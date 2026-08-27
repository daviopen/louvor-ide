const test = require('node:test');
const assert = require('node:assert/strict');

const {
  isTransientAuthorizationError,
  withAuthorizationRetry
} = require('../src/js/modules/auth-service');

test('classifica falhas transitórias de rede/Firestore sem tratá-las como revogação de sessão', () => {
  const transientCodes = [
    'auth/network-request-failed',
    'firestore/unavailable',
    'unavailable',
    'firestore/deadline-exceeded',
    'deadline-exceeded',
    'firestore/aborted',
    'aborted',
    'firestore/resource-exhausted',
    'resource-exhausted',
    'app/firestore-unavailable'
  ];

  transientCodes.forEach(code => {
    assert.equal(isTransientAuthorizationError({ code }), true, `${code} deveria ser transitório`);
  });

  assert.equal(isTransientAuthorizationError({ code: 'permission-denied' }), false);
  assert.equal(isTransientAuthorizationError({ code: 'auth/user-disabled' }), false);
});

test('repete a validação de autorização após erro transitório', async () => {
  let attempts = 0;
  const result = await withAuthorizationRetry(async () => {
    attempts += 1;
    if (attempts === 1) {
      const error = new Error('temporariamente indisponível');
      error.code = 'firestore/unavailable';
      throw error;
    }
    return { authorized: true };
  }, {
    maxAttempts: 2,
    delayMs: 0,
    sleep: async () => {}
  });

  assert.equal(attempts, 2);
  assert.deepEqual(result, { authorized: true });
});

test('não repete erro definitivo de autorização', async () => {
  let attempts = 0;

  await assert.rejects(
    withAuthorizationRetry(async () => {
      attempts += 1;
      const error = new Error('negado');
      error.code = 'permission-denied';
      throw error;
    }, {
      maxAttempts: 3,
      delayMs: 0,
      sleep: async () => {}
    }),
    /negado/
  );

  assert.equal(attempts, 1);
});
