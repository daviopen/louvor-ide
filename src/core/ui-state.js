/** Estados canônicos para operações assíncronas e telas de dados. */
export const UI_STATUS = Object.freeze({
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  EMPTY: 'empty',
  ERROR: 'error'
});

export function createUiState(overrides = {}) {
  return {
    status: UI_STATUS.IDLE,
    data: null,
    error: null,
    ...overrides
  };
}

export function loadingState(previous = {}) {
  return createUiState({ ...previous, status: UI_STATUS.LOADING, error: null });
}

export function successState(data) {
  const isEmpty = Array.isArray(data) && data.length === 0;
  return createUiState({ status: isEmpty ? UI_STATUS.EMPTY : UI_STATUS.SUCCESS, data });
}

export function errorState(error) {
  return createUiState({ status: UI_STATUS.ERROR, error });
}

/** Confirmações destrutivas/administrativas devem passar por este contrato. */
export async function confirmAction({ message, confirm = null }) {
  if (!message) throw new Error('message é obrigatório');
  const confirmer = confirm || ((text) => window.confirm(text));
  return Boolean(await confirmer(message));
}
