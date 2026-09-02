const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'src/pages/profile.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/styles/profile.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'src/js/modules/profile-page.js'), 'utf8');

test('Meu Perfil usa cabeçalho de identidade e separa dados pessoais de acesso', () => {
  assert.match(html, /class="profile-card profile-hero"/);
  assert.match(html, /id="profile-access-email"/);
  assert.match(html, /id="profile-access-role"/);
  assert.match(html, /id="profile-personal-title">Dados pessoais/);
  assert.doesNotMatch(html, /id="profile-email"/);
});

test('foto informa salvamento automático e mantém ações independentes do formulário', () => {
  assert.match(html, /id="profile-photo-status"[^>]*>Foto salva automaticamente/);
  assert.match(js, /async function persistPhoto/);
  assert.match(js, /await state\.service\.savePhoto\(state\.user, photoURL\)/);
  assert.match(js, /setPhotoStatus\(successMessage\)/);
  assert.match(js, /await persistPhoto\(result\.url, 'Foto atualizada'\)/);
});

test('formulário só habilita salvar quando existem alterações', () => {
  assert.match(html, /id="profile-save"[^>]*disabled/);
  assert.match(html, /id="profile-save-status"/);
  assert.match(js, /function updateSaveState\(\)/);
  assert.match(js, /button\.disabled = !dirty/);
  assert.match(js, /Alterações não salvas/);
  assert.match(js, /Alterações salvas/);
});

test('telefone recebe formatação brasileira sem alterar números internacionais incompatíveis', () => {
  assert.match(js, /function formatPhone\(value\)/);
  assert.match(js, /digits\.length === 11/);
  assert.match(js, /digits\.length === 10/);
  assert.match(html, /inputmode="tel"/);
});

test('layout mantém breakpoints desktop, tablet e mobile', () => {
  assert.match(css, /@media\(max-width:1000px\)/);
  assert.match(css, /@media\(max-width:820px\)/);
  assert.match(css, /@media\(max-width:640px\)/);
  assert.match(css, /@media\(max-width:390px\)/);
  assert.match(css, /min-height:44px/);
});
