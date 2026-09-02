/** Persistência da fila transacional de notificações. */
(function initNotificationOutboxRepository(globalScope, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (globalScope) globalScope.MusicIdeNotificationOutboxRepository = api;
})(typeof window !== 'undefined' ? window : null, function createModule() {
  const ALLOWED_TYPES = new Set([
    'SCHEDULE_MEMBER_ASSIGNED',
    'SCHEDULE_MEMBER_REMOVED',
    'SCHEDULE_UPDATED',
    'SETLIST_UPDATED'
  ]);

  function serverTimestamp(clock) {
    const firebaseApi = typeof globalThis !== 'undefined' ? globalThis.firebase : null;
    const fieldValue = firebaseApi?.firestore?.FieldValue;
    return fieldValue?.serverTimestamp ? fieldValue.serverTimestamp() : clock();
  }

  function normalizeIds(values) {
    return [...new Set((Array.isArray(values) ? values : []).map(value => String(value || '').trim()).filter(Boolean))].slice(0, 100);
  }

  function normalizeChannels(channels = {}) {
    return {
      push: channels.push === true,
      email: channels.email === true,
      calendar: channels.calendar === true
    };
  }

  class NotificationOutboxRepository {
    constructor(database, options = {}) {
      if (!database || typeof database.collection !== 'function') throw new Error('Firestore é obrigatório para NotificationOutboxRepository.');
      this.db = database;
      this.clock = options.clock || (() => new Date());
    }

    collection() { return this.db.collection('notificationOutbox'); }

    async enqueue(input, actorUserId) {
      const type = String(input?.type || '').trim().toUpperCase();
      const aggregateType = String(input?.aggregateType || '').trim().toLowerCase();
      if (!ALLOWED_TYPES.has(type)) throw new Error(`Tipo de notificação não suportado: ${type || 'vazio'}.`);
      if (!['schedule', 'setlist'].includes(aggregateType)) throw new Error('Agregado de notificação inválido.');
      if (!actorUserId) throw new Error('Ator da notificação não identificado.');
      if (!input?.scheduleId) throw new Error('scheduleId é obrigatório na outbox.');

      const now = serverTimestamp(this.clock);
      const document = {
        type,
        aggregateType,
        scheduleId: String(input.scheduleId),
        eventId: input.eventId ? String(input.eventId) : null,
        setlistId: input.setlistId ? String(input.setlistId) : null,
        targetUserIds: normalizeIds(input.targetUserIds),
        channels: normalizeChannels(input.channels),
        payload: input.payload && typeof input.payload === 'object' ? { ...input.payload } : {},
        actorUserId: String(actorUserId),
        status: 'PENDING',
        attempts: 0,
        createdAt: now,
        updatedAt: now
      };
      const ref = await this.collection().add(document);
      return { id: ref.id, ...document };
    }
  }

  return Object.freeze({ NotificationOutboxRepository, ALLOWED_TYPES, normalizeChannels, normalizeIds });
});
