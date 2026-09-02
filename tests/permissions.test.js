const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const rules = fs.readFileSync(path.join(root, 'firestore.rules'), 'utf8');
const shell = fs.readFileSync(path.join(root, 'src/js/modules/app-shell.js'), 'utf8');
const routeAccess = fs.readFileSync(path.join(root, 'src/js/modules/route-access-page.js'), 'utf8');

test('Rotas e Acessos representa os três níveis da matriz ativa', () => {
  assert.match(routeAccess, /NONE/);
  assert.match(routeAccess, /READ/);
  assert.match(routeAccess, /EDIT/);
  assert.match(routeAccess, /ACCESS_PROFILE_CATALOG/);
});

test('tela legada de permissões foi aposentada e redireciona para Rotas e Acessos', () => {
  const legacyPermissionsPage = fs.readFileSync(path.join(root, 'src/js/modules/permissions-page.js'), 'utf8');
  assert.match(legacyPermissionsPage, /settings&tab=routes/);
  assert.doesNotMatch(legacyPermissionsPage, /getDocs|collection\(|permissionsList/);
});

test('menu e rota exigem permissão explícita sem fallback legado', () => {
  assert.match(shell, /resolveAccessLevel/);
  assert.match(shell, /return 'none'/);
  assert.doesNotMatch(shell, /fallback.*permissions/i);
});

test('Firestore diferencia READ de EDIT e somente SUPER_ADMIN altera a matriz técnica', () => {
  assert.match(rules, /explicitPermission\(moduleName, \['READ', 'EDIT'\]\)/);
  assert.match(rules, /explicitPermission\(moduleName, \['EDIT'\]\)/);
  assert.match(rules, /allow create, update: if isSuperAdmin\(\) && validPermissionDocument\(permissionId\)/);
  assert.match(rules, /allow delete: if isSuperAdmin\(\)/);
  assert.doesNotMatch(rules, /legacyReadModule/);
  assert.doesNotMatch(rules, /legacyEditModule/);
});

test('snapshot de permissão não pode ser elevado por ADMIN comum', () => {
  assert.match(rules, /adminKeepsPrivilegeFields/);
  assert.match(rules, /hasAny\(\['uid', 'role', 'permissions', 'accessProfile'\]\)/);
});