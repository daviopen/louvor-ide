import { MusicAIProvider, MusicAIProviderError } from './music-ai-provider.js';
import {
  MUSIC_AI_RESPONSE_JSON_SCHEMA,
  MUSIC_AI_SCHEMA_VERSION,
  extractYouTubeVideoId
} from './music-ai-schema.js';

const FIREBASE_SDK_VERSION = '12.18.0';
const DEFAULT_MODEL = 'gemini-3.7-flash';

const STRATEGY_TIMEOUTS = Object.freeze({
  plain: 30000,
  url: 50000,
  video: 90000,
  videoLookup: 30000
});

const VIDEO_LOOKUP_JSON_SCHEMA = Object.freeze({
  type: 'object',
  additionalProperties: false,
  required: ['videoId', 'videoUrl'],
  properties: {
    videoId: { type: ['string', 'null'] },
    videoUrl: { type: ['string', 'null'] }
  }
});

function firebaseOptionsFromCompat() {
  const app = window.firebase?.apps?.[0];
  const options = app?.options || {};
  if (!options.apiKey || !options.projectId || !options.appId) {
    throw new MusicAIProviderError('FIREBASE_NOT_READY', 'O Firebase ainda não está pronto para a importação com IA.');
  }
  return { ...options };
}

function classifyError(error) {
  const text = `${error?.code || ''} ${error?.message || ''}`.toLowerCase();
  if (text.includes('quota') || text.includes('429') || text.includes('resource-exhausted')) return 'QUOTA';
  if (text.includes('app-check') || text.includes('appcheck') || text.includes('403')) return 'APP_CHECK';
  if (text.includes('timeout') || text.includes('deadline')) return 'TIMEOUT';
  if (text.includes('invalid') || text.includes('json') || text.includes('schema')) return 'INVALID_RESPONSE';
  return 'UNAVAILABLE';
}

function friendlyAnalysisError(code, strategy) {
  if (code === 'TIMEOUT' && strategy === 'video') return 'O vídeo demorou mais que o esperado para ser analisado. Tente novamente ou informe o nome da música e o artista.';
  if (code === 'TIMEOUT' && strategy === 'url') return 'A página demorou mais que o esperado para responder. Tente novamente ou cole a cifra diretamente no mesmo campo.';
  if (code === 'TIMEOUT') return 'A análise demorou mais que o esperado. Tente novamente em alguns segundos.';
  if (code === 'QUOTA') return 'O limite temporário da IA foi atingido. Aguarde alguns instantes e tente novamente.';
  if (code === 'APP_CHECK') return 'A validação de segurança da IA falhou. Atualize a página e tente novamente.';
  if (code === 'INVALID_RESPONSE') return 'A IA retornou dados incompletos. Tente novamente ou continue pelo cadastro manual.';
  return 'A análise com IA não pôde ser concluída. Tente novamente ou continue pelo cadastro manual.';
}

async function loadPublicConfig() {
  try {
    await import('../js/ai-public-config.js');
  } catch {}
  return window.IDE_MUSIC_AI_CONFIG || {};
}

function hasVideoCandidate(data) {
  return Boolean(data?.video?.url || data?.video?.videoId);
}

function hasChordContent(data) {
  return Boolean(
    String(data?.chordSheet || '').trim()
    || (Array.isArray(data?.sections) && data.sections.some(section => String(section?.content || '').trim()))
  );
}

