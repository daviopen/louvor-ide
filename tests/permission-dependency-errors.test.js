const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

test('Escalas identifica qual dependência foi negada pelo Firestore', () => {
  const source = read('src/services/schedule-service.js');
  for (const label of ['escalas e eventos', 'pessoas da escala', 'funções ministeriais', 'vínculos entre pessoas e funções', 'indisponibilidades', 'participantes das escalas']) {
    assert.match(source, new RegExp(label));
  }
});

test('Setlists e Músicas contextualizam leituras auxiliares negadas', () => {
  const setlists = read('src/js/pages/setlists-simple.js');
  const songs = read('src/repositories/music-repository.js');
  assert.match(setlists, /Não foi possível consultar \$\{label\}/);
  assert.match(setlists, /pessoas dos Setlists/);
  assert.match(setlists, /biblioteca de músicas/);
  assert.match(songs, /Não foi possível consultar tons dos ministros/);
  assert.match(songs, /Não foi possível consultar ministros/);
  assert.match(songs, /Não foi possível consultar catálogo de músicas/);
});
