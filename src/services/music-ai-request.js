import { MusicAIProviderError } from './music-ai-provider.js';

export const MUSIC_AI_TIMEOUT_MS = 90000;

function timeoutError() {
  return new MusicAIProviderError('TIMEOUT', 'A análise demorou mais que o esperado e foi interrompida. Tente novamente ou continue pelo cadastro manual.');
}

export function assertMusicAIRequest(input = {}) {
  const context = input.requestContext;
  if (context && (context.closed || Date.now() >= context.deadline)) throw timeoutError();
}

/** One deadline covers initialization, retries and optional enrichment. */
export async function runMusicAIRequest(input, work, { timeoutMs = MUSIC_AI_TIMEOUT_MS, child = false } = {}) {
  if (input.requestContext && !child) {
    assertMusicAIRequest(input);
    return work(input);
  }
  const context = {
    deadline: Math.min(Date.now() + timeoutMs, input.requestContext?.deadline ?? Infinity),
    closed: false
  };
  const scoped = {
    ...input,
    requestContext: context,
    onProgress: event => {
      if (!context.closed && Date.now() < context.deadline) input.onProgress?.(event);
    }
  };
  let timer;
  try {
    return await Promise.race([
      Promise.resolve().then(() => { assertMusicAIRequest(scoped); return work(scoped); }),
      new Promise((_, reject) => {
        timer = setTimeout(() => { context.closed = true; reject(timeoutError()); }, Math.max(0, context.deadline - Date.now()));
      })
    ]);
  } finally {
    clearTimeout(timer);
    context.closed = true;
  }
}
