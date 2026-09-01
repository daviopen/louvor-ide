import {
  MUSIC_AI_SCHEMA_VERSION,
  buildMusicAnalysisPrompt,
  normalizeMusicAIResponse,
  validateMusicAIInput
} from './music-ai-contract.js';

const FIREBASE_AI_SDK_VERSION = '12.18.0';
const DEFAULT_MODEL = 'gemini-3.5-flash-lite';
const DEFAULT_TIMEOUT_MS = 30000;
const REQUEST_COOLDOWN_MS = 3500;
const TEXT_FALLBACK_BLOCKED_CODES = new Set([
  'QUOTA',
  'APP_CHECK',
  'APP_CHECK_CONFIGURATION',
  'CONFIGURATION',
  'TIMEOUT',
  'DUPLICATE',
  'VALIDATION'
]);

let sdkPromise = null;

export class MusicAIProviderError extends Error {
  constructor(code, message, cause = null) {
    super(message);
    this.name = 'MusicAIProviderError';
    this.code = code;
    this.cause = cause || undefined;
  }
}

/**
 * Contrato abstrato de provider para análise assistida de músicas.
 * Implementações nunca devem persistir músicas automaticamente.
 */
export class MusicAIProvider {
  getInfo() {
    return { provider: 'unknown', model: null };
  }

  async analyze() {
    throw new MusicAIProviderError('NOT_IMPLEMENTED', 'Provider de IA não implementado.');
  }
}

async function loadFirebaseAISdk() {
  if (!sdkPromise) {
    const base = `https://www.gstatic.com/firebasejs/${FIREBASE_AI_SDK_VERSION}`;
    sdkPromise = Promise.all([
      import(`${base}/firebase-app.js`),
      import(`${base}/firebase-app-check.js`),
      import(`${base}/firebase-ai.js`)
    ]).then(([app, appCheck, ai]) => ({ app, appCheck, ai }));
  }
  return sdkPromise;
}

function firebaseConfigFromEnvironment(scope = window) {
  const env = scope?.ENV || {};
  return {
    apiKey: env.VITE_FIREBASE_API_KEY || '',
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: env.VITE_FIREBASE_APP_ID || '',
    measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || ''
  };
}

function assertFirebaseConfig(config) {
  if (!config.apiKey || !config.projectId || !config.appId) {
    throw new MusicAIProviderError(
      'CONFIGURATION',
      'A integração de IA ainda não foi configurada neste ambiente. Continue pelo cadastro manual.'
    );
  }
}

function appCheckSiteKey(scope = window) {
  return String(scope?.ENV?.VITE_FIREBASE_APPCHECK_SITE_KEY || '').trim();
}

function configuredModel(scope = window) {
  return String(scope?.ENV?.VITE_FIREBASE_AI_MODEL || DEFAULT_MODEL).trim() || DEFAULT_MODEL;
}

function isLocalDevelopment(scope = window) {
  const hostname = String(scope?.location?.hostname || '').toLowerCase();
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

function classifyProviderError(error) {
  if (error instanceof MusicAIProviderError) return error;
  const code = String(error?.code || '').toLowerCase();
  const message = String(error?.message || '').toLowerCase();
  const combined = `${code} ${message}`;

  if (combined.includes('quota') || combined.includes('resource-exhausted') || combined.includes('429')) {
    return new MusicAIProviderError('QUOTA', 'A cota da IA foi atingida. Continue pelo cadastro manual.', error);
  }
  if (combined.includes('app-check') || combined.includes('appcheck') || combined.includes('403')) {
    return new MusicAIProviderError('APP_CHECK', 'A proteção App Check rejeitou a solicitação. Continue pelo cadastro manual.', error);
  }
  if (combined.includes('network') || combined.includes('unavailable') || combined.includes('offline') || combined.includes('fetch')) {
    return new MusicAIProviderError('UNAVAILABLE', 'A IA está indisponível no momento. Continue pelo cadastro manual.', error);
  }
  return new MusicAIProviderError('FAILED', 'Não foi possível analisar a música com IA. Continue pelo cadastro manual.', error);
}

function canFallbackToPastedText(error, input) {
  if (!input.sourceUrl || !input.pastedText) return false;
  const classified = classifyProviderError(error);
  return !TEXT_FALLBACK_BLOCKED_CODES.has(classified.code);
}

function requestFingerprint(input) {
  const value = JSON.stringify({
    pastedText: input.pastedText || '',
    sourceUrl: input.sourceUrl || '',
    youtubeUrl: input.youtubeUrl || '',
    manualBpm: input.manualBpm ?? null
  });
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

function withTimeout(promise, timeoutMs) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new MusicAIProviderError('TIMEOUT', 'A análise com IA excedeu o tempo limite. Continue pelo cadastro manual.'));
    }, timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