function hostnameOf(value) {
  try {
    return new URL(value).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

function isCifraClubUrl(value) {
  const hostname = hostnameOf(value);
  return hostname === 'cifraclub.com.br' || hostname.endsWith('.cifraclub.com.br');
}

function isBananaCifrasUrl(value) {
  const hostname = hostnameOf(value);
  return hostname === 'bananacifras.com' || hostname.endsWith('.bananacifras.com');
}

function titleFromSlug(value) {
  return decodeURIComponent(String(value || ''))
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/(^|\s)(\p{L})/gu, (_, prefix, letter) => `${prefix}${letter.toLocaleUpperCase('pt-BR')}`);
}

export function slugifyChordPath(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/['’`´]/g, '')
    .replace(/&/g, ' e ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export function buildChordSourceCandidates(identity = {}) {
  const artistSlug = slugifyChordPath(identity.artist);
  const titleSlug = slugifyChordPath(identity.title);
  if (!artistSlug || !titleSlug) return [];
  const artistInitial = artistSlug.charAt(0);
  return [
    {
      provider: 'cifraclub',
      label: 'Cifra Club',
      url: `https://www.cifraclub.com.br/${artistSlug}/${titleSlug}/`
    },
    {
      provider: 'bananacifras',
      label: 'Banana Cifras',
      url: `https://www.bananacifras.com/cifra/${artistInitial}/${artistSlug}/${titleSlug}`
    }
  ];
}

export function extractSongIdentityFromChordUrl(value) {
  try {
    const url = new URL(value);
    const parts = url.pathname.split('/').filter(Boolean);
    if (isCifraClubUrl(value) && parts.length >= 2) {
      return {
        artist: titleFromSlug(parts.at(-2)),
        title: titleFromSlug(parts.at(-1))
      };
    }
    if (isBananaCifrasUrl(value) && parts.length >= 2) {
      return {
        artist: titleFromSlug(parts.at(-2)),
        title: titleFromSlug(parts.at(-1))
      };
    }
  } catch {}
  return null;
}

export function selectMusicAIStrategy(input = {}) {
  if (input.youtubeUrl || input.sourceType === 'youtube-url') return 'video';
  if (input.sourceUrl || input.sourceType === 'source-url') return 'url';
  return 'plain';
}

export function shouldRetryEmbeddedVideoLookup({ input = {}, data = {} } = {}) {
  return Boolean(
    input.sourceUrl
    && !input.youtubeUrl
    && isCifraClubUrl(input.sourceUrl)
    && !hasVideoCandidate(data)
  );
}

function comparableIdentity(value) {
  return slugifyChordPath(value);
}

export function chordResultMatchesIdentity(data = {}, identity = {}) {
  const expectedTitle = comparableIdentity(identity.title);
  const expectedArtist = comparableIdentity(identity.artist);
  if (!expectedTitle || !expectedArtist) return false;

  const actualTitle = comparableIdentity(data.title);
  const actualArtist = comparableIdentity(data.artist);
  if (actualTitle && actualTitle !== expectedTitle) return false;
  if (actualArtist && actualArtist !== expectedArtist) return false;
  return true;
}

function normalizeUrlForComparison(value) {
  try {
    const url = new URL(value);
    url.hash = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return String(value || '').replace(/\/$/, '');
  }
}

export function urlContextRetrievedSuccessfully(metadata, expectedUrl = '') {
  const items = Array.isArray(metadata?.urlMetadata) ? metadata.urlMetadata : [];
  const expected = normalizeUrlForComparison(expectedUrl);
  return items.some(item => {
    const status = String(item?.urlRetrievalStatus || '').toUpperCase();
    const retrieved = normalizeUrlForComparison(item?.retrievedUrl || '');
    const matches = !expected || !retrieved || retrieved === expected;
    return status.includes('SUCCESS') && matches;
  });
}

function videoFromLookup(fallback = {}) {
  if (hasVideoCandidate(fallback)) return fallback.video;
  const candidateUrl = String(fallback.videoUrl || '').trim() || null;
  const videoId = String(fallback.videoId || '').trim() || extractYouTubeVideoId(candidateUrl);
  if (!videoId && !candidateUrl) return null;
  return {
    provider: videoId ? 'youtube' : null,
    videoId: videoId || null,
    url: videoId ? `https://www.youtube.com/watch?v=${videoId}` : candidateUrl
  };
}

export function mergeEmbeddedVideoLookup(primary = {}, fallback = {}) {
  if (hasVideoCandidate(primary)) return primary;
  const video = videoFromLookup(fallback);
  if (!video) return primary;
  return {
    ...primary,
    video,
    provenance: {
      ...(primary.provenance || {}),
      video: fallback?.provenance?.video || 'segunda leitura focada da página de cifra'
    }
  };
}

export function mergeVideoAndChordSource(videoData = {}, chordData = {}, source = {}) {
  const sourceUrl = String(source?.url || '').trim() || null;
  const sourceLabel = String(source?.label || '').trim() || 'fonte de cifra';
  const chordSections = Array.isArray(chordData.sections) && chordData.sections.some(section => String(section?.content || '').trim())
    ? chordData.sections
    : videoData.sections;

  return {
    ...videoData,
    title: videoData.title || chordData.title || null,
    artist: videoData.artist || chordData.artist || null,
    originalKey: chordData.originalKey || videoData.originalKey || null,
    chordFormKey: chordData.chordFormKey || videoData.chordFormKey || null,
    capoFret: chordData.capoFret ?? videoData.capoFret ?? null,
    chordSheet: chordData.chordSheet || videoData.chordSheet || null,
    sections: chordSections || [],
    timeSignature: videoData.timeSignature || chordData.timeSignature || null,
    bpm: videoData.bpm || chordData.bpm || null,
    bpmSource: videoData.bpm ? (videoData.bpmSource || 'análise do vídeo') : (chordData.bpmSource || null),
    lyrics: videoData.lyrics || null,
    video: videoData.video || chordData.video || null,
    chordSourceUrl: sourceUrl,
    chordSourceProvider: source?.provider || null,
    provenance: {
      ...(videoData.provenance || {}),
      ...(chordData.provenance || {}),
      ...(sourceUrl ? { chordSheet: `${sourceLabel}: ${sourceUrl}` } : {}),
      ...(sourceUrl && chordData.originalKey ? { originalKey: `${sourceLabel}: ${sourceUrl}` } : {}),
      ...(sourceUrl && chordData.capoFret !== null && chordData.capoFret !== undefined ? { capoFret: `${sourceLabel}: ${sourceUrl}` } : {})
    }
  };
}

function ensureExplicitYoutubeVideo(data = {}, input = {}) {
  if (!input.youtubeUrl) return data;
  const videoId = extractYouTubeVideoId(input.youtubeUrl);
  if (!videoId) return data;
  return {
    ...data,
    video: {
      provider: 'youtube',
      videoId,
      url: `https://www.youtube.com/watch?v=${videoId}`
    },
    provenance: {
      ...(data.provenance || {}),
      video: 'URL do YouTube informada pelo usuário'
    }
  };
}

function notifyProgress(input, stage, message) {
  if (typeof input?.onProgress !== 'function') return;
  try {
    input.onProgress({ stage, message });
  } catch {}
}

function emptyMusicResponse(overrides = {}) {
  return {
    schemaVersion: MUSIC_AI_SCHEMA_VERSION,
    title: null,
    artist: null,
    originalKey: null,
    chordFormKey: null,
    capoFret: null,
    chordSheet: null,
    lyrics: null,
    sections: [],
    timeSignature: null,
    bpm: null,
    bpmSource: null,
    video: null,
    provenance: {},
    ...overrides
  };
}

async function generateStructuredResult(model, content) {
  const result = await model.generateContent(content);
  const text = result?.response?.text?.() || '';
  if (!text) throw new MusicAIProviderError('INVALID_RESPONSE', 'A IA retornou uma resposta vazia.');
  let data;
  try {
    data = JSON.parse(text);
  } catch (error) {
    throw new MusicAIProviderError('INVALID_RESPONSE', 'A IA retornou uma resposta que não pôde ser validada.', error);
  }
  return {
    data,
    urlContextMetadata: result?.response?.candidates?.[0]?.urlContextMetadata || null
  };
}

async function generateStructuredJson(model, content) {
  const result = await generateStructuredResult(model, content);
  return result.data;
}

function buildSystemInstruction() {
  return `Você estrutura dados de músicas para o IDE Music. Responda somente no schema ${MUSIC_AI_SCHEMA_VERSION}. Não invente nome, artista, tom, BPM, compasso, capotraste, cifra, letra ou vídeo. Quando não houver evidência suficiente, use null ou lista vazia.

A entrada pode ser um link do YouTube, uma URL de cifra/fonte, uma cifra ou texto colado, ou apenas nome da música + artista. Quando a entrada for apenas nome/artista, trate-a como uma identificação da música e use somente conhecimento do modelo de alta confiança para sugerir título, artista, tom, BPM e estrutura harmônica. Marque a proveniência desses campos como "conhecimento do modelo; revisar". Nesse modo, não invente link ou ID do YouTube, capotraste ou letra completa.

REGRA DE TOM E CAPOTRASTE: originalKey é SEMPRE o tom musical real/soante declarado pela fonte, nunca o tom deduzido apenas pelas formas dos acordes exibidos. Se uma página disser, por exemplo, "Tom: Db (com forma de C)" e "Capotraste: 1ª casa", retorne originalKey="Db", chordFormKey="C" e capoFret=1. Se não houver capotraste, capoFret deve ser null. Não converta Db para C só porque os desenhos/acordes estão na forma de C.

A cifra do IDE Music é COMPACTA e ORIENTATIVA, não uma transcrição integral da página de cifra. Remova cabeçalhos do site, menus, anúncios, créditos, navegação, comentários e qualquer texto que não faça parte da execução musical. Em chordSheet e em sections, NÃO copie a letra inteira.

PADRÃO IDE MUSIC: preserve a relação entre cada pequena pista de letra e os acordes que realmente pertencem àquela frase. Uma linha válida é algo como "Tu és o - Am7", "Tu és Rei - G" ou "És o Senhor - F9  Dm7". Nunca devolva somente "Tu és", "Grandes coisas" ou "Não há" quando a fonte possui acordes para essas frases. Não junte todos os acordes de uma seção em uma progressão única se isso apagar onde as mudanças harmônicas acontecem.

Regra de detalhamento: se uma seção musical tiver até 5 acordes efetivos, ela pode ser resumida em uma única linha quando isso não perder a relação letra/acorde. Se a seção tiver mais de 5 acordes efetivos, divida-a em várias linhas curtas, preservando a ordem musical e as mudanças de acorde. Cada linha deve usar normalmente 2 ou 3 palavras da letra como referência visual e os acordes correspondentes àquela frase. Em partes puramente instrumentais, preserve a sequência de acordes, inclusive repetições que tenham função de contagem/forma. Use cabeçalhos naturais como "Intro:", "Estrofe:", "Pré-Refrão:", "Refrão:", "Ponte:", "Instrumental:", "Solo:", "Interlúdio:" e "Final:" quando existirem.

Quando houver blocos distintos dentro da mesma seção, preserve pequenas quebras de linha para facilitar leitura. Se uma estrutura inteira se repetir mais tarde sem mudança musical relevante, represente essa estrutura uma única vez. Estrofes diferentes podem permanecer como Estrofe 1, Estrofe 2 etc.

O campo lyrics só deve conter letra que tenha sido fornecida diretamente pelo usuário no texto colado. Não reproduza letra completa obtida apenas de uma página remota ou de conhecimento do modelo.

O campo video deve representar um vídeo real da música, preferencialmente YouTube, encontrado na fonte ou explicitamente informado pelo usuário. Nunca use a URL da própria página de cifra como video.url. Não invente um vídeo.

Não faça scraping próprio nem tente contornar login, paywall, robots ou bloqueios de sites.`;
}

export class FirebaseMusicAIProvider extends MusicAIProvider {
  constructor({ model = null } = {}) {
    super({ provider: 'firebase-ai-logic/google-ai', model: model || DEFAULT_MODEL });
    this.explicitModel = model;
    this._runtime = null;
    this._models = new Map();
  }

  async _loadRuntime() {
    if (this._runtime) return this._runtime;
    try {
      const publicConfig = await loadPublicConfig();
      if (publicConfig.enabled === false) {
        throw new MusicAIProviderError('DISABLED', 'A importação com IA está desabilitada. Continue pelo cadastro manual.');
      }
      this.model = this.explicitModel || publicConfig.model || window.ENV?.VITE_FIREBASE_AI_MODEL || DEFAULT_MODEL;

      const [{ initializeApp, getApps, getApp }, aiModule, appCheckModule] = await Promise.all([
        import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app.js`),
        import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-ai.js`),
        import(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app-check.js`)
      ]);

      const options = firebaseOptionsFromCompat();
      const appName = 'ide-music-ai';
      const modularApp = getApps().some(app => app.name === appName) ? getApp(appName) : initializeApp(options, appName);
      const siteKey = publicConfig.appCheckSiteKey || window.ENV?.VITE_FIREBASE_APPCHECK_SITE_KEY || window.FIREBASE_APPCHECK_SITE_KEY || '';
      if (!siteKey) {
        throw new MusicAIProviderError('APP_CHECK_CONFIG', 'A proteção App Check da IA ainda não foi configurada. Continue pelo cadastro manual.');
      }

      try {
        appCheckModule.initializeAppCheck(modularApp, {
          provider: new appCheckModule.ReCaptchaEnterpriseProvider(siteKey),
          isTokenAutoRefreshEnabled: true
        });
      } catch (error) {
        if (!String(error?.code || '').includes('already-initialized')) throw error;
      }

      const ai = aiModule.getAI(modularApp, { backend: new aiModule.GoogleAIBackend() });
      this._runtime = { ai, aiModule };
      return this._runtime;
    } catch (error) {
      if (error instanceof MusicAIProviderError) throw error;
      throw new MusicAIProviderError(classifyError(error), 'Não foi possível inicializar o Firebase AI Logic.', error);
    }
  }

  async _loadModel(strategy = 'plain') {
    if (this._models.has(strategy)) return this._models.get(strategy);
    const { ai, aiModule } = await this._loadRuntime();
    const isVideoLookup = strategy === 'videoLookup';
    const modelParams = {
      model: this.model,
      generationConfig: {
        responseMimeType: 'application/json',
        responseJsonSchema: isVideoLookup ? VIDEO_LOOKUP_JSON_SCHEMA : MUSIC_AI_RESPONSE_JSON_SCHEMA,
        temperature: 0.1
      },
      ...(strategy === 'url' || strategy === 'videoLookup' ? { tools: [{ urlContext: {} }] } : {}),
      ...(!isVideoLookup ? { systemInstruction: buildSystemInstruction() } : {})
    };
    const model = aiModule.getGenerativeModel(ai, modelParams, { timeout: STRATEGY_TIMEOUTS[strategy] || 45000 });
    this._models.set(strategy, model);
    return model;
  }

  _buildPrompt(input) {
    const sourceIsCifraClub = Boolean(input.sourceUrl && isCifraClubUrl(input.sourceUrl));
    return [
      'Analise os dados fornecidos e retorne somente informações sustentadas pelo conteúdo ou, no modo nome/artista, por conhecimento do modelo de alta confiança.',
      input.sourceType ? `Tipo de entrada detectado pelo aplicativo: ${input.sourceType}.` : '',
      input.songQuery ? `O usuário informou somente a identificação da música: ${input.songQuery}. Identifique a música e sugira título, artista, tom, BPM e estrutura harmônica quando tiver alta confiança. Não invente vídeo, capotraste e não devolva letra completa.` : '',
      input.sourceUrl ? `URL da página de cifra/fonte: ${input.sourceUrl}. Use a página apenas como fonte; nunca use esta URL como link de vídeo.` : '',
      sourceIsCifraClub ? 'Esta é uma página do Cifra Club. Leia explicitamente os campos "Tom", "Capotraste" e, quando existir, a indicação "com forma de". originalKey deve ser o valor de "Tom"; chordFormKey deve ser a forma indicada; capoFret deve ser o número da casa do capotraste.' : '',
      input.sourceUrl ? 'Extraia nome, artista, tom real e estrutura harmônica que estiverem claramente disponíveis. Para sections, preserve pequenas pistas da letra JUNTO dos acordes correspondentes de cada frase. Se houver referência comprovável a vídeo do YouTube na própria página, ela pode ser retornada; não invente.' : '',
      input.youtubeUrl ? 'Analise o vídeo fornecido como mídia. Tente identificar nome, artista, tom, BPM e estrutura harmônica apenas quando houver evidência suficiente no áudio/vídeo.' : '',
      input.manualBpm ? `BPM informado manualmente pelo usuário: ${input.manualBpm}. Marque bpmSource como manual.` : '',
      input.pastedText && !input.songQuery ? `Conteúdo colado pelo usuário:\n---\n${input.pastedText}\n---` : '',
      'Para a cifra, siga o padrão IDE Music: não devolva apenas a pista da letra. Toda linha vocal precisa carregar os acordes que pertencem àquela frase. Se a seção passar de 5 acordes, prefira várias linhas curtas (pista de 2 ou 3 palavras + acordes correspondentes) em vez de uma progressão única. Preserve repetições instrumentais relevantes.',
      'Não invente dados ausentes.'
    ].filter(Boolean).join('\n\n');
  }

  async _analyzePrimary(input, strategy) {
    const model = await this._loadModel(strategy);
    const prompt = this._buildPrompt(input);
    if (strategy === 'video') {
      const videoPart = {
        fileData: {
          fileUri: input.youtubeUrl,
          mimeType: 'video/*'
        }
      };
      notifyProgress(input, 'video-analysis', 'Analisando o vídeo para identificar música, artista, tom e andamento…');
      const data = await generateStructuredJson(model, [videoPart, prompt]);
      return ensureExplicitYoutubeVideo(data, input);
    }
    return generateStructuredJson(model, prompt);
  }

  async _fallbackFromChordUrl(input, sourceError) {
    const identity = extractSongIdentityFromChordUrl(input.sourceUrl);
    if (!identity?.title || !identity?.artist) throw sourceError;
    const model = await this._loadModel('plain');
    const query = `${identity.title} — ${identity.artist}`;
    const prompt = [
      `A página de cifra não pôde ser lida diretamente. Use apenas a identidade inferida da própria URL: ${query}.`,
      'Sugira título, artista, tom, BPM e estrutura harmônica apenas se tiver alta confiança. Não invente vídeo, capotraste, forma de acorde e não gere letra completa.',
      'Marque a proveniência dos campos sugeridos como "fallback pelo nome na URL; revisar".'
    ].join('\n\n');
    const fallback = await generateStructuredJson(model, prompt);
    return {
      ...fallback,
      capoFret: null,
      chordFormKey: null,
      title: fallback.title || identity.title,
      artist: fallback.artist || identity.artist,
      provenance: {
        ...(fallback.provenance || {}),
        title: fallback?.provenance?.title || 'nome inferido da URL da cifra',
        artist: fallback?.provenance?.artist || 'artista inferido da URL da cifra'
      }
    };
  }

  async _lookupEmbeddedVideo(input, primary) {
    if (!shouldRetryEmbeddedVideoLookup({ input, data: primary })) return primary;
    const identity = [primary.title, primary.artist].filter(Boolean).join(' — ');
    const model = await this._loadModel('videoLookup');
    const videoPrompt = [
      'Leia a URL exclusivamente para localizar um vídeo do YouTube comprovadamente incorporado ou referenciado na própria página. Não use busca externa e não invente ID.',
      `URL da cifra: ${input.sourceUrl}`,
      identity ? `Música identificada: ${identity}.` : '',
      'No Cifra Club o ID pode aparecer em thumbnails como i.ytimg.com/vi/VIDEO_ID/... ou i.ytimg.com/vi_webp/VIDEO_ID/..., além de youtube.com/watch, youtu.be e youtube.com/embed.',
      'Retorne videoId e videoUrl. Se não encontrar evidência suficiente, retorne ambos como null.'
    ].filter(Boolean).join('\n\n');
    try {
      const fallback = await generateStructuredJson(model, videoPrompt);
      return mergeEmbeddedVideoLookup(primary, fallback);
    } catch (error) {
      console.warn('Busca complementar do vídeo não encontrou evidência utilizável:', error?.code || error?.message || error);
      return primary;
    }
  }

  async _readChordCandidate(candidate, identity, input) {
    const model = await this._loadModel('url');
    notifyProgress(input, 'chord-source', `Procurando uma cifra compatível em ${candidate.label}…`);
    const cifraClubRules = candidate.provider === 'cifraclub'
      ? 'No Cifra Club, leia os campos "Tom", "Capotraste" e "com forma de". O tom real declarado em "Tom" vai para originalKey; a forma vai para chordFormKey; a casa do capotraste vai para capoFret. Não confunda forma de acorde com tom real.'
      : '';
    const prompt = [
      `Leia esta URL como possível cifra para ${identity.title} — ${identity.artist}: ${candidate.url}`,
      'Use exclusivamente o conteúdo realmente recuperado da URL para a estrutura harmônica.',
      cifraClubRules,
      'Se a página não corresponder à música e ao artista esperados, retorne chordSheet null, sections vazias, originalKey null, chordFormKey null e capoFret null.',
      'Se corresponder, organize a cifra no padrão IDE Music. Em sections, associe cada pequena pista vocal aos acordes reais daquela frase; não retorne linhas vocais sem acorde quando a página mostra o acorde. Se uma seção tiver mais de 5 acordes, mantenha várias linhas curtas. Em Intro/Instrumental/Final, preserve a progressão e repetições relevantes. Não copie a letra completa.'
    ].filter(Boolean).join('\n\n');
    const result = await generateStructuredResult(model, prompt);
    if (!urlContextRetrievedSuccessfully(result.urlContextMetadata, candidate.url)) return null;
    if (!chordResultMatchesIdentity(result.data, identity)) return null;
    if (!hasChordContent(result.data)) return null;
    return result.data;
  }

  async _enrichVideoWithChordSource(input, primary) {
    const identity = {
      title: String(primary?.title || '').trim(),
      artist: String(primary?.artist || '').trim()
    };
    if (!identity.title || !identity.artist) {
      notifyProgress(input, 'chord-fallback', 'Não foi possível identificar música e artista com segurança; mantendo a análise do vídeo.');
      return primary;
    }

    notifyProgress(input, 'song-identified', `Música identificada: ${identity.title} — ${identity.artist}. Agora procurando uma cifra de referência…`);
    const candidates = buildChordSourceCandidates(identity);

    for (const candidate of candidates) {
      try {
        const chordData = await this._readChordCandidate(candidate, identity, input);
        if (!chordData) continue;
        notifyProgress(input, 'chord-found', `Cifra encontrada em ${candidate.label}. Organizando os dados no padrão do IDE Music…`);
        return mergeVideoAndChordSource(primary, chordData, candidate);
      } catch (error) {
        console.warn(`Fonte de cifra indisponível (${candidate.label}):`, error?.code || error?.message || error);
      }
    }

    notifyProgress(input, 'chord-fallback', 'Nenhuma cifra externa acessível foi confirmada. Usando a estrutura identificada diretamente no vídeo.');
    return primary;
  }

  async analyzeSong(input) {
    const strategy = selectMusicAIStrategy(input);
    try {
      let primary;
      try {
        primary = await this._analyzePrimary(input, strategy);
      } catch (error) {
        if (strategy !== 'url' || !extractSongIdentityFromChordUrl(input.sourceUrl)) throw error;
        console.warn('Leitura direta da página falhou; usando identidade da URL como fallback:', error?.code || error?.message || error);
        primary = await this._fallbackFromChordUrl(input, error);
      }

      if (strategy === 'video') {
        const videoData = ensureExplicitYoutubeVideo(primary, input);
        return this._enrichVideoWithChordSource(input, videoData);
      }
      if (strategy === 'url') return this._lookupEmbeddedVideo(input, primary);
      return primary;
    } catch (error) {
      if (error instanceof MusicAIProviderError && ['DISABLED', 'APP_CHECK_CONFIG', 'FIREBASE_NOT_READY'].includes(error.code)) throw error;
      const code = error instanceof MusicAIProviderError ? error.code : classifyError(error);
      throw new MusicAIProviderError(code, friendlyAnalysisError(code, strategy), error);
    }
  }
}

export { emptyMusicResponse };
export default FirebaseMusicAIProvider;
