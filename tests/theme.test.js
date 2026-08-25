const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const auth = require('../src/js/modules/auth-service.js');

const root = path.resolve(__dirname, '..');
const tokens = fs.readFileSync(path.join(root, 'src/styles/tokens.css'), 'utf8');
const themeCss = fs.readFileSync(path.join(root, 'src/css/music-ide-theme.css'), 'utf8');

function createThemeScope({ stored = null, prefersDark = false } = {}) {
  const storage = new Map();
  if (stored !== null) storage.set(auth.THEME_STORAGE_KEY, stored);

  return {
    localStorage: {
      getItem(key) { return storage.has(key) ? storage.get(key) : null; },
      setItem(key, value) { storage.set(key, value); }
    },
    matchMedia() {
      return { matches: prefersDark };
    },
    document: {
      documentElement: {
        dataset: {},
        style: {}
      }
    }
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

test('tokens e superfícies de cifra/letra possuem cobertura dark mode', () => {
  assert.match(tokens, /:root\[data-theme="dark"\]/);
  assert.match(tokens, /color-scheme:\s*dark/);
  assert.match(themeCss, /music-ide-theme-select/);
  assert.match(themeCss, /\[data-theme="dark"\][^\n]*\.chord/);
  assert.match(themeCss, /lyrics-content/);
  assert.match(themeCss, /chord-content/);
});
