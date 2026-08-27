/**
 * Persistência do domínio de escalas.
 * Mantém consultas e writes do Firestore fora da UI e preserva histórico por soft delete.
 */
(function initScheduleRepository(globalScope, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (globalScope) globalScope.MusicIdeScheduleRepository = api;
})(typeof window !== 'undefined' ? window : null, function createModule() {
  function entity(snapshot) {
    return snapshot && snapshot.exists ? { id: snapshot.id, ...snapshot.data() } : null;
  }

  function entities(snapshot) {
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  function scheduleIdForEvent(eventId) {
    return `schedule_${String(eventId || '').trim()}`;
  }

  class ScheduleRepository {
    constructor(database, options = {}) {
      if (!database || typeof database.collection !== 'function') throw new Error('Firestore é obrigatório para ScheduleRepository.');
      this.db = database;
      this.clock = options.clock || (() => new Date());
    }

    schedules() { return this.db.collection('schedules'); }
    members() { return this.db.collection('scheduleMembers'); }
    events() { return this.db.collection('events'); }
    users() { return this.db.collection('users'); }
    functions() { return this.db.collection('ministryFunctions'); }
    userFunctions() { return this.db.collection('userFunctions'); }
    unavailability() { return this.db.collection('unavailability'); }
    auditLogs() { return this.db.collection('auditLogs'); }

    async getSchedule(id) { return entity(await this.schedules().doc(id).get()); }
    async getEvent(id) { return entity(await this.events().doc(id).get()); }

    async listSchedules() {
      const [schedules, events] = await Promise.all([this.schedules().get(), this.events().get()]);
      const eventMap = new Map(entities(events).map(item => [item.id, item]));
      return entities(schedules).map(schedule => ({ ...schedule, event: eventMap.get(schedule.eventId) || null }));
    }

    async ensureForEvent(event, actorUserId) {
      if (!event || !event.id) throw new Error('Evento inválido.');
      const id = event.scheduleId || scheduleIdForEvent(event.id);
      const current = await this.getSchedule(id);
      if (current) return { ...current, idempotent: true };
      const now = this.clock();
      const document = {
        eventId: event.id,
        eventDate: event.date,
        eventTime: event.time || null,
        status: ['CANCELLED', 'COMPLETED'].includes(event.status) ? event.status : 'DRAFT',
        slots: [],
        createdBy: actorUserId,
        updatedBy: actorUserId,
        createdAt: now,
        updatedAt: now
      };
      await this.schedules().doc(id).set(document);
      return { id, ...document, idempotent: false };
    }

    async updateSchedule(id, patch, actorUserId) {
      const current = await this.getSchedule(id);
      if (!current) throw new Error('Escala não encontrada.');
      const updatedAt = this.clock();
      await this.schedules().doc(id).set({ ...patch, updatedBy: actorUserId, updatedAt }, { merge: true });
      return { ...current, ...patch, id, updatedBy: actorUserId, updatedAt };
    }

    async listMembers(scheduleId, options = {}) {
      const snapshot = await this.members().where('scheduleId', '==', scheduleId).get();
      const items = entities(snapshot);
      return options.includeInactive ? items : items.filter(item => item.active !== false);
    }

    async listAllMembers(options = {}) {
      const items = entities(await this.members().get());
      return options.includeInactive ? items : items.filter(item => item.active !== false);
    }

    async createMember(data, actorUserId) {
      const now = this.clock();
      const document = { ...data, active: true, createdBy: actorUserId, updatedBy: actorUserId, createdAt: now, updatedAt: now };
      const ref = await this.members().add(document);
      return { id: ref.id, ...document };
    }

    async updateMember(id, patch, actorUserId) {
      const snapshot = await this.members().doc(id).get();
      const current = entity(snapshot);
      if (!current) throw new Error('Integrante da escala não encontrado.');
      const updatedAt = this.clock();
      await this.members().doc(id).set({ ...patch, updatedBy: actorUserId, updatedAt }, { merge: true });
      return { ...current, ...patch, id, updatedBy: actorUserId, updatedAt };
    }

    async removeMember(id, actorUserId) {
      return this.updateMember(id, { active: false, removedAt: this.clock() }, actorUserId);
    }

    async listActiveUsers() {
      const snapshot = await this.users().get();
      return entities(snapshot)
        .filter(item => item.active !== false)
        .sort((a, b) => String(a.name || a.email || '').localeCompare(String(b.name || b.email || ''), 'pt-BR'));
    }

    async listActiveFunctions() {
      const snapshot = await this.functions().get();
      return entities(snapshot)
        .filter(item => item.active !== false)
        .sort((a, b) => Number(a.order || 0) - Number(b.order || 0) || String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR'));
    }

    async listUserFunctions() {
      const snapshot = await this.userFunctions().get();
      return entities(snapshot).filter(item => item.active !== false);
    }

    async listUnavailability() {
      return entities(await this.unavailability().get());
    }

    async getPermissionLevel(userId, moduleName = 'schedules') {
      const snapshot = await this.db.collection('permissions').doc(`${userId}__${moduleName}`).get();
      if (!snapshot.exists) return 'NONE';
      return String(snapshot.data()?.level || 'NONE').toUpperCase();
    }

    async addAuditLog(actorUserId, action, entityId, details = {}) {
      const createdAt = this.clock();
      const ref = await this.auditLogs().add({
        actorUserId,
        action,
        entityType: 'schedule',
        entityId,
        details,
        createdAt
      });
      return { id: ref.id, actorUserId, action, entityType: 'schedule', entityId, details, createdAt };
    }
  }

  return Object.freeze({ ScheduleRepository, scheduleIdForEvent });
});
