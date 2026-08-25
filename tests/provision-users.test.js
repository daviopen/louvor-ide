const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const configPath = path.join(projectRoot, 'ops', 'provisioned-users.json');
const scriptPath = path.join(projectRoot, 'src', 'scripts', 'provision-users.cjs');

test('provisionamento operacional não armazena credenciais e mantém usuário de teste ativo', () => {
  const users = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const script = fs.readFileSync(scriptPath, 'utf8');

  assert.ok(Array.isArray(users));
  assert.ok(users.length > 0);

  for (const user of users) {
    assert.match(user.email, /^[^@\s]+@[^@\s]+\.[^@\s]+$/);
    assert.ok(['MEMBER', 'ADMIN', 'SUPER_ADMIN'].includes(user.role));
    assert.equal(typeof user.active, 'boolean');
    assert.equal(Object.hasOwn(user, 'password'), false);
    assert.equal(Object.hasOwn(user, 'token'), false);
    assert.equal(Object.hasOwn(user, 'credential'), false);
  }

  const testUser = users.find(user => user.email === 'teste.firebase@gmail.com');
  assert.deepEqual(testUser, {
    email: 'teste.firebase@gmail.com',
    role: 'MEMBER',
    active: true
  });

  assert.match(script, /applicationDefault\(\)/);
  assert.match(script, /getUserByEmail/);
  assert.match(script, /updateUser/);
  assert.match(script, /collection\('users'\)/);
});
