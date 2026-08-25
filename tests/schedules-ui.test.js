const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const page = fs.readFileSync(path.join(root, 'src/js/modules/schedules-page.js'), 'utf8');
const loader = fs.readFileSync(path.join(root, 'src/js/modules/events-page.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/styles/schedules.css'), 'utf8');

test('módulo de escalas é carregado pela área do sistema sem quebrar Eventos', () => {
  assert.match(loader, /section'\) !== 'schedules'/);
  assert.match(loader, /schedule-repository\.js/);
  assert.match(loader, /schedule-service\.js/);
  assert.match(loader, /schedules-page\.js/);
  assert.match(loader, /service\.create/);
});

test('listagem e edição de escala ficam separadas por scheduleId', () => {
  assert.match(page, /scheduleId: params\.get\('scheduleId'\)/);
  assert.match(page, /Editar escala/);
  assert.match(page, /editorUrl\(schedule\.id\)/);
  assert.match(page, /renderListView/);
  assert.match(page, /renderEditorView/);
  assert.match(page, /Voltar para escalas/);
});

test('seleção normal usa somente elegíveis e um único campo pesquisável por função', () => {
  assert.match(page, /service\.eligibleUsers/);
  assert.match(page, /data-user-combobox/);
  assert.match(page, /<datalist/);
  assert.doesNotMatch(page, /data-user-search/);
  assert.match(page, /data-exception-user/);
  assert.match(page, /override:true/);
  assert.match(page, /motivo da exceção administrativa/i);
});

test('UI possui avatar, status de completude e filtros históricos na listagem', () => {
  assert.match(page, /schedule-avatar/);
  assert.match(page, /Completa/);
  assert.match(page, /Incompleta/);
  assert.match(page, /schedule-filter-person/);
  assert.match(page, /schedule-filter-function/);
  assert.match(page, /schedule-filter-from/);
  assert.match(page, /schedule-filter-to/);
});

test('UI não acessa collections do Firestore diretamente e possui layout mobile', () => {
  assert.doesNotMatch(page, /\.collection\(/);
  assert.match(css, /@media\(max-width:640px\)/);
  assert.match(css, /schedule-summary-card/);
  assert.match(css, /schedule-slot/);
});
