const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'src/pages/nova-musica.html'), 'utf8');
const controller = fs.readFileSync(path.join(root, 'src/js/pages/song-form.js'), 'utf8');

test('formulário de música cobre os campos do roadmap 23', () => {
  for (const id of ['titulo', 'artista', 'tom', 'tema', 'link', 'cifra', 'letra', 'observacoes', 'minister-list']) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.match(html, /data-preview="cifra"/);
  assert.match(html, /data-preview="letra"/);
});

test('ministros são filtrados pela função Ministro e aceitam vários tons preferidos', () => {
  assert.match(controller, /collection\('ministryFunctions'\)/);
  assert.match(controller, /collection\('userFunctions'\)/);
  assert.match(controller, /===\s*'ministro'/);
  assert.match(controller, /ministerUserIds/);
  assert.match(controller, /songMinisterKeys/);
  assert.match(controller, /preferredKey/);
});

test('criação e edição validam obrigatórios, auditam e protegem alterações não salvas', () => {
  assert.match(controller, /Informe o artista/);
  assert.match(controller, /Informe o tom original/);
  assert.match(controller, /Informe a cifra/);
  assert.match(controller, /Informe a letra/);
  assert.match(controller, /SONG_CREATED/);
  assert.match(controller, /SONG_UPDATED/);
  assert.match(controller, /collection\('auditLogs'\)/);
  assert.match(controller, /beforeunload/);
  assert.match(controller, /alterações não salvas/);
});
