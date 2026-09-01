import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeMusicAIResponse, normalizeMusicalKey, normalizeBpm, extractYouTubeVideoId, MUSIC_AI_SCHEMA_VERSION } from '../src/services/music-ai-schema.js';
import { MusicAIService } from '../src/services/music-ai-service.js';
import { MusicAIProvider } from '../src/services/music-ai-provider.js';

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
