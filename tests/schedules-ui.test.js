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

test('seleção normal usa somente elegíveis em seletor visual com nome e avatar', () => {
  assert.match(page, /service\.eligibleUsers/);
  assert.match(page, /schedule-person-trigger/);
  assert.match(page, /schedule-person-option/);
  assert.match(page, /renderAvatar/);
  assert.match(page, /data-action=\"select-person\"/);
  assert.doesNotMatch(page, /data-user-combobox/);
  assert.doesNotMatch(page, /<datalist/);
  assert.doesNotMatch(page, /data-exception-user/);
  assert.doesNotMatch(page, /assign-exception/);
  assert.doesNotMatch(page, /Exceção administrativa/);
});

test('funções repetidas recebem numeração e cada perfil possui marcador de cor', () => {
  assert.match(page, /function slotFunctionLabel\(schedule, slot\)/);
  assert.match(page, /matches\.length<=1/);
  assert.match(page, /return `\$\{base\} \$\{position/);
  assert.match(page, /functionColorIndex/);
  assert.match(page, /schedule-function-dot/);
  assert.match(css, /schedule-function-dot--1/);
  assert.match(css, /schedule-function-dot--8/);
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

test('editor possui hierarquia visual, seletor de pessoas e layout mobile', () => {
  assert.match(css, /schedule-editor-card__heading/);
  assert.match(css, /schedule-person-options/);
  assert.match(css, /schedule-person-option__avatar/);
  assert.match(css, /schedule-slot__actions/);
  assert.match(css, /@media\(max-width:640px\)/);
});

test('editor e popup usam tokens semânticos oficiais em claro e escuro', () => {
  assert.match(css, /--background:var\(--ide-background\)/);
  assert.match(css, /background:var\(--ide-background\)/);
  assert.match(css, /background:var\(--ide-surface\)/);
  assert.match(css, /z-index:var\(--ide-z-modal\)/);
  assert.match(css, /var\(--ide-shadow-overlay\)/);
  assert.match(css, /100vmax rgba\(0,0,0,.64\)/);
});

test('popup possui tratamento específico para toque e viewport mobile', () => {
  assert.match(css, /100dvh/);
  assert.match(css, /76dvh/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /schedule-person-option\{min-height:60px/);
  assert.match(css, /schedule-slot__actions \.ide-button\{min-height:44px/);
});

test('UI não acessa collections do Firestore diretamente', () => {
  assert.doesNotMatch(page, /\.collection\(/);
  assert.match(css, /schedule-summary-card/);
  assert.match(css, /schedule-slot/);
});
