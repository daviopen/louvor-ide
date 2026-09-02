const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const usersHtml = fs.readFileSync(path.join(root, 'src/pages/users.html'), 'utf8');
const usersPage = fs.readFileSync(path.join(root, 'src/js/modules/users-page.js'), 'utf8');
const userRepository = fs.readFileSync(path.join(root, 'src/repositories/user-repository.js'), 'utf8');
const { normalizePersonalData, validateBirthDate } = require('../src/services/user-service.js');

test('formulário administrativo permite informar nascimento e telefone', () => {
  assert.match(usersHtml, /id="user-birth-date"[^>]*type="date"/);
  assert.match(usersHtml, /id="user-phone"[^>]*type="tel"/);
  assert.match(usersHtml, /id="user-phone"[^>]*inputmode="tel"/);
  assert.match(usersPage, /el\('user-birth-date'\)\.value = user\?\.birthDate \|\| ''/);
  assert.match(usersPage, /el\('user-phone'\)\.value = formatPhone\(user\?\.phone \|\| ''\)/);
  assert.match(usersPage, /birthDate: el\('user-birth-date'\)\.value \|\| null/);
  assert.match(usersPage, /phone: el\('user-phone'\)\.value\.trim\(\) \|\| null/);
});

test('repositório permite somente os novos campos pessoais no contrato administrativo existente', () => {
  assert.match(userRepository, /'phone', 'birthDate'/);
  assert.match(userRepository, /phone: input\.phone \|\| null/);
  assert.match(userRepository, /birthDate: input\.birthDate \|\| null/);
});

test('dados pessoais administrativos usam as mesmas regras de formato do Meu Perfil', () => {
  assert.deepEqual(
    normalizePersonalData({ phone: '(61) 99999-9999', birthDate: '1993-01-12' }, new Date('2026-09-02T12:00:00Z')),
    { phone: '(61) 99999-9999', birthDate: '1993-01-12' }
  );
  assert.throws(() => normalizePersonalData({ phone: '123' }), /telefone válido/i);
  assert.throws(() => validateBirthDate('2027-01-01', new Date('2026-09-02T12:00:00Z')), /futuro/i);
  assert.throws(() => validateBirthDate('1993-02-31', new Date('2026-09-02T12:00:00Z')), /data de nascimento válida/i);
});
