const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const loginPath = path.resolve(__dirname, '../src/pages/login.html');
const loginHtml = fs.readFileSync(loginPath, 'utf8');

test('login loads design tokens before the legacy theme', () => {
  const tokensIndex = loginHtml.indexOf('../styles/tokens.css');
  const themeIndex = loginHtml.indexOf('../css/music-ide-theme.css');

  assert.notEqual(tokensIndex, -1);
  assert.notEqual(themeIndex, -1);
  assert.ok(tokensIndex < themeIndex);
});

test('login uses the official multicolor Google G mark instead of a synthetic badge', () => {
  assert.match(loginHtml, /class="google-logo"/);
  assert.match(loginHtml, /rgb\(66,133,244\)/);
  assert.match(loginHtml, /rgb\(52,168,83\)/);
  assert.match(loginHtml, /rgb\(251,188,5\)/);
  assert.match(loginHtml, /rgb\(234,67,53\)/);
  assert.doesNotMatch(loginHtml, /conic-gradient/);
});

test('login keeps typography, controls and surfaces on IDE Music design tokens', () => {
  assert.match(loginHtml, /font-family:\s*var\(--ide-font-family-sans\)/);
  assert.match(loginHtml, /background:\s*var\(--ide-color-neutral-100\)/);
  assert.match(loginHtml, /background:\s*var\(--ide-primary\)\s*!important/);
  assert.match(loginHtml, /border-radius:\s*var\(--ide-radius-md\)/);
});

test('login has explicit responsive mobile layout and associated field labels', () => {
  assert.match(loginHtml, /@media \(max-width: 760px\)/);
  assert.match(loginHtml, /<label for="login-email">/);
  assert.match(loginHtml, /id="login-password"/);
  assert.match(loginHtml, /<label for="login-password">/);
});
