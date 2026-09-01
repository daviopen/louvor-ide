import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyMusicAIInput,
  extractLyricsFromPastedMusicText,
  parseSongQueryIdentity,
  MusicAIService
} from '../src/services/music-ai-service.js';
import {
  extractSongIdentityFromChordUrl,
  selectMusicAIStrategy
} from '../src/services/firebase-music-ai-provider.js';
import { MusicAIProvider } from '../src/services/music-ai-provider.js';

class CaptureProvider extends MusicAIProvider {
  constructor(result = null) {
    super({ provider: 'capture', model: 'test' });
    this.lastInput = null;
    this.result = result;
  }

  async analyzeSong(input) {
    this.lastInput = input;
    return this.result || {
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
  assert.deepEqual(result.songIdentity, { title: 'Jesus, Filho de Deus', artist: 'Fernandinho' });
});

test('nome e artista separados por última vírgula também são identificados', () => {
  assert.deepEqual(parseSongQueryIdentity('Nada além do Sangue, Fernandinho'), {
    title: 'Nada além do Sangue',
    artist: 'Fernandinho'
  });
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

test('cada entrada escolhe uma estratégia adequada sem URL Context global', () => {
  assert.equal(selectMusicAIStrategy({ sourceType: 'youtube-url', youtubeUrl: 'https://youtu.be/abc123' }), 'video');
  assert.equal(selectMusicAIStrategy({ sourceType: 'source-url', sourceUrl: 'https://www.cifraclub.com.br/a/b/' }), 'url');
  assert.equal(selectMusicAIStrategy({ sourceType: 'song-query', songQuery: 'Música — Artista' }), 'plain');
  assert.equal(selectMusicAIStrategy({ sourceType: 'pasted-text', pastedText: 'Intro:\nG C' }), 'plain');
});

test('identidade da música pode ser inferida de Cifra Club e Banana Cifras para fallback', () => {
  assert.deepEqual(
    extractSongIdentityFromChordUrl('https://www.cifraclub.com.br/fernandinho/grandes-coisas/'),
    { title: 'Grandes Coisas', artist: 'Fernandinho' }
  );
  assert.deepEqual(
    extractSongIdentityFromChordUrl('https://www.bananacifras.com/cifra/f/fernandinho/grandes-coisas'),
    { title: 'Grandes Coisas', artist: 'Fernandinho' }
  );
});

test('letra é extraída de conteúdo colado removendo linhas formadas só por acordes', () => {
  const lyrics = extractLyricsFromPastedMusicText([
    'Tom: B',
    'Estrofe:',
    'B                   E/B',
    'Deixou os céus para me encontrar',
    'G#m             E         B',
    'Um amor assim o mundo não conheceu',
    '',
    'Refrão:',
    'B  F#/B  E',
    'No altar de adoração'
  ].join('\n'));

  assert.match(lyrics, /Deixou os céus/);
  assert.match(lyrics, /Um amor assim/);
  assert.match(lyrics, /No altar de adoração/);
  assert.doesNotMatch(lyrics, /B\s+E\/B/);
  assert.doesNotMatch(lyrics, /Tom: B/);
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

test('service preserva nome e artista informados quando a IA omite esses campos', async () => {
  const provider = new CaptureProvider({
    schemaVersion: '1.0.0',
    title: null,
    artist: null,
    originalKey: 'B',
    chordSheet: 'Intro:\nB E',
    lyrics: null,
    sections: [],
    timeSignature: null,
    bpm: null,
    bpmSource: null,
    video: null,
    provenance: {}
  });
  const service = new MusicAIService(provider);
  const result = await service.analyze({ rawInput: 'Nada além do Sangue, Fernandinho' });
  assert.equal(result.data.title, 'Nada além do Sangue');
  assert.equal(result.data.artist, 'Fernandinho');
});

test('service rejeita somente quando o campo único está vazio', async () => {
  const service = new MusicAIService(new CaptureProvider());
  await assert.rejects(
    () => service.analyze({ rawInput: '   ' }),
    error => error.code === 'VALIDATION' && /Informe o nome da música/.test(error.message)
  );
});
