const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const page = fs.readFileSync(path.join(root, 'src/pages/setlist-view.html'), 'utf8');
const fixes = fs.readFileSync(path.join(root, 'src/css/setlist-performance-view-fixes.css'), 'utf8');
const metadata = fs.readFileSync(path.join(root, 'src/js/modules/setlist-view-metadata.js'), 'utf8');

test('setlist viewer hides stale loading, error and empty states through hidden attribute', () => {
  assert.match(fixes, /\.performance-page \[hidden\][\s\S]*display:\s*none\s*!important/);
  assert.match(page, /id="error"[^>]*hidden/);
  assert.match(page, /id="viewer"[^>]*hidden/);
  assert.match(page, /id="content-empty"[^>]*hidden/);
});

test('setlist viewer exposes dress code outside edit screen', () => {
  assert.match(page, /id="dress-code-view"/);
  assert.match(page, /id="dress-code-colors"/);
  assert.match(page, /setlist-view-metadata\.js/);
  assert.match(metadata, /dressCodeColors/);
  assert.match(metadata, /repository\.getSetlist\(setlistId\)/);
});

test('setlist viewer uses eventDate when available', () => {
  assert.match(metadata, /setlist\?\.eventDate \|\| setlist\?\.data \|\| setlist\?\.date/);
});
