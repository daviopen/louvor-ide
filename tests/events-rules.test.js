const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rules = fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8');

test('eventos exigem EDIT apenas no próprio módulo para criar, editar e excluir', () => {
  assert.match(rules, /allow create: if canEdit\('events'\) && validEventCreate/);
  assert.match(rules, /allow update: if canEdit\('events'\) && validEventUpdate/);
  assert.match(rules, /allow delete: if canEdit\('events'\) && validEventDelete/);
  assert.doesNotMatch(rules, /allow create: if canEdit\('events'\) && canEdit\('schedules'\) && canEdit\('setlists'\)/);
  assert.doesNotMatch(rules, /allow delete: if canEdit\('events'\) && canEdit\('schedules'\) && canEdit\('setlists'\)/);
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
  assert.match(rules, /existsAfter\(linkedSchedulePath\)/);
  assert.match(rules, /getAfter\(linkedSchedulePath\)\.data\.eventDate == request\.resource\.data\.date/);
  assert.match(rules, /getAfter\(linkedSetlistPath\)\.data\.eventTime == request\.resource\.data\.time/);
});

test('EDIT em Eventos só pode sincronizar campos vinculados de escala e setlist', () => {
  assert.match(rules, /function eventManagedScheduleUpdate\(scheduleId\)/);
  assert.match(rules, /affectedKeys\(\)\.hasOnly\(\['eventDate', 'eventTime', 'status', 'updatedBy', 'updatedAt'\]\)/);
  assert.match(rules, /function eventManagedSetlistUpdate\(setlistId\)/);
  assert.match(rules, /allow update: if canEdit\('schedules'\) \|\| eventManagedScheduleUpdate\(documentId\)/);
  assert.match(rules, /allow update: if canEdit\('setlists'\) \|\| eventManagedSetlistUpdate\(documentId\)/);
});

test('exclusão de evento permite cascata controlada dos vínculos sem conceder CRUD manual', () => {
  assert.match(rules, /function eventCascadeScheduleMemberDelete\(\)/);
  assert.match(rules, /function eventCascadeSetlistSongDelete\(\)/);
  assert.match(rules, /allow create, update: if canEdit\('schedules'\);/);
  assert.match(rules, /allow delete: if canEdit\('schedules'\) \|\| eventCascadeScheduleMemberDelete\(\);/);
  assert.match(rules, /allow create, update: if canEdit\('setlists'\);/);
  assert.match(rules, /allow delete: if canEdit\('setlists'\) \|\| eventCascadeSetlistSongDelete\(\);/);
});

test('histórico final permanece imutável para edição e exclusão explícita remove vínculos em qualquer status válido', () => {
  assert.match(rules, /resource\.data\.status in \['PLANNED', 'CONFIRMED'\]/);
  assert.match(rules, /resource\.data\.status in \['PLANNED', 'CONFIRMED', 'CANCELLED', 'COMPLETED'\]/);
  assert.match(rules, /!existsAfter\(linkedSchedulePath\)/);
  assert.match(rules, /!existsAfter\(linkedSetlistPath\)/);
});
