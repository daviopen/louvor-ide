const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../src/js/modules/schedules-monthly-ui.js'), 'utf8');

test('resumo mensal reencontra o card atual após leitura assíncrona', () => {
  assert.match(source, /const currentCard = scope\.document\.querySelector\('\.schedule-editor-card'\)/);
  assert.match(source, /!currentCard\?\.isConnected/);
  assert.match(source, /currentCard\.dataset\.scheduleId !== scheduleId/);
  assert.match(source, /currentCard\.insertAdjacentHTML\('afterend'/);
  assert.doesNotMatch(source, /card\.insertAdjacentHTML\('afterend'/);
});

test('resumo mensal evita duplicação durante MutationObserver e rerenders do editor', () => {
  assert.match(source, /nextElementSibling\?\.classList\.contains\('schedule-monthly-summary'\)/);
  assert.match(source, /clearTimeout\(editorTimer\)/);
});
