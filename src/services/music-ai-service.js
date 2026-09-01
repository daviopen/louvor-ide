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

function fingerprint(input) {
  return JSON.stringify([input.pastedText, input.sourceUrl, input.youtubeUrl, input.manualBpm]);
}

export class MusicAIService {
  constructor(provider = new FirebaseMusicAIProvider()) {
    this.provider = provider;
  }

  validateInput(input = {}) {
    const pastedText = compactText(input.pastedText);
    const sourceUrl = validHttpUrl(input.sourceUrl);
    const youtubeUrl = validHttpUrl(input.youtubeUrl);
    const manualBpm = normalizeBpm(input.manualBpm);
    const errors = [];

    if (!pastedText && !sourceUrl) errors.push('Cole uma cifra/texto ou informe uma URL de referência.');
    if (input.sourceUrl && !sourceUrl) errors.push('A URL de cifra/referência não é válida.');
    if (input.youtubeUrl && !youtubeUrl) errors.push('A URL do YouTube não é válida.');
    if (youtubeUrl && !extractYouTubeVideoId(youtubeUrl)) errors.push('Informe uma URL válida do YouTube.');
    if (input.manualBpm && !manualBpm) errors.push('O BPM deve ser um número inteiro entre 30 e 260.');

    return { errors, normalized: { pastedText, sourceUrl, youtubeUrl, manualBpm } };
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
