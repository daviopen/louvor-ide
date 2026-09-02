/**
 * Persistência do domínio de indisponibilidades.
 * Mantém detalhes do Firebase fora da página e do service.
 */
(function initUnavailabilityRepository(globalScope, factory) {
  const api = factory(globalScope);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (globalScope) globalScope.MusicIdeUnavailabilityRepository = api;
})(typeof window !== 'undefined' ? window : null, function createModule(globalScope) {
  const DEFAULT_LIST_LIMIT = 250;
  const EVENT_LIST_LIMIT = 120;
  const PERMISSION_TTL_MS = 2 * 60 * 1000;

  function snapshotToEntity(snapshot) { return snapshot && snapshot.exists ? { id: snapshot.id, ...snapshot.data() } : null; }
  function mapSnapshot(snapshot) { return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); }
  function defaultServerTimestamp(clock) {
    const fieldValue = globalScope?.firebase?.firestore?.FieldValue;
    if (fieldValue && typeof fieldValue.serverTimestamp === 'function') return fieldValue.serverTimestamp();
    return clock();
  }

  class UnavailabilityRepository {
    constructor(database, options = {}) {
      if (!database || typeof database.collection !== 'function') throw new Error('Firestore é obrigatório para UnavailabilityRepository.');
      this.db = database;
      this.clock = options.clock || (() => new Date());
      this.serverTimestamp = options.serverTimestamp || (() => defaultServerTimestamp(this.clock));
      this.permissionCache = new Map();
      this.referenceCache = new Map();
    }
    collection() { return this.db.collection('unavailability'); }
    async getById(id) { return snapshotToEntity(await this.collection().doc(id).get()); }
    async listByUser(userId) {
      const snapshot = await this.collection().where('userId', '==', userId).get();
      return mapSnapshot(snapshot);
    }
    async listAll(limit = DEFAULT_LIST_LIMIT) {
      const safeLimit = Math.max(1, Math.min(500, Number(limit) || DEFAULT_LIST_LIMIT));
      return mapSnapshot(await this.collection().orderBy('date', 'desc').limit(safeLimit).get());
    }
    async create(data) {
      const now = this.clock();
      const document = { ...data, createdAt: data.createdAt || now, updatedAt: data.updatedAt || now };
      const ref = await this.collection().add(document);
      return { id: ref.id, ...document };
    }
    async update(id, patch) {
      const current = await this.getById(id);
      if (!current) throw new Error('Indisponibilidade não encontrada.');
      const updatedAt = this.clock();
      await this.collection().doc(id).update({ ...patch, updatedAt });
      return { ...current, ...patch, id, updatedAt };
    }
    async delete(id) { await this.collection().doc(id).delete(); return true; }

    async cachedReference(key, ttlMs, loader) {
      const current = this.referenceCache.get(key);
      if (current && Date.now() - current.loadedAt < ttlMs) return current.value;
      const value = await loader();
      this.referenceCache.set(key, { loadedAt: Date.now(), value });
      return value;
    }

    async listActiveUsers() {
      return this.cachedReference('activeUsers', 5 * 60 * 1000, async () => {
        // Compatibilidade: registros legados podem não possuir `active`.
        // No modelo atual, ausência do campo significa ativo; por isso não usamos
        // where('active', '==', true), que excluiria esses usuários silenciosamente.
        const snapshot = await this.db.collection('users').get();
        return mapSnapshot(snapshot)
          .filter(item => item.active !== false)
          .sort((a, b) => String(a.name || a.email || '').localeCompare(String(b.name || b.email || ''), 'pt-BR'));
      });
    }

    async listEvents(limit = EVENT_LIST_LIMIT) {
      return this.cachedReference('events', 2 * 60 * 1000, async () => {
        const safeLimit = Math.max(1, Math.min(250, Number(limit) || EVENT_LIST_LIMIT));
        const snapshot = await this.db.collection('events').orderBy('date', 'desc').limit(safeLimit).get();
        return mapSnapshot(snapshot).sort((a, b) => {
          const left = a.date && typeof a.date.toDate === 'function' ? a.date.toDate() : new Date(a.date || 0);
          const right = b.date && typeof b.date.toDate === 'function' ? b.date.toDate() : new Date(b.date || 0);
          return left - right;
        });
      });
    }

    async getPermissionLevel(userId, moduleName = 'unavailability') {
      const key = `${userId}__${moduleName}`;
      const current = this.permissionCache.get(key);
      if (current && Date.now() - current.loadedAt < PERMISSION_TTL_MS) return current.level;
      const snapshot = await this.db.collection('permissions').doc(key).get();
      const level = snapshot.exists ? String((snapshot.data() || {}).level || 'NONE').toUpperCase() : 'NONE';
      this.permissionCache.set(key, { level, loadedAt: Date.now() });
      return level;
    }

    async addAuditLog(actorUserId, action, entityId, details = {}) {
      const createdAt = this.serverTimestamp();
      const ref = await this.db.collection('auditLogs').add({ actorUserId, action, entityType: 'unavailability', entityId, details, createdAt });
      return { id: ref.id, actorUserId, action, entityType: 'unavailability', entityId, details, createdAt };
    }
  }

  return Object.freeze({ UnavailabilityRepository, snapshotToEntity, DEFAULT_LIST_LIMIT, EVENT_LIST_LIMIT });
});