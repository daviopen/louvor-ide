const test = require('node:test');
const assert = require('node:assert/strict');

const {
  UnavailabilityService,
  validateDate,
  recordConflicts,
  filterAvailableUsers,
  isFutureRecord
} = require('../src/services/unavailability-service.js');

const NOW = new Date(2026, 7, 25, 12, 0, 0);

function repositoryFixture(seed = {}) {
  let sequence = 1;
  const records = (seed.records || []).map(item => ({ ...item }));
  const audits = [];
  return {
    records,
    audits,
    async getPermissionLevel() { return seed.permissionLevel || 'NONE'; },
    async listByUser(userId) { return records.filter(item => item.userId === userId).map(item => ({ ...item })); },
    async listAll() { return records.map(item => ({ ...item })); },
    async getById(id) { return records.find(item => item.id === id) || null; },
    async create(data) { const item = { id: `u-${sequence++}`, ...data }; records.push(item); return { ...item }; },
    async update(id, patch) { const index = records.findIndex(item => item.id === id); records[index] = { ...records[index], ...patch }; return { ...records[index] }; },
    async delete(id) { const index = records.findIndex(item => item.id === id); if (index >= 0) records.splice(index, 1); },
    async addAuditLog(actorUserId, action, entityId, details) { const log = { actorUserId, action, entityId, details }; audits.push(log); return log; }
  };
}

const actor = { uid: 'user-1' };
const memberProfile = { role: 'MEMBER' };
const adminProfile = { role: 'ADMIN' };
const superAdminProfile = { role: 'SUPER_ADMIN' };

test('data é obrigatória e não aceita data passada', () => {
  assert.throws(() => validateDate('', NOW), /Data é obrigatória/);
  assert.throws(() => validateDate('2026-08-24', NOW), /hoje ou uma data futura/);
  assert.equal(validateDate('2026-08-25', NOW).getDate(), 25);
});

test('conflito considera data, período e evento', () => {
  const base = { date: '2026-08-28', period: 'EVENING', eventId: 'event-1' };
  assert.equal(recordConflicts(base, { date: '2026-08-28', time: '20:00', eventId: 'event-1' }), true);
  assert.equal(recordConflicts(base, { date: '2026-08-28', time: '10:00', eventId: 'event-1' }), false);
  assert.equal(recordConflicts(base, { date: '2026-08-28', time: '20:00', eventId: 'event-2' }), false);
  assert.equal(recordConflicts({ ...base, period: null }, { date: '2026-08-28', time: '10:00', eventId: 'event-1' }), true);
  assert.equal(recordConflicts({ ...base, eventId: null }, { date: '2026-08-28', time: '20:00', eventId: 'event-2' }), true);
});

test('indisponível é removido da seleção normal de escala', () => {
  const users = [{ id: 'user-1' }, { id: 'user-2' }, { id: 'user-3' }];
  const records = [
    { id: 'r1', userId: 'user-2', date: '2026-08-28', period: 'EVENING', eventId: 'event-1' },
    { id: 'r2', userId: 'user-3', date: '2026-08-29', period: null, eventId: null }
  ];
  assert.deepEqual(filterAvailableUsers(users, records, { date: '2026-08-28', time: '20:00', eventId: 'event-1' }).map(item => item.id), ['user-1', 'user-3']);
});

test('usuário cria somente a própria indisponibilidade e grava ator/auditoria', async () => {
  const repo = repositoryFixture();
  const service = new UnavailabilityService(repo, { clock: () => NOW });
  const created = await service.create({ date: '2026-08-28', period: 'EVENING', note: 'Viagem' }, actor, memberProfile, { access: { level: 'NONE', canManageOthers: false } });
  assert.equal(created.userId, 'user-1');
  assert.equal(created.createdBy, 'user-1');
  assert.equal(created.updatedBy, 'user-1');
  assert.equal(created.period, 'EVENING');
  assert.equal(created.note, 'Viagem');
  assert.equal(repo.audits[0].action, 'UNAVAILABILITY_CREATED');
  await assert.rejects(
    service.create({ userId: 'user-2', date: '2026-08-28' }, actor, memberProfile, { access: { level: 'NONE', canManageOthers: false } }),
    /administrador autorizado/
  );
});

