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
  const AUTH_REVEAL_TIMEOUT_MS = 10000;
  const AUTH_RECOVERY_ID = 'music-ide-auth-recovery';
  const AUTH_RETURN_URL_KEY = 'musicIdeReturnUrl';

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

  function currentReturnUrl() {
    const page = String(scope.location?.pathname || '').split('/').filter(Boolean).pop() || 'index.html';
    return `${page}${scope.location?.search || ''}${scope.location?.hash || ''}`;
  }

  function rememberReturnUrl() {
    try {
      if (scope.sessionStorage) scope.sessionStorage.setItem(AUTH_RETURN_URL_KEY, currentReturnUrl());
    } catch (_) {}
  }

  function removeAuthRecovery() {
    const recovery = scope.document && scope.document.getElementById && scope.document.getElementById(AUTH_RECOVERY_ID);
    if (recovery && typeof recovery.remove === 'function') recovery.remove();
  }

  function createAuthRecovery() {
    if (!scope.document || !scope.document.documentElement || !scope.document.createElement) return null;
    const existing = scope.document.getElementById && scope.document.getElementById(AUTH_RECOVERY_ID);
    if (existing) return existing;

    const recovery = scope.document.createElement('section');
    recovery.id = AUTH_RECOVERY_ID;
    recovery.setAttribute('role', 'alert');
    recovery.setAttribute('aria-live', 'assertive');
    recovery.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;padding:24px;background:#090b0c;color:#f7f8f2;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;box-sizing:border-box;';

    const card = scope.document.createElement('div');
    card.style.cssText = 'width:min(430px,100%);padding:28px 24px;border:1px solid rgba(216,255,69,.35);border-radius:18px;background:#111416;box-shadow:0 18px 60px rgba(0,0,0,.35);text-align:center;';

    const title = scope.document.createElement('h1');
    title.textContent = 'Não foi possível carregar o IDE Music';
    title.style.cssText = 'margin:0 0 12px;font-size:1.25rem;line-height:1.3;color:#f7f8f2;';

    const description = scope.document.createElement('p');
    description.textContent = 'A validação da sessão demorou mais que o esperado. Isso pode acontecer no Safari ou ao abrir o link por outro aplicativo.';
    description.style.cssText = 'margin:0 0 22px;color:#c8ccca;font-size:.95rem;line-height:1.55;';

    const actions = scope.document.createElement('div');
    actions.style.cssText = 'display:grid;gap:10px;';

    const retry = scope.document.createElement('button');
    retry.type = 'button';
    retry.textContent = 'Tentar novamente';
    retry.style.cssText = 'min-height:46px;border:0;border-radius:999px;background:#d8ff45;color:#090b0c;font-weight:800;font-size:.95rem;cursor:pointer;';
    retry.addEventListener('click', () => {
      emit('info', 'auth.recovery.retry', 'Usuário solicitou nova tentativa após timeout de autenticação.', { page: scope.location?.pathname || null });
      if (scope.location && typeof scope.location.reload === 'function') scope.location.reload();
    });

    const login = scope.document.createElement('button');
    login.type = 'button';
    login.textContent = 'Voltar para o login';
    login.style.cssText = 'min-height:46px;border:1px solid rgba(255,255,255,.24);border-radius:999px;background:transparent;color:#f7f8f2;font-weight:700;font-size:.95rem;cursor:pointer;';
    login.addEventListener('click', () => {
      rememberReturnUrl();
      emit('info', 'auth.recovery.login', 'Usuário voltou ao login após timeout de autenticação.', { page: scope.location?.pathname || null });
      if (scope.location && typeof scope.location.replace === 'function') scope.location.replace('login.html');
    });

    actions.append(retry, login);
    card.append(title, description, actions);
    recovery.appendChild(card);
    scope.document.documentElement.appendChild(recovery);
    return recovery;
  }

  function authIsPending() {
    const root = scope.document && scope.document.documentElement;
    return Boolean(root && root.classList && root.classList.contains('auth-pending'));
  }

  function startAuthRevealWatchdog(options = {}) {
    if (!scope.document || !scope.document.documentElement || typeof scope.setTimeout !== 'function') return null;
    if (scope.__musicIdeAuthRevealWatchdog) return scope.__musicIdeAuthRevealWatchdog;

    const timeoutMs = Math.max(1000, Number(options.timeoutMs) || AUTH_REVEAL_TIMEOUT_MS);
    let finished = false;
    let timeoutId = null;

    const clear = () => {
      if (finished) return;
      finished = true;
      if (timeoutId != null && typeof scope.clearTimeout === 'function') scope.clearTimeout(timeoutId);
      removeAuthRecovery();
      scope.__musicIdeAuthRevealWatchdog = null;
    };

    const check = () => {
      if (!authIsPending()) {
        clear();
        return;
      }
      createAuthRecovery();
      emit('error', 'auth.reveal-timeout', 'A tela permaneceu em auth-pending além do limite seguro.', {
        page: scope.location?.pathname || null,
        timeoutMs,
        userAgent: scope.navigator?.userAgent || null
      });
    };

    timeoutId = scope.setTimeout(check, timeoutMs);
    const watchdog = { clear, check, timeoutMs };
    scope.__musicIdeAuthRevealWatchdog = watchdog;

    if (typeof scope.addEventListener === 'function') {
      scope.addEventListener('musicIdeAuthReady', clear, { once: true });
      scope.addEventListener('pageshow', event => {
        if (!event || event.persisted !== true || !authIsPending() || finished) return;
        if (timeoutId != null && typeof scope.clearTimeout === 'function') scope.clearTimeout(timeoutId);
        timeoutId = scope.setTimeout(check, Math.min(timeoutMs, 3000));
      });
    }

    return watchdog;
  }

  function appendEnhancementScript({ marker, src, type = '' }) {
    if (scope.document.querySelector(`script[${marker}]`)) return;
    const script = scope.document.createElement('script');
    script.src = src;
    if (type) script.type = type;
    else script.defer = true;
    script.setAttribute(marker, 'true');
    scope.document.head.appendChild(script);
  }

  function loadPageEnhancement() {
    const page = String(scope.location?.pathname || '').split('/').pop();
    if (page === 'login.html') {
      appendEnhancementScript({
        marker: 'data-ide-pwa-install-guide',
        src: '../js/modules/pwa-install-guide.js?v=20260827-install-guide'
      });
      return;
    }

    if (page === 'consultar.html' || page === 'nova-musica.html') {
      appendEnhancementScript({
        marker: 'data-ide-song-maintenance',
        src: '../js/modules/song-maintenance-enhancement.js?v=20260902-delete-duplicate',
        type: 'module'
      });
    }
  }

  const api = {
    createCorrelationId,
    sanitize,
    normalizeError,
    userFacingError,
    startAuthRevealWatchdog,
    debug(event, message, context, options) { return emit('debug', event, message, context, options); },
    info(event, message, context, options) { return emit('info', event, message, context, options); },
    warn(event, message, context, options) { return emit('warn', event, message, context, options); },
    error(event, message, context, options) { return emit('error', event, message, context, options); },
    critical: reportCritical,
    installGlobalErrorMonitoring
  };

  scope.MusicIdeObservability = api;
  installGlobalErrorMonitoring();
  startAuthRevealWatchdog();
  loadPageEnhancement();
  api.info('observability.ready', 'Observabilidade inicializada.', { page: scope.location && scope.location.pathname || null });
})(typeof window !== 'undefined' ? window : null);