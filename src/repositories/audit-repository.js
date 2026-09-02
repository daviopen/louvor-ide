/**
 * Repositório somente leitura do Audit Log.
 * Mantém a janela de leitura limitada para impedir crescimento linear de custo.
 */
(function initAuditRepository(globalScope, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (globalScope) globalScope.MusicIdeAuditRepository = api;
})(typeof window !== 'undefined' ? window : null, function createAuditRepositoryModule() {
  const DEFAULT_AUDIT_LIMIT = 100;
  const MAX_AUDIT_LIMIT = 250;

  function mapSnapshot(snapshot) { return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); }
  function asDate(value) {
    if (!value) return null;
    if (typeof value.toDate === 'function') return value.toDate();
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  function filterLogs(logs, filters = {}) {
    const actor = String(filters.actorUserId || '').trim().toLowerCase();
    const action = String(filters.action || '').trim();
    const entityType = String(filters.entityType || '').trim();
    const from = filters.from ? new Date(`${filters.from}T00:00:00`) : null;
    const to = filters.to ? new Date(`${filters.to}T23:59:59.999`) : null;
    return (Array.isArray(logs) ? logs : []).filter(log => {
      const createdAt = asDate(log.createdAt);
      return (!actor || String(log.actorUserId || '').toLowerCase().includes(actor))
        && (!action || log.action === action)
        && (!entityType || log.entityType === entityType)
        && (!from || (createdAt && createdAt >= from))
        && (!to || (createdAt && createdAt <= to));
    });
  }

  class AuditRepository {
    constructor(database) {
      if (!database || typeof database.collection !== 'function') throw new Error('Firestore é obrigatório para AuditRepository.');
      this.db = database;
    }

    async listRecent(limit = DEFAULT_AUDIT_LIMIT, options = {}) {
      const safeLimit = Math.min(Math.max(Number(limit) || DEFAULT_AUDIT_LIMIT, 1), MAX_AUDIT_LIMIT);
      let query = this.db.collection('auditLogs').orderBy('createdAt', 'desc');
      if (options.startAfter) query = query.startAfter(options.startAfter);
      const snapshot = await query.limit(safeLimit).get();
      return mapSnapshot(snapshot);
    }

    async listFiltered(filters = {}, sourceLogs = null) {
      const logs = Array.isArray(sourceLogs) ? sourceLogs : await this.listRecent(filters.limit || DEFAULT_AUDIT_LIMIT);
      return filterLogs(logs, filters);
    }
  }

  return { AuditRepository, asDate, filterLogs, DEFAULT_AUDIT_LIMIT, MAX_AUDIT_LIMIT };
});