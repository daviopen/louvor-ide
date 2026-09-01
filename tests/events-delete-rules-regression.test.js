const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rules = fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8');

test('exclusão de evento aceita todos os status válidos quando o bundle vinculado é removido', () => {
  const match = rules.match(/function validEventDelete\(\) \{([\s\S]*?)\n    \}/);
  assert.ok(match, 'validEventDelete deve existir');
  const body = match[1];

  assert.match(body, /resource\.data\.status in \['PLANNED', 'CONFIRMED', 'CANCELLED', 'COMPLETED'\]/);
  assert.match(body, /!existsAfter\(linkedSchedulePath\)/);
  assert.match(body, /!existsAfter\(linkedSetlistPath\)/);
  assert.doesNotMatch(body, /resource\.data\.status == 'PLANNED'/);
});
