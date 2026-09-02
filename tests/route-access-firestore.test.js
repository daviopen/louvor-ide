const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/js/modules/route-access-page.js'), 'utf8');

test('tela de rotas compara perfil, espelho e documentos efetivos do Firestore', () => {
  assert.match(source, /collection\('users'\)\.orderBy\('name'\)\.get\(\)/);
  assert.match(source, /collection\('permissions'\)\.get\(\)/);
  assert.match(source, /users\.permissions/);
  assert.match(source, /Documento permissions/);
  assert.match(source, /strongestLevel\(mirror\[moduleName\], technical\[moduleName\]\)/);
});

test('tela destaca diferenças de leitura, edição e papel administrativo', () => {
  assert.match(source, /expectedRoute === effectiveRoute/);
  assert.match(source, /moduleDivergent/);
  assert.match(source, /roleDivergent/);
  assert.match(source, /option value="DIVERGENT">Divergentes/);
  assert.match(source, /data-status="\$\{item\.state\}"/);
});

test('seleção de usuário é persistida na URL para diagnóstico compartilhável', () => {
  assert.match(source, /new URLSearchParams\(scope\.location\.search\)\.get\('userId'\)/);
  assert.match(source, /url\.searchParams\.set\('userId', user\.id\)/);
  assert.match(source, /history\.replaceState/);
});
