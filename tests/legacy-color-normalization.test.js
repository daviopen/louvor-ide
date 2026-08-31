const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeHtml, hexPattern } = require('../src/scripts/normalize-built-html-colors.js');

test('normalizer replaces known and unknown hex colors inside CSS contexts', () => {
  const input = '<style>.a{color:#333;background:#4CAF50;border-color:#abcdef}</style><div style="color:#666">Texto</div>';
  const output = normalizeHtml(input);
  assert.match(output, /var\(--ide-text-primary\)/);
  assert.match(output, /var\(--ide-primary-active\)/);
  assert.match(output, /var\(--ide-text-secondary\)/);
  const cssOnly = output.match(/<style>([\s\S]*?)<\/style>/)[1];
  assert.doesNotMatch(cssOnly, hexPattern);
});

test('normalizer never rewrites native input values or arbitrary HTML attributes', () => {
  const input = '<input type="color" value="#D8FF45"><div data-color="#abcdef"></div>';
  const output = normalizeHtml(input);
  assert.match(output, /type="color" value="#D8FF45"/);
  assert.match(output, /data-color="#abcdef"/);
  assert.doesNotMatch(output, /value="var\(--ide-text-primary\)"/);
});

test('theme-color metadata remains browser-valid without a hex literal', () => {
  const output = normalizeHtml('<meta name="theme-color" content="#090b0c">');
  assert.match(output, /<meta name="theme-color" content="black">/);
  assert.doesNotMatch(output, hexPattern);
});
