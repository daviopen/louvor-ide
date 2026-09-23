const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');
const cleanup = require('../src/scripts/cleanup-legacy-data.cjs');

const repository = read('src/repositories/music-repository.js');
const collections = read('src/constants/collections.js');
const rules = read('firestore.rules');
const script = read('src/scripts/cleanup-legacy-data.cjs');

test('runtime de músicas usa somente a collection canônica songs', () => {
  assert.match(repository, /COLLECTIONS\.SONGS/);
  assert.doesNotMatch(repository, /COLLECTIONS\.MUSICS|legacyCollectionName|['"]musicas['"]/);
  assert.doesNotMatch(collections, /MUSICS\s*:/);
  assert.doesNotMatch(rules, /match \/musicas\//);
});

test('limpeza só apaga legado depois de verificar cobertura e arquivar', () => {
  const coverageIndex = script.indexOf('await assertCanonicalCoverage');
  const archiveIndex = script.indexOf('await archive(db, sourceDocs)');
  const deleteIndex = script.indexOf('await removeSource(db, sourceDocs)');
  assert.ok(coverageIndex >= 0);
  assert.ok(archiveIndex > coverageIndex);
  assert.ok(deleteIndex > archiveIndex);
  assert.match(script, /_legacyArchives/);
  assert.match(script, /--restore-musicas/);
});

test('limpeza legada permanece como operação administrativa fora do Actions', () => {
  assert.equal(fs.existsSync(path.join(root, '.github', 'workflows', 'legacy-data-cleanup.yml')), false);
  assert.match(script, /--restore-musicas/);
  assert.match(script, /async function main/);
});

test('utilitário de chunks respeita limite operacional de batch', () => {
  assert.equal(cleanup.SOURCE, 'musicas');
  assert.equal(cleanup.TARGET, 'songs');
  assert.equal(cleanup.BATCH_SIZE, 400);
  assert.deepEqual(cleanup.chunks([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
});
