const test = require('node:test');
const assert = require('node:assert/strict');
const { buildDefaultSlots, DEFAULT_SCHEDULE_TEMPLATE } = require('../src/repositories/schedule-repository.js');

const functions = [
  { id: 'fn_ministro', slug: 'ministro', active: true },
  { id: 'fn_back', slug: 'back-vocal', active: true },
  { id: 'fn_guitarra', slug: 'guitarra', active: true },
  { id: 'fn_violao', slug: 'violao', active: true },
  { id: 'fn_baixo', slug: 'baixo', active: true },
  { id: 'fn_bateria', slug: 'bateria', active: true },
  { id: 'fn_teclado', slug: 'teclado', active: true },
  { id: 'fn_sax', slug: 'sax', active: true },
  { id: 'fn_dm', slug: 'dm', active: true }
];

test('template padrão cria 4 backs, 2 ministros e 1 de cada instrumento principal', () => {
  const slots = buildDefaultSlots(functions);
  assert.equal(slots.length, 11);
  const counts = slots.reduce((acc, slot) => {
    acc[slot.functionId] = (acc[slot.functionId] || 0) + 1;
    return acc;
  }, {});
  assert.equal(counts.fn_back, 4);
  assert.equal(counts.fn_ministro, 2);
  assert.equal(counts.fn_guitarra, 1);
  assert.equal(counts.fn_violao, 1);
  assert.equal(counts.fn_baixo, 1);
  assert.equal(counts.fn_bateria, 1);
  assert.equal(counts.fn_teclado, 1);
  assert.equal(counts.fn_sax, undefined);
  assert.equal(counts.fn_dm, undefined);
});

test('template ignora função padrão inexistente ou inativa sem bloquear criação da escala', () => {
  const slots = buildDefaultSlots(functions.filter(item => item.slug !== 'guitarra').map(item => item.slug === 'teclado' ? { ...item, active: false } : item));
  assert.equal(slots.some(slot => slot.functionId === 'fn_guitarra'), false);
  assert.equal(slots.some(slot => slot.functionId === 'fn_teclado'), false);
});

test('configuração do template permanece declarativa e flexível', () => {
  assert.deepEqual(DEFAULT_SCHEDULE_TEMPLATE.map(item => [item.slug, item.quantity]), [
    ['back-vocal', 4], ['ministro', 2], ['guitarra', 1], ['violao', 1], ['baixo', 1], ['bateria', 1], ['teclado', 1]
  ]);
});
