const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rules = fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8');

test('usuário ativo pode consultar os próprios slots de permissão mesmo quando o documento não existe', () => {
  assert.match(rules, /function ownPermissionSlot\(permissionId\)/);
  assert.match(rules, /request\.auth\.uid \+ '__dashboard'/);
  assert.match(rules, /request\.auth\.uid \+ '__permissions'/);
  assert.match(rules, /request\.auth\.uid \+ '__audit'/);

  const permissionsMatch = rules.match(/match \/permissions\/\{permissionId\} \{([\s\S]*?)\n    \}/);
  assert.ok(permissionsMatch, 'regra da collection permissions deve existir');
  assert.match(permissionsMatch[1], /allow get: if isSuperAdmin\(\) \|\| canRead\('permissions'\) \|\| ownPermissionSlot\(permissionId\);/);
});
