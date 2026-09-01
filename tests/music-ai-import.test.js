import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeMusicAIResponse, normalizeMusicalKey, normalizeBpm, extractYouTubeVideoId, MUSIC_AI_SCHEMA_VERSION } from '../src/services/music-ai-schema.js';
import { MusicAIService } from '../src/services/music-ai-service.js';
import { MusicAIProvider } from '../src/services/music-ai-provider.js';
import { composeChordSheet, resolveReferenceLink } from '../src/js/modules/music-ai-import.js';

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

test('extrai videoId de URLs YouTube suportadas', () => {
  assert.equal(extractYouTubeVideoId('https://www.youtube.com/watch?v=abc123XYZ'), 'abc123XYZ');
  assert.equal(extractYouTubeVideoId('https://youtu.be/abc123XYZ'), 'abc123XYZ');
  assert.equal(extractYouTubeVideoId('https://www.youtube.com/shorts/abc123XYZ'), 'abc123XYZ');
  assert.equal(extractYouTubeVideoId('https://example.com/video'), null);
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

test('monta cifra pelo padrão natural do IDE Music e prioriza sections sobre copia-e-cola bruto', () => {
  const chordSheet = composeChordSheet({
    chordSheet: 'MENU DO SITE\nCifra copiada sem tratamento',
    sections: [
      { type: 'intro', label: 'Intro', content: 'Intro:\nG  D  Em  C' },
      { type: 'verse', label: 'Verse 1', content: 'G               D\nPrimeira linha' },
      { type: 'chorus', label: 'Chorus', content: 'C               G\nLinha do refrão' },
      { type: 'bridge', label: 'Bridge', content: 'Em  C  G  D' }
    ]
  });

  assert.equal(chordSheet, [
    'Intro:\nG  D  Em  C',
    'Estrofe 1:\nG               D\nPrimeira linha',
    'Refrão:\nC               G\nLinha do refrão',
    'Ponte:\nEm  C  G  D'
  ].join('\n\n'));
  assert.doesNotMatch(chordSheet, /MENU DO SITE/);
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
