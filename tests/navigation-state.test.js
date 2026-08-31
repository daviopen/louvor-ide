const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const filterPanelSource = fs.readFileSync(path.join(__dirname, '../src/js/modules/filter-panel.js'), 'utf8');
const schedulesSource = fs.readFileSync(path.join(__dirname, '../src/js/modules/schedules-page.js'), 'utf8');
const setlistsSource = fs.readFileSync(path.join(__dirname, '../src/js/pages/setlists-simple.js'), 'utf8');
const songsSource = fs.readFileSync(path.join(__dirname, '../src/js/pages/consulta.js'), 'utf8');
const songFormSource = fs.readFileSync(path.join(__dirname, '../src/js/pages/song-form.js'), 'utf8');

function navigationHarness(href = 'https://louvor-ide.web.app/module.html?section=schedules') {
  const locationUrl = new URL(href);
  const location = {
    href: locationUrl.href,
    origin: locationUrl.origin,
    pathname: locationUrl.pathname,
    search: locationUrl.search,
    hash: locationUrl.hash
  };
  const storage = new Map();
  const document = {
    readyState: 'complete',
    querySelectorAll() { return []; }
  };
  const history = {
    state: null,
    replaceState(state, _title, next) {
      this.state = state;
      const updated = new URL(next, location.href);
      location.href = updated.href;
      location.origin = updated.origin;
      location.pathname = updated.pathname;
      location.search = updated.search;
      location.hash = updated.hash;
    }
  };
  const window = {
    document,
    location,
    history,
    sessionStorage: {
      setItem(key, value) { storage.set(key, String(value)); },
      getItem(key) { return storage.get(key) ?? null; }
    }
  };

  vm.runInNewContext(filterPanelSource, { window, URL, URLSearchParams });
  return { navigation: window.MusicIdeNavigationState, location, storage };
}

test('navigation state only accepts same-app return targets', () => {
  const { navigation } = navigationHarness();
  assert.equal(navigation.safeRelativeUrl('setlists.html?view=history&page=2'), 'setlists.html?view=history&page=2');
  assert.equal(navigation.safeRelativeUrl('https://evil.example/steal'), '');
  assert.equal(navigation.safeRelativeUrl('//evil.example/steal'), '');
});

test('returnTo carries the complete filtered list URL without navigation', () => {
  const { navigation } = navigationHarness('https://louvor-ide.web.app/setlists.html?view=history&minister=Ana&page=3');
  const target = navigation.withReturnTo('setlist.html?id=setlist_1');
  const parsed = new URL(target, 'https://louvor-ide.web.app/');
  assert.equal(parsed.pathname, '/setlist.html');
  assert.equal(parsed.searchParams.get('id'), 'setlist_1');
  assert.equal(parsed.searchParams.get('returnTo'), 'setlists.html?view=history&minister=Ana&page=3');
});

test('replaceQuery updates state with history.replaceState and preserves route params', () => {
  const { navigation, location } = navigationHarness('https://louvor-ide.web.app/module.html?section=schedules');
  navigation.replaceQuery({ q: 'culto', person: 'u1', sort: 'DATE_ASC', page: 1 }, { sort: 'DATE_ASC', page: '1' });
  const params = new URLSearchParams(location.search);
  assert.equal(params.get('section'), 'schedules');
  assert.equal(params.get('q'), 'culto');
  assert.equal(params.get('person'), 'u1');
  assert.equal(params.has('sort'), false);
  assert.equal(params.has('page'), false);
});

test('session fallback restores the last list when returnTo is absent', () => {
  const { navigation, location } = navigationHarness('https://louvor-ide.web.app/setlists.html?view=history&page=4');
  navigation.remember('setlists');
  const editor = new URL('https://louvor-ide.web.app/setlist.html?id=abc');
  location.href = editor.href;
  location.pathname = editor.pathname;
  location.search = editor.search;
  location.hash = editor.hash;
  assert.equal(navigation.resolveReturnUrl('setlists.html?view=upcoming', 'setlists'), 'setlists.html?view=history&page=4');
});

test('schedules serialize filters before opening the editor', () => {
  assert.match(schedulesSource, /params\.get\('q'\)/);
  assert.match(schedulesSource, /navigation\.replaceQuery/);
  assert.match(schedulesSource, /navigation\.remember\('schedules'/);
  assert.match(schedulesSource, /navigation\.withReturnTo\(target\)/);
  assert.match(schedulesSource, /navigation\.resolveReturnUrl\('module\.html\?section=schedules', 'schedules'\)/);
});

test('setlists preserve combined filters and history pagination', () => {
  assert.match(setlistsSource, /initialParams\.get\('page'\)/);
  assert.match(setlistsSource, /restoreState\(\)/);
  assert.match(setlistsSource, /page:state\.view==='history'\?state\.page:1/);
  assert.match(setlistsSource, /navigation\.remember\('setlists',href\)/);
  assert.match(setlistsSource, /nav\?nav\.withReturnTo\(editTarget\):editTarget/);
});

test('song catalog preserves filters, page and selected song around edit', () => {
  assert.match(songsSource, /params\.get\('page'\)/);
  assert.match(songsSource, /params\.get\('song'\)/);
  assert.match(songsSource, /syncNavigationState\(\)/);
  assert.match(songsSource, /navigation\.remember\('songs', href\)/);
  assert.match(songsSource, /navigation \? navigation\.withReturnTo\(editTarget\) : editTarget/);
  assert.match(songFormSource, /navigation\.resolveReturnUrl\('consultar\.html', 'songs'\)/);
  assert.match(songFormSource, /location\.href = returnUrl\(\)/);
});