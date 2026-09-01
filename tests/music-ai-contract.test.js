const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const contractPath = path.join(root, 'src/services/music-ai-contract.js');

async function loadContract() {
  const source = fs.readFileSync(contractPath, 'utf8');
  const url = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
  return import(url);
}

test('contrato de IA é versionado e normaliza tons sem inventar valores', async () => {
  const contract = await loadContract();
  assert.equal(contract.MUSIC_AI_SCHEMA_VERSION, '1.0.0');
  assert.equal(contract.normalizeMusicalKey('f♯m'), 'F#m');
  assert.equal(contract.normalizeMusicalKey('Bb'), 'Bb');
  assert.equal(contract.normalizeMusicalKey('H'), null);
  assert.equal(contract.normalizeMusicalKey('C/G'), null);
});

test('BPM e compasso aceitam somente faixas plausíveis', async () => {
  const contract = await loadContract();
  assert.equal(contract.normalizeBpm(72.4), 72);
  assert.equal(contract.normalizeBpm(30), 30);
  assert.equal(contract.normalizeBpm(300), 300);
  assert.equal(contract.normalizeBpm(301), null);
  assert.equal(contract.normalizeBpm(12), null);
  assert.equal(contract.normalizeTimeSignature(' 6 / 8 '), '6/8');
  assert.equal(contract.normalizeTimeSignature('4/3'), null);
  assert.equal(contract.normalizeTimeSignature('99/4'), null);
});

test('YouTube é estruturado com provider, URL e videoId', async () => {
  const contract = await loadContract();
  assert.deepEqual(contract.parseYouTubeReference('https://youtu.be/dQw4w9WgXcQ?t=10'), {
    provider: 'youtube',
    url: 'https://youtu.be/dQw4w9WgXcQ?t=10',
    videoId: 'dQw4w9WgXcQ'
  });
  assert.equal(contract.parseYouTubeReference('https://example.com/video'), null);
});

test('resposta parcial mantém campos ausentes vazios e descarta dados inválidos', async () => {
  const contract = await loadContract();
  const result = contract.normalizeMusicAIResponse({
    title: 'Canção Teste',
    originalKey: 'Z#',
    bpm: 500,
    sections: [
      { type: 'Intro', content: 'C  G' },
      { type: 'Refrão', content: 'Am  F' }
    ]
  });

  assert.equal(result.title, 'Canção Teste');
  assert.equal(result.artist, null);
  assert.equal(result.originalKey, null);
  assert.equal(result.bpm, null);
  assert.deepEqual(result.sections.map(section => section.type), ['intro', 'chorus']);
  assert.ok(result.warnings.some(item => /tom sugerido/i.test(item)));
  assert.ok(result.warnings.some(item => /BPM sugerido/i.test(item)));
});

test('BPM manual prevalece sobre sugestão automática', async () => {
  const contract = await loadContract();
  const result = contract.normalizeMusicAIResponse({ bpm: 140 }, { manualBpm: 96 });
  assert.equal(result.bpm, 96);
});

test('entrada aceita texto, URL ou ambos e sempre oferece fallback manual', async () => {
  const contract = await loadContract();
  assert.equal(contract.validateMusicAIInput({}).valid, false);
  assert.equal(contract.validateMusicAIInput({ pastedText: 'Intro: C G' }).valid, true);
  assert.equal(contract.validateMusicAIInput({ sourceUrl: 'https://example.com/cifra' }).valid, true);
  assert.equal(contract.buildSourceType({ pastedText: 'x', sourceUrl: 'https://example.com/cifra' }), 'pasted_text+url');
});

test('metadados persistíveis registram proveniência sem copiar cifra ou letra para auditoria técnica', async () => {
  const contract = await loadContract();
  const metadata = contract.buildMusicAIImportMetadata({
    chordSheet: 'conteúdo que não deve entrar no metadata',
    lyrics: 'letra que não deve entrar no metadata',
    sections: [{ type: 'verse', content: 'texto da seção' }],
    fieldProvenance: [{ field: 'title', source: 'pasted_text', confidence: 'high', evidence: 'Cabeçalho' }]
  }, {
    pastedText: 'conteúdo',
    sourceUrl: 'https://example.com/cifra'
  }, {
    provider: 'firebase-ai-logic',
    model: 'gemini-test'
  }, new Date('2026-08-31T20:00:00Z'));

  assert.equal(metadata.schemaVersion, '1.0.0');
  assert.equal(metadata.sourceProvider, 'example.com');
  assert.equal(metadata.sourceType, 'pasted_text+url');
  assert.equal(metadata.provider, 'firebase-ai-logic');
  assert.equal(Object.hasOwn(metadata, 'chordSheet'), false);
  assert.equal(Object.hasOwn(metadata, 'lyrics'), false);
});
