import { MusicAIProvider, MusicAIProviderError } from './music-ai-provider.js';
import { MUSIC_AI_RESPONSE_JSON_SCHEMA, MUSIC_AI_SCHEMA_VERSION } from './music-ai-schema.js';

const FIREBASE_SDK_VERSION = '12.18.0';
const DEFAULT_MODEL = 'gemini-3.6-flash';

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

async function loadPublicConfig() {
  try {
    await import('../js/ai-public-config.js');
  } catch {}
  return window.IDE_MUSIC_AI_CONFIG || {};
}

export class FirebaseMusicAIProvider extends MusicAIProvider {
  constructor({ model = null } = {}) {
    super({ provider: 'firebase-ai-logic/google-ai', model: model || DEFAULT_MODEL });
    this.explicitModel = model;
    this._model = null;
  }

  async _loadModel() {
    if (this._model) return this._model;
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
      this._model = aiModule.getGenerativeModel(ai, {
        model: this.model,
        tools: [{ urlContext: {} }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseJsonSchema: MUSIC_AI_RESPONSE_JSON_SCHEMA,
          temperature: 0.1
        },
        systemInstruction: `Você estrutura dados de músicas para o IDE Music. Responda somente no schema ${MUSIC_AI_SCHEMA_VERSION}. Não invente nome, artista, tom, BPM, compasso, cifra, letra ou vídeo. Quando não houver evidência suficiente, use null ou lista vazia. Preserve a cifra em texto simples, mantendo seções naturais como Intro, Estrofe, Pré-Refrão, Refrão, Ponte, Instrumental e Final. Não faça scraping nem tente contornar bloqueios de sites.`
      }, { timeout: 45000 });
      return this._model;
    } catch (error) {
      if (error instanceof MusicAIProviderError) throw error;
      throw new MusicAIProviderError(classifyError(error), 'Não foi possível inicializar o Firebase AI Logic.', error);
    }
  }

  async analyzeSong(input) {
    const model = await this._loadModel();
    const prompt = [
      'Analise os dados fornecidos e retorne somente informações sustentadas pelo conteúdo.',
      input.sourceUrl ? `URL de cifra/referência (use apenas se estiver publicamente acessível e permitido): ${input.sourceUrl}` : '',
      input.youtubeUrl ? `URL de vídeo de referência: ${input.youtubeUrl}` : '',
      input.manualBpm ? `BPM informado manualmente pelo usuário: ${input.manualBpm}. Marque bpmSource como manual.` : '',
      input.pastedText ? `Conteúdo colado pelo usuário:\n---\n${input.pastedText}\n---` : '',
      'Se a URL não puder ser acessada, continue somente com o texto colado e demais informações fornecidas. Não invente dados ausentes.'
    ].filter(Boolean).join('\n\n');

    try {
      const result = await model.generateContent(prompt);
      const text = result?.response?.text?.() || '';
      if (!text) throw new MusicAIProviderError('INVALID_RESPONSE', 'A IA retornou uma resposta vazia.');
      try {
        return JSON.parse(text);
      } catch (error) {
        throw new MusicAIProviderError('INVALID_RESPONSE', 'A IA retornou uma resposta que não pôde ser validada.', error);
      }
    } catch (error) {
      if (error instanceof MusicAIProviderError) throw error;
      throw new MusicAIProviderError(classifyError(error), 'A análise com IA não pôde ser concluída.', error);
    }
  }
}

export default FirebaseMusicAIProvider;
