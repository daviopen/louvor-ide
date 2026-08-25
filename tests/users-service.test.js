const test = require('node:test');
const assert = require('node:assert/strict');
const { filterUsers, paginate, canManageUsers, UserService } = require('../src/services/user-service.js');

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

test('UserService cria conta no Firebase, usa UID gerado e envia definição de senha', async () => {
  const calls = [];
  const resetEmails = [];
  const secondaryAuth = {
    createUserWithEmailAndPassword: async email => ({ user: { uid: 'firebase-generated-uid', delete: async () => {} } }),
    signOut: async () => {}
  };
  const firebase = {
    app: () => ({ options: { projectId: 'demo' } }),
    initializeApp: () => ({ auth: () => secondaryAuth, delete: async () => {} })
  };
  const repository = {
    findByEmail: async () => null,
    createUser: async input => { calls.push(['create', input]); return { id: input.uid, ...input }; },
    replaceUserFunctions: async (id, ids) => { calls.push(['functions', id, ids]); return ids; },
    replaceInitialPermissions: async (id, permissions) => { calls.push(['permissions', id, permissions]); return permissions; },
    addAuditLog: async (...args) => { calls.push(['audit', ...args]); return {}; }
  };
  const service = new UserService(repository, {
    firebase,
    auth: { sendPasswordResetEmail: async email => resetEmails.push(email) },
    actorProvider: () => ({ uid: 'admin-1' })
  });
  const permissions = { users: 'READ', songs: 'EDIT' };
  await service.create({ uid: 'manual-uid-must-be-ignored', name: 'Pessoa', email: 'pessoa@ide.com', functionIds: ['dm', 'teclado'], permissions });
  assert.equal(calls[0][1].uid, 'firebase-generated-uid');
  assert.deepEqual(calls[1], ['functions', 'firebase-generated-uid', ['dm', 'teclado']]);
  assert.deepEqual(calls[2], ['permissions', 'firebase-generated-uid', permissions]);
  assert.equal(calls[3][2], 'USER_CREATED');
  assert.deepEqual(resetEmails, ['pessoa@ide.com']);
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

test('ADMIN pode solicitar redefinição pelo Firebase e ação é auditada', async () => {
  const calls = [];
  const emails = [];
  const repository = { addAuditLog: async (...args) => { calls.push(args); return {}; } };
  const service = new UserService(repository, {
    auth: { sendPasswordResetEmail: async email => emails.push(email) },
    actorProvider: () => ({ uid: 'admin-1', role: 'ADMIN' })
  });
  await service.sendPasswordReset('  PESSOA@IDE.COM  ', 'user-1');
  assert.deepEqual(emails, ['pessoa@ide.com']);
  assert.equal(calls[0][1], 'USER_PASSWORD_RESET_REQUESTED');
  assert.equal(calls[0][2], 'user-1');
});
