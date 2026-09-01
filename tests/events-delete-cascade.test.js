const test = require('node:test');
const assert = require('node:assert/strict');

const { EventService } = require('../src/services/event-service');

test('EventService.remove deletes a populated confirmed event with edit access to Events', async () => {
  const deleted = [];
  const repository = {
    async getById(id) {
      return { id, name: 'Culto', status: 'CONFIRMED', scheduleId: 'schedule_e1', setlistId: 'setlist_e1' };
    },
    async deleteEventBundle(event, actorUserId) { deleted.push({ event, actorUserId }); }
  };
  const service = new EventService(repository);
  const result = await service.remove('e1', { uid: 'admin' }, null, {
    access: { canEdit: true, canManageLinked: true }
  });

  assert.equal(result, true);
  assert.equal(deleted.length, 1);
  assert.equal(deleted[0].event.status, 'CONFIRMED');
  assert.equal(deleted[0].actorUserId, 'admin');
});

test('EventService.remove also allows final events because deletion is explicit and confirmed in UI', async () => {
  let called = false;
  const repository = {
    async getById(id) { return { id, name: 'Evento antigo', status: 'COMPLETED' }; },
    async deleteEventBundle() { called = true; }
  };
  const service = new EventService(repository);
  await service.remove('e2', { uid: 'admin' }, null, { access: { canEdit: true, canManageLinked: true } });
  assert.equal(called, true);
});

test('EventService.remove requires edit access to Events, without requiring manual edit in linked modules', async () => {
  const service = new EventService({});
  await assert.rejects(
    () => service.remove('e1', { uid: 'user' }, null, { access: { canEdit: false, canManageLinked: false } }),
    /Você não possui permissão de edição em Eventos/
  );
});
