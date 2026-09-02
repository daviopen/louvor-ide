const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { injectPwaHead } = require('../src/scripts/inject-pwa-head.js');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');
const pngDimensions = relativePath => {
  const png = fs.readFileSync(path.join(root, relativePath));
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
};

test('manifesto PWA usa a identidade e os ícones oficiais do IDE Music', () => {
  const manifest = JSON.parse(read('src/pwa/manifest.webmanifest'));
  assert.equal(manifest.name, 'IDE Music');
  assert.equal(manifest.short_name, 'IDE Music');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, '/index.html');
  assert.equal(manifest.theme_color, '#090b0c');
  assert.ok(manifest.icons.some(icon => icon.sizes === '192x192' && icon.purpose === 'any'));
  assert.ok(manifest.icons.some(icon => icon.sizes === '512x512' && icon.purpose === 'maskable'));
});

test('todos os arquivos de ícone declarados existem e não estão vazios', () => {
  const manifest = JSON.parse(read('src/pwa/manifest.webmanifest'));
  const iconPaths = [
    ...manifest.icons.map(icon => icon.src),
    '/icons/apple-touch-icon.png',
    '/icons/favicon-48.png',
    '/icons/favicon-32.png'
  ];
  for (const iconPath of iconPaths) {
    const absolutePath = path.join(root, 'src/pwa', iconPath);
    assert.ok(fs.statSync(absolutePath).size > 0, `${iconPath} está vazio`);
  }
});

test('ícones PWA possuem as dimensões declaradas para Android e iPhone', () => {
  const expectedDimensions = new Map([
    ['icon-192.png', 192],
    ['icon-512.png', 512],
    ['icon-maskable-192.png', 192],
    ['icon-maskable-512.png', 512],
    ['apple-touch-icon.png', 180],
    ['favicon-48.png', 48],
    ['favicon-32.png', 32]
  ]);
  for (const [fileName, size] of expectedDimensions) {
    assert.deepEqual(pngDimensions(`src/pwa/icons/${fileName}`), { width: size, height: size });
  }
});

test('injeção PWA é completa e idempotente em qualquer página', () => {
  const input = '<!doctype html><html><head><title>IDE Music</title></head><body></body></html>';
  const once = injectPwaHead(input);
  const twice = injectPwaHead(once);
  assert.equal(twice, once);
  assert.match(once, /rel="manifest" href="\/manifest\.webmanifest"/);
  assert.match(once, /rel="apple-touch-icon"/);
  assert.match(once, /apple-mobile-web-app-capable/);
  assert.match(once, /src="\/pwa-runtime\.js"/);
});

test('service worker não intercepta fetch nem cria cache de aplicação obsoleto', () => {
  const worker = read('src/pwa/service-worker.js');
  assert.match(worker, /addEventListener\('install'/);
  assert.match(worker, /addEventListener\('activate'/);
  assert.doesNotMatch(worker, /addEventListener\(['"]fetch/);
});

test('Central de Ajuda informa a logo oficial e a reinstalação do atalho antigo', () => {
  const help = read('src/pages/help.html');
  assert.match(help, /Instagram <strong>@music\.ide<\/strong>/);
  assert.match(help, /Remova o atalho antigo e instale novamente/);
});
