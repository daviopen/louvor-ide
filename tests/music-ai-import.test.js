import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeMusicAIResponse, normalizeMusicalKey, normalizeCapoFret, normalizeBpm, extractYouTubeVideoId, MUSIC_AI_SCHEMA_VERSION } from '../src/services/music-ai-schema.js';
import { MusicAIService } from '../src/services/music-ai-service.js';
import { MusicAIProvider } from '../src/services/music-ai-provider.js';
import { mergeEmbeddedVideoLookup, mergeVideoAndChordSource, shouldRetryEmbeddedVideoLookup } from '../src/services/firebase-music-ai-provider.js';
import { compactSectionContent, composeChordSheet, formatCapoHeader, resolveReferenceLink } from '../src/js/modules/music-ai-import.js';

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

test('normaliza capotraste somente para casas válidas', () => {
  assert.equal(normalizeCapoFret(1), 1);
  assert.equal(normalizeCapoFret('7'), 7);
  assert.equal(normalizeCapoFret(null), null);
  assert.equal(normalizeCapoFret(13), null);
  assert.equal(normalizeCapoFret('abc'), null);
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

test('preserva tom real, forma da cifra e capotraste como dados distintos', () => {
  const normalized = normalizeMusicAIResponse({
    title: 'Grandes Coisas',
    artist: 'Fernandinho',
    originalKey: 'Db',
    chordFormKey: 'C',
    capoFret: 1
  });

  assert.equal(normalized.originalKey, 'Db');
  assert.equal(normalized.chordFormKey, 'C');
  assert.equal(normalized.capoFret, 1);
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

test('mescla cifra de referência sem trocar tom real por forma de acorde', () => {
  const merged = mergeVideoAndChordSource(
    { title: 'Grandes Coisas', artist: 'Fernandinho', originalKey: 'C', capoFret: null, chordFormKey: null },
    {
      title: 'Grandes Coisas',
      artist: 'Fernandinho',
      originalKey: 'Db',
      chordFormKey: 'C',
      capoFret: 1,
      sections: [{ type: 'intro', label: 'Intro', content: 'Am7  G  F' }]
    },
    { provider: 'cifraclub', label: 'Cifra Club', url: 'https://www.cifraclub.com.br/fernandinho/grandes-coisas/' }
  );

  assert.equal(merged.originalKey, 'Db');
  assert.equal(merged.chordFormKey, 'C');
  assert.equal(merged.capoFret, 1);
});

test('resposta parcial mantém campos não identificados vazios', () => {
  const normalized = normalizeMusicAIResponse({ title: 'Canção', originalKey: 'G', bpm: 500 });
  assert.equal(normalized.schemaVersion, MUSIC_AI_SCHEMA_VERSION);
  assert.equal(normalized.title, 'Canção');
  assert.equal(normalized.artist, null);
  assert.equal(normalized.originalKey, 'G');
  assert.equal(normalized.chordFormKey, null);
  assert.equal(normalized.capoFret, null);
  assert.equal(normalized.bpm, null);
  assert.deepEqual(normalized.sections, []);
});

test('service usa provider abstrato e preserva proveniência do provider', async () => {
  const provider = new MockProvider({
    schemaVersion: MUSIC_AI_SCHEMA_VERSION,
    title: 'Exemplo',
    artist: 'Artista',
    originalKey: 'D',
    chordFormKey: null,
    capoFret: null,
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

test('detalha estrofe longa preservando as mudanças harmônicas por frase', () => {
  const compact = compactSectionContent([
    'Am7',
    'Tu és o Deus dessa terra',
    'G',
    'Tu és Rei desse povo',
    'F9  Dm7',
    'És o Senhor da nação, Tu és',
    '',
    'Am7',
    'Tu és a luz desse mundo',
    'G',
    'Esperança para os perdidos',
    'F9  Dm7',
    'Tu és a paz pra os cansados, Tu és'
  ].join('\n'), 'Estrofe');

  assert.equal(compact, [
    'Tu és - Am7',
    'Tu és - G',
    'És o Senhor - F9  Dm7',
    '',
    'Tu és - Am7',
    'Esperança para - G',
    'Tu és - F9  Dm7'
  ].join('\n'));
});

test('detalha parte com mais de 5 acordes mantendo pista e acorde correspondentes', () => {
  const compact = compactSectionContent([
    'C9  G  F9',
    'Ninguém é como nosso Deus',
    'Am7  G  F9  G',
    'Ninguém é como nosso Deus'
  ].join('\n'), 'Pré-Refrão');

  assert.equal(compact, [
    'Ninguém é - C9  G  F9',
    'Ninguém é - Am7  G  F9  G'
  ].join('\n'));
});

test('mantém seção vocal com até 5 acordes em uma linha compacta', () => {
  const compact = compactSectionContent([
    'F9',
    'Grandes coisas estão por vir',
    'G',
    'Grandes coisas vão acontecer',
    'C9  G/B  F9',
    'Nesse lugar'
  ].join('\n'), 'Refrão');

  assert.equal(compact, 'Grandes coisas - F9  G  C9  G/B  F9');
});

test('preserva repetição instrumental relevante para execução', () => {
  const compact = compactSectionContent('Am7  G  F\nAm7  G  F', 'Intro');
  assert.equal(compact, 'Am7  G  F  Am7  G  F');
});

test('formata cabeçalho de capotraste com a forma da cifra', () => {
  assert.equal(formatCapoHeader({ capoFret: 1, chordFormKey: 'C' }), 'Capotraste: 1ª casa (forma de C)');
  assert.equal(formatCapoHeader({ capoFret: null, chordFormKey: 'C' }), '');
});

test('monta cifra do IDE Music com capotraste, detalhe por limite e sem estrutura duplicada', () => {
  const chordSheet = composeChordSheet({
    originalKey: 'Db',
    chordFormKey: 'C',
    capoFret: 1,
    chordSheet: 'MENU DO SITE\nCifra copiada sem tratamento',
    sections: [
      { type: 'intro', label: 'Intro', content: 'Intro:\nAm7  G  F\nAm7  G  F' },
      { type: 'verse', label: 'Verse', content: 'Am7\nTu és o Deus dessa terra\nG\nTu és Rei desse povo\nF9  Dm7\nÉs o Senhor da nação\n\nAm7\nTu és a luz desse mundo\nG\nEsperança para os perdidos\nF9  Dm7\nTu és a paz pra os cansados' },
      { type: 'pre_chorus', label: 'Pre-Chorus', content: 'C9  G  F9\nNinguém é como nosso Deus\nAm7  G  F9  G\nNinguém é como nosso Deus' },
      { type: 'chorus', label: 'Chorus', content: 'F9\nGrandes coisas estão por vir\nG\nGrandes coisas vão acontecer\nC9  G/B  F9\nNesse lugar' },
      { type: 'chorus', label: 'Chorus', content: 'F9\nGrandes coisas estão por vir\nG\nGrandes coisas vão acontecer\nC9  G/B  F9\nNesse lugar' }
    ]
  });

  assert.equal(chordSheet, [
    'Capotraste: 1ª casa (forma de C)',
    'Intro:\nAm7  G  F  Am7  G  F',
    'Estrofe:\nTu és - Am7\nTu és - G\nÉs o Senhor - F9  Dm7\n\nTu és - Am7\nEsperança para - G\nTu és - F9  Dm7',
    'Pré-Refrão:\nNinguém é - C9  G  F9\nNinguém é - Am7  G  F9  G',
    'Refrão:\nGrandes coisas - F9  G  C9  G/B  F9'
  ].join('\n\n'));
  assert.doesNotMatch(chordSheet, /MENU DO SITE/);
  assert.equal((chordSheet.match(/^Refrão:/gm) || []).length, 1);
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
  assert.match(source, /verificando tom\/capotraste/);
  assert.match(source, /ai-import__thinking/);
  assert.match(source, /aria-busy/);
  assert.match(source, /IA analisando/);
});
