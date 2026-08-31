const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  authorizationFailureMessage,
  isActiveProfile,
  resolveAuthorizedProfile
} = require('../src/js/modules/auth-service');

function firestoreScope({ snapshot, setError = null, permissions = {} }) {
  const firestore = () => ({
    collection(name) {
      if (name === 'users') {
        return {
          doc() {
            return {
              async get() { return snapshot; },
              async set() {
                if (setError) throw setError;
              }
            };
          }
        };
      }
      if (name === 'permissions') {
        return {
          doc(id) {
            return {
              async get() {
                const data = permissions[id];
                return data
                  ? { exists: true, data() { return data; } }
                  : { exists: false, data() { return null; } };
              }
            };
          }
        };
      }
      throw new Error(`collection inesperada: ${name}`);
    }
  });
  firestore.FieldValue = { serverTimestamp() { return new Date(); } };
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
    profile: null,
    permissionsFromCache: false
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

test('perfil existente ativo é autorizado pelo gate da aplicação com permissões efetivas', async () => {
  const userId = 'active';
  const profile = { uid: userId, active: true, role: 'MEMBER' };
  const scope = firestoreScope({
    snapshot: { exists: true, data() { return profile; } },
    permissions: {
      [`${userId}__dashboard`]: { userId, module: 'dashboard', level: 'READ' }
    }
  });

  const result = await resolveAuthorizedProfile(scope, { uid: userId });
  assert.equal(result.authorized, true);
  assert.equal(result.profile.active, true);
  assert.equal(result.profile.permissions.dashboard, 'READ');
});

test('Firestore Rules exigem perfil existente e ativo para activeUser', () => {
  const rules = fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8');
  assert.match(rules, /function hasProfile\(\) \{ return supportedProvider\(\) && exists\(profilePath\(request\.auth\.uid\)\); \}/);
  assert.match(rules, /function activeUser\(\) \{ return supportedProvider\(\) && hasProfile\(\) && profile\(\)\.data\.active == true; \}/);
  assert.doesNotMatch(rules, /function activeUser\(\) \{ return supportedProvider\(\) && \(!hasProfile\(\)/);
});

test('usuário comum não possui regra de autoativação MEMBER', () => {
  const rules = fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8');
  assert.doesNotMatch(rules, /request\.auth\.uid == userId[\s\S]{0,200}request\.resource\.data\.role == 'MEMBER'/);
  assert.match(rules, /allow create: if validCreatedUser\(userId\) && \(isSuperAdmin\(\)/);
});
