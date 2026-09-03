const test = require('node:test');
const assert = require('node:assert/strict');

const {
  loadEffectivePermissions,
  resolveAuthorizedProfile
} = require('../src/js/modules/auth-service');
const accessProfiles = require('../src/js/modules/access-profiles.js');

function snapshot(exists, data = null) {
  return {
    exists,
    data() { return data; }
  };
}

test('hidrata permissões canônicas com uma única leitura do perfil', async () => {
  const userId = 'user-davi';
  let profileReads = 0;
  let permissionReads = 0;

  const database = {
    collection(name) {
      if (name === 'users') {
        return {
          doc(id) {
            assert.equal(id, userId);
            return {
              async get() {
                profileReads += 1;
                return snapshot(true, {
                  uid: userId,
                  name: 'Davi',
                  email: 'davi.alves.de.sousa@gmail.com',
                  active: true,
                  role: 'MEMBER',
                  accessProfile: 'PARTICIPANT'
                });
              }
            };
          }
        };
      }

      if (name === 'permissions') {
        permissionReads += 1;
        throw new Error('bootstrap não deve consultar a coleção permissions');
      }
      throw new Error(`collection inesperada: ${name}`);
    }
  };

  const scope = {
    firebase: { firestore: () => database },
    MusicIdeAccessProfiles: accessProfiles
  };
  const authorization = await resolveAuthorizedProfile(scope, { uid: userId });

  assert.equal(authorization.authorized, true);
  assert.equal(authorization.profile.permissions.dashboard, 'READ');
  assert.equal(authorization.profile.permissions.unavailability, 'EDIT');
  assert.equal(authorization.profile.permissions.events, 'READ');
  assert.equal(profileReads, 1);
  assert.equal(permissionReads, 0);
});

test('ignora documentos de permissão inconsistentes ou com nível inválido em auditoria explícita', async () => {
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
