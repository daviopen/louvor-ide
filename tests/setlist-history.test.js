const test = require('node:test');
const assert = require('node:assert/strict');
const history = require('../src/services/setlist-history-service.js');

test('separa próximos e histórico considerando data e status', () => {
  const today = new Date('2026-08-25T12:00:00');
  const items = [
    { id: 'past', date: '2026-08-20', status: 'DRAFT' },
    { id: 'future', date: '2026-09-01', status: 'DRAFT' },
    { id: 'cancelled', date: '2026-09-02', status: 'CANCELLED' }
  ];
  const result = history.split(items, today);
  assert.deepEqual(result.upcoming.map(item => item.id), ['future']);
  assert.deepEqual(result.history.map(item => item.id), ['cancelled', 'past']);
});

test('normaliza evento, músicas, ministro, participantes e Dress Code para listagem', () => {
  const users = new Map([['u1', { name: 'Marina' }]]);
  const library = new Map([['s1', { title: 'Bondade de Deus' }]]);
  const item = history.normalizeItem(
    { id: 'set1', eventId: 'e1', eventDate: '2026-08-20', dressCodeColors: ['#d8ff45', '#FFFFFF', '#ffffff', 'inválida'] },
    { event: { name: 'Culto da Família', theme: 'Gratidão' }, songs: [{ songId: 's1', ministerUserId: 'u1' }], users, library, participantNames: ['Davi Alves', 'Davi Alves', 'Rogério Barbosa'] }
  );
  assert.equal(item.name, 'Culto da Família');
  assert.deepEqual(item.ministerNames, ['Marina']);
  assert.deepEqual(item.participantNames, ['Davi Alves', 'Rogério Barbosa']);
  assert.deepEqual(item.songTitles, ['Bondade de Deus']);
  assert.equal(item.theme, 'Gratidão');
  assert.deepEqual(item.dressCodeColors, ['#D8FF45', '#FFFFFF']);
});

test('limita Dress Code a três cores hexadecimais válidas', () => {
  assert.deepEqual(
    history.normalizeDressCodeColors(['#111111', '#222222', '#333333', '#444444', 'red']),
    ['#111111', '#222222', '#333333']
  );
});

test('aplica filtros combinados de setlists', () => {
  const items = [{
    dateKey: '2026-08-20', name: 'Culto da Família', event: { name: 'Culto da Família' },
    ministerNames: ['Marina Oliveira'], participantNames: ['Davi Alves', 'Rogério Barbosa'],
    songTitles: ['Bondade de Deus'], theme: 'Gratidão', status: 'READY'
  }];
  assert.equal(history.filter(items, {
    from: '2026-08-01', to: '2026-08-31', event: 'família', minister: 'marina',
    participant: 'rogério', status: 'READY', song: 'bondade', theme: 'gratidão'
  }).length, 1);
  assert.equal(history.filter(items, { participant: 'outro' }).length, 0);
  assert.equal(history.filter(items, { status: 'DRAFT' }).length, 0);
});

test('pagina resultados preservando limites', () => {
  const items = Array.from({ length: 19 }, (_, index) => ({ id: index + 1 }));
  const page = history.paginate(items, 3, 8);
  assert.equal(page.page, 3);
  assert.equal(page.totalPages, 3);
  assert.equal(page.items.length, 3);
  assert.deepEqual(page.items.map(item => item.id), [17, 18, 19]);
});
