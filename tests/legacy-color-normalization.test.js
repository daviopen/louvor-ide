const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeHtml, hexPattern } = require('../src/scripts/normalize-built-html-colors.js');

test('normalizer replaces known and unknown hex colors with design tokens', () => {
  const input = '<style>.a{color:#333;background:#4CAF50;border-color:#abcdef}</style>';
  const output = normalizeHtml(input);
  assert.match(output, /var\(--ide-text-primary\)/);
  assert.match(output, /var\(--ide-primary-active\)/);
  assert.match(output, /var\(--ide-text-primary\)/);
  assert.doesNotMatch(output, hexPattern);
});

test('theme-color metadata remains browser-valid without a hex literal', () => {
  const output = normalizeHtml('<meta name="theme-color" content="#090b0c">');
  assert.equal(output, '<meta name="theme-color" content="black">');
  assert.doesNotMatch(output, hexPattern);
});
