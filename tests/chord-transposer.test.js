const test = require('node:test');
const assert = require('node:assert/strict');

const {
  highlightChords,
  normalizeKey,
  resolveSetlistFinalKey,
  semitoneDistance,
  transposeText
} = require('../src/js/modules/chord-transposer');

test('normaliza sustenidos, bemóis e tons menores', () => {
  assert.equal(normalizeKey('f#'), 'F#');
  assert.equal(normalizeKey('Bb'), 'Bb');
  assert.equal(normalizeKey('Em'), 'E');
  assert.equal(normalizeKey('inválido'), null);
});

test('calcula a distância entre tons considerando enarmonia', () => {
  assert.equal(semitoneDistance('D', 'E'), 2);
  assert.equal(semitoneDistance('B', 'C'), 1);
  assert.equal(semitoneDistance('C#', 'Db'), 0);
});

test('transpõe acordes simples, extensões e baixo invertido', () => {
  const cifra = 'D  Em7  Bm7  G\nA/C#  D/F#  G(add9)';
  const result = transposeText(cifra, 'D', 'E');

  assert.equal(result, 'E  F#m7  C#m7  A\nB/D#  E/G#  A(add9)');
});

test('usa bemóis quando o tom de destino é bemol', () => {
  assert.equal(transposeText('C F G Am', 'C', 'Db'), 'Db Gb Ab Bbm');
});

test('não altera palavras da letra que se parecem parcialmente com acordes', () => {
  const letra = 'Amor e graça\nDeus é bom';
  assert.equal(transposeText(letra, 'C', 'D'), letra);
});

test('mantém o tom salvo na setlist mesmo que o cadastro do ministro mude', () => {
  const setlistSong = { tomOriginal: 'D', tomFinal: 'E', ministro: 'Rayane' };
  const currentSong = { tom: 'D', tomMinistro: { Rayane: 'D' } };

  assert.equal(resolveSetlistFinalKey(setlistSong, currentSong), 'E');
});

test('usa o tom atual do ministro somente para setlists antigas sem tom final', () => {
  const setlistSong = { tomOriginal: 'D', ministro: 'Rayane' };
  const currentSong = { tom: 'D', tomMinistro: { Rayane: 'E' } };

  assert.equal(resolveSetlistFinalKey(setlistSong, currentSong), 'E');
});

test('escapa HTML antes de destacar os acordes', () => {
  const result = highlightChords('<img src=x onerror=alert(1)>\nC G');

  assert.match(result, /&lt;img/);
  assert.doesNotMatch(result, /<img/);
  assert.match(result, /<span class="chord">C<\/span>/);
});
