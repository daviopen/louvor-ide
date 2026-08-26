const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const js = fs.readFileSync(path.join(__dirname, '../src/js/pages/setlists-simple.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '../src/pages/setlists.html'), 'utf8');

test('setlist cards expose separate editing and repertoire destinations', () => {
  assert.match(js, /setlist\.html\?id=/);
  assert.match(js, /setlist-view\.html\?id=/);
  assert.match(js, /Abrir repertório/);
  assert.match(js, /Editar Setlist/);
});

test('ready setlists prioritize repertoire while drafts prioritize editing', () => {
  assert.match(js, /if\(ready\)/);
  assert.match(js, /ide-button--secondary[^\n]+Editar[^\n]+ide-button--primary[^\n]+Abrir repertório/);
  assert.match(js, /ide-button--primary[^\n]+Editar Setlist[^\n]+ide-button--secondary[^\n]+Abrir repertório/);
});

test('empty setlists do not navigate to an empty repertoire', () => {
  assert.match(js, /if\(!hasSongs\)/);
  assert.match(js, /Repertório vazio/);
  assert.match(js, /aria-disabled="true"/);
});

test('setlist status labels are localized', () => {
  assert.match(js, /READY:'Pronto'/);
  assert.match(js, /DRAFT:'Rascunho'/);
  assert.match(js, /COMPLETED:'Concluído'/);
  assert.match(js, /CANCELLED:'Cancelado'/);
});

test('actions remain responsive on mobile', () => {
  assert.match(html, /\.setlist-card__actions\{[^}]*gap:10px/);
  assert.match(html, /@media\(max-width:560px\)[\s\S]*\.setlist-card__actions\{display:grid;grid-template-columns:1fr\}/);
  assert.match(html, /btn-disabled/);
});
