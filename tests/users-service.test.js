const test = require('node:test');
const assert = require('node:assert/strict');
const { filterUsers, paginate, canManageUsers, UserService, DEFAULT_PASSWORD_RESET_URL, DEFAULT_MEMBER_PERMISSIONS } = require('../src/services/user-service.js');

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

test('permissões padrão de novo membro seguem o perfil operacional definido', () => {
  assert.deepEqual(DEFAULT_MEMBER_PERMISSIONS, {
    dashboard: 'READ',
    users: 'NONE',
    permissions: 'NONE',
    unavailability: 'EDIT',
    events: 'NONE',
    schedules: 'READ',
    setlists: 'EDIT',
    songs: 'EDIT',
    audit: 'NONE'
  });
});

test('UserService cria conta com UID gerado pelo Firebase e solicita definição de senha', async () => {
  const calls = [];
  const resetCalls = [];
  const secondaryAuth = {
    createUserWithEmailAndPassword: async email => ({ user: { uid: 'firebase-generated-uid', delete: async () => {} } }),
    signOut: async () => {}
  };
  const firebase = {
    app: () => ({ options: { projectId: 'demo' } }),
    initializeApp: () => ({ auth: () => secondaryAuth, delete: async () => {} })
  };
  const auth = {
    languageCode: null,
    sendPasswordResetEmail: async (email, settings) => resetCalls.push({ email, settings })
  };
  const repository = {
    findByEmail: async () => null,
    createUser: async input => { calls.push(['create', input]); return { id: input.uid, ...input }; },
    replaceUserFunctions: async (id, ids) => { calls.push(['functions', id, ids]); return ids; },
    replaceInitialPermissions: async (id, permissions) => { calls.push(['permissions', id, permissions]); return permissions; },
    addAuditLog: async (...args) => { calls.push(['audit', ...args]); return {}; }
  };
  const service = new UserService(repository, { firebase, auth, actorProvider: () => ({ uid: 'admin-1' }) });
  const result = await service.create({ name: 'Pessoa', email: ' PESSOA@IDE.COM ', functionIds: ['dm'], permissions: { users: 'READ' } });
  assert.equal(calls[0][1].uid, 'firebase-generated-uid');
  assert.equal(result.passwordEmailSent, true);
  assert.equal(auth.languageCode, 'pt-BR');
  assert.deepEqual(resetCalls, [{ email: 'pessoa@ide.com', settings: { url: DEFAULT_PASSWORD_RESET_URL, handleCodeInApp: false } }]);
});

test('UserService aplica permissões padrão quando o cadastro não informa permissões', async () => {
  const calls = [];
  const secondaryAuth = {
    createUserWithEmailAndPassword: async () => ({ user: { uid: 'firebase-default-uid', delete: async () => {} } }),
    signOut: async () => {}
  };
  const firebase = {
    app: () => ({ options: { projectId: 'demo' } }),
    initializeApp: () => ({ auth: () => secondaryAuth, delete: async () => {} })
  };
  const repository = {
    findByEmail: async () => null,
    createUser: async input => ({ id: input.uid, ...input }),
    replaceUserFunctions: async () => [],
    replaceInitialPermissions: async (id, permissions) => { calls.push({ id, permissions }); return permissions; },
    addAuditLog: async () => ({})
  };
  const auth = { sendPasswordResetEmail: async () => {} };
  const service = new UserService(repository, { firebase, auth, actorProvider: () => ({ uid: 'admin-1' }) });
  await service.create({ name: 'Novo membro', email: 'novo@ide.com' });
  assert.deepEqual(calls[0], { id: 'firebase-default-uid', permissions: DEFAULT_MEMBER_PERMISSIONS });
});

test('ADMIN pode solicitar redefinição pelo Firebase com URL explícita e auditoria', async () => {
  const calls = [];
  const resetCalls = [];
  const repository = { addAuditLog: async (...args) => { calls.push(args); return {}; } };
  const auth = {
    languageCode: null,
    sendPasswordResetEmail: async (email, settings) => resetCalls.push({ email, settings })
  };
  const service = new UserService(repository, { auth, actorProvider: () => ({ uid: 'admin-1', role: 'ADMIN' }) });
  await service.sendPasswordReset('  PESSOA@IDE.COM  ', 'user-1');
  assert.equal(auth.languageCode, 'pt-BR');
  assert.deepEqual(resetCalls[0], { email: 'pessoa@ide.com', settings: { url: DEFAULT_PASSWORD_RESET_URL, handleCodeInApp: false } });
  assert.equal(calls[0][1], 'USER_PASSWORD_RESET_REQUESTED');
  assert.equal(calls[0][2], 'user-1');
  assert.equal(calls[0][3].continueUrl, DEFAULT_PASSWORD_RESET_URL);
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
    getUser: async id => ({ id, uid: id, name: 'Nome anterior', email: 'nome@ide.com', photoURL: null }),
    updateUser: async (id, patch) => { calls.push(['update', id, patch]); return { id, uid: id, ...patch }; },
    replaceUserFunctions: async (id, ids) => { calls.push(['functions', id, ids]); return ids; },
    addAuditLog: async (...args) => { calls.push(['audit', ...args]); return {}; }
  };
  const service = new UserService(repository, { actorProvider: () => ({ uid: 'admin-1' }) });
  const result = await service.update('user-1', { name: 'Nome', email: 'nome@ide.com', photoURL: null, functionIds: ['dm', 'teclado'] });
  assert.equal(result.emailChanged, false);
  assert.deepEqual(calls[0], ['update', 'user-1', { name: 'Nome', email: 'nome@ide.com', photoURL: null }]);
  assert.deepEqual(calls[1], ['functions', 'user-1', ['dm', 'teclado']]);
  assert.equal(calls[2][2], 'USER_UPDATED');
});