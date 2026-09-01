const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'src/pages/module.html'), 'utf8');
const page = fs.readFileSync(path.join(root, 'src/js/modules/unavailability-page.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/styles/unavailability-filter-panel.css'), 'utf8');
const repository = fs.readFileSync(path.join(root, 'src/repositories/unavailability-repository.js'), 'utf8');

test('indisponibilidade usa painel padrão com pessoa e mês, sem filtros de data soltos', () => {
  assert.match(html, /id="unavailability-filter-panel" class="ide-filter-panel" data-filter-panel="unavailability"/);
  assert.match(html, /id="admin-user-filter"[^>]*data-filter-neutral="ALL"/);
  assert.match(html, /id="unavailability-month-filter"[^>]*data-filter-neutral=""/);
  assert.match(html, /id="unavailability-clear-filters"[^>]*ide-button--ghost/);
  assert.doesNotMatch(html, /id="unavailability-filter-from"/);
  assert.doesNotMatch(html, /id="unavailability-filter-to"/);
  assert.doesNotMatch(html, /features\/unavailability\/filter-panel-standard\.js/);
});

test('lista de mês é derivada das indisponibilidades e sincroniza o calendário', () => {
  assert.match(page, /function monthKeysWithRecords\(records\)/);
  assert.match(page, /recordOverlapsMonth\(record, key\)/);
  assert.match(page, /state\.availableMonthKeys = monthKeysWithRecords\(personFilteredRecords\(\)\)/);
  assert.match(page, /state\.filterMonthKey = String\(value \|\| ''\)/);
  assert.match(page, /state\.month = monthFromKey\(state\.filterMonthKey\)/);
  assert.match(page, /renderList\(\);\s*renderCalendar\(\);/);
});

test('setas do calendário continuam disponíveis e navegam entre meses com registros', () => {
  assert.match(html, /id="calendar-prev"/);
  assert.match(html, /id="calendar-next"/);
  assert.match(page, /function navigateCalendar\(direction\)/);
  assert.match(page, /calendar-prev'\)\.addEventListener\('click', \(\) => navigateCalendar\(-1\)\)/);
  assert.match(page, /calendar-next'\)\.addEventListener\('click', \(\) => navigateCalendar\(1\)\)/);
});

test('dias do calendário são clicáveis e abrem popup com pessoas indisponíveis', () => {
  assert.match(html, /id="unavailability-day-dialog"/);
  assert.match(html, /id="unavailability-day-list"/);
  assert.match(page, /data-unavailability-date=/);
  assert.match(page, /function openDayDetails\(key\)/);
  assert.match(page, /personName\(userId\)/);
  assert.match(page, /unavailability-day-dialog/);
  assert.match(css, /\.unavailability-day-person/);
});

test('auditoria de indisponibilidade usa timestamp do servidor exigido pelas Rules', () => {
  assert.match(repository, /FieldValue/);
  assert.match(repository, /serverTimestamp\(\)/);
  assert.match(repository, /const createdAt = this\.serverTimestamp\(\)/);
});
