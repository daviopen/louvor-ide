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

test('SUPER_ADMIN possui bootstrap apenas nas Rules e suporta Custom Claims', () => {
  assert.match(rules, /davitads@gmail\.com/);
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
});

test('operações administrativas impedem exclusão física de usuário', () => {
  const users = extractMatch('users/{userId}');
  assert.match(users, /allow delete: if false;/);
  assert.match(users, /resource\.data\.role != 'SUPER_ADMIN'/);
});

test('audit log é append-only e exige ator autenticado', () => {
  const audit = extractMatch('auditLogs/{documentId}');
  assert.match(audit, /actorUserId == request\.auth\.uid/);
  assert.match(audit, /allow update, delete: if false;/);
});

test('Setlist pode ler somente as dependências operacionais necessárias', () => {
  assert.match(extractMatch('users/{userId}'), /canRead\('setlists'\)/);
  assert.match(extractMatch('events/{documentId}'), /canRead\('events'\) \|\| canRead\('setlists'\)/);
  assert.match(extractMatch('schedules/{documentId}'), /canRead\('schedules'\) \|\| canRead\('setlists'\)/);
  assert.match(extractMatch('scheduleMembers/{documentId}'), /canRead\('schedules'\) \|\| canRead\('setlists'\)/);
  assert.match(extractMatch('songs/{documentId}'), /canRead\('songs'\) \|\| canRead\('setlists'\)/);
  assert.match(extractMatch('songMinisterKeys/{documentId}'), /canRead\('songs'\) \|\| canRead\('setlists'\)/);
});

test('biblioteca legada de músicas é somente leitura para Setlist/Músicas', () => {
  const legacySongs = extractMatch('musicas/{documentId}');
  assert.match(legacySongs, /canRead\('songs'\) \|\| canRead\('setlists'\)/);
  assert.match(legacySongs, /allow write: if false;/);
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
    'musicas/{documentId}',
    'songMinisterKeys/{documentId}',
    'auditLogs/{documentId}',
    'lgpdConsents/{documentId}'
  ].forEach(extractMatch);
});

test('e-mail de bootstrap não é fonte de autorização no JavaScript do frontend', () => {
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
});