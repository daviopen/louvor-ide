const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/js/modules/schedule-export-polish.js'), 'utf8');
const moduleHtml = fs.readFileSync(path.join(root, 'src/pages/module.html'), 'utf8');
const appShell = fs.readFileSync(path.join(root, 'src/js/modules/app-shell.js'), 'utf8');

function loadPolishApi() {
  const window = {
    location: { search: '?section=schedules&view=export' },
    document: {
      readyState: 'loading',
      addEventListener() {},
      getElementById() { return null; }
    },
    addEventListener() {}
  };
  vm.runInNewContext(source, { window, URLSearchParams, Date, Intl, console });
  return window.MusicIdeScheduleExportPolish;
}

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

test('PDF footer Music uses the official IDE Music secondary violet', () => {
  assert.match(source, /violet:\s*\[132,\s*120,\s*255\]/);
  assert.match(source, /var\(--ide-color-violet-500,#8478ff\)/);
});

test('unavailability export groups repeated records by person with denser pagination and spacing', () => {
  assert.match(source, /const ABSENCE_PEOPLE_PER_PAGE = 10/);
  assert.match(source, /const groups = new Map\(\)/);
  assert.match(source, /if \(!groups\.has\(name\)\) groups\.set\(name, \[\]\)/);
  assert.match(source, /weekly-export-absence-person/);
  assert.match(source, /height:34mm!important/);
  assert.match(source, /gap:2\.5mm 3mm!important/);
  assert.match(source, /groups\.slice\(index, index \+ ABSENCE_PEOPLE_PER_PAGE\)/);
  assert.match(source, /pages\.forEach\(\(groupsForPage, index\)/);
});

test('unavailability periods are clipped to the selected export month', () => {
  const api = loadPolishApi();
  assert.ok(api);
  assert.equal(
    api.normalizeAbsencePeriod('Toda sexta-feira · 27/08/2026 a 30/09/2026', '2026-09'),
    'Toda sexta-feira · 01/09/2026 a 30/09/2026'
  );
  assert.equal(
    api.normalizeAbsencePeriod('Todo sábado · 27/08/2026 a 31/12/2026', '2026-09'),
    'Todo sábado · 01/09/2026 a 30/09/2026'
  );
  assert.equal(
    api.normalizeAbsencePeriod('27/08/2026 a 06/09/2026', '2026-09'),
    '01/09/2026 a 06/09/2026'
  );
  assert.equal(api.normalizeAbsencePeriod('19/09/2026', '2026-09'), '19/09/2026');
});

test('Exportar and Participações are permanent schedule navigation items', () => {
  assert.match(appShell, /id: 'schedules-export'.*label: 'Exportar escalas'.*view=export.*permission: 'schedules'/s);
  assert.match(appShell, /id: 'schedules-participation'.*label: 'Participações'.*view=participation.*permission: 'schedules'/s);
  assert.match(appShell, /scheduleView === 'export'\) return 'schedules-export'/);
  assert.match(appShell, /scheduleView === 'participation'\) return 'schedules-participation'/);
});
