const test = require('node:test');
const assert = require('node:assert/strict');

const monthly = require('../src/services/schedule-monthly-service');

test('monthlyParticipation counts a person once per schedule even with multiple functions', () => {
  const users = [
    { id: 'u1', name: 'Ana', active: true },
    { id: 'u2', name: 'Beto', active: true },
    { id: 'u3', name: 'Caio', active: true }
  ];
  const schedules = [
    {
      id: 's1', eventDate: '2026-09-09',
      members: [
        { userId: 'u1', functionId: 'ministro', active: true },
        { userId: 'u1', functionId: 'violao', active: true },
        { userId: 'u2', functionId: 'bateria', active: true }
      ]
    },
    { id: 's2', eventDate: '2026-09-20', members: [{ userId: 'u1', functionId: 'ministro', active: true }] },
    { id: 's3', eventDate: '2026-10-01', members: [{ userId: 'u2', functionId: 'bateria', active: true }] }
  ];

  const rows = monthly.monthlyParticipation(users, schedules, '2026-09');
  assert.deepEqual(rows, [
    { userId: 'u1', name: 'Ana', total: 2 },
    { userId: 'u2', name: 'Beto', total: 1 },
    { userId: 'u3', name: 'Caio', total: 0 }
  ]);
});

test('monthBounds returns the complete selected month', () => {
  assert.deepEqual(monthly.monthBounds('2026-09'), { from: '2026-09-01', to: '2026-09-30' });
  assert.deepEqual(monthly.monthBounds('2028-02'), { from: '2028-02-01', to: '2028-02-29' });
});

test('unavailabilityOverlapsMonth includes ranges and open weekly recurrences', () => {
  assert.equal(monthly.unavailabilityOverlapsMonth({ date: '2026-08-30', endAt: '2026-09-03' }, '2026-09'), true);
  assert.equal(monthly.unavailabilityOverlapsMonth({ date: '2026-10-01' }, '2026-09'), false);
  assert.equal(monthly.unavailabilityOverlapsMonth({ date: '2026-08-01', recurrence: { frequency: 'WEEKLY', openEnded: true } }, '2026-09'), true);
});
