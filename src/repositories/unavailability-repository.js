/**
 * Persistência do domínio de indisponibilidades.
 * Mantém detalhes do Firebase fora da página e do service.
 */
(function initUnavailabilityRepository(globalScope, factory) {
  const api = factory(globalScope);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (globalScope) globalScope.MusicIdeUnavailabilityRepository = api;
})(typeof window !== 'undefined' ? window : null, function createModule(globalScope) {
  function snapshotToEntity(snapshot) {
    return snapshot && snapshot.exists ? { id: snapshot.id, ...snapshot.data() } : null;
  }

  function mapSnapshot(snapshot) {
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  function defaultServerTimestamp(clock) {
    const fieldValue = globalScope?.firebase?.firestore?.FieldValue;
    if (fieldValue && typeof fieldValue.serverTimestamp === 'function') return fieldValue.serverTimestamp();
    return clock();
  }

  class UnavailabilityRepository {
    constructor(database, options = {}) {
      if (!database || typeof database.collection !== 'function') {
        throw new Error('Firestore é obrigatório para UnavailabilityRepository.');
      }
      this.db = database;
      this.clock = options.clock || (() => new Date());
      this.serverTimestamp = options.serverTimestamp || (() => defaultServerTimestamp(this.clock));
    }

    collection() { return this.db.collection('unavailability'); }

    async getById(id) {
      return snapshotToEntity(await this.collection().doc(id).get());
    }

    async listByUser(userId) {
      const snapshot = await this.collection().where('userId', '==', userId).get();
      return mapSnapshot(snapshot);
    }

    async listAll() {
      return mapSnapshot(await this.collection().get());
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

    async delete(id) {
      await this.collection().doc(id).delete();
      return true;
    }

    async listActiveUsers() {
      const snapshot = await this.db.collection('users').where('active', '==', true).get();
      return mapSnapshot(snapshot).sort((a, b) => String(a.name || a.email || '').localeCompare(String(b.name || b.email || ''), 'pt-BR'));
    }

    async listEvents() {
      const snapshot = await this.db.collection('events').get();
      return mapSnapshot(snapshot).sort((a, b) => {
        const left = a.date && typeof a.date.toDate === 'function' ? a.date.toDate() : new Date(a.date || 0);
        const right = b.date && typeof b.date.toDate === 'function' ? b.date.toDate() : new Date(b.date || 0);
        return left - right;
      });
    }

    async getPermissionLevel(userId, moduleName = 'unavailability') {
      const snapshot = await this.db.collection('permissions').doc(`${userId}__${moduleName}`).get();
      if (!snapshot.exists) return 'NONE';
      const data = snapshot.data() || {};
      return String(data.level || 'NONE').toUpperCase();
    }

    async addAuditLog(actorUserId, action, entityId, details = {}) {
      // As Firestore Rules exigem createdAt == request.time. Usar Date do cliente
      // faz a gravação principal ocorrer e a auditoria falhar com permission-denied.
      const createdAt = this.serverTimestamp();
      const ref = await this.db.collection('auditLogs').add({
        actorUserId,
        action,
        entityType: 'unavailability',
        entityId,
        details,
        createdAt
      });
      return { id: ref.id, actorUserId, action, entityType: 'unavailability', entityId, details, createdAt };
    }
  }

  return Object.freeze({ UnavailabilityRepository, snapshotToEntity });
});
