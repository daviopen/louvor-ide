'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { NotificationOutboxRepository, normalizeChannels, normalizeIds } = require('../src/repositories/notification-outbox-repository.js');
const { composeRules } = require('../src/scripts/build-firestore-rules.cjs');

function fakeDb() {
  const writes = [];
  return {
    writes,
    collection(name) {
      assert.equal(name, 'notificationOutbox');
      return {
        async add(document) {
          writes.push(document);
          return { id: 'outbox_1' };
        }
      };
    }
  };
}

test('normaliza canais e destinatários da outbox', () => {
  assert.deepEqual(normalizeChannels({ push: true, email: 1, calendar: true }), {
    push: true,
    email: false,
    calendar: true
  });
  assert.deepEqual(normalizeIds(['u1', 'u1', '', ' u2 ']), ['u1', 'u2']);
});

test('grava item PENDING com contrato mínimo e sem credenciais', async () => {
  const db = fakeDb();
  const clock = () => new Date('2026-09-02T19:00:00.000Z');
  const repository = new NotificationOutboxRepository(db, { clock });
  const item = await repository.enqueue({
    type: 'SCHEDULE_MEMBER_ASSIGNED',
    aggregateType: 'schedule',
    scheduleId: 'schedule_event_1',
    eventId: 'event_1',
    targetUserIds: ['user_1'],
    channels: { push: true, email: true, calendar: true },
    payload: { functionId: 'fn_ministro' }
  }, 'admin_1');

  assert.equal(item.id, 'outbox_1');
  assert.equal(item.status, 'PENDING');
  assert.equal(item.attempts, 0);
  assert.equal(item.actorUserId, 'admin_1');
  assert.deepEqual(item.targetUserIds, ['user_1']);
  assert.equal(db.writes.length, 1);
  assert.equal(db.writes[0].channels.calendar, true);
  assert.equal(db.writes[0].createdAt.toISOString(), '2026-09-02T19:00:00.000Z');
});

test('rejeita tipos não suportados antes de escrever no Firestore', async () => {
  const db = fakeDb();
  const repository = new NotificationOutboxRepository(db);
  await assert.rejects(() => repository.enqueue({
    type: 'UNKNOWN', aggregateType: 'schedule', scheduleId: 's1'
  }, 'admin_1'), /não suportado/i);
  assert.equal(db.writes.length, 0);
});

test('composer insere regras de notificações antes do fallback exatamente uma vez', () => {
  const base = "rules_version = '2';\nservice cloud.firestore {\n  match /databases/{database}/documents {\n    match /{document=**} { allow read, write: if false; }\n  }\n}\n";
  const fragment = '    match /notificationOutbox/{documentId} { allow create: if true; }';
  const composed = composeRules(base, fragment);
  assert.ok(composed.indexOf('notificationOutbox') < composed.indexOf('match /{document=**}'));
  assert.equal((composed.match(/notificationOutbox/g) || []).length, 1);
  assert.equal(composeRules(composed, fragment), composed);
});
