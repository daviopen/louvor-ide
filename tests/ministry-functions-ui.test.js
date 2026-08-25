const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'src', 'pages', 'users.html'), 'utf8');
const page = fs.readFileSync(path.join(root, 'src', 'js', 'modules', 'users-page.js'), 'utf8');
const rules = fs.readFileSync(path.join(root, 'firestore.rules'), 'utf8');

test('módulo de usuários expõe gestão completa de funções ministeriais', () => {
  assert.match(html, /id="manage-functions"/);
  assert.match(html, />\s*Funções ministeriais\s*</);
  assert.match(html, /id="functions-dialog"/);
  assert.match(html, /id="function-form"/);
  assert.match(html, /Funções descrevem onde a pessoa serve no ministério\. Elas não concedem acesso administrativo ao sistema\./);
  assert.match(html, /repositories\/domain-repositories\.js/);
  assert.match(html, /services\/ministry-functions-service\.js/);

  assert.match(page, /ensureDefaultFunctions\(\)/);
  assert.match(page, /createFunction\(/);
  assert.match(page, /updateFunction\(/);
  assert.match(page, /setFunctionActive\(/);
  assert.match(page, /ministryService\.reorder\(/);
  assert.match(page, /data-function-action="up"/);
  assert.match(page, /data-function-action="down"/);
  assert.match(page, /Os vínculos históricos serão preservados/);
});

test('Firestore mantém função ministerial separada de autorização do sistema', () => {
  assert.match(rules, /match \/ministryFunctions\/\{documentId\}/);
  assert.match(rules, /allow write: if isSuperAdmin\(\) \|\| canEdit\('users'\)/);
  assert.match(rules, /match \/userFunctions\/\{documentId\}/);
  assert.match(rules, /allow write: if canEdit\('users'\)/);
});
