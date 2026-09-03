const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

test('Dashboard não volta a fazer full scan das coleções principais', () => {
  const source = read('src/repositories/dashboard-repository.js');
  assert.doesNotMatch(source, /collection\(['"]events['"]\)\.get\(\)/);
  assert.doesNotMatch(source, /collection\(['"]schedules['"]\)\.get\(\)/);
  assert.doesNotMatch(source, /collection\(['"]setlists['"]\)\.get\(\)/);
  assert.match(source, /listOwnScheduleMembers/);
  assert.match(source, /getSchedulesByIds/);
  assert.match(source, /listSetlistsForTargets/);
});

test('catálogo de músicas não relê users e songMinisterKeys dentro do callback de songs', () => {
  const source = read('src/repositories/music-repository.js');
  const method = source.slice(source.indexOf('async subscribeAllOrderedByTitle'), source.indexOf('async findById'));
  assert.doesNotMatch(method, /listCatalogMinisterAssignments\(/);
  assert.match(method, /ministerKeys\.onSnapshot/);
  assert.match(method, /users\.onSnapshot/);
});

test('DomainRepository oferece paginação e update não força segunda leitura', () => {
  const source = read('src/repositories/domain-repositories.js');
  assert.match(source, /async listPage\(/);
  assert.match(source, /startAfter/);
  assert.match(source, /limit\(pageSize\)/);
  assert.match(source, /return this\.upsert\(id, patch, \{ current \}\)/);
});

test('Audit Log possui janela limitada e teto explícito', () => {
  const source = read('src/repositories/audit-repository.js');
  assert.match(source, /DEFAULT_AUDIT_LIMIT = 100/);
  assert.match(source, /MAX_AUDIT_LIMIT = 250/);
  assert.match(source, /\.limit\(safeLimit\)\.get\(\)/);
});

test('Notification Outbox permanece sem processamento agendado', () => {
  const workflow = path.join(__dirname, '..', '.github/workflows/notification-outbox.yml');
  assert.equal(fs.existsSync(workflow), false);
});

test('budgets de Firestore permanecem documentados', () => {
  const source = read('docs/FIRESTORE_READ_BUDGET.md');
  assert.match(source, /Dashboard \| <= 30/);
  assert.match(source, /Paginação visual/);
  assert.match(source, /Security Rules continuam sendo a autoridade/);
});
