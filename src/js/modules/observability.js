/**
 * Observabilidade transversal do IDE Music.
 * Logging estruturado, correlation ID, sanitização e captura de falhas críticas.
 */
(function initializeObservability(scope) {
  if (!scope || scope.MusicIdeObservability) return;

  const REDACTED = '[REDACTED]';
  const SENSITIVE_KEY = /(password|passwd|pwd|secret|token|authorization|credential|cookie|session|api[-_]?key|private[-_]?key|access[-_]?token|refresh[-_]?token)/i;
  const MAX_DEPTH = 5;
  const MAX_ARRAY = 30;
  const MAX_CRITICAL_BUFFER = 25;

  function createCorrelationId() {
    if (scope.crypto && typeof scope.crypto.randomUUID === 'function') return scope.crypto.randomUUID();
    return `ide-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function sanitize(value, depth = 0, seen = new WeakSet()) {
    if (value == null || typeof value === 'number' || typeof value === 'boolean') return value;
    if (typeof value === 'string') return value.length > 1000 ? `${value.slice(0, 1000)}…` : value;
    if (typeof value === 'function') return `[Function ${value.name || 'anonymous'}]`;
    if (value instanceof Error) {
      return sanitize({
        name: value.name,
        message: value.message,
        code: value.code,
        stack: value.stack
      }, depth + 1, seen);
    }
    if (depth >= MAX_DEPTH) return '[MaxDepth]';
    if (typeof value !== 'object') return String(value);
    if (seen.has(value)) return '[Circular]';
    seen.add(value);

    if (Array.isArray(value)) return value.slice(0, MAX_ARRAY).map(item => sanitize(item, depth + 1, seen));

    const output = {};
    Object.entries(value).forEach(([key, item]) => {
      output[key] = SENSITIVE_KEY.test(key) ? REDACTED : sanitize(item, depth + 1, seen);
    });
    return output;
  }

  function normalizeError(error) {
    if (!error) return null;
    const safe = sanitize(error);
    return {
      name: safe.name || 'Error',
      code: safe.code || 'UNKNOWN_ERROR',
      message: safe.message || 'Erro sem mensagem técnica.',
      stack: safe.stack || null
    };
  }

  function emit(level, event, message, context = {}, options = {}) {
    const record = {
      timestamp: new Date().toISOString(),
      level,
      event: event || 'application.event',
      message: message || '',
      correlationId: options.correlationId || context.correlationId || createCorrelationId(),
      context: sanitize(context),
      error: normalizeError(options.error || null)
    };

    const consoleMethod = level === 'error' || level === 'critical' ? 'error' : level === 'warn' ? 'warn' : 'info';
    if (scope.console && typeof scope.console[consoleMethod] === 'function') scope.console[consoleMethod]('[IDE Music]', record);
    return record;
  }

  function monitoringEndpoint() {
    const configured = scope.MUSIC_IDE_MONITORING_ENDPOINT;
    return typeof configured === 'string' && /^https:\/\//i.test(configured) ? configured : '';
  }

  function sendCritical(record) {
    const endpoint = monitoringEndpoint();
    if (!endpoint) return false;
    const payload = JSON.stringify(record);
    try {
      if (scope.navigator && typeof scope.navigator.sendBeacon === 'function') {
        return scope.navigator.sendBeacon(endpoint, new Blob([payload], { type: 'application/json' }));
      }
      if (typeof scope.fetch === 'function') {
        scope.fetch(endpoint, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: payload,
          keepalive: true,
          credentials: 'omit'
        }).catch(() => {});
        return true;
      }
    } catch (_) {}
    return false;
  }

  function reportCritical(event, error, context = {}) {
    const record = emit('critical', event, 'Falha crítica capturada.', context, { error });
    const buffer = Array.isArray(scope.__musicIdeCriticalErrors) ? scope.__musicIdeCriticalErrors : [];
    buffer.push(record);
    scope.__musicIdeCriticalErrors = buffer.slice(-MAX_CRITICAL_BUFFER);
    sendCritical(record);
    try {
      scope.dispatchEvent(new CustomEvent('musicIdeCriticalError', { detail: record }));
    } catch (_) {}
    return record;
  }

  function installGlobalErrorMonitoring() {
    if (scope.__musicIdeGlobalErrorMonitoringInstalled) return;
    scope.__musicIdeGlobalErrorMonitoringInstalled = true;

    scope.addEventListener('error', event => {
      reportCritical('window.error', event.error || new Error(event.message || 'Erro global'), {
        source: event.filename || null,
        line: event.lineno || null,
        column: event.colno || null
      });
    });

    scope.addEventListener('unhandledrejection', event => {
      const reason = event.reason instanceof Error ? event.reason : new Error(String(event.reason || 'Promise rejeitada sem tratamento'));
      reportCritical('window.unhandledrejection', reason);
    });
  }

  function userFacingError(error, fallbackMessage = 'Não foi possível concluir a operação. Tente novamente.') {
    return {
      message: error && error.userMessage ? error.userMessage : fallbackMessage,
      code: error && error.code ? error.code : 'UNKNOWN_ERROR',
      correlationId: error && error.correlationId ? error.correlationId : createCorrelationId()
    };
  }

  const api = {
    createCorrelationId,
    sanitize,
    normalizeError,
    userFacingError,
    debug(event, message, context, options) { return emit('debug', event, message, context, options); },
    info(event, message, context, options) { return emit('info', event, message, context, options); },
    warn(event, message, context, options) { return emit('warn', event, message, context, options); },
    error(event, message, context, options) { return emit('error', event, message, context, options); },
    critical: reportCritical,
    installGlobalErrorMonitoring
  };

  scope.MusicIdeObservability = api;
  installGlobalErrorMonitoring();
  api.info('observability.ready', 'Observabilidade inicializada.', { page: scope.location && scope.location.pathname || null });
})(typeof window !== 'undefined' ? window : null);
