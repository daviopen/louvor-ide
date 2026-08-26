/**
 * Erro padronizado da aplicação.
 * `message`/`userMessage` são seguros para UI; detalhes técnicos ficam separados.
 */
export class AppError extends Error {
  constructor(message, {
    code = 'UNKNOWN_ERROR',
    cause = null,
    details = null,
    technicalMessage = null,
    correlationId = null
  } = {}) {
    const safeMessage = message || 'Ocorreu um erro inesperado.';
    super(safeMessage, cause ? { cause } : undefined);
    this.name = 'AppError';
    this.code = code;
    this.userMessage = safeMessage;
    this.technicalMessage = technicalMessage || cause?.message || null;
    this.details = details;
    this.correlationId = correlationId || null;
  }

  static from(error, fallbackMessage = 'Ocorreu um erro inesperado.', options = {}) {
    if (error instanceof AppError) return error;
    return new AppError(fallbackMessage, {
      code: options.code || error?.code || 'UNKNOWN_ERROR',
      cause: error,
      technicalMessage: error?.message || null,
      details: options.details || null,
      correlationId: options.correlationId || null
    });
  }
}

export default AppError;
