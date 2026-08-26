const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', 'src');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

const criticalPages = [
  'pages/login.html',
  'pages/index.html',
  'pages/module.html',
  'pages/consultar.html',
  'pages/setlist.html',
  'pages/users.html'
];

test('páginas críticas declaram idioma e viewport responsivo', () => {
  for (const page of criticalPages) {
    const html = read(page);
    assert.match(html, /<html[^>]+lang="pt-BR"/i, `${page}: lang pt-BR`);
    assert.match(html, /<meta[^>]+name="viewport"[^>]+width=device-width/i, `${page}: viewport`);
  }
});

test('login oferece semântica, labels, feedback assistivo e foco visível', () => {
  const html = read('pages/login.html');
  assert.match(html, /<main\b/i);
  assert.match(html, /<label\s+for="login-email"/i);
  assert.match(html, /<label\s+for="login-password"/i);
  assert.match(html, /id="auth-message"[^>]+role="status"[^>]+aria-live="polite"/i);
  assert.match(html, /:focus-visible/);
  assert.match(html, /prefers-reduced-motion:\s*reduce/);
});

test('controles críticos usam targets móveis adequados e breakpoints explícitos', () => {
  const login = read('pages/login.html');
  const menu = read('styles/main-menu.css');
  const schedules = read('styles/schedules.css');
  const users = read('styles/users.css');

  assert.match(login, /min-height:\s*48px/);
  assert.match(login, /@media\s*\(max-width:\s*760px\)/);
  assert.match(menu, /@media\s*\(max-width:/);
  assert.match(schedules, /@media\s*\(max-width:\s*640px\)/);
  assert.match(users, /@media\s*\(max-width:/);
});

test('tokens de tema mantêm foco e superfícies para claro/escuro', () => {
  const tokens = read('styles/tokens.css');
  const design = read('styles/design-system.css');
  assert.match(tokens, /--ide-focus-ring\s*:/);
  assert.match(tokens, /\[data-theme="dark"\]/);
  assert.match(tokens, /--ide-background\s*:/);
  assert.match(tokens, /--ide-text-primary\s*:/);
  assert.match(design, /:focus-visible/);
});

test('UI crítica evita bloquear zoom do usuário', () => {
  for (const page of criticalPages) {
    const html = read(page);
    assert.doesNotMatch(html, /user-scalable\s*=\s*no/i, `${page}: não deve desabilitar zoom`);
    assert.doesNotMatch(html, /maximum-scale\s*=\s*1(?:\.0+)?(?:["',\s>])/i, `${page}: não deve limitar zoom`);
  }
});
