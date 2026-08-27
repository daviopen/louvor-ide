const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../src/js/modules/schedules-page.js'), 'utf8');

test('schedule list exposes ordering options', () => {
  assert.match(source, /id=\"schedule-sort\"/);
  assert.match(source, /Data · mais próxima primeiro/);
  assert.match(source, /Data · mais distante primeiro/);
  assert.match(source, /Evento · A–Z/);
  assert.match(source, /Evento · Z–A/);
});

test('schedule ordering is applied by a dedicated comparator', () => {
  assert.match(source, /function compareSchedules\(a,b\)/);
  assert.match(source, /sort\(compareSchedules\)/);
  assert.match(source, /sort: 'DATE_ASC'/);
  assert.match(source, /\['schedule-sort','sort','change'\]/);
});
