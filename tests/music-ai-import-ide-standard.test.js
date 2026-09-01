import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { composeIdeMusicChordSheet } from '../src/js/modules/music-ai-import.js';
import { normalizeMusicAIResponse } from '../src/services/music-ai-schema.js';

test('restaura pistas vocais curtas, transpõe para o tom real e remove repetições', () => {
  const chordSheet = composeIdeMusicChordSheet({
    originalKey: 'Db',
    chordFormKey: 'C',
    capoFret: 1,
    sections: [
      { type: 'intro', label: 'Intro', content: 'Am7  G  F\nAm7  G  F' },
      {
        type: 'verse',
        label: 'Estrofe',
        content: [
          'Am7', 'Tu és o Deus dessa terra',
          'G', 'Tu és Rei desse povo',
          'F9  Dm7', 'És o Senhor da nação',
          'Am7', 'Tu és a luz desse mundo',
          'G', 'Esperança para os perdidos',
          'F9  Dm7', 'Tu és a paz pra os cansados'
        ].join('\n')
      },
      {
        type: 'pre_chorus',
        label: 'Pré-Refrão',
        content: 'C9  G  F9\nNinguém é como nosso Deus\nAm7  G  F9  G\nNinguém é como nosso Deus'
      },
      {
        type: 'chorus',
        label: 'Refrão',
        content: 'F9\nGrandes coisas estão por vir\nG\nGrandes coisas vão acontecer\nC9  G/B  F9\nNesse lugar'
      },
      {
        type: 'chorus',
        label: 'Refrão',
        content: 'F9\nGrandes coisas estão por vir\nG\nGrandes coisas vão acontecer\nC9  G/B  F9\nNesse lugar'
      },
      { type: 'outro', label: 'Final', content: 'F9  C9  F9  C9' }
    ]
  });

  assert.doesNotMatch(chordSheet, /Capotraste/i);
  assert.match(chordSheet, /Intro:\nBbm7\s+Ab\s+Gb/);
  assert.match(chordSheet, /Estrofe:\nTu és - Bbm7/);
  assert.match(chordSheet, /Tu és - Ab/);
  assert.match(chordSheet, /És o Senhor - Gb9\s+Ebm7/);
  assert.match(chordSheet, /Pré-Refrão:\nNinguém é - Db9\s+Ab\s+Gb9/);
  assert.match(chordSheet, /Refrão:\nGrandes coisas - Gb9\s+Ab\s+Db9\s+Ab\/C\s+Gb9/);
  assert.equal((chordSheet.match(/^Refrão:/gm) || []).length, 1);
});

test('preserva estrofes diferentes mesmo quando compartilham a mesma harmonia', () => {
  const chordSheet = composeIdeMusicChordSheet({
    originalKey: 'G',
    chordFormKey: 'G',
    capoFret: null,
    sections: [
      { type: 'verse', label: 'Estrofe', content: 'G\nPrimeira frase da música\nD\nOutra linha da primeira estrofe' },
      { type: 'verse', label: 'Estrofe', content: 'G\nSegunda estrofe da música\nD\nOutra linha da segunda estrofe' }
    ]
  });

  assert.match(chordSheet, /Estrofe 1:/);
  assert.match(chordSheet, /Primeira frase - G\s+D/);
  assert.match(chordSheet, /Estrofe 2:/);
  assert.match(chordSheet, /Segunda estrofe - G\s+D/);
});

test('normaliza tema sugerido pela IA', () => {
  const normalized = normalizeMusicAIResponse({
    title: 'Exemplo',
    artist: 'Artista',
    originalKey: 'G',
    theme: 'Adoração e grandeza de Deus',
    sections: [],
    provenance: { theme: 'conteúdo analisado' }
  });

  assert.equal(normalized.theme, 'Adoração e grandeza de Deus');
  assert.equal(normalized.provenance.theme, 'conteúdo analisado');
});

test('interface informa explicitamente que o input esperado é Cifra Club', async () => {
  const source = await readFile(new URL('../src/js/modules/music-ai-import.js', import.meta.url), 'utf8');
  assert.match(source, /Link do Cifra Club/);
  assert.match(source, /Entrada esperada: link da música no Cifra Club/);
  assert.match(source, /cifraclub\.com\.br\/artista\/musica/);
});
