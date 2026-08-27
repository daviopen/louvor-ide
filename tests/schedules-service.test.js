const test = require('node:test');
const assert = require('node:assert/strict');
const { ScheduleService, periodForTime, unavailabilityMatches, scheduleCompleteness } = require('../src/services/schedule-service.js');

function fakeRepository() {
  const schedules = new Map([['schedule_event_1', { id: 'schedule_event_1', eventId: 'event_1', status: 'DRAFT', slots: [{ id: 'slot_a', functionId: 'fn_back' }] }]]);
  const members = [];
  const audit = [];
  const calls = { listAllMembers: 0, listMembers: 0 };
  return {
    schedules, members, audit, calls,
    async getPermissionLevel() { return 'EDIT'; },
    async listSchedules() { return [{ ...schedules.get('schedule_event_1'), event: { id: 'event_1', name: 'Culto', date: '2026-09-01', time: '20:00' } }]; },
    async listActiveUsers() { return [{ id: 'u1', name: 'Ana', active: true }, { id: 'u2', name: 'Bia', active: true }]; },
    async listActiveFunctions() { return [{ id: 'fn_back', name: 'Back Vocal', active: true, order: 10 }, { id: 'fn_keys', name: 'Teclado', active: true, order: 20 }]; },
    async listUserFunctions() { return [{ userId: 'u1', functionId: 'fn_back', active: true }, { userId: 'u1', functionId: 'fn_keys', active: true }, { userId: 'u2', functionId: 'fn_back', active: true }]; },
    async listUnavailability() { return [{ id: 'un1', userId: 'u2', date: '2026-09-01', period: 'EVENING' }]; },
    async listAllMembers() { calls.listAllMembers += 1; return members.filter(item => item.active !== false); },
    async listMembers() { calls.listMembers += 1; return members.filter(item => item.active !== false); },
    async getSchedule(id) { return schedules.get(id) || null; },
    async getEvent() { return { id: 'event_1', name: 'Culto', date: '2026-09-01', time: '20:00' }; },
    async updateSchedule(id, patch) { const next = { ...schedules.get(id), ...patch }; schedules.set(id, next); return next; },
    async createMember(data) { const item = { id: `m${members.length + 1}`, ...data, active: true }; members.push(item); return item; },
    async removeMember(id) { const item = members.find(member => member.id === id); if (item) item.active = false; return item; },
    async addAuditLog(actor, action, entityId, details) { audit.push({ actor, action, entityId, details }); }
  };
}

test('classifica período do evento', () => {
  assert.equal(periodForTime('09:00'), 'MORNING');
  assert.equal(periodForTime('15:30'), 'AFTERNOON');
  assert.equal(periodForTime('20:00'), 'EVENING');
});

test('indisponibilidade considera data, período e evento específico', () => {
  const event = { id: 'e1', date: '2026-09-01', time: '20:00' };
  assert.equal(unavailabilityMatches({ date: '2026-09-01', period: 'EVENING' }, event), true);
  assert.equal(unavailabilityMatches({ date: '2026-09-01', period: 'MORNING' }, event), false);
  assert.equal(unavailabilityMatches({ date: '2026-09-01', eventId: 'e2' }, event), false);
});

test('completude depende de todos os slots possuírem integrante ativo', () => {
  const schedule = { slots: [{ id: 'a' }, { id: 'b' }] };
  assert.deepEqual(scheduleCompleteness(schedule, [{ slotId: 'a', active: true }]), { complete: false, filled: 1, total: 2, missingSlotIds: ['b'] });
  assert.equal(scheduleCompleteness(schedule, [{ slotId: 'a', active: true }, { slotId: 'b', active: true }]).complete, true);
});

test('carrega integrantes de todas as escalas em uma única leitura em lote', async () => {
  const repository = fakeRepository();
  repository.members.push({ id: 'm1', scheduleId: 'schedule_event_1', slotId: 'slot_a', userId: 'u1', functionId: 'fn_back', active: true });
  const service = new ScheduleService(repository);
  const data = await service.load({ uid: 'admin' }, { role: 'SUPER_ADMIN' });
  assert.equal(repository.calls.listAllMembers, 1);
  assert.equal(repository.calls.listMembers, 0);
  assert.equal(data.schedules[0].members.length, 1);
  assert.equal(data.schedules[0].completeness.complete, true);
});

test('lista elegíveis apenas ativos, com função e disponíveis', async () => {
  const repository = fakeRepository();
  const service = new ScheduleService(repository);
  const data = await service.load({ uid: 'admin' }, { role: 'SUPER_ADMIN' });
  const eligible = service.eligibleUsers('fn_back', data.schedules[0].event, data);
  assert.deepEqual(eligible.map(item => item.id), ['u1']);
});

test('bloqueia indisponível sem exceção e audita exceção com motivo', async () => {
  const repository = fakeRepository();
  const service = new ScheduleService(repository);
  await assert.rejects(() => service.assign('schedule_event_1', 'slot_a', 'u2', { uid: 'admin' }, { role: 'SUPER_ADMIN' }), /indisponível/);
  await service.assign('schedule_event_1', 'slot_a', 'u2', { uid: 'admin' }, { role: 'SUPER_ADMIN' }, { override: true, reason: 'Necessidade excepcional' });
  assert.equal(repository.members[0].exception.override, true);
  assert.equal(repository.audit.at(-1).action, 'SCHEDULE_MEMBER_OVERRIDE_ASSIGNED');
});

test('permite mesma pessoa em funções diferentes e impede duplicidade na mesma função', async () => {
  const repository = fakeRepository();
  const service = new ScheduleService(repository);
  await service.assign('schedule_event_1', 'slot_a', 'u1', { uid: 'admin' }, { role: 'SUPER_ADMIN' });
  const schedule = repository.schedules.get('schedule_event_1');
  schedule.slots.push({ id: 'slot_b', functionId: 'fn_keys' }, { id: 'slot_c', functionId: 'fn_back' });
  await service.assign('schedule_event_1', 'slot_b', 'u1', { uid: 'admin' }, { role: 'SUPER_ADMIN' });
  await assert.rejects(() => service.assign('schedule_event_1', 'slot_c', 'u1', { uid: 'admin' }, { role: 'SUPER_ADMIN' }), /mesma função/);
});
