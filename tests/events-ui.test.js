const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'src/pages/module.html'), 'utf8');
const page = fs.readFileSync(path.join(root, 'src/js/modules/events-page.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/styles/events.css'), 'utf8');
const filterPanel = fs.readFileSync(path.join(root, 'src/js/modules/filter-panel.js'), 'utf8');
const repository = fs.readFileSync(path.join(root, 'src/repositories/event-repository.js'), 'utf8');

test('módulo de eventos expõe CRUD, todos os campos e ciclo de status', () => {
  assert.match(html, /id="events-content"[^>]*hidden/);
  assert.match(html, /id="event-name"[^>]*required/);
  assert.match(html, /id="event-date"[^>]*required/);
  assert.match(html, /id="event-time"/);
  assert.match(html, /id="event-description"[^>]*maxlength="1000"/);
  assert.match(html, /id="event-location"/);
  assert.match(html, /id="event-theme"/);
  assert.match(html, /value="PLANNED"/);
  assert.match(html, /value="CONFIRMED"/);
  assert.match(html, /value="COMPLETED"/);
  assert.match(html, /value="CANCELLED"/);
});

test('UI usa service e não acessa Firestore diretamente', () => {
  assert.match(page, /service\.create/);
  assert.match(page, /service\.update/);
  assert.match(page, /service\.changeStatus/);
  assert.match(page, /service\.remove/);
  assert.doesNotMatch(page, /\.collection\(/);
});

test('lista não expõe IDs técnicos de escala/setlist e oferece filtro por intervalo de datas', () => {
  assert.doesNotMatch(page, /Escala:\s*\$\{escapeHtml\(item\.scheduleId/);
  assert.doesNotMatch(page, /Setlist:\s*\$\{escapeHtml\(item\.setlistId/);
  assert.match(page, /id="events-date-from"/);
  assert.match(page, /id="events-date-to"/);
  assert.match(page, /state\.dateFrom/);
  assert.match(page, /state\.dateTo/);
  assert.match(page, /itemDate < state\.dateFrom/);
  assert.match(page, /itemDate > state\.dateTo/);
});

test('repository cria evento, escala e Setlist em transação idempotente e audita', () => {
  assert.match(repository, /runTransaction/);
  assert.match(repository, /eventDocumentId\(requestId\)/);
  assert.match(repository, /scheduleDocumentId\(eventId\)/);
  assert.match(repository, /setlistDocumentId\(eventId\)/);
  assert.match(repository, /transaction\.set\(eventRef/);
  assert.match(repository, /transaction\.set\(scheduleRef/);
  assert.match(repository, /transaction\.set\(setlistRef/);
  assert.match(repository, /auditLogs/);
});

test('layout de eventos respeita rota oculta, alinha controles e possui tratamento responsivo', () => {
  assert.match(css, /\.events-page\[hidden\]\{display:none!important\}/);
  assert.match(css, /\.events-page\{[^}]*max-width:100%[^}]*box-sizing:border-box/);
  assert.match(css, /\.events-page>\*\{min-width:0\}/);
  assert.match(css, /\.events-toolbar\{display:grid/);
  assert.match(css, /height:44px/);
  assert.match(css, /\.events-item\{[^}]*align-items:center/);
  assert.match(css, /\.events-item-actions\{[^}]*align-items:center/);
  assert.match(css, /@media\(max-width:700px\)/);
  assert.match(css, /grid-template-columns:minmax\(0,1fr\)/);
  assert.match(css, /@media\(max-width:420px\)/);
});

test('painéis de filtro sempre iniciam fechados e só abrem após ação do usuário', () => {
  assert.match(filterPanel, /panel\.open = false/);
  assert.doesNotMatch(filterPanel, /localStorage/);
  assert.doesNotMatch(filterPanel, /matchMedia/);
});
