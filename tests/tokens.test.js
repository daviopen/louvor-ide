const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const tokensPath = path.join(root, 'src/styles/tokens.css');
const tokens = fs.readFileSync(tokensPath, 'utf8');
const shell = fs.readFileSync(path.join(root, 'src/js/modules/app-shell.js'), 'utf8');

const semanticTokens = ['--ide-primary','--ide-primary-hover','--ide-primary-active','--ide-secondary','--ide-background','--ide-surface','--ide-surface-secondary','--ide-text-primary','--ide-text-secondary','--ide-border','--ide-success','--ide-warning','--ide-error','--ide-info'];
const foundationTokens = ['--ide-space-1','--ide-space-4','--ide-space-8','--ide-radius-sm','--ide-radius-md','--ide-radius-lg','--ide-shadow-sm','--ide-shadow-md','--ide-shadow-lg','--ide-font-family-sans','--ide-font-family-mono','--ide-font-size-sm','--ide-font-size-md','--ide-breakpoint-mobile','--ide-breakpoint-tablet','--ide-breakpoint-desktop','--ide-z-dropdown','--ide-z-sidebar','--ide-z-modal'];

test('IDE Music exposes semantic and foundation design tokens', () => {
  [...semanticTokens, ...foundationTokens].forEach(token => assert.match(tokens, new RegExp(`${token}\\s*:`), `missing ${token}`));
});

test('official palette preserves the IDE Music lime and violet identity', () => {
  assert.match(tokens, /--ide-color-lime-500:\s*#d8ff45/i);
  assert.match(tokens, /--ide-color-violet-500:\s*#8478ff/i);
});

test('authenticated shell loads tokens before the Design System', () => {
  const tokenPosition = shell.indexOf('../styles/tokens.css');
  const designSystemPosition = shell.indexOf('../styles/design-system.css');
  assert.ok(tokenPosition >= 0);
  assert.ok(designSystemPosition >= 0);
  assert.ok(tokenPosition < designSystemPosition);
});

function cssFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return cssFiles(full);
    return entry.isFile() && entry.name.endsWith('.css') ? [full] : [];
  });
}

test('hex colors are centralized exclusively in tokens.css', () => {
  const files = [...cssFiles(path.join(root, 'src/styles')), ...cssFiles(path.join(root, 'src/css'))];
  const hex = /#[0-9a-f]{3,8}\b/ig;
  files.filter(file => file !== tokensPath).forEach(file => {
    const matches = fs.readFileSync(file, 'utf8').match(hex) || [];
    assert.deepEqual(matches, [], `${path.relative(root, file)} contains hardcoded hex colors: ${matches.join(', ')}`);
  });
});

function hexValue(variable) {
  const match = tokens.match(new RegExp(`${variable}:\\s*(#[0-9a-f]{6})`, 'i'));
  assert.ok(match, `missing literal palette token ${variable}`);
  return match[1];
}
function luminance(hex) {
  const values = hex.match(/[0-9a-f]{2}/gi).map(v => parseInt(v, 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  return .2126 * values[0] + .7152 * values[1] + .0722 * values[2];
}
function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + .05) / (lo + .05);
}

test('core foreground/background pairs meet WCAG AA', () => {
  const dark = hexValue('--ide-color-neutral-950');
  const text = hexValue('--ide-color-neutral-900');
  const muted = hexValue('--ide-color-neutral-600');
  const surface = hexValue('--ide-color-neutral-50');
  const lime = hexValue('--ide-color-lime-500');
  const white = hexValue('--ide-color-white');
  const error = hexValue('--ide-color-error-700');
  assert.ok(contrast(text, surface) >= 4.5, 'primary text on surface must meet AA');
  assert.ok(contrast(muted, surface) >= 4.5, 'secondary text on surface must meet AA');
  assert.ok(contrast(dark, lime) >= 4.5, 'primary button text must meet AA');
  assert.ok(contrast(white, dark) >= 4.5, 'text on dark surfaces must meet AA');
  assert.ok(contrast(error, surface) >= 4.5, 'error text on surface must meet AA');
});
