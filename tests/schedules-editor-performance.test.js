const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ScheduleService, sortSlotsByFunction } = require('../src/services/schedule-service.js');

test('editor usa carregamento direcionado em vez da listagem completa', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/js/modules/schedules-page.js'), 'utf8');
  assert.match(source, /service\.loadEditor\(state\.scheduleId/);
});

test('remoções atualizam a interface antes de aguardar o Firestore', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/js/modules/schedules-page.js'), 'utf8');
  const removeSlotOptimistic = source.indexOf('schedule.slots=beforeSlots.filter(item=>item.id!==slotId)');
  const removeSlotPersist = source.indexOf('await service.removeSlot(schedule.id,slotId');
  const removeMemberOptimistic = source.indexOf('schedule.members=beforeMembers.filter(item=>item.id!==memberId)');
  const removeMemberPersist = source.indexOf('await service.removeMember(schedule.id,memberId');

  assert.ok(removeSlotOptimistic >= 0, 'remoção otimista da função deve existir');
  assert.ok(removeSlotPersist > removeSlotOptimistic, 'função deve sair da UI antes da persistência remota');
  assert.ok(removeMemberOptimistic >= 0, 'remoção otimista da pessoa deve existir');
  assert.ok(removeMemberPersist > removeMemberOptimistic, 'pessoa deve sair da UI antes da persistência remota');
  assert.match(source, /schedule\.slots=beforeSlots;\s*schedule\.members=beforeMembers;/, 'falha ao remover função deve restaurar o estado anterior');
  assert.match(source, /schedule\.members=beforeMembers;\s*recomputeSchedule\(schedule\);\s*renderEditorView\(\);\s*throw error;/, 'falha ao remover pessoa deve restaurar o estado anterior');
});

test('loadEditor não lê todas as escalas nem todos os integrantes', async () => {
  const calls = { listSchedules: 0, listAllMembers: 0, getSchedule: 0, listMembers: 0, getEvent: 0 };
  const repository = {
    async getPermissionLevel() { return 'EDIT'; },
    async getSchedule(id) { calls.getSchedule += 1; return { id, eventId: 'event_1', slots: [{ id: 'slot_1', functionId: 'fn_back' }] }; },
    async getEvent() { calls.getEvent += 1; return { id: 'event_1', name: 'Culto', date: '2026-09-01', time: '20:00' }; },
    async listMembers() { calls.listMembers += 1; return []; },
    async listActiveUsers() { return []; },
    async listActiveFunctions() { return []; },
    async listUserFunctions() { return []; },
    async listUnavailability() { return []; },
    async listSchedules() { calls.listSchedules += 1; return []; },
    async listAllMembers() { calls.listAllMembers += 1; return []; }
  };
  const service = new ScheduleService(repository);
  const data = await service.loadEditor('schedule_event_1', { uid: 'admin' }, { role: 'SUPER_ADMIN' });
  assert.equal(data.schedules.length, 1);
  assert.equal(calls.getSchedule, 1);
  assert.equal(calls.getEvent, 1);
  assert.equal(calls.listMembers, 1);
  assert.equal(calls.listSchedules, 0);
  assert.equal(calls.listAllMembers, 0);
});

test('posições repetidas ficam agrupadas conforme a ordem das funções', () => {
  const functions = [
    { id: 'fn_dm', order: 1 },
    { id: 'fn_ministro', order: 2 },
    { id: 'fn_back', order: 3 },
    { id: 'fn_violao', order: 4 }
  ];
  const slots = [
    { id: 'dm', functionId: 'fn_dm' },
    { id: 'ministro_1', functionId: 'fn_ministro' },
    { id: 'back_1', functionId: 'fn_back' },
    { id: 'back_2', functionId: 'fn_back' },
    { id: 'ministro_2', functionId: 'fn_ministro' },
    { id: 'violao', functionId: 'fn_violao' }
  ];
  assert.deepEqual(sortSlotsByFunction(slots, functions).map(item => item.id), [
    'dm', 'ministro_1', 'ministro_2', 'back_1', 'back_2', 'violao'
  ]);
});
