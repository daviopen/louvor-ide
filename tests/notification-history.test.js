const test = require('node:test');
const assert = require('node:assert/strict');
const { NotificationRepository } = require('../src/repositories/notification-repository');
const { NotificationService, safeNotificationUrl } = require('../src/services/notification-service');

test('latest query orders in Firestore before limiting and scopes owner and cursor', async () => {
  const calls = [];
  const query = {};
  for (const name of ['collection', 'where', 'orderBy', 'limit', 'startAfter']) query[name] = (...args) => { calls.push([name, ...args]); return query; };
  query.get = async () => ({ docs: [{ id: 'a', data: () => ({ userId: 'u', read: true }) }] });
  const repo = new NotificationRepository(query, () => 'u');
  const result = await repo.list('u', { pageSize: 5, cursor: 'cursor' });
  assert.deepEqual(calls, [['collection', 'notifications'], ['where', 'userId', '==', 'u'], ['orderBy', 'createdAt', 'desc'], ['limit', 5], ['startAfter', 'cursor']]);
  assert.equal(result.items[0].read, true);
  await assert.rejects(repo.list('other'));
});

test('history retains read rows, paginates, deduplicates, and refreshes', async () => {
  let count = 0;
  const repo = { list: async (uid, options) => {
    count++;
    if (count === 2) assert.equal(options.cursor, 'a');
    return { items: [{ id: count === 1 ? 'a' : 'b', userId: uid, read: true }], cursor: count === 1 ? 'a' : 'b' };
  } };
  const service = new NotificationService(repo, 'u');
  assert.equal((await service.load({ pageSize: 1 })).length, 1);
  assert.equal(service.hasMore, true);
  assert.equal((await service.load({ append: true, pageSize: 1 })).length, 2);
  assert.equal((await service.load({ pageSize: 5 })).length, 1);
  assert.equal(service.hasMore, false);
});

test('read failure leaves unread, successful read survives stale load and rejects other owners', async () => {
  let fail = true;
  const repo = {
    list: async () => ({ items: [{ id: 'a', userId: 'u', read: false }], cursor: null }),
    markRead: async () => { if (fail) throw new Error('offline'); }
  };
  const service = new NotificationService(repo, 'u');
  const [item] = await service.load();
  await assert.rejects(service.markRead(item));
  assert.equal(item.read, false);
  fail = false;
  await service.markRead(item);
  assert.equal(item.read, true);
  assert.equal((await service.load())[0].read, true);
  await assert.rejects(service.markRead({ id: 'b', userId: 'other', read: false }));
});

test('unsafe and external notification destinations stay on Mural', () => {
  const base = 'https://louvor-ide.web.app/index.html';
  for (const value of ['javascript:alert(1)', 'https://attacker.example', '//attacker.example', 'data:text/html,x']) {
    assert.equal(safeNotificationUrl(value, base), 'https://louvor-ide.web.app/mural.html');
  }
  assert.equal(safeNotificationUrl('/module.html?section=schedules', base), 'https://louvor-ide.web.app/module.html?section=schedules');
});
