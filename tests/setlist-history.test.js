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

test('normaliza evento, músicas, artista e ministro para filtros', () => {
  const users = new Map([['u1', { name: 'Marina' }]]);
  const library = new Map([['s1', { title: 'Bondade de Deus', artist: 'Isaías Saad' }]]);
  const item = history.normalizeItem(
    { id: 'set1', eventId: 'e1', eventDate: '2026-08-20' },
    { event: { name: 'Culto da Família', theme: 'Gratidão' }, songs: [{ songId: 's1', ministerUserId: 'u1' }], users, library }
  );
  assert.equal(item.name, 'Culto da Família');
  assert.deepEqual(item.ministerNames, ['Marina']);
  assert.deepEqual(item.songTitles, ['Bondade de Deus']);
  assert.deepEqual(item.artists, ['Isaías Saad']);
  assert.equal(item.theme, 'Gratidão');
});

test('aplica filtros combinados do histórico', () => {
  const items = [{
    dateKey: '2026-08-20', name: 'Culto da Família', event: { name: 'Culto da Família' },
    ministerNames: ['Marina Oliveira'], songTitles: ['Bondade de Deus'], artists: ['Isaías Saad'], theme: 'Gratidão'
  }];
  assert.equal(history.filter(items, { from: '2026-08-01', to: '2026-08-31', event: 'família', minister: 'marina', song: 'bondade', artist: 'isaías', theme: 'gratidão' }).length, 1);
  assert.equal(history.filter(items, { minister: 'outro' }).length, 0);
});

test('pagina resultados preservando limites', () => {
  const items = Array.from({ length: 19 }, (_, index) => ({ id: index + 1 }));
  const page = history.paginate(items, 3, 8);
  assert.equal(page.page, 3);
  assert.equal(page.totalPages, 3);
  assert.equal(page.items.length, 3);
  assert.deepEqual(page.items.map(item => item.id), [17, 18, 19]);
});
