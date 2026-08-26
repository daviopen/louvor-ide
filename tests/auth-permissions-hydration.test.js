const test = require('node:test');
const assert = require('node:assert/strict');

const {
  loadEffectivePermissions,
  resolveAuthorizedProfile
} = require('../src/js/modules/auth-service');

function snapshot(exists, data = null) {
  return {
    exists,
    data() { return data; }
  };
}

test('hidrata permissões efetivas do usuário antes de liberar a sessão', async () => {
  const userId = 'user-davi';
  const reads = [];
  const permissionData = {
    [`${userId}__dashboard`]: { userId, module: 'dashboard', level: 'READ' },
    [`${userId}__unavailability`]: { userId, module: 'unavailability', level: 'EDIT' }
  };

  const database = {
    collection(name) {
      if (name === 'users') {
        return {
          doc(id) {
            assert.equal(id, userId);
            return {
              async get() {
                return snapshot(true, {
                  uid: userId,
                  name: 'Davi',
                  email: 'davi.alves.de.sousa@gmail.com',
                  active: true,
                  role: 'MEMBER'
                });
              }
            };
          }
        };
      }

      assert.equal(name, 'permissions');
      return {
        doc(id) {
          reads.push(id);
          return {
            async get() {
              return permissionData[id]
                ? snapshot(true, permissionData[id])
                : snapshot(false);
            }
          };
        }
      };
    }
  };

  const scope = { firebase: { firestore: () => database } };
  const authorization = await resolveAuthorizedProfile(scope, { uid: userId });

  assert.equal(authorization.authorized, true);
  assert.equal(authorization.profile.permissions.dashboard, 'READ');
  assert.equal(authorization.profile.permissions.unavailability, 'EDIT');
  assert.equal(authorization.profile.permissions.events, undefined);
  assert.ok(reads.includes(`${userId}__unavailability`));
  assert.equal(reads.every(id => id.startsWith(`${userId}__`)), true);
});

test('ignora documentos de permissão inconsistentes ou com nível inválido', async () => {
  const userId = 'member-1';
  const database = {
    collection(name) {
      assert.equal(name, 'permissions');
      return {
        doc(id) {
          return {
            async get() {
              if (id.endsWith('__unavailability')) {
                return snapshot(true, { userId: 'outro', module: 'unavailability', level: 'EDIT' });
              }
              if (id.endsWith('__dashboard')) {
                return snapshot(true, { userId, module: 'dashboard', level: 'OWNER' });
              }
              return snapshot(false);
            }
          };
        }
      };
    }
  };

  const permissions = await loadEffectivePermissions({ firebase: { firestore: () => database } }, userId);
  assert.deepEqual(permissions, {});
});
