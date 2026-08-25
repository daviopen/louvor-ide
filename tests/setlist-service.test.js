const test = require('node:test');
const assert = require('node:assert/strict');
const { eligibleMinisters, preferredKey, normalizeOrder, validateSongs } = require('../src/services/setlist-service.js');

test('somente integrantes escalados como Ministro ficam elegíveis', () => {
  const functions=[{id:'f-min',name:'Ministro'},{id:'f-gtr',name:'Guitarra'}];
  const users=[{id:'u1',name:'Ana',active:true},{id:'u2',name:'Beto',active:true}];
  const members=[{userId:'u1',functionId:'f-min',active:true},{userId:'u2',functionId:'f-gtr',active:true}];
  assert.deepEqual(eligibleMinisters(members,functions,users).map(item=>item.id),['u1']);
});

test('tom preferido por ministro é sugerido sem alterar a música', () => {
  const song={id:'s1',tom:'C'}; const keys=[{songId:'s1',userId:'u1',preferredKey:'E'}];
  assert.equal(preferredKey(song,'u1','Ana',keys),'E');
  assert.equal(song.tom,'C');
});

test('reordenação sempre produz sequência única e contínua', () => {
  assert.deepEqual(normalizeOrder([{songId:'a',order:9},{songId:'b',order:2}]).map(item=>item.order),[1,2]);
});

test('validação rejeita ministro fora da escala', () => {
  assert.throws(()=>validateSongs([{songId:'s1',title:'Canção',ministerUserId:'u2',executionKey:'D'}],[{id:'u1',name:'Ana'}]),/não está escalado como Ministro/);
});

test('validação exige tom de execução e impede duplicidade', () => {
  assert.throws(()=>validateSongs([{songId:'s1',title:'A',ministerUserId:'u1',executionKey:''}],[{id:'u1'}]),/tom de execução/);
  assert.throws(()=>validateSongs([{songId:'s1',title:'A',ministerUserId:'u1',executionKey:'C'},{songId:'s1',title:'A',ministerUserId:'u1',executionKey:'D'}],[{id:'u1'}]),/não pode aparecer duas vezes/);
});