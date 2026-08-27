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

test('e-mail de usuário existente é imutável', async () => {
  const repository = repositoryFixture({ id: 'uid-1', uid: 'uid-1', name: 'Pessoa', email: 'original@example.com', photoURL: null });
  const service = new UserService(repository, { actorProvider: () => ({ uid: 'admin-1' }) });

  await assert.rejects(
    () => service.update('uid-1', {
      name: 'Pessoa Atualizada',
      email: 'outro@example.com',
      photoURL: null,
      functionIds: ['fn-1']
    }),
    /não pode ser alterado após a criação/
  );

  assert.equal(repository.calls.updateUser.length, 0);
  assert.equal(repository.calls.functions.length, 0);
  assert.equal(repository.calls.audits.length, 0);
});

test('edição preserva o e-mail original e atualiza os demais dados', async () => {
  const repository = repositoryFixture({ id: 'uid-2', uid: 'uid-2', name: 'Pessoa', email: 'mesmo@example.com', photoURL: null });
  const service = new UserService(repository, { actorProvider: () => ({ uid: 'admin-1' }) });

  const result = await service.update('uid-2', {
    name: 'Novo Nome',
    email: 'MESMO@example.com',
    photoURL: 'https://example.com/foto.jpg',
    functionIds: ['fn-2']
  });

  assert.equal(result.email, 'mesmo@example.com');
  assert.equal(result.emailChanged, false);
  assert.deepEqual(repository.calls.updateUser[0], {
    id: 'uid-2',
    patch: { name: 'Novo Nome', email: 'mesmo@example.com', photoURL: 'https://example.com/foto.jpg' }
  });
  assert.deepEqual(repository.calls.functions[0], { id: 'uid-2', functionIds: ['fn-2'] });
  assert.equal(repository.calls.audits[0].details.emailChanged, false);
});

test('tela desabilita o campo de e-mail durante a edição e preserva o e-mail cadastrado no payload', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'js', 'modules', 'users-page.js'), 'utf8');
  assert.match(source, /emailField\.disabled = Boolean\(user\)/);
  assert.match(source, /O e-mail de login é definido no cadastro e não pode ser alterado/);
  assert.match(source, /editingUser\?\.email \|\| el\('user-email'\)\.value\.trim\(\)/);
});
