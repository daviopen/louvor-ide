const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const moduleHtml = fs.readFileSync(path.join(root, 'src', 'pages', 'module.html'), 'utf8');
const orderModule = fs.readFileSync(path.join(root, 'src', 'js', 'modules', 'function-display-order.js'), 'utf8');
const rules = fs.readFileSync(path.join(root, 'firestore.rules'), 'utf8');

test('ordem de exibição possui tela administrativa dedicada', () => {
  assert.match(moduleHtml, /function-display-order\.js\?v=20260901-display-order/);
  assert.match(orderModule, /tab === 'display-order'/);
  assert.match(orderModule, /Ordem de Exibição/);
  assert.match(orderModule, /Aplicar ordem sugerida/);
  assert.match(orderModule, /Salvar ordem/);
  assert.match(orderModule, /MINISTRY_FUNCTIONS_REORDERED/);
  assert.match(orderModule, /display-order-settings/);
  assert.match(orderModule, /if \(!isAdmin\(profile\)\) \{ scope\.location\.replace\('index\.html'\)/);
});

test('ordem sugerida prioriza ministro e back, instrumentos no meio e DM no fim', () => {
  const ministro = orderModule.indexOf("'ministro'");
  const back = orderModule.indexOf("'back-vocal'");
  const violao = orderModule.indexOf("'violao'");
  const dm = orderModule.indexOf("'dm'");
  assert.ok(ministro >= 0 && back > ministro && violao > back && dm > violao);
  assert.match(orderModule, /labelA === 'dm' \? 9999/);
});

test('exportação usa a ordem persistida em ministryFunctions', () => {
  assert.match(orderModule, /collection\('ministryFunctions'\)\.get\(\)/);
  assert.match(orderModule, /querySelectorAll\('\.weekly-export-team'\)/);
  assert.match(orderModule, /buildRank\(functions\)/);
  assert.match(orderModule, /rows\.sort/);
  assert.match(orderModule, /orderExportTeams\(functions\)/);
});

test('permissão permanece protegida também pelas Firestore Rules', () => {
  assert.match(rules, /match \/ministryFunctions\/\{documentId\}/);
  assert.match(rules, /allow write: if isAdmin\(\)/);
  assert.match(rules, /match \/auditLogs\/\{documentId\}/);
  assert.match(rules, /allow create: if validAuditLogDocument\(\)/);
});
