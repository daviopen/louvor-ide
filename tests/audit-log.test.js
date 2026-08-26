const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

const dataModel = read('src/models/data-model.js');
const rules = read('firestore.rules');
const authAudit = read('src/js/modules/audit-auth-runtime.js');
const normalizer = read('src/scripts/normalize-built-html-colors.js');
const users = read('src/services/user-service.js');
const permissions = read('src/js/modules/permissions-page.js');
const functionsService = read('src/services/ministry-functions-service.js');
const unavailability = read('src/services/unavailability-service.js');
const events = read('src/repositories/event-repository.js');
const schedules = read('src/services/schedule-service.js');
const setlists = read('src/repositories/setlist-repository.js');
const musicService = read('src/js/modules/music-service.js');
const musicRepository = read('src/repositories/music-repository.js');

const expectAll = (source, patterns) => patterns.forEach(pattern => assert.match(source, pattern));

test('auditLogs has the canonical actor/action/entity/id/timestamp contract and is append-only', () => {
  expectAll(dataModel, [
    /auditLogs: Object\.freeze/,
    /'actorUserId', 'action', 'entityType', 'entityId', 'createdAt'/
  ]);
  expectAll(rules, [
    /match \/auditLogs\/\{documentId\}/,
    /allow read: if canRead\('audit'\)/,
    /request\.resource\.data\.actorUserId == request\.auth\.uid/,
    /allow update, delete: if false/
  ]);
});

test('authentication audits successful login and logout without credentials', () => {
  expectAll(authAudit, [
    /AUTH_LOGIN/,
    /AUTH_LOGOUT/,
    /entityType: 'auth'/,
    /entityId: user\.uid/,
    /createdAt: timestamp\(\)/,
    /await record\(user, 'AUTH_LOGOUT'\)/
  ]);
  assert.doesNotMatch(authAudit, /user\.email/);
  assert.doesNotMatch(authAudit, /password|credential|idToken|accessToken/i);
  assert.match(normalizer, /audit-auth-runtime\.js/);
  assert.match(normalizer, /data-ide-audit-runtime/);
});

test('administrative and operational domains emit audit events', () => {
  expectAll(users, [/USER_CREATED/, /USER_UPDATED/, /USER_DEACTIVATED/, /USER_REACTIVATED/]);
  expectAll(permissions, [/ACCESS_PROFILE_UPDATED/, /before, after/]);
  expectAll(functionsService, [/MINISTRY_FUNCTION_CREATED/, /MINISTRY_FUNCTION_UPDATED/, /before:/, /after:/]);
  expectAll(unavailability, [/UNAVAILABILITY_CREATED/, /UNAVAILABILITY_UPDATED/, /UNAVAILABILITY_DELETED/, /UNAVAILABILITY_OVERRIDE_CONFIRMED/]);
  expectAll(events, [/EVENT_CREATED/, /EVENT_UPDATED/, /EVENT_DELETED/]);
  expectAll(schedules, [/SCHEDULE_SLOT_ADDED/, /SCHEDULE_SLOT_REMOVED/, /SCHEDULE_MEMBER_ASSIGNED/, /SCHEDULE_MEMBER_REMOVED/]);
  expectAll(setlists, [/SETLIST_UPDATED/]);
});

test('music create/update/delete emits audit records with minimal before/after snapshots', () => {
  expectAll(musicService, [
    /MUSIC_CREATED/,
    /MUSIC_UPDATED/,
    /MUSIC_DELETED/,
    /before: null/,
    /before: this\.auditSnapshot\(before\)/,
    /after: this\.auditSnapshot\(processedData\)/
  ]);
  expectAll(musicRepository, [
    /collection\(COLLECTIONS\.AUDIT_LOGS\)/,
    /entityType: 'song'/,
    /actorUserId/,
    /createdAt/
  ]);
  assert.doesNotMatch(musicService.match(/auditSnapshot\(song\)[\s\S]*?\n  }/)[0], /cifra|letra|password|token/i);
});