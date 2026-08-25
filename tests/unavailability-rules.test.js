const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rules = fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8');

function block(collection) {
  const marker = `match /${collection} {`;
  const start = rules.indexOf(marker);
  assert.notEqual(start, -1, `${collection} precisa de Rules explícitas`);
  const end = rules.indexOf('\n    match /', start + marker.length);
  return rules.slice(start, end === -1 ? rules.length : end);
}

test('indisponibilidade valida início, fim do intervalo, período e tamanho da observação', () => {
  assert.match(rules, /function validUnavailabilityDocument\(\)/);
  assert.match(rules, /request\.resource\.data\.date is timestamp/);
  assert.match(rules, /request\.resource\.data\.endAt is timestamp/);
  assert.match(rules, /request\.resource\.data\.endAt >= request\.resource\.data\.date/);
  assert.match(rules, /\['MORNING', 'AFTERNOON', 'EVENING'\]/);
  assert.match(rules, /request\.resource\.data\.note\.size\(\) <= 240/);
});

test('usuário comum só cria para si e não pode trocar o userId na edição', () => {
  const unavailability = block('unavailability/{documentId}');
  assert.match(rules, /request\.resource\.data\.userId == request\.auth\.uid/);
  assert.match(rules, /request\.resource\.data\.userId == resource\.data\.userId/);
  assert.match(unavailability, /ownUnavailabilityCreate\(\)/);
});

test('edição e exclusão exigem que o fim da indisponibilidade ainda não tenha passado', () => {
  const unavailability = block('unavailability/{documentId}');
  assert.match(rules, /resource\.data\.endAt >= request\.time/);
  assert.match(rules, /request\.resource\.data\.endAt >= request\.time/);
  assert.match(unavailability, /allow delete: if resource\.data\.endAt >= request\.time/);
});

test('gestão de terceiros exige EDIT e acesso à lista de usuários é limitado ao administrador operacional', () => {
  const users = block('users/{userId}');
  assert.match(rules, /function administrativeUnavailabilityWrite\(\)/);
  assert.match(rules, /canEdit\('unavailability'\)/);
  assert.match(users, /canEdit\('unavailability'\)/);
});

test('ator da criação/edição é preso à identidade autenticada', () => {
  assert.match(rules, /request\.resource\.data\.createdBy == request\.auth\.uid/);
  assert.match(rules, /request\.resource\.data\.updatedBy == request\.auth\.uid/);
});
