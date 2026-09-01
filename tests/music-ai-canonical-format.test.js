import test from 'node:test';
import assert from 'node:assert/strict';
import { composeCanonicalChordSheet } from '../src/js/modules/music-ai-import.js';

test('converte forma com capotraste para o tom real e não exibe capotraste', () => {
  const chordSheet = composeCanonicalChordSheet({
    originalKey: 'Db',
    chordFormKey: 'C',
    capoFret: 1,
    sections: [
      { type: 'intro', label: 'Intro', content: 'Am7  G  F  Am7  G  F' },
      {
        type: 'verse',
        label: 'Estrofe',
        content: [
          'Tu és - Am7',
          'Tu és - G',
          'És o Senhor - F9  Dm7',
          'Tu és - Am7',
          'Esperança para - G',
          'Tu és - F9  Dm7'
        ].join('\n')
      },
      {
        type: 'pre_chorus',
        label: 'Pré-Refrão',
        content: [
          'Ninguém é - C9  G  F9',
          'Ninguém é - Am7  G  F9  G'
        ].join('\n')
      },
      {
        type: 'chorus',
        label: 'Refrão',
        content: [
          'Grandes coisas - F9',
          'Grandes coisas - G',
          'Nesse lugar - C9  G/B  F9',
          'Grandes coisas - F9',
          'Grandes coisas - G',
          'Nesse lugar - C9  G/B  F9'
        ].join('\n')
      },
      {
        type: 'instrumental',
        label: 'Instrumental',
        content: 'C9  F9  C9  F9  Am7  G  F9  Am7  G  F9'
      },
      {
        type: 'pre_chorus',
        label: 'Pré-Refrão',
        content: [
          'Ninguém é - C9  G  F9',
          'Ninguém é - Am7  G  F9',
          'Ninguém é - C9  G  F9',
          'Ninguém é - Am7  G  F9  G'
        ].join('\n')
      },
      {
        type: 'chorus',
        label: 'Refrão',
        content: [
          'Grandes coisas - F9',
          'Grandes coisas - G',
          'Nesse lugar - C9  G/B  F9',
          'Grandes coisas - F9',
          'Grandes coisas - G',
          'Nesse lugar - C9  G/B  F9',
          'Grandes coisas - F9',
          'Grandes coisas - G',
          'Nesse lugar - C9  G/B  F9',
          'Grandes coisas - F9',
          'Grandes coisas - G  C9'
        ].join('\n')
      },
      { type: 'outro', label: 'Final', content: 'F9  C9  F9  C9' }
    ]
  });

  assert.equal(chordSheet, [
    'Intro:\nBbm7  Ab  Gb',
    'Estrofe:\nBbm7  Ab  Gb9  Ebm7',
    'Pré-Refrão:\nDb9  Ab  Gb9  Bbm7  Ab  Gb9  Ab',
    'Refrão:\nGb9  Ab  Db9  Ab/C  Gb9  Ab  Db9',
    'Instrumental:\nDb9  Gb9  Bbm7  Ab  Gb9',
    'Final:\nGb9  Db9'
  ].join('\n\n'));

  assert.doesNotMatch(chordSheet, /Capotraste/i);
  assert.doesNotMatch(chordSheet, /Tu és|Grandes coisas|Ninguém é|Esperança/);
  assert.equal((chordSheet.match(/^Pré-Refrão:/gm) || []).length, 1);
  assert.equal((chordSheet.match(/^Refrão:/gm) || []).length, 1);
});

test('mantém cifra já no tom real sem alteração de acordes', () => {
  const chordSheet = composeCanonicalChordSheet({
    originalKey: 'G',
    chordFormKey: null,
    capoFret: null,
    sections: [
      { type: 'intro', label: 'Intro', content: 'G  D  Em  C  G  D  Em  C' },
      { type: 'chorus', label: 'Refrão', content: 'G\nD\nEm  C\nG\nD\nEm  C' }
    ]
  });

  assert.equal(chordSheet, 'Intro:\nG  D  Em  C\n\nRefrão:\nG  D  Em  C');
});
