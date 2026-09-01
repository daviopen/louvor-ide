import FirebaseMusicAIProvider from './firebase-music-ai-provider.js';
import { normalizeMusicAIResponse, normalizeBpm, extractYouTubeVideoId } from './music-ai-schema.js';

const DUPLICATE_WINDOW_MS = 5000;
const RATE_WINDOW_MS = 60000;
const MAX_REQUESTS_PER_WINDOW = 4;
let activeRequest = null;
let lastFingerprint = '';
let lastStartedAt = 0;
const requestTimes = [];

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
      songQuery: null
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
      songQuery: null
    };
  }

  const sourceType = looksLikeSongQuery(rawInput) ? 'song-query' : 'pasted-text';
  return {
    rawInput,
    pastedText: rawInput,
    sourceUrl: null,
    youtubeUrl: null,
    manualBpm: null,
    sourceType,
    songQuery: sourceType === 'song-query' ? rawInput : null
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

export class MusicAIService {
  constructor(provider = new FirebaseMusicAIProvider()) {
    this.provider = provider;
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
        songQuery: null
      }
    };
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
    activeRequest = this.provider.analyzeSong(normalized)
      .then(raw => ({ data: normalizeMusicAIResponse(raw), provider: this.provider.getMetadata(), input: normalized }))
      .finally(() => { activeRequest = null; });
    return activeRequest;
  }
}

export default MusicAIService;
