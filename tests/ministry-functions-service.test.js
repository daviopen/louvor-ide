const test = require('node:test');
const assert = require('node:assert/strict');

const dataModel = require('../src/models/data-model.js');
const {
  MinistryFunctionsService,
  normalizeLegacyFunctionLabel,
  canManageMinistryFunctions
} = require('../src/services/ministry-functions-service.js');

function createHarness() {
  let sequence = 0;
  const functions = new Map();
  const relations = new Map();
  const audits = [];

  const ministryFunctionsRepository = {
    async findBySlug(slug) {
      return [...functions.values()].find(item => item.slug === slug) || null;
    },
    async getById(id) {
      return functions.get(id) || null;
    },
    async create(document) {
      const id = `function-${++sequence}`;
      const entity = { id, ...document };
      functions.set(id, entity);
      return entity;
    },
    async update(id, patch) {
      const current = functions.get(id);
      if (!current) throw new Error(`missing ${id}`);
      const entity = { ...current, ...patch, id };
      functions.set(id, entity);
      return entity;
    },
    async listOrdered(options = {}) {
      const items = [...functions.values()].sort((a, b) => a.order - b.order);
      return options.activeOnly ? items.filter(item => item.active) : items;
    },
    async reorder(items) {
      for (const item of items) {
        const current = functions.get(item.functionId);
        functions.set(item.functionId, { ...current, order: item.order });
      }
      return items;
    }
  };

  const userFunctionsRepository = {
    async assign(userId, functionId) {
      const id = dataModel.userFunctionDocumentId(userId, functionId);
      const entity = { id, userId, functionId, active: true };
      relations.set(id, entity);
      return entity;
    },
    async unassign(userId, functionId) {
      const id = dataModel.userFunctionDocumentId(userId, functionId);
      const current = relations.get(id);
      const entity = { ...current, id, userId, functionId, active: false };
      relations.set(id, entity);
      return entity;
    },
    async listByUser(userId, options = {}) {
      const items = [...relations.values()].filter(item => item.userId === userId);
      return options.activeOnly === false ? items : items.filter(item => item.active);
    }
  };

  const auditRepository = {
    async create(document) {
      const entity = { id: `audit-${audits.length + 1}`, ...document };
      audits.push(entity);
      return entity;
    }
  };

  const service = new MinistryFunctionsService({
    ministryFunctionsRepository,
    userFunctionsRepository,
    auditRepository,
    actorProvider: () => ({ uid: 'admin-1' })
  });

  return { service, functions, relations, audits };
}

test('catálogo padrão de funções é criado de forma idempotente', async () => {
  const { service } = createHarness();

  const first = await service.ensureDefaultFunctions();
  const second = await service.ensureDefaultFunctions();
  const all = await service.listFunctions();

  assert.equal(first.length, dataModel.DEFAULT_MINISTRY_FUNCTIONS.length);
  assert.equal(second.length, 0);
  assert.deepEqual(all.map(item => item.slug), dataModel.DEFAULT_MINISTRY_FUNCTIONS.map(item => item.slug));
  assert.ok(all.every(item => item.active === true));
});

test('cadastro, edição, inativação e ordenação preservam catálogo e geram auditoria', async () => {
  const { service, audits } = createHarness();
  await service.ensureDefaultFunctions();

  const percussion = await service.createFunction({ name: 'Percussão', order: 100, active: true });
  const edited = await service.updateFunction(percussion.id, { name: 'Percussão Geral' });
  const inactive = await service.setFunctionActive(percussion.id, false);

  assert.equal(edited.slug, 'percussao');
  assert.equal(inactive.active, false);
  assert.equal((await service.listActiveFunctions()).some(item => item.id === percussion.id), false);

  const all = await service.listFunctions();
  const reversed = [...all].reverse();
  await service.reorder(reversed.map(item => ({ functionId: item.id })));
  const reordered = await service.listFunctions();
  assert.deepEqual(reordered.map(item => item.id), reversed.map(item => item.id));

  assert.deepEqual(audits.map(item => item.action), [
    'MINISTRY_FUNCTION_CREATED',
    'MINISTRY_FUNCTION_UPDATED',
    'MINISTRY_FUNCTION_DEACTIVATED',
    'MINISTRY_FUNCTIONS_REORDERED'
  ]);
  assert.ok(audits.every(item => item.actorUserId === 'admin-1'));
});

test('uma pessoa pode possuir múltiplas funções e vínculos removidos ficam inativos', async () => {
  const { service } = createHarness();
  await service.ensureDefaultFunctions();
  const all = await service.listFunctions();
  const bateria = all.find(item => item.slug === 'bateria');
  const dm = all.find(item => item.slug === 'dm');

  await service.replaceUserFunctions('user-1', [bateria.id, dm.id]);
  let assigned = await service.listUserFunctions('user-1');
  assert.deepEqual(new Set(assigned.map(item => item.functionId)), new Set([bateria.id, dm.id]));

  await service.replaceUserFunctions('user-1', [dm.id]);
  assigned = await service.listUserFunctions('user-1');
  assert.deepEqual(assigned.map(item => item.functionId), [dm.id]);
});

test('aliases legados da planilha são compatibilizados sem tratar permissão como função', async () => {
  const { service } = createHarness();
  await service.ensureDefaultFunctions();

  assert.equal(normalizeLegacyFunctionLabel('Baterista'), 'bateria');
  assert.equal(normalizeLegacyFunctionLabel('Violão'), 'violao');
  assert.equal(normalizeLegacyFunctionLabel('Direção Musical'), 'dm');

  const ids = await service.resolveLegacyFunctionIds(['Baterista', 'Violão', 'Direção Musical', 'ADMIN']);
  const all = await service.listFunctions();
  const slugs = ids.map(id => all.find(item => item.id === id).slug);
  assert.deepEqual(slugs, ['bateria', 'violao', 'dm']);

  assert.equal(canManageMinistryFunctions({ role: 'MEMBER', permissions: {} }), false);
  assert.equal(canManageMinistryFunctions({ role: 'ADMIN', permissions: {} }), false);
  assert.equal(canManageMinistryFunctions({ role: 'MEMBER', permissions: { users: 'EDIT' } }), true);
  assert.equal(canManageMinistryFunctions({ role: 'SUPER_ADMIN', permissions: {} }), true);
});
