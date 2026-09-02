import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeMusicAIResponse } from '../src/services/music-ai-schema.js';
import { composeIdeMusicChordSheet } from '../src/js/modules/music-ai-import.js';

test('preserva os metadados de tom real, forma e capotraste como dados distintos', () => {
  const cases = [
    { title: 'A Cristo Seja a Glória', originalKey: 'A', chordFormKey: 'Ab', capoFret: 1 },
    { title: 'Quem É Esse?', originalKey: 'F#', chordFormKey: 'E', capoFret: 2 },
    { title: 'Sem capotraste', originalKey: 'G', chordFormKey: null, capoFret: null }
  ];

  for (const expected of cases) {
    const normalized = normalizeMusicAIResponse(expected);
    assert.equal(normalized.originalKey, expected.originalKey, expected.title);
    assert.equal(normalized.chordFormKey, expected.chordFormKey, expected.title);
    assert.equal(normalized.capoFret, expected.capoFret, expected.title);
  }
});

test('converte acordes da forma com capotraste para os acordes soantes do tom original', () => {
  const inA = composeIdeMusicChordSheet({
    originalKey: 'A',
    chordFormKey: 'Ab',
    capoFret: 1,
    sections: [{ type: 'intro', label: 'Intro', content: 'Ab  Db  Eb' }]
  });
  assert.equal(inA, 'Intro:\nA  D  E');

  const inFSharp = composeIdeMusicChordSheet({
    originalKey: 'F#',
    chordFormKey: 'E',
    capoFret: 2,
    sections: [{ type: 'intro', label: 'Intro', content: 'E  A  B  C#m' }]
  });
  assert.equal(inFSharp, 'Intro:\nF#  B  C#  D#m');
});

test('não transpõe cifra quando não existe capotraste', () => {
  const chordSheet = composeIdeMusicChordSheet({
    originalKey: 'G',
    chordFormKey: null,
    capoFret: null,
    sections: [{ type: 'intro', label: 'Intro', content: 'G  C  D  Em' }]
  });

  assert.equal(chordSheet, 'Intro:\nG  C  D  Em');
});
