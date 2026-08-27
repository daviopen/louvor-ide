const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { UserService } = require('../src/services/user-service.js');

function repositoryFixture(initialUser) {
  let current = { ...initialUser };
  const calls = { updateUser: [], functions: [], audits: [] };
  return {
    calls,
    async getUser() { return { ...current }; },
    async updateUser(id, patch) {
      calls.updateUser.push({ id, patch });
      current = { ...current, ...patch };
      return { ...current };
    },
    async replaceUserFunctions(id, functionIds) {
      calls.functions.push({ id, functionIds });
      return functionIds;
    },
    async addAuditLog(actorUserId, action, entityId, details) {
      calls.audits.push({ actorUserId, action, entityId, details });
      return true;
    }
  };
}

test('alteração de e-mail passa pelo backend de identidade e preserva o UID', async () => {
  const repository = repositoryFixture({ id: 'uid-1', uid: 'uid-1', name: 'Pessoa', email: 'antigo@example.com', photoURL: null });
  const identityCalls = [];
  const service = new UserService(repository, {
    actorProvider: () => ({ uid: 'admin-1' }),
    identityUpdater: async payload => {
      identityCalls.push(payload);
      repository.updateUser = async () => { throw new Error('updateUser cliente não deve alterar perfil quando o e-mail muda'); };
      repository.getUser = async () => ({ id: 'uid-1', uid: 'uid-1', name: payload.name, email: payload.email, photoURL: payload.photoURL });
      return { ok: true, user: { id: payload.userId, uid: payload.userId, ...payload }, emailChanged: true };
    }
  });

  const result = await service.update('uid-1', {
    name: 'Pessoa Atualizada',
    email: 'NOVO@example.com',
    photoURL: null,
    functionIds: ['fn-1']
  });

  assert.equal(identityCalls.length, 1);
  assert.equal(identityCalls[0].userId, 'uid-1');
  assert.equal(identityCalls[0].email, 'novo@example.com');
  assert.equal(result.uid, 'uid-1');
  assert.equal(result.email, 'novo@example.com');
  assert.equal(result.emailChanged, true);
  assert.deepEqual(repository.calls.functions[0], { id: 'uid-1', functionIds: ['fn-1'] });
  assert.equal(repository.calls.audits[0].details.emailChanged, true);
});

test('edição sem mudança de e-mail permanece no repositório normal', async () => {
  const repository = repositoryFixture({ id: 'uid-2', uid: 'uid-2', name: 'Pessoa', email: 'mesmo@example.com', photoURL: null });
  let identityCalled = false;
  const service = new UserService(repository, {
    actorProvider: () => ({ uid: 'admin-1' }),
    identityUpdater: async () => { identityCalled = true; }
  });

  const result = await service.update('uid-2', {
    name: 'Novo Nome',
    email: 'MESMO@example.com',
    photoURL: 'https://example.com/foto.jpg',
    functionIds: []
  });

  assert.equal(identityCalled, false);
  assert.equal(repository.calls.updateUser.length, 1);
  assert.equal(result.emailChanged, false);
});

test('backend de identidade exige token, autorização administrativa e atualiza Auth pelo mesmo UID', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'functions', 'index.js'), 'utf8');
  assert.match(source, /verifyIdToken\(token, true\)/);
  assert.match(source, /actorSnapshot\.data\(\)\.active !== true/);
  assert.match(source, /canManageUsers\(actorSnapshot\.data\(\)\)/);
  assert.match(source, /auth\.getUser\(userId\)/);
  assert.match(source, /auth\.updateUser\(userId, \{ email, displayName: name, photoURL \}\)/);
  assert.match(source, /USER_EMAIL_AND_IDENTITY_UPDATED/);
  assert.doesNotMatch(source, /password\s*:/i);
});
