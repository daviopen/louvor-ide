import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { composeIdeMusicChordSheet, hasIdeMusicVocalCues } from '../src/js/modules/music-ai-import.js';

test('detecta quando seções vocais possuem pistas curtas', () => {
  assert.equal(hasIdeMusicVocalCues({
    sections: [
      { type: 'intro', content: 'Ab  Eb  Fm' },
      { type: 'verse', content: 'Ab\nA Cristo seja a glória\nEb/G\nPra sempre amém' }
    ]
  }), true);
});

test('não considera cifra somente com acordes como padrão vocal completo', () => {
  assert.equal(hasIdeMusicVocalCues({
    sections: [
      { type: 'verse', content: 'Ab  Eb/G  Fm  Db' },
      { type: 'chorus', content: 'Db  Ab  Eb  Fm' }
    ]
  }), false);
});

test('formatação IDE Music preserva pequenas pistas vocais vinculadas aos acordes', () => {
  const output = composeIdeMusicChordSheet({
    originalKey: 'A',
    chordFormKey: 'Ab',
    capoFret: 1,
    sections: [
      { type: 'verse', label: 'Estrofe', content: 'Ab\nA Cristo seja a glória\nEb/G\nPra sempre amém' },
      { type: 'chorus', label: 'Refrão', content: 'Db\nToda honra e glória\nAb\nAo nosso Deus' }
    ]
  });

  assert.match(output, /Estrofe:/);
  assert.match(output, /A Cristo - A/);
  assert.match(output, /Pra sempre - E\/G#/);
  assert.match(output, /Refrão:/);
  assert.match(output, /Toda honra - D/);
});

test('módulo contém fallback de segunda leitura vocal e busca complementar de vídeo', async () => {
  const source = await readFile(new URL('../src/js/modules/music-ai-import.js', import.meta.url), 'utf8');
  assert.match(source, /recoverVocalCues/);
  assert.match(source, /2 ou 3 palavras iniciais/);
  assert.match(source, /recoverVideo/);
  assert.match(source, /youtube\.com\/results\?search_query=/);
});
