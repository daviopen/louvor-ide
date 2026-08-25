const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const auth = require('../src/js/modules/auth-service.js');

const root = path.resolve(__dirname, '..');
const tokens = fs.readFileSync(path.join(root, 'src/styles/tokens.css'), 'utf8');
const themeCss = fs.readFileSync(path.join(root, 'src/css/music-ide-theme.css'), 'utf8');
const designSystemCss = fs.readFileSync(path.join(root, 'src/styles/design-system.css'), 'utf8');
const migrationCss = fs.readFileSync(path.join(root, 'src/styles/legacy-migration.css'), 'utf8');
const pages = ['index.html','consultar.html','nova-musica.html','setlist.html','setlists.html','setlist-view.html','ver.html'];

function createThemeScope({ stored = null, prefersDark = false } = {}) {
  const storage = new Map();
  if (stored !== null) storage.set(auth.THEME_STORAGE_KEY, stored);

  return {
    localStorage: {
      getItem(key) { return storage.has(key) ? storage.get(key) : null; },
      setItem(key, value) { storage.set(key, value); }
    },
    matchMedia() { return { matches: prefersDark }; },
    document: { documentElement: { dataset: {}, style: {} } }
  };
}

test('aceita somente light, dark e system', () => {
  assert.deepEqual(auth.THEME_MODES, ['light', 'dark', 'system']);
  assert.equal(auth.normalizeThemePreference('light'), 'light');
  assert.equal(auth.normalizeThemePreference('dark'), 'dark');
  assert.equal(auth.normalizeThemePreference('system'), 'system');
  assert.equal(auth.normalizeThemePreference('invalido'), 'system');
});

test('system acompanha prefers-color-scheme', () => {
  assert.equal(auth.resolveTheme('system', false), 'light');
  assert.equal(auth.resolveTheme('system', true), 'dark');
  assert.equal(auth.resolveTheme('light', true), 'light');
  assert.equal(auth.resolveTheme('dark', false), 'dark');
});

test('preferência é persistida e aplicada ao documentElement', () => {
  const scope = createThemeScope({ prefersDark: false });
  auth.setThemePreference(scope, 'dark');
  assert.equal(scope.localStorage.getItem(auth.THEME_STORAGE_KEY), 'dark');
  assert.equal(scope.document.documentElement.dataset.theme, 'dark');
  assert.equal(scope.document.documentElement.dataset.themePreference, 'dark');
  assert.equal(scope.document.documentElement.style.colorScheme, 'dark');
});

test('preferência system resolve o tema escuro quando o sistema está escuro', () => {
  const scope = createThemeScope({ stored: 'system', prefersDark: true });
  assert.equal(auth.readThemePreference(scope), 'system');
  assert.equal(auth.applyTheme(scope, auth.readThemePreference(scope)), 'dark');
  assert.equal(scope.document.documentElement.dataset.theme, 'dark');
});

test('light and dark themes expose complete semantic surfaces', () => {
  assert.match(tokens, /:root\s*\{/);
  assert.match(tokens, /:root\[data-theme="dark"\]/);
  assert.match(tokens, /color-scheme:\s*light/);
  assert.match(tokens, /color-scheme:\s*dark/);
  for (const token of ['--ide-background','--ide-surface','--ide-surface-secondary','--ide-text-primary','--ide-text-secondary','--ide-border']) {
    assert.match(tokens, new RegExp(`${token}\\s*:`), `missing ${token}`);
  }
});

test('all Design System component families consume semantic tokens', () => {
  for (const selector of ['ide-select','ide-modal','ide-toast','ide-card','ide-table','ide-empty-state','ide-loading','ide-filter-bar','ide-page-header','ide-mobile-nav','ide-form-layout']) {
    assert.match(designSystemCss, new RegExp(`\\.${selector}`), `missing component styling .${selector}`);
  }
  assert.match(designSystemCss, /var\(--ide-surface\)/);
  assert.match(designSystemCss, /var\(--ide-text-primary\)/);
  assert.match(designSystemCss, /var\(--ide-border\)/);
});

test('Setlist, cifra and lyrics have explicit light/dark migration coverage', () => {
  for (const selector of ['setlist-info','song-card','setlist-card','cifra-display','cifra-container','chord-content','lyrics-content','music-content','chord']) {
    assert.match(migrationCss, new RegExp(`\\.${selector}`), `missing theme coverage for .${selector}`);
  }
  assert.match(migrationCss, /:root\[data-theme="dark"\]/);
  assert.match(themeCss, /\[data-theme="dark"\][^\n]*\.chord/);
  assert.match(themeCss, /lyrics-content/);
  assert.match(themeCss, /chord-content/);
});

test('all authenticated user-facing pages load the shared IDE Music theme layer', () => {
  for (const page of pages) {
    const html = fs.readFileSync(path.join(root, 'src/pages', page), 'utf8');
    assert.match(html, /music-ide-theme\.css/, `${page} must load the shared theme stylesheet`);
    assert.match(html, /auth-service\.js/, `${page} must load auth/theme bootstrap`);
    assert.match(html, /app-shell\.js/, `${page} must load the authenticated shell`);
  }
});
