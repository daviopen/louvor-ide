const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const dataModel = require('../src/models/data-model.js');
const repositories = require('../src/repositories/domain-repositories.js');
const { MinistryFunctionsService } = require('../src/services/ministry-functions-service.js');

const EXPECTED_COLLECTIONS = [
  'users',
  'ministryFunctions',
  'userFunctions',
  'permissions',
  'events',
  'unavailability',
  'schedules',
  'scheduleMembers',
  'setlists',
  'setlistSongs',
  'songs',
  'songMinisterKeys',
  'auditLogs',
  'lgpdConsents'
];

test('roadmap data model defines all canonical collections exactly once', () => {
  assert.deepEqual(Object.values(dataModel.COLLECTIONS), EXPECTED_COLLECTIONS);
  assert.deepEqual(
    Object.values(dataModel.DATA_MODELS).map(schema => schema.collection),
    EXPECTED_COLLECTIONS
  );
  assert.equal(new Set(EXPECTED_COLLECTIONS).size, EXPECTED_COLLECTIONS.length);
});

test('all roadmap entities accept their minimum valid contract', () => {
  const samples = {
    users: { uid: 'u1', name: 'Pessoa', email: 'PESSOA@EXAMPLE.COM', active: true },
    ministryFunctions: { name: 'Ministro', slug: 'ministro', active: true, order: 10 },
    userFunctions: { userId: 'u1', functionId: 'f1', active: true },
    permissions: { userId: 'u1', module: 'events', level: 'READ' },
    events: { name: 'Culto', date: new Date(), status: 'PLANNED' },
    unavailability: { userId: 'u1', date: new Date() },
    schedules: { eventId: 'e1', status: 'DRAFT' },
    scheduleMembers: { scheduleId: 's1', userId: 'u1', functionId: 'f1', active: true },
    setlists: { eventId: 'e1', scheduleId: 's1', status: 'DRAFT' },
    setlistSongs: { setlistId: 'sl1', songId: 'song1', order: 10 },
    songs: { name: 'Canção', active: true },
    songMinisterKeys: { songId: 'song1', userId: 'u1', preferredKey: 'E' },
    auditLogs: { actorUserId: 'u1', action: 'UPDATE', entityType: 'event', entityId: 'e1', createdAt: new Date() },
    lgpdConsents: { userId: 'u1', documentType: 'privacy-policy', version: '1.0', acceptedAt: new Date() }
  };

  for (const [modelName, document] of Object.entries(samples)) {
    assert.equal(dataModel.validateDocument(modelName, document), document, modelName);
  }
});

test('Pessoa ↔ Função is N:N with deterministic unique relation ids', () => {
  const ministro = dataModel.userFunctionDocumentId('user-1', 'ministro');
  const bateria = dataModel.userFunctionDocumentId('user-1', 'bateria');
  const outraPessoa = dataModel.userFunctionDocumentId('user-2', 'ministro');

  assert.equal(ministro, 'user-1__ministro');
  assert.notEqual(ministro, bateria);
  assert.notEqual(ministro, outraPessoa);
  assert.deepEqual(
    dataModel.createUserFunctionDocument('user-1', 'ministro'),
    { userId: 'user-1', functionId: 'ministro', active: true }
  );
});

test('default ministry functions cover roadmap and remain extensible', () => {
  assert.deepEqual(
    dataModel.DEFAULT_MINISTRY_FUNCTIONS.map(item => item.name),
    ['Ministro', 'Back Vocal', 'Bateria', 'Baixo', 'Guitarra', 'Violão', 'Teclado', 'Sax', 'DM']
  );
  assert.equal(dataModel.DEFAULT_MINISTRY_FUNCTIONS.every(item => item.active), true);
  assert.equal(
    dataModel.DEFAULT_MINISTRY_FUNCTIONS.every((item, index, list) => index === 0 || item.order > list[index - 1].order),
    true
  );

  const custom = dataModel.createMinistryFunctionDocument({ name: 'Percussão', order: 100 });
  assert.equal(custom.slug, 'percussao');
  assert.equal(custom.active, true);
});

test('ministry function validation supports activation and ordering invariants', () => {
  assert.throws(
    () => dataModel.createMinistryFunctionDocument({ name: 'Inválida', order: -1 }),
    /order/
  );
  assert.throws(
    () => dataModel.validateDocument('permissions', { userId: 'u1', module: 'events', level: 'OWNER' }),
    /Nível de permissão inválido/
  );
  assert.throws(
    () => dataModel.validateDocument('events', { name: 'Culto', date: new Date(), status: 'UNKNOWN' }),
    /Status de evento inválido/
  );
});

test('repository registry exposes one repository per canonical collection', () => {
  const fakeDb = { collection() { throw new Error('não deve consultar o banco neste teste'); } };
  const registry = repositories.createRepositoryRegistry(fakeDb);

  assert.deepEqual(Object.keys(registry), Object.keys(dataModel.DATA_MODELS));
  for (const [modelName, repository] of Object.entries(registry)) {
    assert.equal(repository.collectionName, dataModel.DATA_MODELS[modelName].collection);
  }
});

test('service seeds defaults and supports multiple functions per user without granting permissions', async () => {
  const functions = new Map();
  let id = 0;
  const assignments = new Map();

  const functionsRepository = {
    async findBySlug(slug) {
      return [...functions.values()].find(item => item.slug === slug) || null;
    },
    async create(document) {
      const entity = { id: `f${++id}`, ...document };
      functions.set(entity.id, entity);
      return entity;
    },
    async listOrdered() {
      return [...functions.values()].filter(item => item.active).sort((a, b) => a.order - b.order);
    },
    async getById(functionId) {
      return functions.get(functionId) || null;
    },
    async update(functionId, patch) {
      const next = { ...functions.get(functionId), ...patch };
      functions.set(functionId, next);
      return next;
    }
  };

  const userFunctionsRepository = {
    async assign(userId, functionId) {
      const relation = { userId, functionId, active: true };
      assignments.set(dataModel.userFunctionDocumentId(userId, functionId), relation);
      return relation;
    },
    async unassign(userId, functionId) {
      const key = dataModel.userFunctionDocumentId(userId, functionId);
      const relation = { ...assignments.get(key), active: false };
      assignments.set(key, relation);
      return relation;
    },
    async listByUser(userId, options = {}) {
      return [...assignments.values()].filter(item => item.userId === userId && (options.activeOnly === false || item.active));
    }
  };

  const service = new MinistryFunctionsService({
    ministryFunctionsRepository: functionsRepository,
    userFunctionsRepository
  });

  const seeded = await service.ensureDefaultFunctions();
  assert.equal(seeded.length, 9);
  assert.equal((await service.ensureDefaultFunctions()).length, 0, 'seed deve ser idempotente');

  const activeFunctions = await service.listActiveFunctions();
  await service.assignFunction('user-1', activeFunctions[0].id);
  await service.assignFunction('user-1', activeFunctions[2].id);
  assert.equal((await service.listUserFunctions('user-1')).length, 2);

  assert.equal('level' in assignments.values().next().value, false, 'função ministerial não carrega permissão');
  await service.setFunctionActive(activeFunctions[0].id, false);
  assert.equal(functions.get(activeFunctions[0].id).active, false);
});

test('canonical collection constants remain aligned with model contract', () => {
  const constantsPath = path.join(__dirname, '../src/constants/collections.js');
  const source = fs.readFileSync(constantsPath, 'utf8');
  for (const collectionName of EXPECTED_COLLECTIONS) {
    assert.match(source, new RegExp(`['\"]${collectionName}['\"]`));
  }
});
