const test = require('node:test');
const assert = require('node:assert/strict');

const {
  AUTHORIZATION_CACHE_KEY,
  clearAuthorizationCache,
  readAuthorizationCache,
  resolveAuthorizedProfile,
  writeAuthorizationCache
} = require('../src/js/modules/auth-service');

const accessProfiles = require('../src/js/modules/access-profiles.js');

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

function createScopeWithProfile(userId, profile, counters = {}) {
  const database = {
    collection(name) {
      if (name === 'users') {
        return {
          doc(id) {
            assert.equal(id, userId);
            return {
              async get() {
                counters.profileReads = (counters.profileReads || 0) + 1;
                return snapshot(true, profile);
              }
            };
          }
        };
      }
      if (name === 'permissions') {
        counters.permissionReads = (counters.permissionReads || 0) + 1;
        throw new Error('bootstrap não deve consultar a coleção permissions');
      }
      throw new Error(`collection inesperada: ${name}`);
    }
  };
  return {
    firebase: { firestore: () => database },
    MusicIdeAccessProfiles: accessProfiles
  };
}

test('cache de autorização é isolado por usuário e vive somente na sessão', () => {
  const sessionStorage = createSessionStorage();
  const scope = { sessionStorage };
  const profile = {
    uid: 'member-1',
    active: true,
    role: 'MEMBER',
    accessProfile: 'LEADER',
    permissions: { dashboard: 'READ', schedules: 'EDIT' }
  };

  assert.equal(writeAuthorizationCache(scope, 'member-1', profile), true);
  assert.ok(sessionStorage.getItem(AUTHORIZATION_CACHE_KEY));
  assert.deepEqual(readAuthorizationCache(scope, 'member-1'), profile);
  assert.equal(readAuthorizationCache(scope, 'member-2'), null);

  clearAuthorizationCache(scope);
  assert.equal(readAuthorizationCache(scope, 'member-1'), null);
});

test('navegação reutiliza permissões hidratadas com apenas uma leitura do perfil', async () => {
  const userId = 'member-1';
  const counters = { profileReads: 0, permissionReads: 0 };
  const liveProfile = {
    uid: userId,
    name: 'Pessoa Teste',
    active: true,
    role: 'MEMBER',
    accessProfile: 'LEADER',
    updatedAt: { seconds: 5, nanoseconds: 0 }
  };
  const scope = createScopeWithProfile(userId, liveProfile, counters);
  const cachedProfile = {
    ...liveProfile,
    permissions: { dashboard: 'READ', schedules: 'EDIT' }
  };

  const authorization = await resolveAuthorizedProfile(scope, { uid: userId }, { cachedProfile });

  assert.equal(authorization.authorized, true);
  assert.equal(authorization.permissionsFromCache, true);
  assert.deepEqual(authorization.profile.permissions, cachedProfile.permissions);
  assert.equal(counters.profileReads, 1, 'perfil ativo deve ser revalidado em cada página');
  assert.equal(counters.permissionReads, 0, 'bootstrap nunca deve reler os 9 documentos técnicos');
});

test('sessão nova deriva permissões do accessProfile sem consultar os 9 slots', async () => {
  const userId = 'minister-1';
  const counters = { profileReads: 0, permissionReads: 0 };
  const scope = createScopeWithProfile(userId, {
    uid: userId,
    active: true,
    role: 'MEMBER',
    accessProfile: 'MINISTER',
    updatedAt: { seconds: 1, nanoseconds: 0 }
  }, counters);

  const authorization = await resolveAuthorizedProfile(scope, { uid: userId });

  assert.equal(authorization.authorized, true);
  assert.equal(authorization.permissionsFromCache, false);
  assert.equal(authorization.profile.permissions.schedules, 'READ');
  assert.equal(authorization.profile.permissions.setlists, 'EDIT');
  assert.equal(authorization.profile.permissions.songs, 'EDIT');
  assert.equal(counters.profileReads, 1);
  assert.equal(counters.permissionReads, 0);
});

test('cache nunca libera perfil inativo', () => {
  const sessionStorage = createSessionStorage();
  const scope = { sessionStorage };
  sessionStorage.setItem(AUTHORIZATION_CACHE_KEY, JSON.stringify({
    version: 1,
    userId: 'member-1',
    profile: { uid: 'member-1', active: false, role: 'MEMBER', accessProfile: 'PARTICIPANT', permissions: { dashboard: 'READ' } }
  }));

  assert.equal(readAuthorizationCache(scope, 'member-1'), null);
});

test('alteração do perfil invalida cache e recalcula localmente sem leituras técnicas', async () => {
  const userId = 'member-1';
  const counters = { profileReads: 0, permissionReads: 0 };
  const scope = createScopeWithProfile(userId, {
    uid: userId,
    active: true,
    role: 'MEMBER',
    accessProfile: 'PARTICIPANT',
    updatedAt: { seconds: 2, nanoseconds: 0 }
  }, counters);
  const cachedProfile = {
    uid: userId,
    active: true,
    role: 'MEMBER',
    accessProfile: 'MINISTER',
    permissions: { dashboard: 'READ', setlists: 'EDIT' },
    updatedAt: { seconds: 1, nanoseconds: 0 }
  };

  const authorization = await resolveAuthorizedProfile(scope, { uid: userId }, { cachedProfile });

  assert.equal(authorization.permissionsFromCache, false);
  assert.equal(authorization.profile.permissions.schedules, 'READ');
  assert.equal(authorization.profile.permissions.setlists, 'READ');
  assert.equal(counters.profileReads, 1);
  assert.equal(counters.permissionReads, 0);
});

test('perfil canônico hidrata READ mesmo sem espelhos materializados', async () => {
  const userId = 'participant-1';
  const counters = { profileReads: 0, permissionReads: 0 };
  const scope = createScopeWithProfile(userId, {
    uid: userId,
    active: true,
    role: 'MEMBER',
    accessProfile: 'PARTICIPANT'
  }, counters);

  const authorization = await resolveAuthorizedProfile(scope, { uid: userId });

  assert.equal(authorization.profile.permissions.schedules, 'READ');
  assert.equal(authorization.profile.permissions.users, undefined);
  assert.equal(counters.permissionReads, 0);
});

test('perfil desconhecido não ganha acesso por espelhos antigos', async () => {
  const userId = 'legacy-1';
  const counters = { profileReads: 0, permissionReads: 0 };
  const scope = createScopeWithProfile(userId, {
    uid: userId,
    active: true,
    role: 'MEMBER',
    accessProfile: 'LEGACY',
    permissions: { dashboard: 'EDIT', users: 'EDIT' }
  }, counters);

  const authorization = await resolveAuthorizedProfile(scope, { uid: userId });

  assert.equal(authorization.authorized, false);
  assert.equal(authorization.reason, 'invalid-profile');
  assert.equal(counters.profileReads, 1);
  assert.equal(counters.permissionReads, 0);
});
