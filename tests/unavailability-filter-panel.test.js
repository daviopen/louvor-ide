const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'src/pages/module.html'), 'utf8');
const adapter = fs.readFileSync(path.join(root, 'src/features/unavailability/filter-panel-standard.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/styles/unavailability-filter-panel.css'), 'utf8');

test('indisponibilidade usa o mesmo painel recolhível de filtros do design system', () => {
  assert.match(html, /id="unavailability-filter-panel" class="ide-filter-panel" data-filter-panel="unavailability"/);
  assert.match(html, /ide-filter-panel__summary-main/);
  assert.match(html, /ide-filter-panel__badge/);
  assert.match(html, /ide-filter-panel__state/);
  assert.match(html, /id="admin-user-filter"[^>]*data-filter-neutral="ALL"/);
  assert.match(html, /id="unavailability-clear-filters"[^>]*ide-button--ghost/);
});

test('filtros mensais injetados são movidos para o painel padrão sem estilo inline', () => {
  assert.match(adapter, /unavailability-month-filter/);
  assert.match(adapter, /group\.className = 'unavailability-date-filter-group'/);
  assert.match(adapter, /group\.removeAttribute\('style'\)/);
  assert.match(adapter, /grid\.insertBefore\(group, clearButton \|\| null\)/);
  assert.match(adapter, /MutationObserver/);
});

test('limpar filtros reutiliza eventos existentes e atualiza o contador do painel', () => {
  assert.match(adapter, /person\.value = 'ALL'/);
  assert.match(adapter, /month\.value = ''/);
  assert.match(adapter, /from\.value = ''/);
  assert.match(adapter, /to\.value = ''/);
  assert.match(adapter, /dispatchChange\(person\)/);
  assert.match(adapter, /MusicIdeFilterPanels\.updatePanel/);
});

test('layout dos filtros é responsivo e usa tokens do design system', () => {
  assert.match(css, /grid-template-columns: repeat\(auto-fit, minmax\(150px, 1fr\)\)/);
  assert.match(css, /var\(--ide-space-3\)/);
  assert.match(css, /\.unavailability-date-filter-group\s*\{\s*display: contents;/);
  assert.match(css, /@media \(max-width: 700px\)/);
  assert.match(css, /\.unavailability-clear-filters/);
});