function createResponseSchema(Schema) {
  const evidenceItem = Schema.object({
    properties: {
      field: Schema.string(),
      source: Schema.string(),
      confidence: Schema.string(),
      evidence: Schema.string()
    },
    optionalProperties: ['evidence']
  });

  const sectionItem = Schema.object({
    properties: {
      type: Schema.string(),
      title: Schema.string(),
      content: Schema.string(),
      chords: Schema.string()
    },
    optionalProperties: ['title', 'content', 'chords']
  });

  const video = Schema.object({
    properties: {
      provider: Schema.string(),
      url: Schema.string(),
      videoId: Schema.string()
    },
    optionalProperties: ['provider', 'url', 'videoId']
  });

  return Schema.object({
    properties: {
      schemaVersion: Schema.string(),
      title: Schema.string(),
      artist: Schema.string(),
      originalKey: Schema.string(),
      chordSheet: Schema.string(),
      lyrics: Schema.string(),
      timeSignature: Schema.string(),
      bpm: Schema.number(),
      video,
      sections: Schema.array({ items: sectionItem }),
      fieldEvidence: Schema.array({ items: evidenceItem }),
      warnings: Schema.array({ items: Schema.string() })
    },
    optionalProperties: [
      'title', 'artist', 'originalKey', 'chordSheet', 'lyrics',
      'timeSignature', 'bpm', 'video', 'sections', 'fieldEvidence', 'warnings'
    ]
  });
}

export class FirebaseMusicAIProvider extends MusicAIProvider {
  constructor(options = {}) {
    super();
    this.scope = options.scope || (typeof window !== 'undefined' ? window : null);
    this.modelName = options.model || (this.scope ? configuredModel(this.scope) : DEFAULT_MODEL);
    this.timeoutMs = Number(options.timeoutMs) || DEFAULT_TIMEOUT_MS;
    this.inflight = new Map();
    this.lastCompleted = new Map();
    this.firebaseApp = null;
    this.aiInstance = null;
    this.appCheckInitialized = false;
  }

  getInfo() {
    return {
      provider: 'firebase-ai-logic:gemini-developer-api',
      model: this.modelName,
      sdkVersion: FIREBASE_AI_SDK_VERSION
    };
  }

  async ensureReady() {
    if (!this.scope) throw new MusicAIProviderError('UNAVAILABLE', 'Firebase AI Logic exige um navegador compatível.');
    const sdk = await loadFirebaseAISdk();
    const config = firebaseConfigFromEnvironment(this.scope);
    assertFirebaseConfig(config);

    if (!this.firebaseApp) {
      const existing = sdk.app.getApps().find(app => app.name === 'music-ai');
      this.firebaseApp = existing || sdk.app.initializeApp(config, 'music-ai');
    }

    if (!this.appCheckInitialized) {
      const siteKey = appCheckSiteKey(this.scope);
      if (!siteKey) {
        throw new MusicAIProviderError(
          'APP_CHECK_CONFIGURATION',
          'O App Check da IA ainda não foi configurado. Continue pelo cadastro manual.'
        );
      }
      if (isLocalDevelopment(this.scope) && typeof self !== 'undefined') {
        self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
      }
      sdk.appCheck.initializeAppCheck(this.firebaseApp, {
        provider: new sdk.appCheck.ReCaptchaEnterpriseProvider(siteKey),
        isTokenAutoRefreshEnabled: true
      });
      this.appCheckInitialized = true;
    }

    if (!this.aiInstance) {
      this.aiInstance = sdk.ai.getAI(this.firebaseApp, { backend: new sdk.ai.GoogleAIBackend() });
    }
    return sdk;
  }

