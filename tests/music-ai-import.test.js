import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeMusicAIResponse, normalizeMusicalKey, normalizeBpm, extractYouTubeVideoId, MUSIC_AI_SCHEMA_VERSION } from '../src/services/music-ai-schema.js';
import { MusicAIService } from '../src/services/music-ai-service.js';
import { MusicAIProvider } from '../src/services/music-ai-provider.js';
import { mergeEmbeddedVideoLookup, shouldRetryEmbeddedVideoLookup } from '../src/services/firebase-music-ai-provider.js';
import { compactSectionContent, composeChordSheet, resolveReferenceLink } from '../src/js/modules/music-ai-import.js';

class MockProvider extends MusicAIProvider {
  constructor(result) {
    super({ provider: 'mock', model: 'mock-model' });
    this.result = result;
    this.calls = 0;
  }
  async analyzeSong() {
    this.calls += 1;
    return this.result;
  }
}

test('normaliza tom musical e rejeita tom inventado/malformado', () => {
  assert.equal(normalizeMusicalKey('F#'), 'F#');
  assert.equal(normalizeMusicalKey('Bb'), 'Bb');
  assert.equal(normalizeMusicalKey('Am'), 'Am');
  assert.equal(normalizeMusicalKey('H'), null);
  assert.equal(normalizeMusicalKey('qualquer'), null);
});

test('normaliza BPM somente dentro de faixa plausível', () => {
  assert.equal(normalizeBpm('72'), 72);
  assert.equal(normalizeBpm(260), 260);
  assert.equal(normalizeBpm(29), null);
  assert.equal(normalizeBpm(261), null);
  assert.equal(normalizeBpm('abc'), null);
});

test('extrai videoId de URLs YouTube e thumbnails ytimg suportadas', () => {
  assert.equal(extractYouTubeVideoId('https://www.youtube.com/watch?v=abc123XYZ'), 'abc123XYZ');
  assert.equal(extractYouTubeVideoId('https://youtu.be/abc123XYZ'), 'abc123XYZ');
  assert.equal(extractYouTubeVideoId('https://www.youtube.com/shorts/abc123XYZ'), 'abc123XYZ');
  assert.equal(extractYouTubeVideoId('https://i.ytimg.com/vi/HYwg0HlxBas/default.jpg'), 'HYwg0HlxBas');
  assert.equal(extractYouTubeVideoId('https://i.ytimg.com/vi_webp/HYwg0HlxBas/default.webp'), 'HYwg0HlxBas');
  assert.equal(extractYouTubeVideoId('https://example.com/video'), null);
});

test('normaliza thumbnail do YouTube para link watch canônico', () => {
  const normalized = normalizeMusicAIResponse({
    video: {
      provider: null,
      url: 'https://i.ytimg.com/vi/HYwg0HlxBas/default.jpg',
      videoId: null
    }
  });

  assert.deepEqual(normalized.video, {
    provider: 'youtube',
    url: 'https://www.youtube.com/watch?v=HYwg0HlxBas',
    videoId: 'HYwg0HlxBas'
  });
});

test('normaliza videoId isolado para link watch canônico', () => {
  const normalized = normalizeMusicAIResponse({
    video: {
      provider: 'youtube',
      url: null,
      videoId: 'HYwg0HlxBas'
    }
  });

  assert.deepEqual(normalized.video, {
    provider: 'youtube',
    url: 'https://www.youtube.com/watch?v=HYwg0HlxBas',
    videoId: 'HYwg0HlxBas'
  });
});

test('faz segunda leitura focada somente quando Cifra Club não trouxe vídeo', () => {
  const input = { sourceUrl: 'https://www.cifraclub.com.br/fernandinho/jesus-filho-de-deus/' };
  assert.equal(shouldRetryEmbeddedVideoLookup({ input, data: { video: null } }), true);
  assert.equal(shouldRetryEmbeddedVideoLookup({ input, data: { video: { videoId: 'HYwg0HlxBas' } } }), false);
  assert.equal(shouldRetryEmbeddedVideoLookup({ input: { ...input, youtubeUrl: 'https://youtu.be/HYwg0HlxBas' }, data: { video: null } }), false);
  assert.equal(shouldRetryEmbeddedVideoLookup({ input: { sourceUrl: 'https://example.com/musica' }, data: { video: null } }), false);
});

