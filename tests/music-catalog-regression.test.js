const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('music catalog uses the canonical IDE design tokens', () => {
  const html = read('src/pages/consultar.html');

  assert.match(html, /var\(--ide-background\)/);
  assert.match(html, /var\(--ide-surface\)/);
  assert.match(html, /var\(--ide-border\)/);
  assert.match(html, /var\(--ide-space-6\)/);
  assert.doesNotMatch(html, /var\(--color-/);
  assert.doesNotMatch(html, /var\(--space-/);
  assert.doesNotMatch(html, /var\(--radius-/);
});

test('music catalog waits for authenticated profile before Firestore subscription', () => {
  const source = read('src/js/pages/consulta.js');

  assert.match(source, /musicIdeAuthReady/);
  assert.match(source, /currentMusicIdeProfile/);
  assert.match(source, /profile\?\.active === true/);
  assert.match(source, /LOAD_TIMEOUT_MS/);
  assert.match(source, /showLoadError/);
});

test('music catalog usa o primeiro snapshot em tempo real sem leitura completa duplicada', () => {
  const pageSource = read('src/js/pages/consulta.js');
  const serviceSource = read('src/js/modules/music-service.js');

  assert.doesNotMatch(pageSource, /await musicService\.getAllMusicsArray\(\)/);
  assert.doesNotMatch(pageSource, /this\.consumeSongs\(initialSongs\)/);
  assert.match(pageSource, /musicService\.loadAllMusics\(/);
  assert.match(pageSource, /SEARCH_DEBOUNCE_MS\s*=\s*160/);
  assert.match(serviceSource, /loadAllMusics\(callback, onError = null\)/);
  assert.match(serviceSource, /subscribeAllOrderedByTitle\(callback, onError\)/);
});

test('music repository reads only canonical songs after production migration', () => {
  const source = read('src/repositories/music-repository.js');

  assert.match(source, /COLLECTIONS\.SONGS/);
  assert.match(source, /canonical\.onSnapshot/);
  assert.doesNotMatch(source, /legacyCollectionName|legacy\.onSnapshot|COLLECTIONS\.MUSICS|['"]musicas['"]/);
  assert.doesNotMatch(source, /canonical\.orderBy\('titulo'\)/);
  assert.match(source, /data\?\.titulo \|\| data\?\.title \|\| data\?\.nome \|\| data\?\.name/);
});
