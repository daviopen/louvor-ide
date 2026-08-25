const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const page = fs.readFileSync(path.join(root, 'src/js/modules/permissions-page.js'), 'utf8');
const shell = fs.readFileSync(path.join(root, 'src/js/modules/app-shell.js'), 'utf8');
const rules = fs.readFileSync(path.join(root, 'firestore.rules'), 'utf8');
const moduleHtml = fs.readFileSync(path.join(root, 'src/pages/module.html'), 'utf8');

const modules = ['dashboard', 'users', 'permissions', 'unavailability', 'events', 'schedules', 'setlists', 'songs', 'audit'];

test('matriz implementa os três níveis e todos os módulos do ROADMAP 13', () => {
  for (const level of ['NONE', 'READ', 'EDIT']) assert.match(page, new RegExp(`['\"]${level}['\"]`));
  for (const moduleName of modules) assert.match(page, new RegExp(`['\"]${moduleName}['\"]`));
  assert.match(moduleHtml, /permissions-page\.js/);
});

test('mudanças administrativas possuem preview, confirmação e auditoria', () => {
  assert.match(page, /collectChanges/);
  assert.match(page, /renderDiff/);
  assert.match(page, /Confirmar alterações administrativas/);
  assert.match(page, /PERMISSIONS_UPDATED/);
  assert.match(page, /auditLogs/);
});

test('menu e rota exigem permissão explícita sem fallback legado', () => {
  assert.match(shell, /function enforceCurrentRoute/);
  assert.match(shell, /firstAllowedHref/);
  assert.match(shell, /return 'none';/);
  assert.doesNotMatch(shell, /Compatibilidade enquanto a matriz/);
  assert.doesNotMatch(shell, /\['dashboard', 'songs', 'setlists'\]\.includes\(permission\)/);
});

test('Firestore diferencia READ de EDIT e somente SUPER_ADMIN altera a matriz', () => {
  assert.match(rules, /explicitPermission\(moduleName, \['READ', 'EDIT'\]\)/);
  assert.match(rules, /explicitPermission\(moduleName, \['EDIT'\]\)/);
  assert.match(rules, /allow create, update: if isSuperAdmin\(\) && validPermissionDocument\(permissionId\)/);
  assert.match(rules, /allow delete: if isSuperAdmin\(\)/);
  assert.doesNotMatch(rules, /legacyReadModule/);
  assert.doesNotMatch(rules, /legacyEditModule/);
});

test('snapshot de permissão não pode ser elevado por ADMIN comum', () => {
  assert.match(rules, /adminKeepsPrivilegeFields/);
  assert.match(rules, /hasAny\(\['role', 'permissions'\]\)/);
});