test('admin com EDIT registra para outra pessoa com confirmação rastreável no Audit Log', async () => {
  const repo = repositoryFixture({ permissionLevel: 'EDIT' });
  const service = new UnavailabilityService(repo, { clock: () => NOW });
  const access = await service.resolveAccess(actor, adminProfile);
  assert.equal(access.canManageOthers, true);
  const created = await service.create({ userId: 'user-2', date: '2026-08-30', eventId: 'event-9' }, actor, adminProfile, { access });
  assert.equal(created.userId, 'user-2');
  assert.equal(repo.audits[0].details.administrative, true);
  assert.equal(repo.audits[0].details.targetUserId, 'user-2');
});

test('somente indisponibilidade futura pode ser editada ou excluída', async () => {
  const repo = repositoryFixture({ records: [
    { id: 'past', userId: 'user-1', date: new Date(2026, 7, 20), endAt: new Date(2026, 7, 20, 23, 59, 59), period: null },
    { id: 'future', userId: 'user-1', date: new Date(2026, 7, 28), endAt: new Date(2026, 7, 28, 23, 59, 59), period: null }
  ] });
  const service = new UnavailabilityService(repo, { clock: () => NOW });
  assert.equal(isFutureRecord(repo.records[0], NOW), false);
  assert.equal(isFutureRecord(repo.records[1], NOW), true);
  await assert.rejects(service.update('past', { date: '2026-08-30' }, actor, memberProfile, { access: { level: 'NONE', canManageOthers: false } }), /Somente indisponibilidades futuras/);
  await assert.rejects(service.remove('past', actor, memberProfile, { access: { level: 'NONE', canManageOthers: false } }), /Somente indisponibilidades futuras/);
  await service.update('future', { date: '2026-08-31', period: 'MORNING' }, actor, memberProfile, { access: { level: 'NONE', canManageOthers: false } });
  assert.equal(repo.records.find(item => item.id === 'future').period, 'MORNING');
  await service.remove('future', actor, memberProfile, { access: { level: 'NONE', canManageOthers: false } });
  assert.equal(repo.records.some(item => item.id === 'future'), false);
});

test('conflito impede seleção normal e exceção administrativa exige edição de escalas e auditoria', async () => {
  const repo = repositoryFixture({ permissionLevel: 'EDIT', records: [
    { id: 'busy', userId: 'user-2', date: '2026-08-28', period: 'EVENING', eventId: 'event-1' }
  ] });
  const service = new UnavailabilityService(repo, { clock: () => NOW });
  const context = { date: '2026-08-28', time: '20:00', eventId: 'event-1' };
  await assert.rejects(service.validateScheduleSelection('user-2', context, actor, adminProfile, { access: { level: 'EDIT', canManageOthers: true } }), error => error.code === 'UNAVAILABILITY_CONFLICT');
  await assert.rejects(service.validateScheduleSelection('user-2', context, actor, adminProfile, { overrideConfirmed: true, access: { level: 'EDIT', canManageOthers: true }, scheduleAccessLevel: 'READ' }), /permissão de edição de escalas/);
  const result = await service.validateScheduleSelection('user-2', context, actor, adminProfile, { overrideConfirmed: true, access: { level: 'EDIT', canManageOthers: true }, scheduleAccessLevel: 'EDIT' });
  assert.equal(result.overridden, true);
  assert.equal(repo.audits.at(-1).action, 'UNAVAILABILITY_OVERRIDE_CONFIRMED');
});

test('SUPER_ADMIN possui gestão administrativa mesmo sem documento explícito de permissão', async () => {
  const repo = repositoryFixture();
  const service = new UnavailabilityService(repo, { clock: () => NOW });
  assert.deepEqual(await service.resolveAccess(actor, superAdminProfile), { level: 'EDIT', canManageOthers: true });
});
