const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rules = fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8');

test('eventos exigem permissão de edição e criação também protege escala/setlist', () => {
  assert.match(rules, /allow create: if canEdit\('events'\) && canEdit\('schedules'\) && canEdit\('setlists'\)/);
  assert.match(rules, /allow update: if canEdit\('events'\) && validEventUpdate/);
});

test('documento de evento valida campos, status e IDs determinísticos', () => {
  assert.match(rules, /function validEventDocument\(eventId\)/);
  assert.match(rules, /request\.resource\.data\.date is timestamp/);
  assert.match(rules, /\['PLANNED', 'CONFIRMED', 'CANCELLED', 'COMPLETED'\]/);
  assert.match(rules, /scheduleId == 'schedule_' \+ eventId/);
  assert.match(rules, /setlistId == 'setlist_' \+ eventId/);
});

test('mudanças de evento exigem vínculos consistentes via getAfter', () => {
  assert.match(rules, /function linkedEventBundleConsistent\(eventId\)/);
  assert.match(rules, /existsAfter\(schedulePath\)/);
  assert.match(rules, /getAfter\(schedulePath\)\.data\.eventDate == request\.resource\.data\.date/);
  assert.match(rules, /getAfter\(setlistPath\)\.data\.eventTime == request\.resource\.data\.time/);
});

test('histórico final permanece imutável para edição e exclusão explícita remove vínculos em qualquer status válido', () => {
  assert.match(rules, /resource\.data\.status in \['PLANNED', 'CONFIRMED'\]/);
  assert.match(rules, /resource\.data\.status in \['PLANNED', 'CONFIRMED', 'CANCELLED', 'COMPLETED'\]/);
  assert.match(rules, /!existsAfter\(schedulePath\)/);
  assert.match(rules, /!existsAfter\(setlistPath\)/);
});
