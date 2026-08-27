'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { buildScheduleSlots, FALLBACK_TEMPLATE } = require('../src/repositories/event-repository.js');

const functions = [
  { id: 'fn_back', slug: 'back-vocal', name: 'Back Vocal', active: true },
  { id: 'fn_ministro', slug: 'ministro', name: 'Ministro', active: true },
  { id: 'fn_guitarra', slug: 'guitarra', name: 'Guitarra', active: true },
  { id: 'fn_violao', slug: 'violao', name: 'Violão', active: true },
  { id: 'fn_baixo', slug: 'baixo', name: 'Baixo', active: true },
  { id: 'fn_bateria', slug: 'bateria', name: 'Bateria', active: true },
  { id: 'fn_teclado', slug: 'teclado', name: 'Teclado', active: true },
  { id: 'fn_extra', slug: 'sax', name: 'Sax', active: true }
];

test('usa o template legado como fallback quando não há configuração', () => {
  const slots = buildScheduleSlots(functions, null);
  const expected = FALLBACK_TEMPLATE.reduce((sum, item) => sum + item.quantity, 0);
  assert.equal(slots.length, expected);
  assert.equal(slots.filter(slot => slot.functionId === 'fn_back').length, 4);
  assert.equal(slots.filter(slot => slot.functionId === 'fn_ministro').length, 2);
  assert.equal(slots.filter(slot => slot.functionId === 'fn_extra').length, 0);
});

test('usa apenas funções e quantidades configuradas no template administrativo', () => {
  const slots = buildScheduleSlots(functions, {
    slots: [
      { functionId: 'fn_ministro', quantity: 1 },
      { functionId: 'fn_bateria', quantity: 2 },
      { functionId: 'fn_extra', quantity: 3 }
    ]
  });
  assert.equal(slots.length, 6);
  assert.equal(slots.filter(slot => slot.functionId === 'fn_ministro').length, 1);
  assert.equal(slots.filter(slot => slot.functionId === 'fn_bateria').length, 2);
  assert.equal(slots.filter(slot => slot.functionId === 'fn_extra').length, 3);
  assert.equal(slots.filter(slot => slot.functionId === 'fn_back').length, 0);
});

test('ignora funções inativas ou inexistentes na configuração', () => {
  const scopedFunctions = functions.map(item => item.id === 'fn_extra' ? { ...item, active: false } : item);
  const slots = buildScheduleSlots(scopedFunctions, {
    slots: [
      { functionId: 'fn_extra', quantity: 2 },
      { functionId: 'nao_existe', quantity: 2 },
      { functionId: 'fn_teclado', quantity: 1 }
    ]
  });
  assert.deepEqual(slots, [{ id: 'slot_teclado_1', functionId: 'fn_teclado' }]);
});
