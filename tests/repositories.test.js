const test = require('node:test');
const assert = require('node:assert/strict');

const {
  DomainRepository,
  MinistryFunctionsRepository,
  UserFunctionsRepository,
  PermissionsRepository,
  SongMinisterKeysRepository
} = require('../src/repositories/domain-repositories.js');

function createMemoryDb(seed = {}) {
  const store = new Map(Object.entries(seed).map(([collection, docs]) => [collection, new Map(Object.entries(docs))]));
  let autoId = 0;

  function getCollection(name) {
    if (!store.has(name)) store.set(name, new Map());
    const docs = store.get(name);
    const api = {
      doc(id) {
        return {
          id,
          async get() {
            const value = docs.get(id);
            return { id, exists: value !== undefined, data: () => value };
          },
          async set(value, options = {}) {
            docs.set(id, options.merge ? { ...(docs.get(id) || {}), ...value } : value);
          }
        };
      },
      async add(value) {
        const id = `auto-${++autoId}`;
        docs.set(id, value);
        return { id };
      },
      async get() {
        return { docs: [...docs.entries()].map(([id, value]) => ({ id, exists: true, data: () => value })) };
      },
      orderBy(field, direction) {
        return {
          async get() {
            const ordered = [...docs.entries()].sort((a, b) => {
              const delta = a[1][field] - b[1][field];
              return direction === 'desc' ? -delta : delta;
            });
            return { docs: ordered.map(([id, value]) => ({ id, exists: true, data: () => value })) };
          }
        };
      },
      where(field, op, expected) {
        assert.equal(op, '==');
        const filters = [[field, expected]];
        const query = {
          where(nextField, nextOp, nextExpected) {
            assert.equal(nextOp, '==');
            filters.push([nextField, nextExpected]);
            return query;
          },
          limit() { return query; },
          async get() {
            const matched = [...docs.entries()].filter(([, value]) => filters.every(([key, expectedValue]) => value[key] === expectedValue));
            return {
              empty: matched.length === 0,
              docs: matched.map(([id, value]) => ({ id, exists: true, data: () => value }))
            };
          }
        };
        return query;
      }
    };
    return api;
  }

  return {
    collection: getCollection,
    batch() {
      const updates = [];
      return {
        update(ref, patch) { updates.push([ref.id, patch]); },
        async commit() {
          const docs = store.get('ministryFunctions');
          for (const [id, patch] of updates) docs.set(id, { ...(docs.get(id) || {}), ...patch });
        }
      };
    },
    dump(collection) { return store.get(collection); }
  };
}

const fixedNow = new Date('2026-08-25T22:00:00Z');

test('DomainRepository executa create/get/list/update preservando timestamps', async () => {
  const db = createMemoryDb();
  const repository = new DomainRepository('users', db, { clock: () => fixedNow });

  const created = await repository.create({ uid: 'u1', name: 'Marina', email: 'marina@example.com', active: true }, { id: 'u1' });
  assert.equal(created.id, 'u1');
  assert.equal(created.createdAt, fixedNow);
  assert.deepEqual(await repository.getById('u1'), created);
  assert.equal((await repository.list()).length, 1);

  const later = new Date('2026-08-25T22:05:00Z');
  repository.clock = () => later;
  const updated = await repository.update('u1', { name: 'Marina Oliveira' });
  assert.equal(updated.name, 'Marina Oliveira');
  assert.equal(updated.createdAt, fixedNow);
  assert.equal(updated.updatedAt, later);
});

test('DomainRepository rejeita modelo desconhecido, banco inválido e update inexistente', async () => {
  const db = createMemoryDb();
  assert.throws(() => new DomainRepository('missing', db), /Modelo desconhecido/);
  assert.throws(() => new DomainRepository('users', null), /Database é obrigatório/);
  await assert.rejects(new DomainRepository('users', db).update('missing', { name: 'X' }), /não encontrado/);
});

test('repositories especializados aplicam IDs determinísticos e filtros de domínio', async () => {
  const db = createMemoryDb({
    ministryFunctions: {
      f1: { name: 'Ministro', slug: 'ministro', active: true, order: 20, createdAt: fixedNow, updatedAt: fixedNow },
      f2: { name: 'Bateria', slug: 'bateria', active: false, order: 10, createdAt: fixedNow, updatedAt: fixedNow }
    }
  });

  const functions = new MinistryFunctionsRepository(db, { clock: () => fixedNow });
  assert.deepEqual((await functions.listOrdered()).map(item => item.id), ['f2', 'f1']);
  assert.deepEqual((await functions.listOrdered({ activeOnly: true })).map(item => item.id), ['f1']);
  assert.equal((await functions.findBySlug('ministro')).id, 'f1');
  assert.equal(await functions.findBySlug('nao-existe'), null);

  const userFunctions = new UserFunctionsRepository(db, { clock: () => fixedNow });
  await userFunctions.assign('u1', 'f1');
  assert.equal((await userFunctions.listByUser('u1')).length, 1);
  await userFunctions.unassign('u1', 'f1');
  assert.equal((await userFunctions.listByUser('u1')).length, 0);
  assert.equal((await userFunctions.listByUser('u1', { activeOnly: false }))[0].active, false);

  const permissions = new PermissionsRepository(db, { clock: () => fixedNow });
  const permission = await permissions.setPermission('u1', 'events', 'EDIT');
  assert.equal(permission.id, 'u1__events');
  assert.equal(permission.level, 'EDIT');

  const keys = new SongMinisterKeysRepository(db, { clock: () => fixedNow });
  const preferred = await keys.setPreferredKey('song1', 'u1', 'E');
  assert.equal(preferred.id, 'song1__u1');
  assert.equal(preferred.preferredKey, 'E');
});

test('reorder de funções é atômico e valida entrada', async () => {
  const db = createMemoryDb({
    ministryFunctions: {
      f1: { name: 'Ministro', slug: 'ministro', active: true, order: 10, createdAt: fixedNow, updatedAt: fixedNow },
      f2: { name: 'Bateria', slug: 'bateria', active: true, order: 20, createdAt: fixedNow, updatedAt: fixedNow }
    }
  });
  const repository = new MinistryFunctionsRepository(db, { clock: () => fixedNow });

  await repository.reorder([{ functionId: 'f2', order: 10 }, { functionId: 'f1', order: 20 }]);
  assert.equal(db.dump('ministryFunctions').get('f2').order, 10);
  assert.equal(db.dump('ministryFunctions').get('f1').order, 20);
  await assert.rejects(repository.reorder([]), /ao menos uma função/);
});
