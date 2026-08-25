const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'src', 'pages', 'users.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src', 'styles', 'users-theme.css'), 'utf8');

test('tela de usuários carrega override de contraste após o CSS principal da feature', () => {
  const usersIndex = html.indexOf('../styles/users.css');
  const themeIndex = html.indexOf('../styles/users-theme.css');
  assert.ok(usersIndex >= 0 && themeIndex > usersIndex);
});

test('status ativo possui contraste dedicado no tema escuro sem cores soltas', () => {
  assert.match(css, /:root\[data-theme="dark"\] body\.users-screen/);
  assert.match(css, /\.ide-badge--success/);
  assert.match(css, /color: var\(--ide-color-success-100\)/);
  assert.match(css, /background: color-mix\(in srgb, var\(--ide-success\) 52%, var\(--ide-surface\)\)/);
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b/i);
});
