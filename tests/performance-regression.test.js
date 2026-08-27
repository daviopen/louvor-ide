const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('Setlist reutiliza apenas catálogos auxiliares e mantém dados operacionais frescos', () => {
  const source = read('src/repositories/setlist-repository.js');

  assert.match(source, /catalogCache = new Map\(\)/);
  assert.match(source, /catalogRequests = new Map\(\)/);
  assert.match(source, /cachedCatalog\('users'/);
  assert.match(source, /cachedCatalog\('functions'/);
  assert.match(source, /cachedCatalog\('ministerKeys'/);
  assert.match(source, /cachedCatalog\('songs'/);
  assert.match(source, /async getSetlist\(id\) \{ return entity\(await this\.setlists\(\)\.doc\(id\)\.get\(\)\); \}/);
  assert.match(source, /members\(\)\.where\('scheduleId', '==', scheduleId\)\.get\(\)/);
  assert.match(source, /setlistSongs\(\)\.where\('setlistId', '==', setlistId\)\.get\(\)/);
});

test('Permissões evita consultas repetidas e descarta respostas fora de ordem', () => {
  const source = read('src/js/modules/permissions-page.js');

  assert.match(source, /PERMISSION_CACHE_TTL_MS = 30000/);
  assert.match(source, /permissionCache = new Map\(\)/);
  assert.match(source, /permissionRequests = new Map\(\)/);
  assert.match(source, /const version = \+\+selectionVersion/);
  assert.match(source, /if \(version !== selectionVersion\) return/);
  assert.match(source, /invalidatePermissions\(changes\[0\]\.userId\)/);
});

test('Auditoria limita o custo de DOM sem reduzir a fidelidade do conjunto consultado', () => {
  const source = read('src/js/modules/audit-page.js');

  assert.match(source, /RENDER_CHUNK_SIZE = 75/);
  assert.match(source, /createDocumentFragment\(\)/);
  assert.match(source, /allLogs = await repository\.listRecent\(500\)/);
  assert.match(source, /repository\.listFiltered\(filters\(\), allLogs\)/);
  assert.match(source, /audit-load-more/);
});

test('Editor de Setlist aplica debounce e registra métricas de carregamento e renderização', () => {
  const source = read('src/js/pages/setlist-schedule.js');

  assert.match(source, /SEARCH_DEBOUNCE_MS = 140/);
  assert.match(source, /setTimeout\(\(\)=>renderSongResults\(event\.target\.value\),SEARCH_DEBOUNCE_MS\)/);
  assert.match(source, /performance\.setlist\.load/);
  assert.match(source, /performance\.setlist\.render/);
  assert.match(source, /performance\.setlist\.save/);
});
