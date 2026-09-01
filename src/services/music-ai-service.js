import FirebaseMusicAIProvider, { buildChordSourceCandidates } from './firebase-music-ai-provider.js';
import { normalizeMusicAIResponse, normalizeBpm, extractYouTubeVideoId } from './music-ai-schema.js';

const DUPLICATE_WINDOW_MS = 5000;
const RATE_WINDOW_MS = 60000;
const MAX_REQUESTS_PER_WINDOW = 4;
const RETRY_DELAY_MS = 700;
const FALLBACK_MODEL = 'gemini-3.7-flash';
const RETRYABLE_PROVIDER_CODES = new Set(['UNAVAILABLE', 'TIMEOUT']);
let activeRequest = null;
let lastFingerprint = '';
let lastStartedAt = 0;
const requestTimes = [];

const CHORD_TOKEN_RE = /^(?:[A-G](?:#|b)?)(?:(?:m|maj|min|dim|aug|sus|add|M)?(?:\d{0,2})?(?:[#b+\-º°()]*)?)(?:\/[A-G](?:#|b)?)?$/u;
const MUSIC_METADATA_RE = /^(?:tom|capotraste|afina[cç][aã]o|bpm|compasso|tuning|key)\s*:/iu;

function validHttpUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function compactText(value, max = 30000) {
  return String(value || '').trim().slice(0, max);
}

function looksLikeSongQuery(value) {
  const text = compactText(value, 500);
  if (!text || text.length > 180) return false;
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (lines.length > 2) return false;
  if (/\b(?:intro|estrofe|refr[aã]o|ponte|instrumental|final|tom|capotraste)\s*:/iu.test(text)) return false;
  if (/\b[A-G](?:#|b)?(?:m|maj|min|sus|dim|aug)?(?:\d{0,2})?(?:\/[A-G](?:#|b)?)?\b.*\b[A-G](?:#|b)?/u.test(text)) return false;
  return true;
}

export function parseSongQueryIdentity(value) {
  const text = compactText(value, 300).replace(/\s+/g, ' ');
  if (!text) return null;

  for (const separator of [' — ', ' – ', ' - ']) {
    const index = text.lastIndexOf(separator);
    if (index > 0) {
      const title = text.slice(0, index).trim();
      const artist = text.slice(index + separator.length).trim();
      if (title && artist) return { title, artist };
    }
  }

  const commaIndex = text.lastIndexOf(',');
  if (commaIndex > 0) {
    const title = text.slice(0, commaIndex).trim();
    const artist = text.slice(commaIndex + 1).trim();
    if (title && artist && artist.split(/\s+/).length <= 6) return { title, artist };
  }
  return null;
}

function normalizeChordToken(token) {
  const normalized = String(token || '')
    .trim()
    .replace(/^[\[({|]+/, '')
    .replace(/[\])},;:|]+$/, '');
  return CHORD_TOKEN_RE.test(normalized) ? normalized : null;
}

function isChordOnlyLine(line) {
  const tokens = String(line || '').trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return false;
  const meaningful = tokens.filter(token => !/^[|()\[\]{},;:\-]+$/.test(token));
  return Boolean(meaningful.length) && meaningful.every(token => normalizeChordToken(token));
}

function countChordTokens(value) {
  return String(value || '')
    .split(/\s+/)
    .map(normalizeChordToken)
    .filter(Boolean)
    .length;
}

export function hasUsefulChordDetail(data = {}) {
  const sections = Array.isArray(data.sections) ? data.sections : [];
  const detailedSections = sections
    .map(section => countChordTokens(section?.content))
    .filter(count => count > 0);

  if (detailedSections.length) {
    const total = detailedSections.reduce((sum, count) => sum + count, 0);
    return total >= 8 && detailedSections.length >= 2;
  }

  return countChordTokens(data.chordSheet) >= 8;
}

export function extractLyricsFromPastedMusicText(value) {
  const text = compactText(value);
  if (!text) return null;
  const output = [];
  let previousBlank = false;

  for (const rawLine of text.replace(/\r\n?/g, '\n').split('\n')) {
    const line = rawLine.trim();
    if (!line) {
      if (output.length && !previousBlank) output.push('');
      previousBlank = true;
      continue;
    }
    if (isChordOnlyLine(line) || MUSIC_METADATA_RE.test(line)) continue;
    output.push(line);
    previousBlank = false;
  }

  while (output.length && !output.at(-1)) output.pop();
  const lyrics = output.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  return lyrics || null;
}

export function classifyMusicAIInput(value) {
  const rawInput = compactText(value);
  if (!rawInput) {
    return {
      rawInput: '',
      pastedText: '',
      sourceUrl: null,
      youtubeUrl: null,
      manualBpm: null,
      sourceType: null,
      songQuery: null,
      songIdentity: null
    };
  }

  const singleLine = !/[\r\n]/.test(rawInput) ? rawInput : '';
  const detectedUrl = validHttpUrl(singleLine);
  if (detectedUrl) {
    const youtubeVideoId = extractYouTubeVideoId(detectedUrl);
    return {
      rawInput,
      pastedText: '',
      sourceUrl: youtubeVideoId ? null : detectedUrl,
      youtubeUrl: youtubeVideoId ? detectedUrl : null,
      manualBpm: null,
      sourceType: youtubeVideoId ? 'youtube-url' : 'source-url',
      songQuery: null,
      songIdentity: null
    };
  }

  const sourceType = looksLikeSongQuery(rawInput) ? 'song-query' : 'pasted-text';
  const songQuery = sourceType === 'song-query' ? rawInput : null;
  return {
    rawInput,
    pastedText: rawInput,
    sourceUrl: null,
    youtubeUrl: null,
    manualBpm: null,
    sourceType,
    songQuery,
    songIdentity: songQuery ? parseSongQueryIdentity(songQuery) : null
  };
}

function fingerprint(input) {
  return JSON.stringify([
    input.rawInput,
    input.pastedText,
    input.sourceUrl,
    input.youtubeUrl,
    input.manualBpm,
    input.sourceType,
    input.songQuery
  ]);
}

function enrichNormalizedData(data, input) {
  const enriched = { ...data };
  if (input.sourceType === 'song-query' && input.songIdentity) {
    enriched.title ||= input.songIdentity.title;
    enriched.artist ||= input.songIdentity.artist;
    enriched.provenance = {
      ...(enriched.provenance || {}),
      ...(!data.title ? { title: 'informado pelo usuário' } : {}),
      ...(!data.artist ? { artist: 'informado pelo usuário' } : {})
    };
  }
  if (!enriched.lyrics && input.sourceType === 'pasted-text') {
    const lyrics = extractLyricsFromPastedMusicText(input.pastedText);
    if (lyrics) {
      enriched.lyrics = lyrics;
      enriched.provenance = {
        ...(enriched.provenance || {}),
        lyrics: 'extraída do conteúdo colado pelo usuário'
      };
    }
  }
  return enriched;
}

function discardSparseChord(data, input) {
  if (input.sourceType !== 'song-query' || hasUsefulChordDetail(data)) return data;
  return {
    ...data,
    chordSheet: null,
    sections: [],
    provenance: {
      ...(data.provenance || {}),
      chordSheet: 'estrutura harmônica insuficiente; cifra não aplicada'
    }
  };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function notifyProgress(input, stage, message) {
  if (typeof input?.onProgress !== 'function') return;
  try {
    input.onProgress({ stage, message });
  } catch {}
}

function isRetryableProviderError(error) {
  return RETRYABLE_PROVIDER_CODES.has(String(error?.code || '').toUpperCase());
}

export class MusicAIService {
  constructor(provider = new FirebaseMusicAIProvider(), { fallbackProvider = null } = {}) {
    this.provider = provider;
    this.fallbackProvider = fallbackProvider;
    if (!this.fallbackProvider && provider?.constructor === FirebaseMusicAIProvider) {
      this.fallbackProvider = new FirebaseMusicAIProvider({ model: FALLBACK_MODEL });
    }
  }

  validateInput(input = {}) {
    if (Object.prototype.hasOwnProperty.call(input, 'rawInput')) {
      const normalized = classifyMusicAIInput(input.rawInput);
      const errors = normalized.rawInput ? [] : ['Informe o nome da música, artista, link do YouTube, link da cifra ou cole a cifra.'];
      return { errors, normalized };
    }

    const pastedText = compactText(input.pastedText);
    const sourceUrl = validHttpUrl(input.sourceUrl);
    const youtubeUrl = validHttpUrl(input.youtubeUrl);
    const manualBpm = normalizeBpm(input.manualBpm);
    const errors = [];

    if (!pastedText && !sourceUrl && !youtubeUrl) errors.push('Cole uma cifra/texto ou informe uma URL de referência.');
    if (input.sourceUrl && !sourceUrl) errors.push('A URL de cifra/referência não é válida.');
    if (input.youtubeUrl && !youtubeUrl) errors.push('A URL do YouTube não é válida.');
    if (youtubeUrl && !extractYouTubeVideoId(youtubeUrl)) errors.push('Informe uma URL válida do YouTube.');
    if (input.manualBpm && !manualBpm) errors.push('O BPM deve ser um número inteiro entre 30 e 260.');

    return {
      errors,
      normalized: {
        rawInput: pastedText || sourceUrl || youtubeUrl || '',
        pastedText,
        sourceUrl,
        youtubeUrl,
        manualBpm,
        sourceType: sourceUrl ? 'source-url' : (youtubeUrl ? 'youtube-url' : 'pasted-text'),
        songQuery: null,
        songIdentity: null
      }
    };
  }

  async _analyzeWithResilience(providerInput) {
    try {
      const raw = await this.provider.analyzeSong(providerInput);
      return { raw, provider: this.provider };
    } catch (firstError) {
      if (!isRetryableProviderError(firstError)) throw firstError;

      notifyProgress(providerInput, 'retry', 'O serviço de IA respondeu com instabilidade. Tentando novamente…');
      await sleep(RETRY_DELAY_MS);

      try {
        const raw = await this.provider.analyzeSong(providerInput);
        return { raw, provider: this.provider };
      } catch (secondError) {
        if (!isRetryableProviderError(secondError) || !this.fallbackProvider) throw secondError;

        notifyProgress(providerInput, 'fallback-model', 'A instabilidade continua. Tentando um modelo alternativo estável…');
        const raw = await this.fallbackProvider.analyzeSong(providerInput);
        return { raw, provider: this.fallbackProvider };
      }
    }
  }

  async _analyzeSongQuery(normalized, onProgress) {
    const candidates = buildChordSourceCandidates(normalized.songIdentity || {});
    let bestFallback = null;

    for (const candidate of candidates) {
      const providerInput = {
        ...normalized,
        sourceUrl: candidate.url,
        sourceType: 'source-url',
        ...(typeof onProgress === 'function' ? { onProgress } : {})
      };
      notifyProgress(providerInput, 'song-query-source', `Procurando uma cifra detalhada em ${candidate.label}…`);

      try {
        const { raw, provider } = await this._analyzeWithResilience(providerInput);
        const data = enrichNormalizedData(normalizeMusicAIResponse(raw), normalized);
        if (!bestFallback) bestFallback = { data, provider };
        if (!hasUsefulChordDetail(data)) continue;

        data.chordSourceUrl ||= candidate.url;
        data.chordSourceProvider ||= candidate.provider;
        data.provenance = {
          ...(data.provenance || {}),
          chordSheet: `${candidate.label}: ${candidate.url}`
        };
        return { data, provider };
      } catch (error) {
        console.warn(`Busca de cifra por nome/artista indisponível (${candidate.label}):`, error?.code || error?.message || error);
      }
    }

    notifyProgress(
      { ...(typeof onProgress === 'function' ? { onProgress } : {}) },
      'song-query-fallback',
      'Não encontrei uma cifra detalhada confirmada. Mantendo somente os dados confiáveis da música.'
    );

    if (bestFallback) {
      return { data: discardSparseChord(bestFallback.data, normalized), provider: bestFallback.provider };
    }

    const providerInput = typeof onProgress === 'function'
      ? { ...normalized, onProgress }
      : normalized;
    const { raw, provider } = await this._analyzeWithResilience(providerInput);
    const data = discardSparseChord(enrichNormalizedData(normalizeMusicAIResponse(raw), normalized), normalized);
    return { data, provider };
  }

  async analyze(input = {}) {
    const { errors, normalized } = this.validateInput(input);
    if (errors.length) {
      const error = new Error(errors.join(' '));
      error.code = 'VALIDATION';
      throw error;
    }

    const now = Date.now();
    while (requestTimes.length && now - requestTimes[0] > RATE_WINDOW_MS) requestTimes.shift();
    if (requestTimes.length >= MAX_REQUESTS_PER_WINDOW) {
      const error = new Error('Muitas análises em sequência. Aguarde um pouco ou continue pelo cadastro manual.');
      error.code = 'CLIENT_RATE_LIMIT';
      throw error;
    }

    const nextFingerprint = fingerprint(normalized);
    if (activeRequest && nextFingerprint === lastFingerprint && now - lastStartedAt < DUPLICATE_WINDOW_MS) return activeRequest;

    lastFingerprint = nextFingerprint;
    lastStartedAt = now;
    requestTimes.push(now);

    if (normalized.sourceType === 'song-query' && normalized.songIdentity) {
      activeRequest = this._analyzeSongQuery(normalized, input.onProgress)
        .then(({ data, provider }) => ({ data, provider: provider.getMetadata(), input: normalized }))
        .finally(() => { activeRequest = null; });
      return activeRequest;
    }

    const providerInput = typeof input.onProgress === 'function'
      ? { ...normalized, onProgress: input.onProgress }
      : normalized;

    activeRequest = this._analyzeWithResilience(providerInput)
      .then(({ raw, provider }) => {
        const data = enrichNormalizedData(normalizeMusicAIResponse(raw), normalized);
        return { data, provider: provider.getMetadata(), input: normalized };
      })
      .finally(() => { activeRequest = null; });
    return activeRequest;
  }
}

export default MusicAIService;
