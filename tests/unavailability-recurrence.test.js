const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildRecordRange,
  dateInRange,
  recordConflicts,
  filterAvailableUsers,
  UnavailabilityService
} = require('../src/services/unavailability-service.js');

const NOW = new Date(2026, 7, 27, 12, 0, 0);

function repositoryFixture(records = []) {
  const audits = [];
  return {
    records,
    audits,
    async listByUser(userId) { return records.filter(item => item.userId === userId); },
    async create(data) { const item = { id: `u-${records.length + 1}`, ...data }; records.push(item); return item; },
    async getById(id) { return records.find(item => item.id === id) || null; },
    async update(id, patch) { const index = records.findIndex(item => item.id === id); records[index] = { ...records[index], ...patch }; return records[index]; },
    async delete(id) { const index = records.findIndex(item => item.id === id); if (index >= 0) records.splice(index, 1); },
    async addAuditLog(actorUserId, action, entityId, details) { const log = { actorUserId, action, entityId, details }; audits.push(log); return log; }
  };
}

test('recorrência semanal aberta usa horizonte técnico e preserva estado aberto', () => {
  const range = buildRecordRange('2026-08-27', '', { frequency: 'WEEKLY', weekdays: [5], openEnded: true }, NOW);
  assert.equal(range.recurrence.frequency, 'WEEKLY');
  assert.deepEqual(range.recurrence.weekdays, [5]);
  assert.equal(range.recurrence.openEnded, true);
  assert.equal(range.end.getFullYear(), 2099);
});

test('recorrência exige pelo menos um dia da semana', () => {
  assert.throws(() => buildRecordRange('2026-08-27', '', { frequency: 'WEEKLY', weekdays: [] }, NOW), /Selecione pelo menos um dia/);
});

test('sexta recorrente conflita somente nas sextas dentro da vigência', () => {
  const record = {
    date: '2026-08-27',
    endAt: new Date(2099, 11, 31, 23, 59, 59),
    recurrence: { frequency: 'WEEKLY', weekdays: [5], openEnded: true },
    period: null,
    eventId: null
  };
  assert.equal(dateInRange(record, '2026-08-28'), true);
  assert.equal(dateInRange(record, '2026-08-29'), false);
  assert.equal(dateInRange(record, '2026-09-04'), true);
  assert.equal(recordConflicts(record, { date: '2026-09-04', time: '20:00' }), true);
  assert.equal(recordConflicts(record, { date: '2026-09-05', time: '20:00' }), false);
});

test('recorrência semanal respeita período e evento', () => {
  const record = {
    userId: 'user-2',
    date: '2026-08-27',
    endAt: new Date(2099, 11, 31, 23, 59, 59),
    recurrence: { frequency: 'WEEKLY', weekdays: [5], openEnded: true },
    period: 'EVENING',
    eventId: 'event-1'
  };
  assert.equal(recordConflicts(record, { date: '2026-08-28', time: '20:00', eventId: 'event-1' }), true);
  assert.equal(recordConflicts(record, { date: '2026-08-28', time: '10:00', eventId: 'event-1' }), false);
  assert.equal(recordConflicts(record, { date: '2026-08-28', time: '20:00', eventId: 'event-2' }), false);
});

test('pessoa com sexta recorrente é removida da seleção normal de escala', () => {
  const users = [{ id: 'user-1' }, { id: 'user-2' }];
  const records = [{
    userId: 'user-2', date: '2026-08-27', endAt: new Date(2099, 11, 31, 23, 59, 59),
    recurrence: { frequency: 'WEEKLY', weekdays: [5], openEnded: true }, period: null, eventId: null
  }];
  assert.deepEqual(filterAvailableUsers(users, records, { date: '2026-08-28', time: '20:00' }).map(item => item.id), ['user-1']);
  assert.deepEqual(filterAvailableUsers(users, records, { date: '2026-08-29', time: '20:00' }).map(item => item.id), ['user-1', 'user-2']);
});

test('criação recorrente persiste dias e auditoria sem data final artificial', async () => {
  const repo = repositoryFixture();
  const service = new UnavailabilityService(repo, { clock: () => NOW });
  const created = await service.create({ date: '2026-08-27', recurrence: { frequency: 'WEEKLY', weekdays: [5], openEnded: true } }, { uid: 'user-1' }, { role: 'MEMBER' }, { access: { level: 'EDIT', canManageOthers: false } });
  assert.deepEqual(created.recurrence.weekdays, [5]);
  assert.equal(created.recurrence.openEnded, true);
  assert.equal(repo.audits[0].details.endDate, null);
  assert.equal(repo.audits[0].details.recurrence, 'WEEKLY');
  assert.deepEqual(repo.audits[0].details.weekdays, [5]);
});