test('segunda leitura acrescenta somente o vídeo ausente e preserva a primeira análise', () => {
  const primary = {
    title: 'Jesus, Filho de Deus',
    artist: 'Fernandinho',
    originalKey: 'B',
    chordSheet: 'Intro:\nB  E/B',
    video: null,
    provenance: { title: 'fonte' }
  };
  const fallback = {
    title: null,
    artist: null,
    video: { provider: 'youtube', url: null, videoId: 'HYwg0HlxBas' },
    provenance: { video: 'thumbnail ytimg da página' }
  };

  const merged = mergeEmbeddedVideoLookup(primary, fallback);
  assert.equal(merged.title, primary.title);
  assert.equal(merged.chordSheet, primary.chordSheet);
  assert.deepEqual(merged.video, fallback.video);
  assert.equal(merged.provenance.video, 'thumbnail ytimg da página');
});

test('resposta parcial mantém campos não identificados vazios', () => {
  const normalized = normalizeMusicAIResponse({ title: 'Canção', originalKey: 'G', bpm: 500 });
  assert.equal(normalized.schemaVersion, MUSIC_AI_SCHEMA_VERSION);
  assert.equal(normalized.title, 'Canção');
  assert.equal(normalized.artist, null);
  assert.equal(normalized.originalKey, 'G');
  assert.equal(normalized.bpm, null);
  assert.deepEqual(normalized.sections, []);
});

test('service usa provider abstrato e preserva proveniência do provider', async () => {
  const provider = new MockProvider({
    schemaVersion: MUSIC_AI_SCHEMA_VERSION,
    title: 'Exemplo',
    artist: 'Artista',
    originalKey: 'D',
    chordSheet: 'Intro: D G',
    lyrics: null,
    sections: [],
    timeSignature: '4/4',
    bpm: 80,
    bpmSource: 'texto',
    video: null,
    provenance: { title: 'texto colado' }
  });
  const service = new MusicAIService(provider);
  const result = await service.analyze({ pastedText: 'Exemplo\nTom D\n80 BPM' });
  assert.equal(result.data.title, 'Exemplo');
  assert.equal(result.data.bpm, 80);
  assert.equal(result.provider.provider, 'mock');
  assert.equal(provider.calls, 1);
});

test('service exige texto ou URL e permite fallback manual após erro de validação', async () => {
  const service = new MusicAIService(new MockProvider({}));
  await assert.rejects(() => service.analyze({}), error => error.code === 'VALIDATION');
});

test('service valida BPM manual e URL do YouTube sem chamar provider', async () => {
  const provider = new MockProvider({});
  const service = new MusicAIService(provider);
  await assert.rejects(() => service.analyze({ pastedText: 'x', manualBpm: 999 }), error => error.code === 'VALIDATION');
  await assert.rejects(() => service.analyze({ pastedText: 'x', youtubeUrl: 'https://example.com/video' }), error => error.code === 'VALIDATION');
  assert.equal(provider.calls, 0);
});

test('mantém seção curta em uma única linha compacta', () => {
  const compact = compactSectionContent([
    'G               D',
    'Primeira linha completa da estrofe',
    'Em              C',
    'Continuação que não deve ir inteira para a cifra'
  ].join('\n'), 'Estrofe');

  assert.equal(compact, 'Primeira linha - G  D  Em  C');
  assert.doesNotMatch(compact, /completa da estrofe/);
  assert.doesNotMatch(compact, /Continuação/);
});

