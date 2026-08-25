const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  authorizationFailureMessage,
  isActiveProfile,
  resolveAuthorizedProfile
} = require('../src/js/modules/auth-service');

const rules = fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8');

function firestoreScope({ snapshot, setError = null }) {
  const profileRef = {
    async get() { return snapshot; },
    async set() {
      if (setError) throw setError;
    }
  };

  function firestore() {
    return {
      collection(name) {
        assert.equal(name, 'users');
        return {
          doc() { return profileRef; }
        };
      }
    };
  }
  firestore.FieldValue = { serverTimestamp: () => 'server-time' };

  return { firebase: { firestore } };
}

test('perfil só é ativo com active=true explícito', () => {
  assert.equal(isActiveProfile({ active: true }), true);
  assert.equal(isActiveProfile({ active: false }), false);
  assert.equal(isActiveProfile({}), false);
  assert.equal(isActiveProfile(null), false);
});

test('conta sem perfil não é autorizada quando bootstrap é negado pelas Rules', async () => {
  const scope = firestoreScope({
    snapshot: { exists: false, data() { return null; } },
    setError: { code: 'permission-denied' }
  });

  const result = await resolveAuthorizedProfile(scope, {
    uid: 'user-sem-perfil',
    email: 'pessoa@example.com',
    displayName: 'Pessoa'
  });

  assert.deepEqual(result, {
    authorized: false,
    reason: 'not-provisioned',
    profile: null
  });
  assert.match(authorizationFailureMessage(result.reason), /não foi liberada/i);
});

test('perfil existente inativo é rejeitado pelo gate da aplicação', async () => {
  const profile = { uid: 'inactive', active: false, role: 'MEMBER' };
  const scope = firestoreScope({
    snapshot: { exists: true, data() { return profile; } }
  });

  const result = await resolveAuthorizedProfile(scope, { uid: 'inactive' });
  assert.equal(result.authorized, false);
  assert.equal(result.reason, 'inactive');
  assert.equal(result.profile, profile);
});

test('perfil existente ativo é autorizado pelo gate da aplicação', async () => {
  const profile = { uid: 'active', active: true, role: 'MEMBER' };
  const scope = firestoreScope({
    snapshot: { exists: true, data() { return profile; } }
  });

  const result = await resolveAuthorizedProfile(scope, { uid: 'active' });
  assert.equal(result.authorized, true);
  assert.equal(result.profile, profile);
});

test('Firestore Rules exigem perfil existente e ativo para activeUser', () => {
  const start = rules.indexOf('function activeUser()');
  const end = rules.indexOf('function hasRole', start);
  const block = rules.slice(start, end);

  assert.match(block, /hasProfile\(\)/);
  assert.match(block, /profile\(\)\.data\.active == true/);
  assert.doesNotMatch(block, /!hasProfile\(\)/);
});

test('usuário comum não possui regra de autoativação MEMBER', () => {
  const start = rules.indexOf('match /users/{userId}');
  const end = rules.indexOf('match /permissions/', start);
  const block = rules.slice(start, end);

  assert.match(block, /allow create: if validCreatedUser\(userId\)/);
  assert.match(block, /isSuperAdmin\(\)/);
  assert.match(block, /isAdmin\(\).*request\.resource\.data\.role == 'MEMBER'/s);
  assert.doesNotMatch(block, /request\.auth\.uid == userId && activeUser\(\)/);
});
