const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

const authAudit = read('src/js/modules/audit-auth-runtime.js');
const usersPage = read('src/js/modules/users-page.js');
const userRepository = read('src/repositories/user-repository.js');
const rules = read('firestore.rules');
const backfill = read('src/scripts/backfill-user-last-access.cjs');
const workflow = read('.github/workflows/user-last-access-backfill.yml');

test('successful login keeps AUTH_LOGIN and users.lastAccessAt atomic', () => {
  assert.match(authAudit, /const batch = db\.batch\(\)/);
  assert.match(authAudit, /db\.collection\('auditLogs'\)\.doc\(\)/);
  assert.match(authAudit, /db\.collection\('users'\)\.doc\(user\.uid\)/);
  assert.match(authAudit, /batch\.set\(auditRef, auditPayload\(user, 'AUTH_LOGIN', loginAt\)\)/);
  assert.match(authAudit, /batch\.update\(userRef, \{ lastAccessAt: loginAt \}\)/);
  assert.match(authAudit, /return batch\.commit\(\)/);
});

test('users screen renders the persisted lastAccessAt field', () => {
  assert.match(userRepository, /lastAccessAt: input\.lastAccessAt \|\| null/);
  assert.match(usersPage, /dateText\(user\.lastAccessAt\)/);
});

test('an active user may update own lastAccessAt only with server time and without authorization escalation', () => {
  assert.match(rules, /ownsUserDocument\(userId\) && validSelfProfileUpdate\(\)/);
  assert.match(rules, /hasOnly\(\['name', 'phone', 'birthDate', 'photoURL', 'updatedAt', 'lastAccessAt'\]\)/);
  assert.match(rules, /!changed\.hasAny\(\['lastAccessAt'\]\) \|\| request\.resource\.data\.lastAccessAt == request\.time/);
  assert.match(rules, /affectedKeys\(\)\.hasAny\(\['uid', 'role', 'permissions', 'accessProfile'\]\)/);
});

test('historical AUTH_LOGIN audit records backfill lastAccessAt idempotently', () => {
  assert.match(backfill, /where\('action', '==', 'AUTH_LOGIN'\)/);
  assert.match(backfill, /data\.actorUserId/);
  assert.match(backfill, /data\.createdAt/);
  assert.match(backfill, /currentLastAccess = userSnapshot\.data\(\)\?\.lastAccessAt/);
  assert.match(backfill, /toMillis\(latestLogin\) <= toMillis\(currentLastAccess\)/);
  assert.match(backfill, /batch\.update\(item\.ref, \{ lastAccessAt: item\.lastAccessAt \}\)/);
  assert.match(workflow, /backfill-user-last-access\.cjs/);
  assert.match(workflow, /FIREBASE_SERVICE_ACCOUNT_LOUVOR_IDE/);
});
