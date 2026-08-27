const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const page = fs.readFileSync(path.join(root, 'src/js/modules/schedules-page.js'), 'utf8');
const loader = fs.readFileSync(path.join(root, 'src/js/modules/events-page.js'), 'utf8');
const monthlyUi = fs.readFileSync(path.join(root, 'src/js/modules/schedules-monthly-ui.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/styles/schedules.css'), 'utf8');

test('módulo de escalas é carregado pela área do sistema sem quebrar Eventos', () => {
  assert.match(loader, /scheduleSections = new Set/);
  assert.match(loader, /monthlySections = new Set/);
  assert.match(loader, /schedule-repository\.js/);
  assert.match(loader, /schedule-service\.js/);
  assert.match(loader, /schedules-page\.js/);
  assert.match(loader, /schedules-monthly-ui\.js/);
  assert.match(loader, /service\.create/);
});

test('ferramentas mensais permanecem sob a permissão de Escalas', () => {
  assert.match(monthlyUi, /module\.html\?section=schedules&view=\$\{targetView\}/);
  assert.match(monthlyUi, /schedules-export/);
  assert.match(monthlyUi, /schedules-participation/);
  assert.match(monthlyUi, /monthly-export-month/);
  assert.match(monthlyUi, /monthly-participation-month/);
});

test('listagem e edição de escala ficam separadas por scheduleId', () => {
  assert.match(page, /scheduleId: params\.get\('scheduleId'\)/);
  assert.match(page, /Editar escala/);
  assert.match(page, /editorUrl\(schedule\.id\)/);
  assert.match(page, /renderListView/);
  assert.match(page, /renderEditorView/);
  assert.match(page, /Voltar para escalas/);
});

test('seleção normal usa somente elegíveis em modal visual com nome e avatar', () => {
  assert.match(page, /service\.eligibleUsers/);
  assert.match(page, /schedule-person-trigger/);
  assert.match(page, /schedule-person-option/);
  assert.match(page, /renderAvatar/);
  assert.match(page, /data-modal-action=\"select-person\"/);
  assert.match(page, /schedule-person-backdrop/);
  assert.match(page, /aria-modal=\"true\"/);
  assert.doesNotMatch(page, /data-user-combobox/);
  assert.doesNotMatch(page, /<datalist/);
  assert.doesNotMatch(page, /data-exception-user/);
  assert.doesNotMatch(page, /assign-exception/);
  assert.doesNotMatch(page, /Exceção administrativa/);
});

test('modal pode ser cancelado por clique fora, botão fechar ou Esc', () => {
  assert.match(page, /event\.target === backdrop/);
  assert.match(page, /event\.key === 'Escape'/);
  assert.match(page, /data-modal-action=\"close\"/);
  assert.match(page, /function closePersonPicker\(\)/);
});

test('backdrop do seletor permanece fora do layout quando o modal está fechado', () => {
  assert.match(page, /schedule-person-backdrop[^\n]+display:none/);
  assert.match(page, /backdrop\.style\.display = 'none'/);
  assert.match(page, /backdrop\.style\.display='grid'/);
  assert.match(page, /backdrop\.hidden=true;backdrop\.style\.display='none'/);
});

test('seleção e adição atualizam a UI localmente sem reload completo', () => {
  assert.match(page, /assignOptimistic/);
  assert.match(page, /closePersonPicker\(\);\s*renderEditorView\(\)/);
  assert.match(page, /pending_slot_/);
  assert.match(page, /schedule\.members=beforeMembers\.filter/);
  assert.doesNotMatch(page, /toast\('Escala atualizada\.'\);\s*await reload\(\)/);
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
  assert.match(monthlyUi, /schedule-filter-month/);
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
  assert.match(page, /var\(--ide-z-modal,10000\)/);
  assert.match(page, /var\(--ide-shadow-overlay\)/);
});

test('popup possui tratamento para viewport e safe-area mobile', () => {
  assert.match(page, /76dvh/);
  assert.match(page, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /schedule-person-option\{min-height:60px/);
  assert.match(css, /schedule-slot__actions \.ide-button\{min-height:44px/);
});

test('UI não acessa collections do Firestore diretamente', () => {
  assert.doesNotMatch(page, /\.collection\(/);
  assert.doesNotMatch(monthlyUi, /\.collection\(/);
  assert.match(css, /schedule-summary-card/);
  assert.match(css, /schedule-slot/);
});
