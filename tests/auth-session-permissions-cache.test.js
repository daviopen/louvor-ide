const test = require('node:test');
const assert = require('node:assert/strict');

const {
  AUTHORIZATION_CACHE_KEY,
  clearAuthorizationCache,
  readAuthorizationCache,
  resolveAuthorizedProfile,
  writeAuthorizationCache
} = require('../src/js/modules/auth-service');

function createSessionStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); }
  };
}

function snapshot(exists, data = null) {
  return { exists, data() { return data; } };
}

test('cache de autorização é isolado por usuário e vive somente na sessão', () => {
  const sessionStorage = createSessionStorage();
  const scope = { sessionStorage };
  const profile = {
    uid: 'member-1',
    active: true,
    role: 'MEMBER',
    permissions: { dashboard: 'READ', schedules: 'EDIT' }
  };

  assert.equal(writeAuthorizationCache(scope, 'member-1', profile), true);
  assert.ok(sessionStorage.getItem(AUTHORIZATION_CACHE_KEY));
  assert.deepEqual(readAuthorizationCache(scope, 'member-1'), profile);
  assert.equal(readAuthorizationCache(scope, 'member-2'), null);

  clearAuthorizationCache(scope);
  assert.equal(readAuthorizationCache(scope, 'member-1'), null);
});

test('navegação reutiliza permissões hidratadas sem reler os 9 slots', async () => {
  const userId = 'member-1';
  let profileReads = 0;
  let permissionReads = 0;
  const database = {
    collection(name) {
      if (name === 'users') {
        return {
          doc(id) {
            assert.equal(id, userId);
            return {
              async get() {
                profileReads += 1;
                return snapshot(true, {
                  uid: userId,
                  name: 'Pessoa Teste',
                  active: true,
                  role: 'MEMBER'
                });
              }
            };
          }
        };
      }
      if (name === 'permissions') {
        permissionReads += 1;
        throw new Error('permissões não deveriam ser recarregadas durante a navegação');
      }
      throw new Error(`collection inesperada: ${name}`);
    }
  };
  const scope = { firebase: { firestore: () => database } };
  const cachedProfile = {
    uid: userId,
    active: true,
    role: 'MEMBER',
    permissions: { dashboard: 'READ', schedules: 'EDIT' }
  };

  const authorization = await resolveAuthorizedProfile(scope, { uid: userId }, { cachedProfile });

  assert.equal(authorization.authorized, true);
  assert.equal(authorization.permissionsFromCache, true);
  assert.deepEqual(authorization.profile.permissions, cachedProfile.permissions);
  assert.equal(profileReads, 1, 'perfil ativo ainda deve ser revalidado em cada página');
  assert.equal(permissionReads, 0, 'permissões devem vir da sessão após o login');
});

test('cache nunca libera perfil inativo', () => {
  const sessionStorage = createSessionStorage();
  const scope = { sessionStorage };
  sessionStorage.setItem(AUTHORIZATION_CACHE_KEY, JSON.stringify({
    version: 1,
    userId: 'member-1',
    profile: { uid: 'member-1', active: false, role: 'MEMBER', permissions: { dashboard: 'READ' } }
  }));

  assert.equal(readAuthorizationCache(scope, 'member-1'), null);
});

test('alteração do perfil invalida permissões antigas da sessão', async () => {
  const userId = 'member-1';
  let permissionReads = 0;
  const database = {
    collection(name) {
      if (name === 'users') return { doc: () => ({ get: async () => snapshot(true, {
        uid: userId, active: true, role: 'MEMBER', accessProfile: 'PARTICIPANT',
        permissions: { dashboard: 'READ', schedules: 'READ' }, updatedAt: { seconds: 2, nanoseconds: 0 }
      }) }) };
      if (name === 'permissions') return { doc: () => ({ get: async () => { permissionReads += 1; return snapshot(false); } }) };
      throw new Error(`collection inesperada: ${name}`);
    }
  };
  const cachedProfile = {
    uid: userId, active: true, role: 'MEMBER', accessProfile: 'MINISTER',
    permissions: { dashboard: 'READ' }, updatedAt: { seconds: 1, nanoseconds: 0 }
  };
  const authorization = await resolveAuthorizedProfile({ firebase: { firestore: () => database } }, { uid: userId }, { cachedProfile });
  assert.equal(authorization.permissionsFromCache, false);
  assert.equal(authorization.profile.permissions.schedules, 'READ');
  assert.equal(permissionReads, 9);
});

test('perfil canônico hidrata READ mesmo sem espelhos materializados', async () => {
  const userId = 'participant-1';
  const database = {
    collection(name) {
      if (name === 'users') return { doc: () => ({ get: async () => snapshot(true, {
        uid: userId, active: true, role: 'MEMBER', accessProfile: 'PARTICIPANT'
      }) }) };
      if (name === 'permissions') return { doc: () => ({ get: async () => snapshot(false) }) };
      throw new Error(`collection inesperada: ${name}`);
    }
  };
  const accessProfiles = require('../src/js/modules/access-profiles.js');
  const scope = { firebase: { firestore: () => database }, MusicIdeAccessProfiles: accessProfiles };
  const authorization = await resolveAuthorizedProfile(scope, { uid: userId });
  assert.equal(authorization.profile.permissions.schedules, 'READ');
  assert.equal(authorization.profile.permissions.users, undefined);
});
