const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'src/pages/nova-musica.html'), 'utf8');
const controller = fs.readFileSync(path.join(root, 'src/js/pages/song-form.js'), 'utf8');
const repository = fs.readFileSync(path.join(root, 'src/repositories/music-repository.js'), 'utf8');

test('formulário de música cobre os campos do roadmap 23', () => {
  for (const id of ['titulo', 'artista', 'tom', 'tema', 'link', 'cifra', 'letra', 'observacoes', 'minister-list']) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.match(html, /data-preview="cifra"/);
  assert.match(html, /data-preview="letra"/);
});

test('ministros são filtrados pela função Ministro e aceitam vários tons preferidos', () => {
  assert.match(controller, /listEligibleMinisters/);
  assert.match(repository, /MINISTRY_FUNCTIONS/);
  assert.match(repository, /USER_FUNCTIONS/);
  assert.match(repository, /===\s*'ministro'/);
  assert.match(controller, /ministerUserIds/);
  assert.match(repository, /SONG_MINISTER_KEYS/);
  assert.match(repository, /preferredKey/);
  assert.match(controller, /replaceMinisterKeys/);
});

test('edição preserva vínculos existentes mesmo quando o usuário não possui mais função Ministro', () => {
  assert.match(repository, /listUsersByIds/);
  assert.match(controller, /ensureLinkedMinistersVisible/);
  assert.match(controller, /linkedOutsideMinisterRole/);
  assert.match(controller, /vínculo existente/);
  assert.match(controller, /ensureLinkedMinistersVisible\(\[\.\.\.keys\.keys\(\)\]\)/);
});

test('criação e edição validam obrigatórios, mantêm letra opcional, auditam e protegem alterações não salvas', () => {
  assert.match(controller, /Informe o artista/);
  assert.match(controller, /Informe o tom original/);
  assert.match(controller, /Informe a cifra/);
  assert.doesNotMatch(controller, /Informe a letra/);
  assert.match(controller, /configureOptionalLyrics/);
  assert.match(controller, /removeAttribute\('required'\)/);
  assert.match(controller, /aria-required', 'false'/);
  assert.match(controller, /SONG_CREATED/);
  assert.match(controller, /SONG_UPDATED/);
  assert.match(controller, /addAuditLog/);
  assert.match(repository, /AUDIT_LOGS/);
  assert.match(controller, /beforeunload/);
  assert.match(controller, /alterações não salvas/);
});

test('novas gravações e leituras usam somente songs após migração', () => {
  assert.match(repository, /super\(COLLECTIONS\.SONGS/);
  assert.match(repository, /getCollection\(COLLECTIONS\.SONGS\)/);
  assert.doesNotMatch(repository, /legacyCollectionName|COLLECTIONS\.MUSICS|migratedFrom/);
});
