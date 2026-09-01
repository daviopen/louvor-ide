import test from 'node:test';
import assert from 'node:assert/strict';
import { MusicAIProvider } from '../src/services/music-ai-provider.js';
import { MusicAIService, hasUsefulChordDetail } from '../src/services/music-ai-service.js';

class SongQuerySourceProvider extends MusicAIProvider {
  constructor() {
    super({ provider: 'song-query-source-test', model: 'test-model' });
    this.calls = [];
  }

  async analyzeSong(input) {
    this.calls.push(input.sourceUrl || 'plain');

    if (/cifraclub\.com\.br/.test(input.sourceUrl || '')) {
      return {
        schemaVersion: '1.0.0',
        title: 'Grandes Coisas',
        artist: 'Fernandinho',
        originalKey: 'G',
        chordSheet: 'Intro:\nG C Em D\n\nEstrofe:\nTu és',
        lyrics: null,
        sections: [
          { type: 'intro', label: 'Intro', content: 'G C Em D' },
          { type: 'verse', label: 'Estrofe', content: 'Tu és' }
        ],
        timeSignature: null,
        bpm: null,
        bpmSource: null,
        video: null,
        provenance: {}
      };
    }

    if (/bananacifras\.com/.test(input.sourceUrl || '')) {
      return {
        schemaVersion: '1.0.0',
        title: 'Grandes Coisas',
        artist: 'Fernandinho',
        originalKey: 'G',
        chordSheet: 'Intro:\nG C Em D\n\nEstrofe:\nTu és - G C Em D\n\nRefrão:\nGrandes coisas - C G D Em',
        lyrics: null,
        sections: [
          { type: 'intro', label: 'Intro', content: 'G C Em D' },
          { type: 'verse', label: 'Estrofe', content: 'Tu és - G C Em D' },
          { type: 'chorus', label: 'Refrão', content: 'Grandes coisas - C G D Em' }
        ],
        timeSignature: '4/4',
        bpm: 72,
        bpmSource: 'fonte',
        video: null,
        provenance: {}
      };
    }

    throw new Error('consulta plain não deveria ser necessária');
  }
}

test('rejeita cifra esparsa sem acordes suficientes', () => {
  assert.equal(hasUsefulChordDetail({
    sections: [
      { content: 'G C Em D' },
      { content: 'Tu és' },
      { content: 'Grandes coisas' }
    ]
  }), false);
});

test('nome + artista tenta outra fonte até encontrar cifra detalhada', async () => {
  const provider = new SongQuerySourceProvider();
  const service = new MusicAIService(provider, { fallbackProvider: null });

  const result = await service.analyze({ rawInput: 'Grandes coisas, fernandinho' });

  assert.equal(result.data.title, 'Grandes Coisas');
  assert.equal(result.data.artist, 'Fernandinho');
  assert.equal(result.data.originalKey, 'G');
  assert.match(result.data.chordSheet, /Estrofe:/);
  assert.match(result.data.chordSheet, /Refrão:/);
  assert.equal(result.data.chordSourceProvider, 'bananacifras');
  assert.match(result.data.chordSourceUrl, /bananacifras\.com/);
  assert.equal(provider.calls.length, 2);
  assert.match(provider.calls[0], /cifraclub\.com\.br/);
  assert.match(provider.calls[1], /bananacifras\.com/);
});
