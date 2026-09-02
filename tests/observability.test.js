const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/js/modules/observability.js'), 'utf8');

function createScope() {
  const listeners = new Map();
  const scope = {
    location: { pathname: '/index.html' },
    console: { info() {}, warn() {}, error() {} },
    crypto: { randomUUID: () => 'test-correlation-id' },
    navigator: {},
    addEventListener(name, handler) { listeners.set(name, handler); },
    dispatchEvent() {},
    CustomEvent: function CustomEvent(name, init) { this.type = name; this.detail = init && init.detail; }
  };
  scope.window = scope;
  return { scope, listeners };
}

function createWatchdogScope() {
  const { scope, listeners } = createScope();
  const ids = new Map();
  const rootClasses = new Set(['auth-pending']);
  let scheduled = null;
  let reloads = 0;
  let replacedWith = null;

  function makeNode(tagName) {
    const nodeListeners = new Map();
    const node = {
      tagName,
      id: '',
      type: '',
      textContent: '',
      style: { cssText: '' },
      children: [],
      setAttribute() {},
      addEventListener(name, handler) { nodeListeners.set(name, handler); },
      append(...children) { this.children.push(...children); },
      appendChild(child) { this.children.push(child); return child; },
      remove() { if (this.id) ids.delete(this.id); },
      trigger(name) { const handler = nodeListeners.get(name); if (handler) handler({ target: this }); }
    };
    return node;
  }

  const documentElement = makeNode('html');
  documentElement.classList = {
    contains(name) { return rootClasses.has(name); },
    add(name) { rootClasses.add(name); },
    remove(name) { rootClasses.delete(name); }
  };
  documentElement.appendChild = child => {
    documentElement.children.push(child);
    if (child.id) ids.set(child.id, child);
    return child;
  };

  scope.document = {
    documentElement,
    createElement: makeNode,
    getElementById(id) { return ids.get(id) || null; },
    querySelector() { return null; },
    head: { appendChild() {} }
  };
  scope.setTimeout = callback => { scheduled = callback; return 1; };
  scope.clearTimeout = () => { scheduled = null; };
  scope.location = {
    pathname: '/module.html',
    search: '?section=schedules',
    hash: '',
    reload() { reloads += 1; },
    replace(value) { replacedWith = value; }
  };
  scope.sessionStorage = {
    values: new Map(),
    setItem(key, value) { this.values.set(key, value); },
    getItem(key) { return this.values.get(key) || null; }
  };

  return {
    scope,
    listeners,
    runTimer() { if (scheduled) scheduled(); },
    removePending() { rootClasses.delete('auth-pending'); },
    getRecovery() { return ids.get('music-ide-auth-recovery') || null; },
    getReloads() { return reloads; },
    getReplacedWith() { return replacedWith; }
  };
}

function loadObservability() {
  const { scope, listeners } = createScope();
  vm.runInNewContext(source, scope, { filename: 'observability.js' });
  return { api: scope.MusicIdeObservability, scope, listeners };
}

test('observability exposes structured logging and correlation IDs', () => {
  const { api } = loadObservability();
  assert.equal(api.createCorrelationId(), 'test-correlation-id');
  const record = api.info('test.event', 'ok', { feature: 'tests' });
  assert.equal(record.level, 'info');
  assert.equal(record.event, 'test.event');
  assert.equal(record.correlationId, 'test-correlation-id');
  assert.equal(record.context.feature, 'tests');
  assert.match(record.timestamp, /^\d{4}-\d{2}-\d{2}T/);
});

test('observability redacts sensitive fields recursively', () => {
  const { api } = loadObservability();
  const sanitized = api.sanitize({
    user: 'musician',
    password: 'secret-value',
    nested: { accessToken: 'abc', safe: 'visible' },
    authorization: 'Bearer abc'
  });
  assert.equal(sanitized.user, 'musician');
  assert.equal(sanitized.password, '[REDACTED]');
  assert.equal(sanitized.nested.accessToken, '[REDACTED]');
  assert.equal(sanitized.nested.safe, 'visible');
  assert.equal(sanitized.authorization, '[REDACTED]');
});

test('user-facing errors never reuse raw technical message by default', () => {
  const { api } = loadObservability();
  const result = api.userFacingError({ code: 'permission-denied', message: 'Firestore internal detail' });
  assert.equal(result.message, 'Não foi possível concluir a operação. Tente novamente.');
  assert.equal(result.code, 'permission-denied');
  assert.equal(result.correlationId, 'test-correlation-id');
});

test('global critical monitoring captures window and promise failures', () => {
  const { scope, listeners } = loadObservability();
  assert.equal(typeof listeners.get('error'), 'function');
  assert.equal(typeof listeners.get('unhandledrejection'), 'function');
  listeners.get('error')({ message: 'boom', filename: 'app.js', lineno: 12, colno: 3 });
  assert.equal(scope.__musicIdeCriticalErrors.length, 1);
  assert.equal(scope.__musicIdeCriticalErrors[0].event, 'window.error');
  assert.equal(scope.__musicIdeCriticalErrors[0].level, 'critical');
});

test('auth watchdog replaces an indefinitely hidden page with recovery actions', () => {
  const harness = createWatchdogScope();
  vm.runInNewContext(source, harness.scope, { filename: 'observability.js' });

  harness.runTimer();
  const recovery = harness.getRecovery();
  assert.ok(recovery, 'recovery overlay must be rendered after auth timeout');
  const card = recovery.children[0];
  const actions = card.children[2];
  const retry = actions.children[0];
  const login = actions.children[1];

  retry.trigger('click');
  assert.equal(harness.getReloads(), 1);

  login.trigger('click');
  assert.equal(harness.getReplacedWith(), 'login.html');
  assert.equal(harness.scope.sessionStorage.getItem('musicIdeReturnUrl'), 'module.html?section=schedules');
});

test('auth watchdog does not show recovery when auth-pending has already finished', () => {
  const harness = createWatchdogScope();
  vm.runInNewContext(source, harness.scope, { filename: 'observability.js' });
  harness.removePending();
  harness.runTimer();
  assert.equal(harness.getRecovery(), null);
});

test('app shell bootstraps the observability module', () => {
  const shell = fs.readFileSync(path.join(root, 'src/js/modules/app-shell.js'), 'utf8');
  assert.match(shell, /initializeObservability/);
  assert.match(shell, /observability\.js\?v=20260825-observability/);
  assert.match(shell, /data-ide-observability/);
});

test('AppError separates UI-safe and technical messages', () => {
  const appError = fs.readFileSync(path.join(root, 'src/core/app-error.js'), 'utf8');
  assert.match(appError, /userMessage/);
  assert.match(appError, /technicalMessage/);
  assert.match(appError, /correlationId/);
  assert.doesNotMatch(appError, /error\?\.message \|\| fallbackMessage/);
});
