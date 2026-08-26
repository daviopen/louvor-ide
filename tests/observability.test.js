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
