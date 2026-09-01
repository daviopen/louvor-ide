import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyMusicAIInput, MusicAIService } from '../src/services/music-ai-service.js';
import { MusicAIProvider } from '../src/services/music-ai-provider.js';

class CaptureProvider extends MusicAIProvider {
  constructor() {
    super({ provider: 'capture', model: 'test' });
    this.lastInput = null;
  }

  async analyzeSong(input) {
    this.lastInput = input;
    return {
      schemaVersion: '1.0.0',
      title: 'Jesus, Filho de Deus',
      artist: 'Fernandinho',
      originalKey: 'B',
      chordSheet: null,
      lyrics: null,
      sections: [],
      timeSignature: null,
      bpm: null,
      bpmSource: null,
      video: input.youtubeUrl ? { provider: 'youtube', url: input.youtubeUrl, videoId: 'HYwg0HlxBas' } : null,
      provenance: {}
    };
  }
}

test('entrada única reconhece link do YouTube', () => {
  const result = classifyMusicAIInput('https://www.youtube.com/watch?v=HYwg0HlxBas');
  assert.equal(result.sourceType, 'youtube-url');
  assert.equal(result.youtubeUrl, 'https://www.youtube.com/watch?v=HYwg0HlxBas');
  assert.equal(result.sourceUrl, null);
  assert.equal(result.pastedText, '');
});

test('entrada única reconhece URL de cifra/fonte', () => {
  const result = classifyMusicAIInput('https://www.cifraclub.com.br/fernandinho/jesus-filho-de-deus/');
  assert.equal(result.sourceType, 'source-url');
  assert.match(result.sourceUrl, /cifraclub\.com\.br/);
  assert.equal(result.youtubeUrl, null);
});

test('entrada única reconhece nome da música e artista', () => {
  const result = classifyMusicAIInput('Jesus, Filho de Deus — Fernandinho');
  assert.equal(result.sourceType, 'song-query');
  assert.equal(result.songQuery, 'Jesus, Filho de Deus — Fernandinho');
  assert.equal(result.pastedText, 'Jesus, Filho de Deus — Fernandinho');
});

test('entrada única reconhece cifra colada como texto e não como busca simples', () => {
  const result = classifyMusicAIInput([
    'Intro:',
    'B  E/B  B  E/B',
    '',
    'Estrofe:',
    'B  E/B',
    'Deixou os céus para me encontrar'
  ].join('\n'));
  assert.equal(result.sourceType, 'pasted-text');
  assert.match(result.pastedText, /Intro:/);
  assert.equal(result.songQuery, null);
});

test('service encaminha a classificação automática para o provider', async () => {
  const provider = new CaptureProvider();
  const service = new MusicAIService(provider);
  const result = await service.analyze({ rawInput: 'https://www.youtube.com/watch?v=HYwg0HlxBas' });

  assert.equal(provider.lastInput.sourceType, 'youtube-url');
  assert.equal(provider.lastInput.youtubeUrl, 'https://www.youtube.com/watch?v=HYwg0HlxBas');
  assert.equal(result.input.sourceType, 'youtube-url');
  assert.equal(result.data.video.videoId, 'HYwg0HlxBas');
});

test('service rejeita somente quando o campo único está vazio', async () => {
  const service = new MusicAIService(new CaptureProvider());
  await assert.rejects(
    () => service.analyze({ rawInput: '   ' }),
    error => error.code === 'VALIDATION' && /Informe o nome da música/.test(error.message)
  );
});
