const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { injectPwaHead } = require('../src/scripts/inject-pwa-head.js');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');
const header = read('src/js/modules/app-header-controls.js');
const css = read('src/styles/app-header-controls.css');

test('desktop leva conta e notificações para o topo direito', () => {
  assert.match(header, /DESKTOP_QUERY = '\(min-width: 901px\)'/);
  assert.match(header, /mountDesktopAccount/);
  assert.match(header, /header\.prepend\(center\)/);
  assert.match(css, /\.ide-app-header-actions\{[^}]*position:fixed[^}]*right:/s);
  assert.match(css, /\.ide-header-account-summary/);
});

test('mobile mantém a conta dentro do menu e o sino no topo', () => {
  assert.match(header, /mountMobileAccount/);
  assert.match(header, /sidebarAccount\(\)/);
  assert.match(header, /account\.appendChild\(controls\)/);
  assert.match(css, /@media\(max-width:900px\)/);
  assert.match(css, /\.ide-header-account\{display:none!important\}/);
});

test('mobile oculta o sino enquanto o drawer está aberto para evitar sobreposição', () => {
  assert.match(css, /body\.ide-sidebar-open \.ide-app-header-actions\{[^}]*visibility:hidden[^}]*opacity:0[^}]*pointer-events:none/s);
});

test('menu de conta desktop reutiliza os controles existentes', () => {
  assert.match(header, /ide-header-account-profile/);
  assert.match(header, /ide-header-account-controls/);
  assert.match(header, /holder\.appendChild\(controls\)/);
  assert.match(css, /ide-header-account-controls \.music-ide-theme-control/);
  assert.match(css, /ide-header-account-controls \.music-ide-signout/);
});

test('injeção global inclui estilos e comportamento do novo cabeçalho', () => {
  const html = injectPwaHead('<html><head><title>IDE Music</title></head><body></body></html>');
  assert.match(html, /styles\/app-header-controls\.css/);
  assert.match(html, /js\/modules\/app-header-controls\.js/);
});
