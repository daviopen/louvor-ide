import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFieldConfidence, expectedSoundingKey, validateHarmonicContext } from '../src/services/music-ai-confidence.js';
import { composeCanonicalChordSheet } from '../src/js/modules/music-ai-import-base.js';
import { composeIdeMusicChordSheet } from '../src/js/modules/music-ai-import.js';

test('A Cristo Seja a Glória: Ab + capo 1 resulta em A', () => {
  const result = validateHarmonicContext({ originalKey: 'A', chordFormKey: 'Ab', capoFret: 1 });
  assert.equal(result.valid, true);
  assert.equal(result.expectedKey, 'A');
  assert.equal(expectedSoundingKey('Ab', 1, 'A'), 'A');
});

test('Quem É Esse: E + capo 2 resulta em F#', () => {
  const result = validateHarmonicContext({ originalKey: 'F#', chordFormKey: 'E', capoFret: 2 });
  assert.equal(result.valid, true);
  assert.equal(result.expectedKey, 'F#');
});

test('música sem capotraste mantém o próprio tom', () => {
  const result = validateHarmonicContext({ originalKey: 'G', chordFormKey: 'G', capoFret: null });
  assert.equal(result.valid, true);
  assert.equal(result.status, 'consistent');
});

test('combinação harmônica inconsistente é detectada deterministicamente', () => {
  const result = validateHarmonicContext({ originalKey: 'F#', chordFormKey: 'E', capoFret: 1 });
  assert.equal(result.valid, false);
  assert.equal(result.expectedKey, 'F');
});

test('confiança prioriza dados explicitamente recuperados da fonte', () => {
  const confidence = buildFieldConfidence({
    originalKey: 'A',
    chordFormKey: 'Ab',
    capoFret: 1,
    video: { url: 'https://www.youtube.com/watch?v=abc123' },
    provenance: {
      originalKey: 'Cifra Club: URL recuperada',
      chordFormKey: 'Cifra Club: página',
      capoFret: 'Cifra Club: página',
      video: 'thumbnail da página'
    }
  }, { sourceUrl: 'https://www.cifraclub.com.br/julliany-souza/a-cristo-seja-a-gloria/' });

  assert.equal(confidence.originalKey, 'high');
  assert.equal(confidence.chordFormKey, 'high');
  assert.equal(confidence.capoFret, 'high');
  assert.equal(confidence.video, 'high');
});

test('conhecimento do modelo é marcado para revisão', () => {
  const confidence = buildFieldConfidence({
    originalKey: 'C',
    provenance: { originalKey: 'conhecimento do modelo; revisar' }
  });
  assert.equal(confidence.originalKey, 'review');
});

test('cifra da fonte é transposta para o tom original sem perder extensões e baixo invertido', () => {
  const canonical = composeIdeMusicChordSheet({
    originalKey: 'F#',
    chordFormKey: 'E',
    capoFret: 2,
    chordSheet: 'Intro:\nE  B/D#  C#m7  A9'
  });

  assert.equal(canonical, 'Intro:\nF#  C#/F  D#m7  B9');
});

test('composeCanonicalChordSheet prefere canonicalChordSheet já calculada e evita dupla transposição', () => {
  const canonical = composeCanonicalChordSheet({
    originalKey: 'F#',
    chordFormKey: 'E',
    capoFret: 2,
    chordSheet: 'E  B  C#m  A',
    sourceChordSheet: 'E  B  C#m  A',
    canonicalChordSheet: 'F#  C#  D#m  B'
  });

  assert.equal(canonical, 'F#  C#  D#m  B');
});
