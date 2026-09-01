const test = require('node:test');
const assert = require('node:assert/strict');

const {
  EventService,
  normalizeEventInput,
  dateKey,
  assertTransition,
  sortEvents
} = require('../src/services/event-service.js');

const NOW = new Date(2026, 7, 25, 12, 0, 0);

function repositoryFixture(seed = {}) {
  const events = (seed.events || []).map(item => ({ ...item }));
  const calls = { creates: [], updates: [], deletes: [] };
  return {
    events,
    calls,
    async getPermissionLevel(_userId, moduleName) { return seed.permissions?.[moduleName] || 'NONE'; },
    async listAll() { return events.map(item => ({ ...item })); },
    async getById(id) { return events.find(item => item.id === id) || null; },
    async createEventBundle(data, actorUserId, requestId) {
      calls.creates.push({ data, actorUserId, requestId });
      const id = `event_${requestId}`;
      const existing = events.find(item => item.id === id);
      if (existing) return { ...existing, idempotent: true };
      const item = { id, ...data, scheduleId: `schedule_${id}`, setlistId: `setlist_${id}` };
      events.push(item);
      return { ...item, idempotent: false };
    },
    async updateEventBundle(id, data, actorUserId, options) {
      calls.updates.push({ id, data, actorUserId, options });
      const index = events.findIndex(item => item.id === id);
      events[index] = { ...events[index], ...data };
      return { ...events[index] };
    },
    async getDependencyCounts() { return seed.dependencies || { scheduleMembers: 0, setlistSongs: 0 }; },
    async deleteEventBundle(event, actorUserId) {
      calls.deletes.push({ event, actorUserId });
      const index = events.findIndex(item => item.id === event.id);
      if (index >= 0) events.splice(index, 1);
    }
  };
}

const actor = { uid: 'user-1' };
const profile = { role: 'ADMIN' };
const fullAccess = { events: 'EDIT', schedules: 'EDIT', setlists: 'EDIT', canRead: true, canEdit: true, canManageLinked: true };
const eventEditOnly = { events: 'EDIT', schedules: 'READ', setlists: 'READ', canRead: true, canEdit: true, canManageLinked: false };
const eventReadOnly = { events: 'READ', schedules: 'EDIT', setlists: 'EDIT', canRead: true, canEdit: false, canManageLinked: false };

test('normaliza campos obrigatórios/opcionais e valida horário/status', () => {
  const value = normalizeEventInput({ name: '  Culto da Família  ', date: '2026-08-30', time: '19:30', description: '  Celebração  ', location: '', theme: 'Família', status: 'confirmed' });
  assert.equal(value.name, 'Culto da Família');
  assert.equal(dateKey(value.date), '2026-08-30');
  assert.equal(value.time, '19:30');
  assert.equal(value.location, null);
  assert.equal(value.status, 'CONFIRMED');
  assert.throws(() => normalizeEventInput({ name: '', date: '2026-08-30' }), /Nome é obrigatório/);
  assert.throws(() => normalizeEventInput({ name: 'Evento', date: '2026-08-30', time: '25:00' }), /Horário inválido/);
  assert.throws(() => normalizeEventInput({ name: 'Evento', date: '2026-08-30', status: 'COMPLETED' }, { forCreate: true }), /iniciar como Planejado ou Confirmado/);
});

test('criação exige somente EDIT em Eventos e é idempotente por requestId', async () => {
  const repo = repositoryFixture();
  const service = new EventService(repo, { clock: () => NOW });
  await assert.rejects(service.create({ name: 'Evento', date: '2026-08-30' }, actor, profile, { access: eventReadOnly, requestId: 'blocked' }), /permissão de edição em Eventos/);
  const created = await service.create({ name: 'Evento', date: '2026-08-30' }, actor, profile, { access: eventEditOnly, requestId: 'abc' });
  assert.equal(created.id, 'event_abc');
  assert.equal(repo.calls.creates.length, 1);
  const repeated = await service.create({ name: 'Evento', date: '2026-08-30' }, actor, profile, { access: eventEditOnly, requestId: 'abc' });
  assert.equal(repeated.idempotent, true);
  assert.equal(repo.events.length, 1);
});

