const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'src/pages/module.html'), 'utf8');
const page = fs.readFileSync(path.join(root, 'src/js/modules/unavailability-page.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/styles/unavailability.css'), 'utf8');
const repository = fs.readFileSync(path.join(root, 'src/repositories/unavailability-repository.js'), 'utf8');

test('módulo de indisponibilidade expõe formulário, calendário e campos opcionais', () => {
  assert.match(html, /id="unavailability-content"/);
  assert.match(html, /id="unavailability-calendar"/);
  assert.match(html, /id="unavailability-date"[^>]*required/);
  assert.match(html, /id="unavailability-period"/);
  assert.match(html, /id="unavailability-event"/);
  assert.match(html, /id="unavailability-note"[^>]*maxlength="240"/);
});

test('UI confirma atuação administrativa e registra sem acesso direto ao Firestore', () => {
  assert.match(page, /Esta ação ficará registrada na auditoria/);
  assert.match(page, /service\.create/);
  assert.match(page, /service\.update/);
  assert.match(page, /service\.remove/);
  assert.doesNotMatch(page, /\.collection\(/);
  assert.match(repository, /collection\('unavailability'\)/);
});

test('layout possui tratamento responsivo para mobile', () => {
  assert.match(css, /@media\(max-width:700px\)/);
  assert.match(css, /unavailability-layout/);
  assert.match(css, /grid-template-columns:1fr/);
});