test('detalha estrofe longa por blocos sem copiar a letra inteira', () => {
  const compact = compactSectionContent([
    'B                   E/B',
    'Deixou os céus para me encontrar',
    'B              E/B',
    'Aqui não é o Seu lugar',
    'G#m             E         B',
    'Um amor assim o mundo não conheceu',
    '',
    'B                 E/B',
    'Naquela cruz se entregou',
    'B                 E/B',
    'O Teu perdão me alcançou',
    'G#m             E         B',
    'Um amor assim o mundo não conheceu'
  ].join('\n'), 'Estrofe 1');

  assert.equal(compact, [
    'Deixou os - B  E/B  G#m  E  B',
    '',
    'Naquela cruz - B  E/B  G#m  E  B'
  ].join('\n'));
});

test('detalha refrão com mais de 5 acordes em pequenas frases e elimina progressão consecutiva repetida', () => {
  const compact = compactSectionContent([
    'B',
    'No altar de adoração',
    'F#/B         B',
    'Seja sempre exaltado',
    'E     B/D#     F#4',
    'Jesus, Filho de Deus',
    'G#m',
    'Deixou a Sua glória',
    'F#/A#        B',
    'Morreu em meu lugar',
    'E     B/D#     F#4',
    'Jesus, Filho de Deus',
    'E     B/D#     F#4',
    'Tu és Jesus, Filho de Deus'
  ].join('\n'), 'Refrão');

  assert.equal(compact, [
    'No altar - B  F#/B  B',
    'Jesus, Filho - E  B/D#  F#4',
    '',
    'Deixou a Sua - G#m  F#/A#  B',
    'Jesus, Filho - E  B/D#  F#4'
  ].join('\n'));
});

test('monta cifra compacta do IDE Music e remove estruturas repetidas', () => {
  const chordSheet = composeChordSheet({
    chordSheet: 'MENU DO SITE\nCifra copiada sem tratamento',
    sections: [
      { type: 'intro', label: 'Intro', content: 'Intro:\nG  D  Em  C' },
      { type: 'verse', label: 'Verse', content: 'G  D\nPrimeira linha completa\nEm  C\nOutra frase da estrofe' },
      { type: 'chorus', label: 'Chorus', content: 'C  G\nLinha do refrão completa\nAm  F\nContinuação do refrão' },
      { type: 'verse', label: 'Verse', content: 'Em  C\nSegunda estrofe completa\nG  D\nOutra frase diferente' },
      { type: 'chorus', label: 'Chorus', content: 'C  G\nLinha do refrão completa\nAm  F\nContinuação do refrão' },
      { type: 'bridge', label: 'Bridge', content: 'Em  C  G  D' }
    ]
  });

  assert.equal(chordSheet, [
    'Intro:\nG  D  Em  C',
    'Estrofe 1:\nPrimeira linha - G  D  Em  C',
    'Refrão:\nLinha do - C  G  Am  F',
    'Estrofe 2:\nSegunda estrofe - Em  C  G  D',
    'Ponte:\nEm  C  G  D'
  ].join('\n\n'));
  assert.doesNotMatch(chordSheet, /MENU DO SITE/);
  assert.equal((chordSheet.match(/Refrão:/g) || []).length, 1);
});

test('link de referência nunca usa a página da cifra', () => {
  const sourceUrl = 'https://www.cifraclub.com.br/artista/musica/';
  assert.equal(resolveReferenceLink({ video: { url: sourceUrl } }, { sourceUrl }), '');
  assert.equal(resolveReferenceLink({}, { sourceUrl }), '');
  assert.equal(resolveReferenceLink({ video: { url: 'https://www.youtube.com/watch?v=video123' } }, { sourceUrl }), 'https://www.youtube.com/watch?v=video123');
  assert.equal(resolveReferenceLink({}, { sourceUrl, youtubeUrl: 'https://youtu.be/video123' }), 'https://youtu.be/video123');
});

test('UI informa visualmente enquanto a IA está analisando', async () => {
  const source = await readFile(new URL('../src/js/modules/music-ai-import.js', import.meta.url), 'utf8');
  assert.match(source, /A IA está analisando a música/);
  assert.match(source, /ai-import__thinking/);
  assert.match(source, /aria-busy/);
  assert.match(source, /IA analisando/);
});
