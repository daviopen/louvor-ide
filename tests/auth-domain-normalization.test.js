const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizeAuthDomainSource } = require('../src/scripts/normalize-auth-domain');

test('troca authDomain firebaseapp.com pelo domínio web.app da aplicação', () => {
  const source = `window.ENV = {\n  VITE_FIREBASE_API_KEY: 'abc',\n  VITE_FIREBASE_AUTH_DOMAIN: 'louvor-ide.firebaseapp.com',\n  VITE_FIREBASE_PROJECT_ID: 'louvor-ide'\n};\n`;
  const output = normalizeAuthDomainSource(source, 'louvor-ide.web.app');

  assert.match(output, /VITE_FIREBASE_AUTH_DOMAIN: 'louvor-ide\.web\.app'/);
  assert.doesNotMatch(output, /louvor-ide\.firebaseapp\.com/);
  assert.match(output, /VITE_FIREBASE_API_KEY: 'abc'/);
});

test('aceita URL HTTPS e guarda somente hostname', () => {
  const source = `window.ENV = { VITE_FIREBASE_AUTH_DOMAIN: 'old.firebaseapp.com' };`;
  const output = normalizeAuthDomainSource(source, 'https://louvor-ide.web.app/');
  assert.match(output, /VITE_FIREBASE_AUTH_DOMAIN: 'louvor-ide\.web\.app'/);
});

test('falha de forma explícita se o env-config não tiver authDomain', () => {
  assert.throws(
    () => normalizeAuthDomainSource(`window.ENV = { VITE_FIREBASE_PROJECT_ID: 'louvor-ide' };`, 'louvor-ide.web.app'),
    /VITE_FIREBASE_AUTH_DOMAIN não encontrado/
  );
});

test('rejeita domínio inválido', () => {
  const source = `window.ENV = { VITE_FIREBASE_AUTH_DOMAIN: 'old.firebaseapp.com' };`;
  assert.throws(() => normalizeAuthDomainSource(source, 'javascript:alert(1)'), /authDomain inválido/);
});
