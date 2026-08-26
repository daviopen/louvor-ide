const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'src', 'pages', 'users.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'src', 'js', 'modules', 'users-page.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src', 'styles', 'users.css'), 'utf8');

test('usuários carrega Button/Input oficiais e mantém CSS da feature por último', () => {
  assert.match(html, /styles\/button\.css/);
  assert.match(html, /styles\/input\.css/);
  assert.match(html, /<body class="users-screen">/);
  const themeIndex = html.indexOf('../css/music-ide-theme.css');
  const usersIndex = html.indexOf('../styles/users.css');
  assert.ok(themeIndex >= 0 && usersIndex > themeIndex);
});

test('criação e edição usam campos responsivos e senha usa redefinição por e-mail', () => {
  assert.match(html, /class="ide-field"/);
  assert.match(html, /class="users-fieldset full"/);
  assert.match(html, /Firebase Authentication gera o UID automaticamente/);
  assert.doesNotMatch(html, /id="password-dialog"/);
  assert.doesNotMatch(html, /id="user-password"/);
  assert.match(js, />Redefinir senha<\/button>/);
  assert.match(js, /service\.sendPasswordReset\(button\.dataset\.email, button\.dataset\.id\)/);
  assert.match(html, /Função ministerial não concede permissão administrativa/);
  assert.match(css, /\.users-form-grid>\.ide-field[^{]*\{display:grid/);
  assert.match(css, /\.users-form-grid\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /@media\(max-width:768px\)[\s\S]*\.users-form-grid\{grid-template-columns:1fr\}/);
});

test('consulta vira cards no mobile e contraste depende dos tokens do tema', () => {
  assert.match(css, /body\.users-screen\{background:var\(--ide-background\)!important\}/);
  assert.match(css, /\.users-chips \.ide-badge\{[^}]*background:var\(--ide-surface-secondary\);color:var\(--ide-text-primary\)/);
  assert.match(css, /td\.users-actions\{display:grid!important;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /content:"Funções"/);
  assert.match(css, /content:"Status"/);
  assert.match(css, /content:"Último acesso"/);
  assert.match(css, /:root\[data-theme="dark"\][^{]*[\s\S]*color:var\(--ide-primary\)/);
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b/i);
});

test('mobile não extrapola a viewport e mantém ações compactas em duas colunas', () => {
  assert.match(css, /\.users-page\{box-sizing:border-box;width:100%;max-width:1360px;min-width:0/);
  assert.match(css, /@media\(max-width:768px\)[\s\S]*\.users-table tbody tr\{box-sizing:border-box;display:block;width:100%;min-width:0/);
  assert.match(css, /@media\(max-width:768px\)[\s\S]*\.users-actions \.ide-button\{width:100%;min-height:36px/);
  assert.match(css, /@media\(max-width:560px\)[\s\S]*td\.users-actions\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}/);
  assert.doesNotMatch(css, /@media\(max-width:560px\)[\s\S]*td\.users-actions\{grid-template-columns:1fr\}/);
});
