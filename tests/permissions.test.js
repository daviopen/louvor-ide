const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const legacyPage = fs.readFileSync(path.join(root, 'src/js/modules/permissions-page.js'), 'utf8');
const routeAccessPage = fs.readFileSync(path.join(root, 'src/js/modules/route-access-page.js'), 'utf8');
const shell = fs.readFileSync(path.join(root, 'src/js/modules/app-shell.js'), 'utf8');
const rules = fs.readFileSync(path.join(root, 'firestore.rules'), 'utf8');

const modules = ['dashboard', 'users', 'unavailability', 'events', 'schedules', 'setlists', 'songs', 'audit'];

test('Rotas e Acessos representa os três níveis da matriz ativa', () => {
  for (const level of ['NONE', 'READ', 'EDIT']) assert.match(routeAccessPage, new RegExp(`['\"]${level}['\"]`));
  for (const moduleName of modules) assert.match(shell, new RegExp(`permission: ['\"]${moduleName}['\"]`));
  assert.match(shell, /id: 'settings-routes'.*Rotas e Acessos/s);
  assert.match(routeAccessPage, /users\.permissions/);
  assert.match(routeAccessPage, /Documento permissions/);
  assert.match(routeAccessPage, /Acesso efetivo/);
});

test('tela legada de permissões foi aposentada e redireciona para Rotas e Acessos', () => {
  assert.match(legacyPage, /section'\) !== 'permissions'/);
  assert.match(legacyPage, /module\.html\?section=settings&tab=routes/);
  assert.doesNotMatch(shell, /id: 'permissions'.*menu: true/s);
  assert.doesNotMatch(legacyPage, /collectChanges|renderDiff|auditLogs|PERMISSIONS_UPDATED/);
});

test('menu e rota exigem permissão explícita sem fallback legado', () => {
  assert.match(shell, /function enforceCurrentRoute/);
  assert.match(shell, /firstAllowedHref/);
  assert.match(shell, /return 'none';/);
  assert.doesNotMatch(shell, /Compatibilidade enquanto a matriz/);
  assert.doesNotMatch(shell, /\['dashboard', 'songs', 'setlists'\]\.includes\(permission\)/);
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
  assert.match(rules, /hasAny\(\['role', 'permissions', 'accessProfile'\]\)/);
});
