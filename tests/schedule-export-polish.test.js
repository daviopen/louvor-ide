const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/js/modules/schedule-export-polish.js'), 'utf8');
const moduleHtml = fs.readFileSync(path.join(root, 'src/pages/module.html'), 'utf8');

test('monthly export loads the dedicated polish layer', () => {
  assert.match(moduleHtml, /schedule-export-polish\.js\?v=20260831-export-polish/);
});

test('schedule PDF hides event time and weekly range while forcing readable event names', () => {
  assert.match(source, /weekly-export-event-title>span\{display:none!important\}/);
  assert.match(source, /weekly-export-sheet:not\(\.weekly-export-absence-sheet\) \.weekly-export-week-label\{display:none!important\}/);
  assert.match(source, /weekly-export-event-title h2\{color:var\(--ide-color-neutral-950,#090b0c\)!important/);
  assert.match(source, /querySelectorAll\('\.weekly-export-event-title > span'\).*node\.remove\(\)/s);
  assert.match(source, /weekLabel\.remove\(\)/);
});

test('schedule PDF footer is neutral, transparent and detached from generic footer styling', () => {
  assert.match(source, /background-color:transparent!important/);
  assert.match(source, /footer\.tagName !== 'FOOTER'/);
  assert.match(source, /scope\.document\.createElement\('div'\)/);
  assert.match(source, /PÁG\. ' counter\(ide-export-page\) ' • COMUNIDADE IDE/);
});

test('unavailability export groups repeated records by person and paginates every person', () => {
  assert.match(source, /const ABSENCE_PEOPLE_PER_PAGE = 7/);
  assert.match(source, /const groups = new Map\(\)/);
  assert.match(source, /if \(!groups\.has\(name\)\) groups\.set\(name, \[\]\)/);
  assert.match(source, /weekly-export-absence-person/);
  assert.match(source, /groups\.slice\(index, index \+ ABSENCE_PEOPLE_PER_PAGE\)/);
  assert.match(source, /pages\.forEach\(\(groupsForPage, index\)/);
});
