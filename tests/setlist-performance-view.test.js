const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const viewer = require('../src/js/modules/setlist-performance-view.js');
const html = fs.readFileSync(path.join(__dirname, '../src/pages/setlist-view.html'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '../src/css/setlist-performance-view.css'), 'utf8');

// Provide only the dependency needed by shiftKey in the Node test runtime.
global.LouvorChordTransposer = require('../src/js/modules/chord-transposer.js');

test('viewer exposes chord/lyrics toggle, stage mode, font controls and song navigation', () => {
  assert.match(html, /id="view-chords"[^>]*>[\s\S]*Ver cifra/);
  assert.match(html, /id="view-lyrics"[^>]*>[\s\S]*Ver letra/);
  assert.match(html, /id="stage-mode-button"/);
  assert.match(html, /id="font-down"/);
  assert.match(html, /id="font-up"/);
  assert.match(html, /id="previous-song"/);
  assert.match(html, /id="next-song"/);
});

test('viewer includes execution-key transposition controls without persistence actions', () => {
  assert.match(html, /id="transpose-down"/);
  assert.match(html, /id="transpose-reset"/);
  assert.match(html, /id="transpose-up"/);
  assert.match(html, /id="execution-key"/);
  assert.doesNotMatch(html, /Salvar tom|save-key|persist-key/i);
});

test('font size remains inside accessible stage bounds', () => {
  assert.equal(viewer.clampFontSize(8), 14);
  assert.equal(viewer.clampFontSize(24), 24);
  assert.equal(viewer.clampFontSize(90), 34);
  assert.equal(viewer.clampFontSize('invalid'), 18);
});

test('song navigation never wraps past setlist boundaries', () => {
  assert.equal(viewer.getAdjacentIndex(0, -1, 3), -1);
  assert.equal(viewer.getAdjacentIndex(0, 1, 3), 1);
  assert.equal(viewer.getAdjacentIndex(2, 1, 3), -1);
});

test('temporary transposition shifts execution key by semitone', () => {
  assert.equal(viewer.shiftKey('C', 1), 'C#');
  assert.equal(viewer.shiftKey('B', 1), 'C');
  assert.equal(viewer.shiftKey('Bb', -1), 'A');
});

test('lyrics normalization preserves paragraphs and removes excessive blank lines', () => {
  assert.equal(viewer.normalizeLyrics('Linha 1\r\n\r\n\r\nLinha 2  '), 'Linha 1\n\nLinha 2');
});

test('stage mode is responsive, high contrast and keeps mobile-specific layout', () => {
  assert.match(css, /\.stage-mode \.performance-song\{[^}]*min-height:100vh/);
  assert.match(css, /\.stage-mode \.ide-sidebar/);
  assert.match(css, /@media\(max-width:560px\)/);
  assert.match(css, /var\(--ide-text-primary\)/);
  assert.match(css, /var\(--ide-primary\)/);
});
