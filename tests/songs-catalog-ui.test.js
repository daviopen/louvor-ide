const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../src/pages/consultar.html'), 'utf8');
const js = fs.readFileSync(path.join(__dirname, '../src/js/pages/consulta.js'), 'utf8');

test('catálogo expõe busca, filtros combináveis, limpar filtros e contador', () => {
  for (const id of [
    'song-search',
    'song-artist-filter',
    'song-minister-filter',
    'song-key-filter',
    'song-theme-filter',
    'songs-clear-filters',
    'songs-result-count'
  ]) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }

  assert.match(js, /matchesFilters\(song, filters\)/);
  assert.match(js, /&& \(!filters\.artist/);
  assert.match(js, /&& \(!filters\.minister/);
  assert.match(js, /&& \(!filters\.key/);
  assert.match(js, /&& \(!filters\.theme/);
});

test('busca textual do catálogo considera o nome da música', () => {
  assert.match(js, /const title = normalize\(song\?\.titulo \?\? song\?\.title\)/);
  assert.match(js, /!filters\.search \|\| title\.includes/);
});

test('catálogo possui paginação, contagem e empty state contextual', () => {
  assert.match(js, /const PAGE_SIZE = 10/);
  assert.match(html, /id="songs-pagination"/);
  assert.match(html, /id="songs-prev-page"/);
  assert.match(html, /id="songs-next-page"/);
  assert.match(js, /Math\.ceil\(this\.filteredSongs\.length \/ PAGE_SIZE\)/);
  assert.match(js, /Nenhuma música encontrada/);
  assert.match(js, /Nenhuma música cadastrada/);
});

test('layout do catálogo contempla breakpoint mobile', () => {
  assert.match(html, /@media \(max-width: 600px\)/);
  assert.match(html, /\.songs-filters \{ grid-template-columns: 1fr; \}/);
  assert.match(html, /\.songs-header \{ align-items: stretch; flex-direction: column; \}/);
});

test('submenu e ação de nova música permanecem acessíveis', () => {
  const shell = fs.readFileSync(path.join(__dirname, '../src/js/modules/app-shell.js'), 'utf8');
  assert.match(shell, /label: 'Músicas'/);
  assert.match(shell, /label: 'Consultar', href: 'consultar\.html'/);
  assert.match(html, /href="nova-musica\.html"/);
  assert.match(html, />\s*Nova Música\s*</);
});
