const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

test('authenticated shell loads the complete visual foundation', () => {
  const shell = read('src/js/modules/app-shell.js');
  for (const asset of ['button.css', 'input.css', 'filter-panel.css', 'ui-consistency.css']) {
    assert.match(shell, new RegExp(asset.replace('.', '\\.')));
  }
  assert.match(shell, /initializeFilterPanels/);
  assert.match(shell, /dataset\.tooltip = label/);
});

test('legacy button migration preserves action hierarchy', () => {
  const shell = read('src/js/modules/app-shell.js');
  assert.match(shell, /hasVariant/);
  assert.match(shell, /btn-danger/);
  assert.match(shell, /btn-reset/);
  assert.match(shell, /else node\.classList\.add\('ide-button--secondary'\)/);
  assert.doesNotMatch(shell, /else node\.classList\.add\('ide-button--primary'\)/);
});

test('all filter-heavy screens use the shared expandable panel', () => {
  const sources = [
    read('src/pages/consultar.html'),
    read('src/pages/setlists.html'),
    read('src/pages/users.html'),
    read('src/pages/module.html'),
    read('src/js/modules/schedules-page.js'),
    read('src/js/modules/audit-page.js')
  ];
  for (const source of sources) {
    assert.match(source, /ide-filter-panel/);
    assert.match(source, /data-filter-panel/);
    assert.match(source, /ide-filter-panel__badge/);
  }
});

test('secondary buttons use neutral theme surfaces', () => {
  const css = read('src/styles/button.css');
  assert.match(css, /ide-button--secondary[^\n]+ide-surface-secondary/);
  assert.match(css, /ide-button--ghost[^\n]+transparent/);
  assert.match(read('src/styles/ui-consistency.css'), /ide-button--danger/);
});

test('user-facing icon markup uses the Font Awesome 6 class contract', () => {
  const files = [
    ...fs.readdirSync(path.join(root, 'src/pages')).filter(name => name.endsWith('.html')).map(name => `src/pages/${name}`),
    ...fs.readdirSync(path.join(root, 'src/js/pages')).filter(name => name.endsWith('.js')).map(name => `src/js/pages/${name}`),
    ...fs.readdirSync(path.join(root, 'src/js/modules')).filter(name => name.endsWith('.js')).map(name => `src/js/modules/${name}`)
  ];
  const source = files.map(read).join('\n');
  assert.doesNotMatch(source, /class=["'][^"']*\bfas\b/);
  assert.doesNotMatch(source, /[☰◐↪]/);
});

test('legacy song and setlist views load token-based final overrides', () => {
  const song = read('src/pages/ver.html');
  const setlist = read('src/pages/setlist.html');
  assert.match(song, /song-view\.css/);
  assert.match(setlist, /setlist-editor\.css/);
  assert.match(song, /ide-button--danger/);
  assert.match(setlist, /ide-button--primary/);
  assert.match(read('src/styles/tokens.css'), /--ide-text-on-dark-secondary/);
});
