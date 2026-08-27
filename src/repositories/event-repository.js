/**
 * Persistência atômica do domínio de eventos.
 * Eventos, escalas, setlists e Audit Log são coordenados fora da UI.
 */
(function initEventRepository(globalScope, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (globalScope) globalScope.MusicIdeEventRepository = api;
})(typeof window !== 'undefined' ? window : null, function createModule() {
  const FALLBACK_TEMPLATE = Object.freeze([
    { slug: 'back-vocal', quantity: 4 },
    { slug: 'ministro', quantity: 2 },
    { slug: 'guitarra', quantity: 1 },
    { slug: 'violao', quantity: 1 },
    { slug: 'baixo', quantity: 1 },
    { slug: 'bateria', quantity: 1 },
    { slug: 'teclado', quantity: 1 }
  ]);

  function snapshotToEntity(snapshot) {
    return snapshot && snapshot.exists ? { id: snapshot.id, ...snapshot.data() } : null;
  }

  function mapSnapshot(snapshot) {
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  function safeRequestId(value) {
    const normalized = String(value || '').trim().replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100);
    if (!normalized) throw new Error('Identificador de criação inválido.');
    return normalized;
  }

  function eventDocumentId(requestId) { return `event_${safeRequestId(requestId)}`; }
  function scheduleDocumentId(eventId) { return `schedule_${String(eventId)}`; }
  function setlistDocumentId(eventId) { return `setlist_${String(eventId)}`; }

  function activeScheduleStatus(currentStatus) {
    return ['DRAFT', 'COMPLETE'].includes(String(currentStatus || '').toUpperCase()) ? String(currentStatus).toUpperCase() : 'DRAFT';
  }

  function activeSetlistStatus(currentStatus) {
    return ['DRAFT', 'READY'].includes(String(currentStatus || '').toUpperCase()) ? String(currentStatus).toUpperCase() : 'DRAFT';
  }

  function linkedStatuses(eventStatus, scheduleStatus, setlistStatus) {
    const normalized = String(eventStatus || 'PLANNED').toUpperCase();
    if (normalized === 'CANCELLED') return { schedule: 'CANCELLED', setlist: 'CANCELLED' };
    if (normalized === 'COMPLETED') return { schedule: 'COMPLETED', setlist: 'COMPLETED' };
    return { schedule: activeScheduleStatus(scheduleStatus), setlist: activeSetlistStatus(setlistStatus) };
  }

  function safeSlotPart(value) {
    return String(value || 'funcao').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'funcao';
  }

  function buildScheduleSlots(functions, configuredTemplate) {
    const activeFunctions = (functions || []).filter(item => item.active !== false);
    const byId = new Map(activeFunctions.map(item => [String(item.id), item]));
    const bySlug = new Map(activeFunctions.filter(item => item.slug).map(item => [String(item.slug), item]));
    const configured = Array.isArray(configuredTemplate?.slots) ? configuredTemplate.slots : [];
    const source = configured.length
      ? configured.map(item => ({ function: byId.get(String(item.functionId)), quantity: Number(item.quantity) || 0 }))
      : FALLBACK_TEMPLATE.map(item => ({ function: bySlug.get(item.slug), quantity: item.quantity }));
    const slots = [];
    source.forEach(entry => {
      if (!entry.function || !Number.isInteger(entry.quantity) || entry.quantity <= 0) return;
      const base = safeSlotPart(entry.function.slug || entry.function.id);
      for (let index = 1; index <= entry.quantity; index += 1) {
        slots.push({ id: `slot_${base}_${index}`, functionId: entry.function.id });
      }
    });
    return slots;
  }

  class EventRepository {
    constructor(database, options = {}) {
      if (!database || typeof database.collection !== 'function') throw new Error('Firestore é obrigatório para EventRepository.');
      this.db = database;
      this.clock = options.clock || (() => new Date());
    }

    events() { return this.db.collection('events'); }
    schedules() { return this.db.collection('schedules'); }
    setlists() { return this.db.collection('setlists'); }
    auditLogs() { return this.db.collection('auditLogs'); }

    async getById(id) { return snapshotToEntity(await this.events().doc(id).get()); }

    async listAll() {
      const snapshot = await this.events().orderBy('date', 'asc').get();
      return mapSnapshot(snapshot);
    }

    async getPermissionLevel(userId, moduleName) {
      const snapshot = await this.db.collection('permissions').doc(`${userId}__${moduleName}`).get();
      if (!snapshot.exists) return 'NONE';
      return String(snapshot.data()?.level || 'NONE').toUpperCase();
    }

    async loadScheduleTemplate() {
      const [functionsSnapshot, templateSnapshot] = await Promise.all([
        this.db.collection('ministryFunctions').get(),
        this.db.collection('settings').doc('scheduleTemplate').get()
      ]);
      const functions = mapSnapshot(functionsSnapshot);
      const template = templateSnapshot.exists ? { id: templateSnapshot.id, ...templateSnapshot.data() } : null;
      return {
        slots: buildScheduleSlots(functions, template),
        version: Number(template?.version || 0),
        source: template ? 'CONFIGURED' : 'FALLBACK'
      };
    }

    async createEventBundle(data, actorUserId, requestId) {
      if (typeof this.db.runTransaction !== 'function') throw new Error('Firestore configurado não oferece transações.');
      const eventId = eventDocumentId(requestId);
      const scheduleId = scheduleDocumentId(eventId);
      const setlistId = setlistDocumentId(eventId);
      const eventRef = this.events().doc(eventId);
      const scheduleRef = this.schedules().doc(scheduleId);
      const setlistRef = this.setlists().doc(setlistId);
      const auditRef = this.auditLogs().doc();
      const now = this.clock();
      const scheduleTemplate = await this.loadScheduleTemplate();

      return this.db.runTransaction(async transaction => {
        const existing = await transaction.get(eventRef);
        if (existing.exists) return { id: existing.id, ...existing.data(), idempotent: true };

        const eventDocument = {
          ...data,
          scheduleId,
          setlistId,
          createdBy: actorUserId,
          updatedBy: actorUserId,
          createdAt: now,
          updatedAt: now
        };
        const scheduleDocument = {
          eventId,
          status: 'DRAFT',
          slots: scheduleTemplate.slots,
          defaultTemplateVersion: scheduleTemplate.version,
          templateSource: scheduleTemplate.source,
          eventDate: data.date,
          eventTime: data.time || null,
          createdBy: actorUserId,
          updatedBy: actorUserId,
          createdAt: now,
          updatedAt: now
        };
        const setlistDocument = {
          eventId,
          scheduleId,
          status: 'DRAFT',
          eventDate: data.date,
          eventTime: data.time || null,
          createdBy: actorUserId,
          updatedBy: actorUserId,
          createdAt: now,
          updatedAt: now
        };
        transaction.set(eventRef, eventDocument);
        transaction.set(scheduleRef, scheduleDocument);
        transaction.set(setlistRef, setlistDocument);
        transaction.set(auditRef, {
          actorUserId,
          action: 'EVENT_CREATED',
          entityType: 'event',
          entityId: eventId,
          details: {
            scheduleId,
            setlistId,
            status: data.status,
            date: data.date,
            time: data.time || null,
            scheduleTemplateVersion: scheduleTemplate.version,
            scheduleTemplateSource: scheduleTemplate.source,
            schedulePositions: scheduleTemplate.slots.length
          },
          createdAt: now
        });
        return { id: eventId, ...eventDocument, idempotent: false };
      });
    }

    async updateEventBundle(eventId, data, actorUserId, options = {}) {
      const current = await this.getById(eventId);
      if (!current) throw new Error('Evento não encontrado.');
      const scheduleId = current.scheduleId || scheduleDocumentId(eventId);
      const setlistId = current.setlistId || setlistDocumentId(eventId);
      const scheduleRef = this.schedules().doc(scheduleId);
      const setlistRef = this.setlists().doc(setlistId);
      let scheduleCurrent = null;
      let setlistCurrent = null;
      if (options.syncLinked) {
        const [scheduleSnapshot, setlistSnapshot] = await Promise.all([scheduleRef.get(), setlistRef.get()]);
        scheduleCurrent = snapshotToEntity(scheduleSnapshot);
        setlistCurrent = snapshotToEntity(setlistSnapshot);
      }

      const now = this.clock();
      const batch = this.db.batch();
      batch.set(this.events().doc(eventId), {
        ...data,
        scheduleId,
        setlistId,
        createdBy: current.createdBy || actorUserId,
        updatedBy: actorUserId,
        createdAt: current.createdAt || now,
        updatedAt: now
      }, { merge: true });

      if (options.syncLinked) {
        const statuses = linkedStatuses(data.status, scheduleCurrent?.status, setlistCurrent?.status);
        batch.set(scheduleRef, {
          eventId,
          status: statuses.schedule,
          eventDate: data.date,
          eventTime: data.time || null,
          createdBy: scheduleCurrent?.createdBy || actorUserId,
          updatedBy: actorUserId,
          createdAt: scheduleCurrent?.createdAt || now,
          updatedAt: now
        }, { merge: true });
        batch.set(setlistRef, {
          eventId,
          scheduleId,
          status: statuses.setlist,
          eventDate: data.date,
          eventTime: data.time || null,
          createdBy: setlistCurrent?.createdBy || actorUserId,
          updatedBy: actorUserId,
          createdAt: setlistCurrent?.createdAt || now,
          updatedAt: now
        }, { merge: true });
      }

      const auditRef = this.auditLogs().doc();
      batch.set(auditRef, {
        actorUserId,
        action: 'EVENT_UPDATED',
        entityType: 'event',
        entityId: eventId,
        details: {
          previousStatus: current.status,
          status: data.status,
          date: data.date,
          time: data.time || null,
          linkedSynchronized: Boolean(options.syncLinked)
        },
        createdAt: now
      });
      await batch.commit();
      return { ...current, ...data, id: eventId, scheduleId, setlistId, updatedBy: actorUserId, updatedAt: now };
    }

    async getDependencyCounts(event) {
      const scheduleId = event.scheduleId || scheduleDocumentId(event.id);
      const setlistId = event.setlistId || setlistDocumentId(event.id);
      const [members, songs] = await Promise.all([
        this.db.collection('scheduleMembers').where('scheduleId', '==', scheduleId).limit(1).get(),
        this.db.collection('setlistSongs').where('setlistId', '==', setlistId).limit(1).get()
      ]);
      return { scheduleMembers: members.empty ? 0 : members.docs.length, setlistSongs: songs.empty ? 0 : songs.docs.length };
    }

    async deleteEventBundle(event, actorUserId) {
      const eventId = event.id;
      const scheduleId = event.scheduleId || scheduleDocumentId(eventId);
      const setlistId = event.setlistId || setlistDocumentId(eventId);
      const now = this.clock();
      const [membersSnapshot, songsSnapshot] = await Promise.all([
        this.db.collection('scheduleMembers').where('scheduleId', '==', scheduleId).get(),
        this.db.collection('setlistSongs').where('setlistId', '==', setlistId).get()
      ]);
      const childCount = membersSnapshot.docs.length + songsSnapshot.docs.length;
      if (childCount > 490) throw new Error('O evento possui vínculos demais para exclusão segura em uma única operação. Procure um administrador.');

      const batch = this.db.batch();
      membersSnapshot.docs.forEach(doc => batch.delete(doc.ref));
      songsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
      batch.delete(this.events().doc(eventId));
      batch.delete(this.schedules().doc(scheduleId));
      batch.delete(this.setlists().doc(setlistId));
      batch.set(this.auditLogs().doc(), {
        actorUserId,
        action: 'EVENT_DELETED',
        entityType: 'event',
        entityId: eventId,
        details: {
          name: event.name,
          scheduleId,
          setlistId,
          status: event.status,
          deletedScheduleMembers: membersSnapshot.docs.length,
          deletedSetlistSongs: songsSnapshot.docs.length
        },
        createdAt: now
      });
      await batch.commit();
      return true;
    }
  }

  return Object.freeze({
    EventRepository,
    snapshotToEntity,
    safeRequestId,
    eventDocumentId,
    scheduleDocumentId,
    setlistDocumentId,
    linkedStatuses,
    buildScheduleSlots,
    FALLBACK_TEMPLATE
  });
});