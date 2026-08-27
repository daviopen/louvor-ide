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
const workflow = read('.github/workflows/legacy-data-cleanup.yml');
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

test('workflow de limpeza em produção é exclusivamente manual', () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /workflow_run:/);
  assert.doesNotMatch(workflow, /\bpush:/);
  assert.doesNotMatch(workflow, /\bschedule:/);
  assert.match(workflow, /dry-run/);
  assert.match(workflow, /cleanup-legacy-data\.cjs --apply/);
  assert.match(workflow, /cleanup-legacy-data\.cjs --restore-musicas/);
});

test('utilitário de chunks respeita limite operacional de batch', () => {
  assert.equal(cleanup.SOURCE, 'musicas');
  assert.equal(cleanup.TARGET, 'songs');
  assert.equal(cleanup.BATCH_SIZE, 400);
  assert.deepEqual(cleanup.chunks([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
});
