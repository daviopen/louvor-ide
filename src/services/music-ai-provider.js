export class MusicAIProviderError extends Error {
  constructor(code, message, cause = null) {
    super(message);
    this.name = 'MusicAIProviderError';
    this.code = code;
    this.cause = cause;
  }
}

/**
 * Contrato abstrato para provedores de IA usados na importação assistida.
 * A UI e as regras de domínio não devem depender diretamente do SDK do Gemini.
 */
export class MusicAIProvider {
  constructor({ provider = 'unknown', model = 'unknown' } = {}) {
    this.provider = provider;
    this.model = model;
  }

  getMetadata() {
    return { provider: this.provider, model: this.model };
  }

  async analyzeSong() {
    throw new MusicAIProviderError('NOT_IMPLEMENTED', 'O provider de IA não implementa analyzeSong().');
  }
}

export default MusicAIProvider;
