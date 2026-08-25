const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const tokens = fs.readFileSync(path.join(root, 'src/styles/tokens.css'), 'utf8');
const shell = fs.readFileSync(path.join(root, 'src/js/modules/app-shell.js'), 'utf8');

const semanticTokens = [
  '--ide-primary',
  '--ide-primary-hover',
  '--ide-primary-active',
  '--ide-secondary',
  '--ide-background',
  '--ide-surface',
  '--ide-surface-secondary',
  '--ide-text-primary',
  '--ide-text-secondary',
  '--ide-border',
  '--ide-success',
  '--ide-warning',
  '--ide-error',
  '--ide-info'
];

test('IDE Music exposes the official semantic color palette', () => {
  semanticTokens.forEach(token => {
    assert.match(tokens, new RegExp(`${token}\\s*:`), `missing ${token}`);
  });
});

test('official palette preserves the IDE Music lime and violet identity', () => {
  assert.match(tokens, /--ide-color-lime-500:\s*#d8ff45/i);
  assert.match(tokens, /--ide-color-violet-500:\s*#8478ff/i);
});

test('authenticated shell loads tokens before the Design System', () => {
  const tokenPosition = shell.indexOf("../styles/tokens.css");
  const designSystemPosition = shell.indexOf("../styles/design-system.css");

  assert.ok(tokenPosition >= 0, 'tokens.css is not loaded by app-shell');
  assert.ok(designSystemPosition >= 0, 'design-system.css is not loaded by app-shell');
  assert.ok(tokenPosition < designSystemPosition, 'tokens.css must load before design-system.css');
});
