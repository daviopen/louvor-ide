/**
 * Repositories canônicos das collections do roadmap.
 *
 * Compatível com o SDK namespaced do Firestore já utilizado pelo projeto.
 * O módulo recebe o contrato de dados por injeção para continuar testável e
 * não criar dependência direta da UI.
 */
(function initDomainRepositories(globalScope, factory) {
  const dataModel = globalScope && globalScope.MusicIdeDataModel
    ? globalScope.MusicIdeDataModel
    : (typeof module !== 'undefined' && module.exports ? require('../models/data-model.js') : null);
  const api = factory(dataModel);

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (globalScope) {
    globalScope.MusicIdeDomainRepositories = api;
  }
})(typeof window !== 'undefined' ? window : null, function createDomainRepositoriesModule(dataModel) {
  if (!dataModel) throw new Error('MusicIdeDataModel é obrigatório.');

  const {
    DATA_MODELS,
    validateDocument,
    userFunctionDocumentId,
    permissionDocumentId,
    songMinisterKeyDocumentId
  } = dataModel;

  function snapshotToEntity(snapshot) {
    if (!snapshot || !snapshot.exists) return null;
    return { id: snapshot.id, ...snapshot.data() };
  }

  class DomainRepository {
    constructor(modelName, database, options = {}) {
      const schema = DATA_MODELS[modelName];
      if (!schema) throw new Error(`Modelo desconhecido: ${modelName}.`);
      if (!database || typeof database.collection !== 'function') {
        throw new Error(`Database é obrigatório para ${modelName}.`);
      }

      this.modelName = modelName;
      this.collectionName = schema.collection;
      this.db = database;
      this.clock = options.clock || (() => new Date());
    }

    collection() {
      return this.db.collection(this.collectionName);
    }

    async getById(id) {
      const snapshot = await this.collection().doc(id).get();
      return snapshotToEntity(snapshot);
    }

    async list() {
      const snapshot = await this.collection().get();
      return snapshot.docs.map(snapshotToEntity);
    }

    async create(data, options = {}) {
      const now = this.clock();
      const document = {
        ...data,
        createdAt: data.createdAt || now,
        updatedAt: data.updatedAt || now
      };
      validateDocument(this.modelName, document);

      if (options.id) {
        await this.collection().doc(options.id).set(document);
        return { id: options.id, ...document };
      }

      const ref = await this.collection().add(document);
      return { id: ref.id, ...document };
    }

    async upsert(id, data) {
      const current = await this.getById(id);
      const now = this.clock();
      const document = {
        ...(current || {}),
        ...data,
        createdAt: current?.createdAt || data.createdAt || now,
        updatedAt: now
      };
      delete document.id;
      validateDocument(this.modelName, document);
      await this.collection().doc(id).set(document, { merge: true });
      return { id, ...document };
    }

    async update(id, patch) {
      const current = await this.getById(id);
      if (!current) throw new Error(`${this.modelName} não encontrado: ${id}.`);
      return this.upsert(id, patch);
    }
  }

  class MinistryFunctionsRepository extends DomainRepository {
    constructor(database, options) {
      super('ministryFunctions', database, options);
    }

    async listOrdered(options = {}) {
      const snapshot = await this.collection().orderBy('order', 'asc').get();
      const items = snapshot.docs.map(snapshotToEntity);
      return options.activeOnly ? items.filter(item => item.active) : items;
    }

    async findBySlug(slug) {
      const snapshot = await this.collection().where('slug', '==', slug).limit(1).get();
      return snapshot.empty ? null : snapshotToEntity(snapshot.docs[0]);
    }

    async reorder(functionOrders) {
      if (!Array.isArray(functionOrders) || functionOrders.length === 0) {
        throw new TypeError('functionOrders deve conter ao menos uma função.');
      }
      if (typeof this.db.batch !== 'function') {
        throw new Error('O banco configurado não oferece batch writes para reordenação atômica.');
      }

      const batch = this.db.batch();
      const collection = this.collection();
      const updatedAt = this.clock();
      for (const item of functionOrders) {
        batch.update(collection.doc(item.functionId), {
          order: item.order,
          updatedAt
        });
      }
      await batch.commit();
      return functionOrders.map(item => ({ ...item, updatedAt }));
    }
  }

  class UserFunctionsRepository extends DomainRepository {
    constructor(database, options) {
      super('userFunctions', database, options);
    }

    async assign(userId, functionId) {
      const id = userFunctionDocumentId(userId, functionId);
      return this.upsert(id, { userId, functionId, active: true, unassignedAt: null });
    }

    async unassign(userId, functionId) {
      const id = userFunctionDocumentId(userId, functionId);
      return this.update(id, { active: false, unassignedAt: this.clock() });
    }

    async listByUser(userId, options = {}) {
      let query = this.collection().where('userId', '==', userId);
      if (options.activeOnly !== false) query = query.where('active', '==', true);
      const snapshot = await query.get();
      return snapshot.docs.map(snapshotToEntity);
    }
  }

  class PermissionsRepository extends DomainRepository {
    constructor(database, options) {
      super('permissions', database, options);
    }

    async setPermission(userId, moduleName, level) {
      const id = permissionDocumentId(userId, moduleName);
      return this.upsert(id, { userId, module: moduleName, level });
    }
  }

  class SongMinisterKeysRepository extends DomainRepository {
    constructor(database, options) {
      super('songMinisterKeys', database, options);
    }

    async setPreferredKey(songId, userId, preferredKey) {
      const id = songMinisterKeyDocumentId(songId, userId);
      return this.upsert(id, { songId, userId, preferredKey });
    }
  }

  function createRepositoryRegistry(database, options = {}) {
    return Object.freeze({
      users: new DomainRepository('users', database, options),
      ministryFunctions: new MinistryFunctionsRepository(database, options),
      userFunctions: new UserFunctionsRepository(database, options),
      permissions: new PermissionsRepository(database, options),
      events: new DomainRepository('events', database, options),
      unavailability: new DomainRepository('unavailability', database, options),
      schedules: new DomainRepository('schedules', database, options),
      scheduleMembers: new DomainRepository('scheduleMembers', database, options),
      setlists: new DomainRepository('setlists', database, options),
      setlistSongs: new DomainRepository('setlistSongs', database, options),
      songs: new DomainRepository('songs', database, options),
      songMinisterKeys: new SongMinisterKeysRepository(database, options),
      auditLogs: new DomainRepository('auditLogs', database, options),
      lgpdConsents: new DomainRepository('lgpdConsents', database, options)
    });
  }

  return Object.freeze({
    DomainRepository,
    MinistryFunctionsRepository,
    UserFunctionsRepository,
    PermissionsRepository,
    SongMinisterKeysRepository,
    createRepositoryRegistry
  });
});
