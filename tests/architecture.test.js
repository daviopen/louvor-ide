const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('architecture directories and contracts exist', () => {
  const required = [
    'src/core',
    'src/components',
    'src/features',
    'src/services',
    'src/repositories',
    'src/models',
    'src/dtos',
    'src/routes',
    'src/utils',
    'src/styles',
    'src/constants',
    'src/tests'
  ];

  for (const dir of required) {
    assert.equal(fs.existsSync(path.join(root, dir)), true, `missing ${dir}`);
  }
});

test('MusicService delegates persistence to MusicRepository', () => {
  const service = read('src/js/modules/music-service.js');
  assert.match(service, /musicRepository/);
  assert.doesNotMatch(service, /this\.db\.collection|window\.db/);
});

test('MusicRepository owns canonical songs persistence', () => {
  const repository = read('src/repositories/music-repository.js');
  const constants = read('src/constants/collections.js');
  assert.match(repository, /extends BaseRepository/);
  assert.match(repository, /COLLECTIONS\.SONGS/);
  assert.match(constants, /SONGS:\s*'songs'/);
  assert.doesNotMatch(repository, /COLLECTIONS\.MUSICS|legacyCollectionName/);
  assert.doesNotMatch(constants, /MUSICS:\s*'musicas'/);
});

test('standard error and UI state contracts are defined', () => {
  assert.match(read('src/core/app-error.js'), /class AppError extends Error/);
  const uiState = read('src/core/ui-state.js');
  for (const status of ['IDLE', 'LOADING', 'SUCCESS', 'EMPTY', 'ERROR']) {
    assert.match(uiState, new RegExp(`${status}:`));
  }
  assert.match(uiState, /confirmAction/);
});
