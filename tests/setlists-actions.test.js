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

test('setlist views are navigated from the application menu without duplicate top tabs', () => {
  assert.doesNotMatch(html, /class="view-tabs"/);
  assert.doesNotMatch(html, /id="tab-upcoming"/);
  assert.doesNotMatch(html, /id="tab-history"/);
  assert.doesNotMatch(js, /tab-upcoming|tab-history/);
});

test('upcoming setlists expose date, minister, status and participant filters', () => {
  assert.match(html, /id="filter-from"/);
  assert.match(html, /id="filter-to"/);
  assert.match(html, /id="filter-minister"/);
  assert.match(html, /id="filter-status"/);
  assert.match(html, /id="filter-participant"/);
  assert.match(js, /participant:\$\('filter-participant'\)\.value/);
  assert.match(js, /status:\$\('filter-status'\)\.value/);
  assert.match(js, /scheduleMembers/);
});

test('event, minister and participant filters list available names', () => {
  assert.match(html, /<select id="filter-event"/);
  assert.match(html, /<select id="filter-minister"/);
  assert.match(html, /<select id="filter-participant"/);
  assert.match(js, /setSelectOptions\('filter-event'/);
  assert.match(js, /setSelectOptions\('filter-minister'/);
  assert.match(js, /setSelectOptions\('filter-participant'/);
  assert.match(js, /Todos os eventos/);
  assert.match(js, /Todos os ministros/);
  assert.match(js, /Todos os participantes/);
});

test('upcoming setlists render all filtered results without pagination', () => {
  assert.match(js, /const page=history[\s\S]*MusicIdeSetlistHistory\.paginate\(state\.filtered,state\.page,state\.pageSize\)[\s\S]*items:state\.filtered/);
  assert.match(js, /\$\('pagination'\)\.hidden=!history\|\|page\.totalPages<=1/);
});

test('actions remain responsive on mobile', () => {
  assert.match(html, /\.setlist-card__actions\{[^}]*gap:10px/);
  assert.match(html, /@media\(max-width:560px\)[\s\S]*\.setlist-card__actions\{display:grid;grid-template-columns:1fr\}/);
  assert.match(html, /btn-disabled/);
});