test('eventos podem repetir o mesmo nome em datas ou horários diferentes', async () => {
  const repo = repositoryFixture();
  const service = new EventService(repo);
  const first = await service.create({ name: 'Culto da Família', date: '2026-09-13', time: '19:00', status: 'CONFIRMED' }, actor, profile, { access: fullAccess, requestId: 'culto-13' });
  const second = await service.create({ name: 'Culto da Família', date: '2026-09-20', time: '19:00', status: 'CONFIRMED' }, actor, profile, { access: fullAccess, requestId: 'culto-20' });
  assert.equal(first.name, second.name);
  assert.notEqual(first.id, second.id);
  assert.equal(repo.events.length, 2);
  assert.deepEqual(repo.events.map(item => dateKey(item.date)), ['2026-09-13', '2026-09-20']);
});

test('mudança de data/hora/status sincroniza vínculos com EDIT apenas em Eventos; metadados isolados não regravam vínculos', async () => {
  const repo = repositoryFixture({ events: [{ id: 'event-1', name: 'Culto', date: new Date(2026, 7, 30, 12), time: '19:00', description: null, location: null, theme: null, status: 'PLANNED', scheduleId: 'schedule_event-1', setlistId: 'setlist_event-1' }] });
  const service = new EventService(repo);
  await service.update('event-1', { name: 'Culto especial' }, actor, profile, { access: eventEditOnly });
  assert.equal(repo.calls.updates[0].options.syncLinked, false);
  await service.update('event-1', { date: '2026-08-31', time: '20:00', status: 'CONFIRMED' }, actor, profile, { access: eventEditOnly });
  assert.equal(repo.calls.updates.at(-1).options.syncLinked, true);
  assert.equal(dateKey(repo.calls.updates.at(-1).data.date), '2026-08-31');
});

test('cancelados e concluídos ficam imutáveis no histórico e transições finais são protegidas', async () => {
  assert.throws(() => assertTransition('CANCELLED', 'PLANNED'), /não pode mudar/);
  const repo = repositoryFixture({ events: [{ id: 'done', name: 'Finalizado', date: NOW, status: 'COMPLETED', scheduleId: 'schedule_done', setlistId: 'setlist_done' }] });
  const service = new EventService(repo);
  await assert.rejects(service.update('done', { name: 'Alterado' }, actor, profile, { access: fullAccess }), /somente no histórico/);
});

test('exclusão física remove o bundle com EDIT apenas em Eventos', async () => {
  const populated = { id: 'event-1', name: 'Culto', date: NOW, status: 'CONFIRMED', scheduleId: 'schedule_event-1', setlistId: 'setlist_event-1' };
  const repo = repositoryFixture({ events: [populated], dependencies: { scheduleMembers: 4, setlistSongs: 6 } });
  await new EventService(repo).remove('event-1', actor, profile, { access: eventEditOnly });
  assert.equal(repo.calls.deletes.length, 1);
  assert.equal(repo.events.length, 0);
  await assert.rejects(new EventService(repositoryFixture({ events: [populated] })).remove('event-1', actor, profile, { access: eventReadOnly }), /permissão de edição em Eventos/);
});

test('resolveAccess considera EDIT em Eventos suficiente para gerir o bundle automático', async () => {
  const repo = repositoryFixture({ permissions: { events: 'EDIT', schedules: 'NONE', setlists: 'NONE' } });
  const access = await new EventService(repo).resolveAccess(actor, profile);
  assert.equal(access.canEdit, true);
  assert.equal(access.canManageLinked, true);
  assert.equal(access.schedules, 'NONE');
  assert.equal(access.setlists, 'NONE');
});

test('SUPER_ADMIN recebe acesso completo e listagem é ordenada por data/horário', async () => {
  const repo = repositoryFixture({ events: [
    { id: 'b', name: 'B', date: '2026-09-01', time: '20:00', status: 'PLANNED' },
    { id: 'a', name: 'A', date: '2026-08-30', time: '19:00', status: 'PLANNED' }
  ] });
  const service = new EventService(repo);
  const access = await service.resolveAccess(actor, { role: 'SUPER_ADMIN' });
  assert.equal(access.canManageLinked, true);
  const list = await service.list(actor, { role: 'SUPER_ADMIN' }, { access });
  assert.deepEqual(list.map(item => item.id), ['a', 'b']);
  assert.deepEqual(sortEvents(repo.events).map(item => item.id), ['a', 'b']);
});
