import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('importação exige revisão explícita antes de aplicar ao formulário', async () => {
  const source = await readFile(new URL('../src/js/modules/music-ai-import-base.js', import.meta.url), 'utf8');
  assert.match(source, /Aplicar sugestões/);
  assert.match(source, /pendingResult = result/);
  assert.match(source, /apply\.addEventListener\('click'/);
  assert.match(source, /validateHarmonicContext\(data\)/);
  assert.match(source, /harmonic\.valid !== false && setValue\('cifra'/);
});

test('prévia mostra tom, forma, capotraste, validação, vídeo e fonte', async () => {
  const source = await readFile(new URL('../src/js/modules/music-ai-import-base.js', import.meta.url), 'utf8');
  for (const label of ['Tom original:', 'Forma encontrada:', 'Capotraste:', 'Validação harmônica:', 'Vídeo:', 'Fonte:']) {
    assert.match(source, new RegExp(label));
  }
});

test('tema é aplicado somente após confirmação das sugestões', async () => {
  const source = await readFile(new URL('../src/js/modules/music-ai-import.js', import.meta.url), 'utf8');
  assert.match(source, /pendingTheme = String\(data\.theme/);
  assert.match(source, /applyButton\.addEventListener\('click'/);
  assert.match(source, /themeField\.value = pendingTheme/);
});

test('diagnósticos transitórios não são persistidos junto da música', async () => {
  const source = await readFile(new URL('../src/js/pages/song-form.js', import.meta.url), 'utf8');
  assert.match(source, /sourceChordSheet: _sourceChordSheet/);
  assert.match(source, /canonicalChordSheet: _canonicalChordSheet/);
  assert.match(source, /fieldConfidence: _fieldConfidence/);
  assert.match(source, /harmonicValidation: _harmonicValidation/);
});
