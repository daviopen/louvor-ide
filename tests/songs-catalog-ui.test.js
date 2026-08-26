const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../src/pages/consultar.html'), 'utf8');
const pageJs = fs.readFileSync(path.join(__dirname, '../src/js/pages/consulta.js'), 'utf8');
const serviceJs = fs.readFileSync(path.join(__dirname, '../src/js/modules/music-service.js'), 'utf8');

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

  assert.match(pageJs, /musicService\.filterCatalog\(this\.allSongs, this\.currentFilters\(\)\)/);
  assert.match(serviceJs, /filterCatalog\(musics, filters = \{\}\)/);
  assert.match(serviceJs, /&& \(!normalizedFilters\.artist/);
  assert.match(serviceJs, /&& \(!normalizedFilters\.minister/);
  assert.match(serviceJs, /&& \(!normalizedFilters\.key/);
  assert.match(serviceJs, /&& \(!normalizedFilters\.theme/);
});

test('busca textual do catálogo considera o nome da música', () => {
  assert.match(serviceJs, /const title = this\.normalizeCatalogValue\(song\?\.titulo \?\? song\?\.title\)/);
  assert.match(serviceJs, /!normalizedFilters\.search \|\| title\.includes\(normalizedFilters\.search\)/);
});

test('filtros e paginação pertencem ao MusicService, não à UI', () => {
  assert.match(serviceJs, /getCatalogOptions\(musics\)/);
  assert.match(serviceJs, /paginateCatalog\(musics, page = 1, pageSize = 10\)/);
  assert.match(pageJs, /musicService\.getCatalogOptions\(this\.allSongs\)/);
  assert.match(pageJs, /musicService\.paginateCatalog\(this\.filteredSongs, this\.page, PAGE_SIZE\)/);
  assert.doesNotMatch(pageJs, /function matchesFilters/);
});

test('catálogo possui paginação, contagem e empty state contextual', () => {
  assert.match(pageJs, /const PAGE_SIZE = 10/);
  assert.match(html, /id="songs-pagination"/);
  assert.match(html, /id="songs-prev-page"/);
  assert.match(html, /id="songs-next-page"/);
  assert.match(serviceJs, /Math\.ceil\(source\.length \/ safePageSize\)/);
  assert.match(pageJs, /Nenhuma música encontrada/);
  assert.match(pageJs, /Nenhuma música cadastrada/);
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
