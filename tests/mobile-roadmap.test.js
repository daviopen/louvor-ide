const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');

const menuCss = read('src', 'styles', 'main-menu.css');
const designCss = read('src', 'styles', 'design-system.css');
const performanceCss = read('src', 'css', 'setlist-performance-view.css');
const performanceHtml = read('src', 'pages', 'setlist-view.html');

test('passo 29: navegação mobile é dedicada, fixa e respeita safe area', () => {
  assert.match(menuCss, /@media \(max-width:900px\)[\s\S]*\.ide-mobile-navigation\s*\{/);
  assert.match(menuCss, /position:fixed/);
  assert.match(menuCss, /env\(safe-area-inset-bottom\)/);
  assert.match(menuCss, /\.ide-mobile-nav-item\.active/);
});

test('passo 29: formulários e ações se adaptam a telas pequenas', () => {
  assert.match(designCss, /@media\(max-width:768px\)/);
  assert.match(designCss, /\.ide-filter-bar\{align-items:stretch;flex-direction:column\}/);
  assert.match(designCss, /\.ide-form-layout__actions\{flex-direction:column-reverse\}/);
  assert.match(designCss, /font-size:16px/);
  assert.match(designCss, /\.ide-card__actions\{flex-direction:column\}/);
});

test('passo 29: tabelas possuem apresentação mobile com rótulos por célula', () => {
  assert.match(designCss, /\.ide-table thead\{display:none\}/);
  assert.match(designCss, /\.ide-table td\[data-label\]/);
  assert.match(designCss, /content:attr\(data-label\)/);
  assert.match(designCss, /@media\(max-width:420px\)[\s\S]*grid-template-columns:1fr/);
});

test('passo 29: setlist e cifra\/letra têm experiência mobile e modo palco real', () => {
  assert.match(performanceHtml, /setlist-performance-view\.css/);
  assert.match(performanceCss, /@media\(max-width:560px\)/);
  assert.match(performanceCss, /\.stage-mode \.ide-mobile-navigation/);
  assert.match(performanceCss, /min-height:100dvh/);
  assert.match(performanceCss, /env\(safe-area-inset-bottom\)/);
  assert.match(performanceCss, /\.stage-mode \.viewer-toolbar\{position:sticky;top:0\}/);
  assert.match(performanceCss, /\.icon-control\{min-width:44px;min-height:44px\}/);
});
