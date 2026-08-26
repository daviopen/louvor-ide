const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const migration = require('../src/scripts/migrate-legacy-data.cjs');
const workflow = fs.readFileSync(path.join(root, '.github/workflows/data-migration.yml'), 'utf8');
const quality = fs.readFileSync(path.join(root, '.github/workflows/quality-gate.yml'), 'utf8');
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

test('legacy migration maps all known legacy domains to canonical collections', () => {
  const pairs = new Set(migration.LEGACY_MAPPINGS.map(item => `${item.source}->${item.target}`));
  [
    'musicas->songs',
    'usuarios->users',
    'funcoesMinisteriais->ministryFunctions',
    'funcoesUsuarios->userFunctions',
    'permissoes->permissions',
    'indisponibilidades->unavailability',
    'eventos->events',
    'escalas->schedules',
    'membrosEscala->scheduleMembers',
    'repertorios->setlists'
  ].forEach(pair => assert.ok(pairs.has(pair), `missing mapping ${pair}`));
});

test('song migration preserves legacy data while populating canonical fields', () => {
  const original = {
    titulo: 'Graça',
    artista: 'Artista',
    tom: 'G',
    tema: 'Graça',
    link: 'https://example.test',
    cifra: '[G]...',
    letra: '...',
    observacoes: 'Nota'
  };
  const migrated = migration.normalizeSong(original);
  assert.equal(migrated.titulo, original.titulo);
  assert.equal(migrated.title, 'Graça');
  assert.equal(migrated.artist, 'Artista');
  assert.equal(migrated.originalKey, 'G');
  assert.equal(migrated.theme, 'Graça');
  assert.equal(migrated.referenceLink, 'https://example.test');
  assert.equal(migrated.chord, '[G]...');
  assert.equal(migrated.lyrics, '...');
  assert.equal(migrated.notes, 'Nota');
  assert.equal(migrated.migratedFrom, 'musicas');
  assert.ok(migrated.migratedAt instanceof Date);
});

test('migration workflow applies on main and verifies after apply', () => {
  assert.match(workflow, /push:\s*\n\s*branches: \[main\]/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /migrate-legacy-data\.cjs --apply/);
  assert.match(workflow, /migrate-legacy-data\.cjs --verify/);
  assert.match(workflow, /cancel-in-progress: false/);
});

test('quality gate exposes lint, tests, build and Firestore rules', () => {
  assert.equal(packageJson.scripts.lint, 'make lint');
  assert.match(quality, /npm run lint/);
  assert.match(quality, /npm test/);
  assert.match(quality, /npm run build/);
  assert.match(quality, /firestore-rules\.test\.js/);
});
