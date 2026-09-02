const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const usersHtml = fs.readFileSync(path.join(root, 'src', 'pages', 'users.html'), 'utf8');
const settingsPage = fs.readFileSync(path.join(root, 'src', 'js', 'modules', 'settings-page.js'), 'utf8');
const shell = fs.readFileSync(path.join(root, 'src', 'js', 'modules', 'app-shell.js'), 'utf8');
const rules = fs.readFileSync(path.join(root, 'firestore.rules'), 'utf8');

test('funções ministeriais são geridas como item administrativo do grupo Configurações', () => {
  assert.match(shell, /id: 'settings-functions'.*groupId: 'settings'.*groupLabel: 'Configurações'/s);
  assert.match(shell, /id: 'settings-template'.*href: 'module\.html\?section=settings'.*adminOnly: true/s);
  assert.match(shell, /id: 'settings-functions'.*href: 'module\.html\?section=settings&tab=functions'.*adminOnly: true/s);
  assert.doesNotMatch(settingsPage, /data-settings-tab="functions"/);
  assert.match(settingsPage, /<h2 id="functions-title">Funções Ministeriais<\/h2>/);
  assert.match(settingsPage, /Gerencie nome, identificador, ícone, ordem e status das funções usadas no cadastro de pessoas, filtros e templates de escala/);
  assert.match(settingsPage, /MINISTRY_FUNCTION_CREATED/);
  assert.match(settingsPage, /MINISTRY_FUNCTION_UPDATED/);
  assert.match(settingsPage, /MINISTRY_FUNCTION_REACTIVATED/);
  assert.match(settingsPage, /MINISTRY_FUNCTION_DEACTIVATED/);
  assert.match(settingsPage, /MINISTRY_FUNCTIONS_REORDERED/);
  assert.match(settingsPage, /data-function-action="up"/);
  assert.match(settingsPage, /data-function-action="down"/);
  assert.match(settingsPage, /Os vínculos históricos serão preservados/);
});

test('tela de usuários mantém apenas vínculo pessoa-função e não expõe gestão do catálogo', () => {
  assert.match(usersHtml, /id="manage-functions"[^>]*hidden/);
  assert.match(usersHtml, /O catálogo de funções é gerenciado em Configurações/);
});

test('Firestore mantém catálogo ministerial separado dos vínculos e restringe gestão a administradores', () => {
  assert.match(rules, /match \/ministryFunctions\/\{documentId\}/);
  assert.match(rules, /allow write: if isAdmin\(\)/);
  assert.match(rules, /match \/userFunctions\/\{documentId\}/);
  assert.match(rules, /allow write: if canEdit\('users'\)/);
});
