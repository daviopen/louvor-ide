const test = require('node:test');
const assert = require('node:assert/strict');
const { filterUsers, paginate, canManageUsers, UserService, DEFAULT_ADMIN_ENDPOINT } = require('../src/services/user-service.js');

test('filterUsers busca por nome/e-mail e combina função/status', () => {
  const users = [
    { id: '1', name: 'Ana Souza', email: 'ana@ide.com', active: true, functionIds: ['vocal'] },
    { id: '2', name: 'Bruno Lima', email: 'bruno@ide.com', active: false, functionIds: ['baixo'] }
  ];
  assert.deepEqual(filterUsers(users, { search: 'ANA', status: 'ACTIVE', functionId: 'vocal' }).map(item => item.id), ['1']);
  assert.deepEqual(filterUsers(users, { search: '@ide.com', status: 'INACTIVE', functionId: 'baixo' }).map(item => item.id), ['2']);
});

test('paginate limita página sem perder total', () => {
  const result = paginate(Array.from({ length: 23 }, (_, index) => index + 1), 3, 10);
  assert.equal(result.total, 23);
  assert.equal(result.pages, 3);
  assert.deepEqual(result.items, [21, 22, 23]);
});

test('canManageUsers permite ADMIN e SUPER_ADMIN gerenciarem usuários', () => {
  assert.equal(canManageUsers({ role: 'ADMIN' }), true);
  assert.equal(canManageUsers({ role: 'SUPER_ADMIN' }), true);
  assert.equal(canManageUsers({ role: 'MEMBER' }), false);
  assert.equal(canManageUsers({ role: 'MEMBER', permissions: { users: 'EDIT' } }), true);
});

test('UserService cria usuário pelo backend privilegiado sem aceitar UID manual', async () => {
  const requests = [];
  const repository = { findByEmail: async () => null };
  const auth = { currentUser: { getIdToken: async () => 'admin-token' } };
  const fetchImpl = async (url, options) => {
    requests.push({ url, options, body: JSON.parse(options.body) });
    return { ok: true, json: async () => ({ result: { uid: 'firebase-generated-uid' } }) };
  };
  const service = new UserService(repository, { auth, fetchImpl });
  const permissions = { users: 'READ', songs: 'EDIT' };
  const result = await service.create({ uid: 'manual-must-be-ignored', name: 'Pessoa', email: ' PESSOA@IDE.COM ', password: 'SenhaSegura123!', functionIds: ['dm'], permissions });
  assert.equal(result.uid, 'firebase-generated-uid');
  assert.equal(requests[0].url, DEFAULT_ADMIN_ENDPOINT);
  assert.equal(requests[0].body.action, 'createUser');
  assert.equal(requests[0].body.data.email, 'pessoa@ide.com');
  assert.equal(requests[0].body.data.password, 'SenhaSegura123!');
  assert.equal('uid' in requests[0].body.data, false);
  assert.equal(requests[0].options.headers.Authorization, 'Bearer admin-token');
});

test('ADMIN pode alterar diretamente a senha de outro usuário via backend privilegiado', async () => {
  const requests = [];
  const service = new UserService({}, {
    auth: { currentUser: { getIdToken: async () => 'admin-token' } },
    fetchImpl: async (_url, options) => {
      requests.push(JSON.parse(options.body));
      return { ok: true, json: async () => ({ result: { uid: 'user-1' } }) };
    }
  });
  await service.setPassword('user-1', 'NovaSenha123!');
  assert.deepEqual(requests[0], { action: 'setPassword', data: { uid: 'user-1', password: 'NovaSenha123!' } });
});

test('UserService inativa sem exclusão física e registra auditoria', async () => {
  const calls = [];
  const repository = {
    updateUser: async (id, patch) => { calls.push(['update', id, patch]); return { id, active: patch.active }; },
    addAuditLog: async (...args) => { calls.push(['audit', ...args]); return {}; }
  };
  const service = new UserService(repository, { actorProvider: () => ({ uid: 'admin-1' }) });
  const result = await service.setActive('user-1', false);
  assert.equal(result.active, false);
  assert.deepEqual(calls[0], ['update', 'user-1', { active: false }]);
  assert.equal(calls[1][2], 'USER_DEACTIVATED');
});

test('UserService atualiza via repositório e sincroniza múltiplas funções', async () => {
  const calls = [];
  const repository = {
    updateUser: async (id, patch) => { calls.push(['update', id, patch]); return { id, ...patch }; },
    replaceUserFunctions: async (id, ids) => { calls.push(['functions', id, ids]); return ids; },
    addAuditLog: async (...args) => { calls.push(['audit', ...args]); return {}; }
  };
  const service = new UserService(repository, { actorProvider: () => ({ uid: 'admin-1' }) });
  await service.update('user-1', { name: 'Nome', email: 'nome@ide.com', photoURL: null, functionIds: ['dm', 'teclado'] });
  assert.deepEqual(calls[1], ['functions', 'user-1', ['dm', 'teclado']]);
  assert.equal(calls[2][2], 'USER_UPDATED');
});
