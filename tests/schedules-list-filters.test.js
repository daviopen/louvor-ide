const test = require('node:test');
const assert = require('node:assert/strict');
const { matchesListPeriodAndStatus: matches } = require('../src/services/schedule-service.js');
const today = new Date(2026, 8, 27, 23, 59);
const schedule = (date, complete = true) => ({ event: { date }, completeness: { complete }, status: 'DRAFT' });
test('default includes all of today and future, excluding past and undated schedules', () => {
  assert.equal(matches(schedule('2026-09-26'), {}, today), false);
  assert.equal(matches(schedule('2026-09-27'), {}, today), true);
  assert.equal(matches(schedule('2026-09-28'), {}, today), true);
  assert.equal(matches(schedule(null), {}, today), false);
});
test('past date boundaries explicitly enable historical searches, inclusively', () => {
  assert.equal(matches(schedule('2026-09-26'), { from: '2026-09-26' }, today), true);
  assert.equal(matches(schedule('2026-09-26'), { to: '2026-09-26' }, today), true);
  assert.equal(matches(schedule('2026-09-26'), { to: '2026-09-28' }, today), false);
  assert.equal(matches(schedule('2026-09-25'), { from: '2026-09-26' }, today), false);
  assert.equal(matches(schedule('2026-09-27'), { to: '2026-09-26' }, today), false);
});
test('status uses displayed completeness and combines with period without enabling history', () => {
  assert.equal(matches(schedule('2026-09-27'), { status: 'COMPLETE' }, today), true);
  assert.equal(matches(schedule('2026-09-27', false), { status: 'COMPLETE' }, today), false);
  assert.equal(matches(schedule('2026-09-27', false), { status: 'DRAFT' }, today), true);
  assert.equal(matches(schedule('2026-09-26'), { status: 'COMPLETE' }, today), false);
  assert.equal(matches(schedule('2026-09-26'), { status: 'COMPLETE', from: '2026-09-26', to: '2026-09-26' }, today), true);
  assert.equal(matches(schedule('2026-09-26'), {}, today), false);
});
