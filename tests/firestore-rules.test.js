const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rulesPath = path.join(__dirname, '..', 'firestore.rules');
const rules = fs.readFileSync(rulesPath, 'utf8');

function extractMatch(collection) {
  const marker = `match /${collection} {`;
  const index = rules.indexOf(marker);
  assert.notEqual(index, -1, `collection ${collection} deve possuir regra explícita`);
  const nextMatch = rules.indexOf('\n    match /', index + marker.length);
  return rules.slice(index, nextMatch === -1 ? rules.length : nextMatch);
}

test('não existe fallback global permitindo usuário autenticado', () => {
  const fallback = extractMatch('{document=**}');
  assert.match(fallback, /allow read, write: if false;/);
  assert.doesNotMatch(rules, /allow read, write: if isAllowedUser\(\)/);
});

test('SUPER_ADMIN exige perfil ativo ou Custom Claim e não usa identidade hardcoded', () => {
  assert.doesNotMatch(rules, /davitads@gmail\.com/);
  assert.doesNotMatch(rules, /bootstrapSuperAdminIdentity|initialSuperAdmin/);
  assert.match(rules, /function isSuperAdmin\(\) \{[\s\S]*return activeUser\(\)/);
  assert.match(rules, /hasClaim\('superAdmin'\)/);
  assert.match(rules, /request\.auth\.token\.role == 'SUPER_ADMIN'/);
});

test('perfil inativo bloqueia autorização', () => {
  assert.match(rules, /profile\(\)\.data\.active == true/);
  assert.match(rules, /function activeUser\(\)/);
});

test('permissões usam níveis READ e EDIT e documento por usuário/módulo', () => {
  assert.match(rules, /permissions\/\$\(request\.auth\.uid \+ '__' \+ moduleName\)/);
  assert.match(rules, /\['READ', 'EDIT'\]/);
  assert.match(rules, /\['EDIT'\]/);
  assert.match(rules, /function canRead\(moduleName\) \{ return isSuperAdmin\(\) \|\| profileCanRead\(moduleName\) \|\| explicitPermission\(moduleName, \['READ', 'EDIT'\]\); \}/);
  assert.doesNotMatch(rules, /activeUser\(\) && moduleName in \['setlists', 'songs'\]/);
});

test('perfil canônico é fonte direta de autorização das Rules', () => {
  assert.match(rules, /function profileCanRead\(moduleName\)/);
  assert.match(rules, /moduleName in \['dashboard', 'unavailability', 'events', 'schedules', 'setlists', 'songs'\]/);
  assert.match(rules, /hasAccessProfile\(\['PARTICIPANT', 'MINISTER', 'DM', 'LEADER', 'ADMINISTRATOR'\]\)/);
  assert.match(rules, /moduleName == 'schedules' && hasAccessProfile\(\['DM', 'LEADER', 'ADMINISTRATOR'\]\)/);
  assert.match(rules, /affectedKeys\(\)\.hasAny\(\['role', 'active', 'uid', 'permissions', 'accessProfile'\]\)/);
});

test('perfil legado usa espelho protegido quando o documento técnico ainda não foi materializado', () => {
  assert.match(rules, /'permissions' in profile\(\)\.data/);
  assert.match(rules, /profile\(\)\.data\.permissions is map/);
  assert.match(rules, /moduleName in profile\(\)\.data\.permissions/);
  assert.match(rules, /profile\(\)\.data\.permissions\[moduleName\] in acceptedLevels/);
  assert.match(rules, /affectedKeys\(\)\.hasAny\(\['role', 'active', 'uid', 'permissions', 'accessProfile'\]\)/);
  assert.match(rules, /affectedKeys\(\)\.hasAny\(\['role', 'permissions', 'accessProfile'\]\)/);
});

test('operações administrativas impedem exclusão física de usuário', () => {
  const users = extractMatch('users/{userId}');
  assert.match(users, /allow delete: if false;/);
  assert.match(users, /resource\.data\.role != 'SUPER_ADMIN'/);
});

test('indisponibilidade de terceiros exige perfil ADMIN além da permissão do módulo para gestão', () => {
  assert.match(rules, /function administrativeUnavailabilityWrite\(\)[\s\S]*isAdmin\(\)[\s\S]*canEdit\('unavailability'\)/);
  const unavailability = extractMatch('unavailability/{documentId}');
  assert.match(unavailability, /isAdmin\(\) && canRead\('unavailability'\)/);
  assert.match(unavailability, /isAdmin\(\) && canEdit\('unavailability'\)/);
});

test('audit log é append-only, possui schema limitado e timestamp do servidor', () => {
  const audit = extractMatch('auditLogs/{documentId}');
  assert.match(rules, /function validAuditLogDocument\(\)/);
  assert.match(rules, /keys\(\)\.hasAll\(\['actorUserId', 'action', 'entityType', 'entityId', 'createdAt'\]\)/);
  assert.match(rules, /keys\(\)\.hasOnly\(/);
  assert.match(rules, /actorUserId == request\.auth\.uid/);
  assert.match(rules, /createdAt == request\.time/);
  assert.match(rules, /action\.matches\('\^\[A-Z0-9_\]\+\$'\)/);
  assert.match(audit, /allow create: if validAuditLogDocument\(\);/);
  assert.match(audit, /allow update, delete: if false;/);
});

test('Escalas pode ler somente as dependências operacionais necessárias ao editor', () => {
  assert.match(extractMatch('users/{userId}'), /canRead\('schedules'\)/);
  assert.match(extractMatch('userFunctions/{documentId}'), /canRead\('schedules'\)/);
  assert.match(extractMatch('events/{documentId}'), /canRead\('schedules'\)/);
  assert.match(extractMatch('unavailability/{documentId}'), /canRead\('schedules'\)/);
  assert.match(extractMatch('schedules/{documentId}'), /canRead\('schedules'\)/);
  assert.match(extractMatch('scheduleMembers/{documentId}'), /canRead\('schedules'\)/);
});

test('Setlist pode ler somente as dependências operacionais necessárias', () => {
  assert.match(extractMatch('users/{userId}'), /canRead\('setlists'\)/);
  assert.match(extractMatch('events/{documentId}'), /canRead\('events'\) \|\| canRead\('schedules'\) \|\| canRead\('setlists'\)/);
  assert.match(extractMatch('schedules/{documentId}'), /canRead\('schedules'\) \|\| canRead\('setlists'\)/);
  assert.match(extractMatch('scheduleMembers/{documentId}'), /canRead\('schedules'\) \|\| canRead\('setlists'\)/);
  assert.match(extractMatch('songs/{documentId}'), /canRead\('songs'\) \|\| canRead\('setlists'\)/);
  assert.match(extractMatch('songMinisterKeys/{documentId}'), /canRead\('songs'\) \|\| canRead\('setlists'\)/);
});

test('Dashboard pode ler apenas as dependências operacionais agregadas e mantém indisponibilidade pessoal', () => {
  assert.match(extractMatch('events/{documentId}'), /canRead\('dashboard'\)/);
  assert.match(extractMatch('schedules/{documentId}'), /canRead\('dashboard'\)/);
  assert.match(extractMatch('scheduleMembers/{documentId}'), /canRead\('dashboard'\)/);
  assert.match(extractMatch('setlists/{documentId}'), /canRead\('dashboard'\)/);
  const unavailability = extractMatch('unavailability/{documentId}');
  assert.doesNotMatch(unavailability, /canRead\('dashboard'\)/);
  assert.match(unavailability, /resource\.data\.userId == request\.auth\.uid/);
});

test('collection legada de músicas não possui mais rota explícita após migração', () => {
  assert.doesNotMatch(rules, /match \/musicas\//);
});

test('collections sensíveis possuem regra explícita', () => {
  [
    'users/{userId}',
    'permissions/{permissionId}',
    'events/{documentId}',
    'unavailability/{documentId}',
    'schedules/{documentId}',
    'scheduleMembers/{documentId}',
    'setlists/{documentId}',
    'setlistSongs/{documentId}',
    'songs/{documentId}',
    'songMinisterKeys/{documentId}',
    'auditLogs/{documentId}',
    'lgpdConsents/{documentId}'
  ].forEach(extractMatch);
});

test('identidade administrativa hardcoded não é fonte de autorização no código', () => {
  const srcRoot = path.join(__dirname, '..', 'src');
  const stack = [srcRoot];
  const jsFiles = [];

  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (entry.isFile() && entry.name.endsWith('.js')) jsFiles.push(full);
    }
  }

  const occurrences = jsFiles.filter(file => fs.readFileSync(file, 'utf8').includes('davitads@gmail.com'));
  assert.deepEqual(occurrences, []);
  assert.doesNotMatch(rules, /davitads@gmail\.com/);
});
