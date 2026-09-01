import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyMusicAIInput,
  extractLyricsFromPastedMusicText,
  parseSongQueryIdentity,
  MusicAIService
} from '../src/services/music-ai-service.js';
import {
  buildChordSourceCandidates,
  chordResultMatchesIdentity,
  extractSongIdentityFromChordUrl,
  mergeVideoAndChordSource,
  selectMusicAIStrategy,
  slugifyChordPath,
  urlContextRetrievedSuccessfully
} from '../src/services/firebase-music-ai-provider.js';
import { normalizeMusicAIResponse } from '../src/services/music-ai-schema.js';
import { MusicAIProvider } from '../src/services/music-ai-provider.js';

class CaptureProvider extends MusicAIProvider {
  constructor(result = null) {
    super({ provider: 'capture', model: 'test' });
    this.lastInput = null;
    this.result = result;
  }

  async analyzeSong(input) {
    this.lastInput = input;
    input.onProgress?.({ stage: 'test', message: 'progresso' });
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

class FlakyProvider extends CaptureProvider {
  constructor(result = null) {
    super(result);
    this.calls = 0;
  }

  async analyzeSong(input) {
    this.calls += 1;
    if (this.calls === 1) {
      const error = new Error('Internal Server Error');
      error.code = 'UNAVAILABLE';
      throw error;
    }
    return super.analyzeSong(input);
  }
}

class AlwaysUnavailableProvider extends MusicAIProvider {
  constructor() {
    super({ provider: 'primary', model: 'unstable-model' });
    this.calls = 0;
  }

  async analyzeSong() {
    this.calls += 1;
    const error = new Error('Internal Server Error');
    error.code = 'UNAVAILABLE';
    throw error;
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

test('gera candidatos de cifra conhecidos a partir da identidade detectada no YouTube', () => {
  assert.equal(slugifyChordPath('Nada Além do Sangue'), 'nada-alem-do-sangue');
  const candidates = buildChordSourceCandidates({ title: 'Nada Além do Sangue', artist: 'Fernandinho' });
  assert.deepEqual(candidates, [
    {
      provider: 'cifraclub',
      label: 'Cifra Club',
      url: 'https://www.cifraclub.com.br/fernandinho/nada-alem-do-sangue/'
    },
    {
      provider: 'bananacifras',
      label: 'Banana Cifras',
      url: 'https://www.bananacifras.com/cifra/f/fernandinho/nada-alem-do-sangue'
    }
  ]);
});

test('só aceita cifra recuperada por URL Context e compatível com a música identificada', () => {
  const expectedUrl = 'https://www.cifraclub.com.br/fernandinho/nada-alem-do-sangue/';
  assert.equal(urlContextRetrievedSuccessfully({
    urlMetadata: [{ retrievedUrl: expectedUrl, urlRetrievalStatus: 'URL_RETRIEVAL_STATUS_SUCCESS' }]
  }, expectedUrl), true);
  assert.equal(urlContextRetrievedSuccessfully({
    urlMetadata: [{ retrievedUrl: expectedUrl, urlRetrievalStatus: 'URL_RETRIEVAL_STATUS_ERROR' }]
  }, expectedUrl), false);
  assert.equal(chordResultMatchesIdentity(
    { title: 'Nada Além do Sangue', artist: 'Fernandinho' },
    { title: 'Nada Além do Sangue', artist: 'Fernandinho' }
  ), true);
  assert.equal(chordResultMatchesIdentity(
    { title: 'Grandes Coisas', artist: 'Fernandinho' },
    { title: 'Nada Além do Sangue', artist: 'Fernandinho' }
  ), false);
});

test('mescla identificação e vídeo com a cifra confirmada sem trocar o link de referência', () => {
  const videoData = {
    schemaVersion: '1.0.0',
    title: 'Nada Além do Sangue',
    artist: 'Fernandinho',
    originalKey: 'A',
    chordSheet: 'sugestão do vídeo',
    lyrics: null,
    sections: [],
    timeSignature: '4/4',
    bpm: 72,
    bpmSource: 'análise do vídeo',
    video: { provider: 'youtube', url: 'https://www.youtube.com/watch?v=abc123', videoId: 'abc123' },
    provenance: { title: 'vídeo' }
  };
  const chordData = {
    title: 'Nada Além do Sangue',
    artist: 'Fernandinho',
    originalKey: 'Bb',
    chordSheet: 'Intro:\nA D9/F# A D9/F#',
    sections: [{ type: 'intro', label: 'Intro', content: 'A D9/F# A D9/F#' }],
    provenance: { chordSheet: 'página de cifra' }
  };
  const merged = mergeVideoAndChordSource(videoData, chordData, {
    provider: 'cifraclub',
    label: 'Cifra Club',
    url: 'https://www.cifraclub.com.br/fernandinho/nada-alem-do-sangue/'
  });

  assert.equal(merged.originalKey, 'Bb');
  assert.equal(merged.bpm, 72);
  assert.equal(merged.video.url, 'https://www.youtube.com/watch?v=abc123');
  assert.equal(merged.chordSheet, 'Intro:\nA D9/F# A D9/F#');
  assert.equal(merged.chordSourceProvider, 'cifraclub');
  assert.match(merged.chordSourceUrl, /cifraclub\.com\.br/);
});

test('normalização preserva a fonte de cifra adicionada pelo provider', () => {
  const normalized = normalizeMusicAIResponse({
    title: 'Nada Além do Sangue',
    artist: 'Fernandinho',
    chordSourceUrl: 'https://www.cifraclub.com.br/fernandinho/nada-alem-do-sangue/',
    chordSourceProvider: 'cifraclub'
  });
  assert.match(normalized.chordSourceUrl, /nada-alem-do-sangue/);
  assert.equal(normalized.chordSourceProvider, 'cifraclub');
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

test('service encaminha a classificação automática e callback de progresso para o provider', async () => {
  const provider = new CaptureProvider();
  const service = new MusicAIService(provider);
  const progress = [];
  const result = await service.analyze({
    rawInput: 'https://www.youtube.com/watch?v=HYwg0HlxBas',
    onProgress: event => progress.push(event)
  });

  assert.equal(provider.lastInput.sourceType, 'youtube-url');
  assert.equal(provider.lastInput.youtubeUrl, 'https://www.youtube.com/watch?v=HYwg0HlxBas');
  assert.equal(typeof provider.lastInput.onProgress, 'function');
  assert.equal(result.input.sourceType, 'youtube-url');
  assert.equal(result.data.video.videoId, 'HYwg0HlxBas');
  assert.deepEqual(progress, [{ stage: 'test', message: 'progresso' }]);
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

test('service repete automaticamente uma falha temporária do provider', async () => {
  const provider = new FlakyProvider();
  const service = new MusicAIService(provider);
  const progress = [];
  const result = await service.analyze({
    rawInput: 'Intro:\nG C Em D\n\nEstrofe:\nG C\nGrandes coisas fez por nós',
    onProgress: event => progress.push(event)
  });

  assert.equal(provider.calls, 2);
  assert.equal(result.data.artist, 'Fernandinho');
  assert.ok(progress.some(event => event.stage === 'retry'));
});

test('service usa modelo alternativo quando a instabilidade persiste após retry', async () => {
  const primary = new AlwaysUnavailableProvider();
  const fallback = new CaptureProvider({
    schemaVersion: '1.0.0',
    title: 'Grandes Coisas',
    artist: 'Fernandinho',
    originalKey: 'Db',
    chordSheet: 'Intro:\nAb7  Gb',
    lyrics: null,
    sections: [],
    timeSignature: '4/4',
    bpm: 72,
    bpmSource: 'modelo alternativo',
    video: null,
    provenance: {}
  });
  fallback.provider = 'fallback';
  fallback.model = 'fallback-model';

  const service = new MusicAIService(primary, { fallbackProvider: fallback });
  const progress = [];
  const result = await service.analyze({
    rawInput: 'Intro:\nAb7 Gb\n\nEstrofe:\nDb Gb\nGrandes coisas fez por nós',
    onProgress: event => progress.push(event)
  });

  assert.equal(primary.calls, 2);
  assert.equal(result.provider.model, 'fallback-model');
  assert.equal(result.data.title, 'Grandes Coisas');
  assert.ok(progress.some(event => event.stage === 'fallback-model'));
});

test('service rejeita somente quando o campo único está vazio', async () => {
  const service = new MusicAIService(new CaptureProvider());
  await assert.rejects(
    () => service.analyze({ rawInput: '   ' }),
    error => error.code === 'VALIDATION' && /Informe o nome da música/.test(error.message)
  );
});
