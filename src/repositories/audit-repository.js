/**
 * Repositório somente leitura do Audit Log.
 * Filtros são aplicados em memória para evitar índices compostos e manter a
 * consulta administrativa previsível enquanto a coleção ainda é pequena.
 */
(function initAuditRepository(globalScope, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (globalScope) globalScope.MusicIdeAuditRepository = api;
})(typeof window !== 'undefined' ? window : null, function createAuditRepositoryModule() {
  function mapSnapshot(snapshot) {
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

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

    async listRecent(limit = 500) {
      const safeLimit = Math.min(Math.max(Number(limit) || 500, 1), 1000);
      const snapshot = await this.db.collection('auditLogs').orderBy('createdAt', 'desc').limit(safeLimit).get();
      return mapSnapshot(snapshot);
    }

    async listFiltered(filters = {}, sourceLogs = null) {
      const logs = Array.isArray(sourceLogs) ? sourceLogs : await this.listRecent(filters.limit || 500);
      return filterLogs(logs, filters);
    }
  }

  return { AuditRepository, asDate, filterLogs };
});
