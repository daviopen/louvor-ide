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
    assert.equal(typeof user.name, 'string');
    assert.ok(user.name.trim().length > 0);
    assert.ok(['MEMBER', 'ADMIN', 'SUPER_ADMIN'].includes(user.role));
    assert.equal(typeof user.active, 'boolean');
    assert.equal(Object.hasOwn(user, 'password'), false);
    assert.equal(Object.hasOwn(user, 'token'), false);
    assert.equal(Object.hasOwn(user, 'credential'), false);
  }

  const testUser = users.find(user => user.email === 'teste.firebase@gmail.com');
  assert.deepEqual(testUser, {
    email: 'teste.firebase@gmail.com',
    name: 'Usuário de Teste Firebase',
    role: 'MEMBER',
    active: true
  });

  assert.match(script, /applicationDefault\(\)/);
  assert.match(script, /getUserByEmail/);
  assert.match(script, /createUser/);
  assert.match(script, /updateUser/);
  assert.match(script, /collection\('users'\)/);
});

test('deploy reconcilia catálogo de funções e migra vínculos legados de forma idempotente', () => {
  const script = fs.readFileSync(scriptPath, 'utf8');

  assert.match(script, /defaultMinistryFunctions/);
  assert.match(script, /Ministro/);
  assert.match(script, /Back Vocal/);
  assert.match(script, /Violão/);
  assert.match(script, /'direcao-musical': 'dm'/);
  assert.match(script, /collection\('ministryFunctions'\)/);
  assert.match(script, /collection\('userFunctions'\)/);
  assert.match(script, /relationDocumentId/);
  assert.match(script, /extractLegacyFunctionLabels/);
  assert.match(script, /reconcileMinistryFunctions\(db\)/);

  assert.doesNotMatch(script, /canonicalFunctionSlug\(profile\.role\)/);
  assert.doesNotMatch(script, /legacyFunctionAliases\[[^\]]*role/);
});