  async analyzeOnce(input, options = {}) {
    const sdk = await this.ensureReady();
    const responseSchema = createResponseSchema(sdk.ai.Schema);
    const tools = input.sourceUrl ? [{ urlContext: {} }] : undefined;
    const model = sdk.ai.getGenerativeModel(this.aiInstance, {
      model: this.modelName,
      tools,
      systemInstruction: [
        'Você auxilia no cadastro de músicas para uma equipe de louvor.',
        'Nunca invente título, artista, tom, BPM, compasso, letra ou cifra.',
        'Retorne apenas informações sustentadas pelo material fornecido.',
        `Use schemaVersion ${MUSIC_AI_SCHEMA_VERSION}.`
      ].join(' '),
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema,
        temperature: 0.1
      }
    });

    const prompt = buildMusicAnalysisPrompt(input);
    const result = await withTimeout(model.generateContent(prompt), this.timeoutMs);
    const text = result?.response?.text?.();
    if (!text) throw new MusicAIProviderError('INVALID_RESPONSE', 'A IA retornou uma resposta vazia.');

    let raw;
    try {
      raw = JSON.parse(text);
    } catch (error) {
      throw new MusicAIProviderError('INVALID_RESPONSE', 'A IA retornou uma resposta inválida.', error);
    }

    const normalized = normalizeMusicAIResponse(raw, {
      manualBpm: input.manualBpm,
      youtubeUrl: input.youtubeUrl
    });
    const hasUsefulData = Boolean(
      normalized.title || normalized.artist || normalized.originalKey || normalized.chordSheet
      || normalized.lyrics || normalized.timeSignature || normalized.bpm || normalized.sections.length
    );
    if (!hasUsefulData) {
      throw new MusicAIProviderError('INVALID_RESPONSE', 'A IA não conseguiu identificar dados úteis nessa fonte.');
    }

    return {
      ...normalized,
      providerInfo: this.getInfo(),
      fallbackUsed: Boolean(options.fallbackUsed)
    };
  }

  async analyze(input = {}) {
    const validation = validateMusicAIInput(input);
    if (!validation.valid) {
      throw new MusicAIProviderError('VALIDATION', validation.errors.join(' '));
    }
    const normalizedInput = {
      pastedText: validation.value.pastedText,
      sourceUrl: validation.value.sourceUrl,
      youtubeUrl: validation.value.youtube?.url || '',
      manualBpm: validation.value.manualBpm
    };
    const fingerprint = requestFingerprint(normalizedInput);

    if (this.inflight.has(fingerprint)) return this.inflight.get(fingerprint);
    const lastCompletedAt = this.lastCompleted.get(fingerprint) || 0;
    if (Date.now() - lastCompletedAt < REQUEST_COOLDOWN_MS) {
      throw new MusicAIProviderError('DUPLICATE', 'Essa mesma análise acabou de ser solicitada. Aguarde alguns segundos.');
    }

    const request = (async () => {
      try {
        try {
          return await this.analyzeOnce(normalizedInput);
        } catch (error) {
          if (canFallbackToPastedText(error, normalizedInput)) {
            const fallbackInput = { ...normalizedInput, sourceUrl: '' };
            const fallback = await this.analyzeOnce(fallbackInput, { fallbackUsed: true });
            fallback.warnings = [
              ...fallback.warnings,
              'A URL não pôde ser usada; a análise foi concluída apenas com o texto colado.'
            ];
            return fallback;
          }
          throw classifyProviderError(error);
        }
      } catch (error) {
        throw classifyProviderError(error);
      } finally {
        this.lastCompleted.set(fingerprint, Date.now());
        this.inflight.delete(fingerprint);
      }
    })();

    this.inflight.set(fingerprint, request);
    return request;
  }
}

export class MockMusicAIProvider extends MusicAIProvider {
  constructor(response = {}) {
    super();
    this.response = response;
  }

  getInfo() {
    return { provider: 'mock', model: 'mock-music-ai' };
  }

  async analyze(input = {}) {
    const validation = validateMusicAIInput(input);
    if (!validation.valid) throw new MusicAIProviderError('VALIDATION', validation.errors.join(' '));
    return {
      ...normalizeMusicAIResponse(this.response, {
        manualBpm: input.manualBpm,
        youtubeUrl: input.youtubeUrl
      }),
      providerInfo: this.getInfo(),
      fallbackUsed: false
    };
  }
}

export function createMusicAIProvider(scope = typeof window !== 'undefined' ? window : null) {
  if (scope?.__MUSIC_AI_PROVIDER__ && typeof scope.__MUSIC_AI_PROVIDER__.analyze === 'function') {
    return scope.__MUSIC_AI_PROVIDER__;
  }
  return new FirebaseMusicAIProvider({ scope });
}
