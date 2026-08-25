/**
 * Erro padronizado da aplicação.
 */
export class AppError extends Error {
  constructor(message, { code = 'UNKNOWN_ERROR', cause = null, details = null } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
  }

  static from(error, fallbackMessage = 'Ocorreu um erro inesperado.') {
    if (error instanceof AppError) return error;
    return new AppError(error?.message || fallbackMessage, {
      code: error?.code || 'UNKNOWN_ERROR',
      cause: error
    });
  }
}

export default AppError;
