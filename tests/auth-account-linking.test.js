const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const workflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'auth-account-linking.yml'), 'utf8');
const script = fs.readFileSync(path.join(root, 'src', 'scripts', 'reconcile-auth-identities.cjs'), 'utf8');

test('Firebase Authentication impede múltiplas contas para o mesmo e-mail', () => {
  assert.match(workflow, /allowDuplicateEmails\":false/);
  assert.match(workflow, /updateMask=signIn\.allowDuplicateEmails/);
  assert.match(workflow, /Validar configuração efetiva/);
});

test('reconciliação preserva o UID canônico do perfil e remove somente duplicatas sem perfil', () => {
  assert.match(script, /expectedUidByEmail/);
  assert.match(script, /profilesByUid\.has\(user\.uid\)/);
  assert.match(script, /auth\.deleteUser\(duplicate\.uid\)/);
  assert.match(script, /uid: expectedUid/);
  assert.match(script, /Não é seguro reconciliar/);
});
