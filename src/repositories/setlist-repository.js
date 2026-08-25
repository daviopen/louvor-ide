/**
 * Persistência do domínio de Setlists.
 * Centraliza Firestore e mantém compatibilidade de leitura com músicas legadas.
 */
(function initSetlistRepository(globalScope, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (globalScope) globalScope.MusicIdeSetlistRepository = api;
})(typeof window !== 'undefined' ? window : null, function createModule() {
  function entity(snapshot) {
    return snapshot && snapshot.exists ? { id: snapshot.id, ...snapshot.data() } : null;
  }
  function entities(snapshot) { return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); }
  function setlistIdForSchedule(scheduleId) { return `setlist_${String(scheduleId || '').replace(/^schedule_/, '')}`; }

  class SetlistRepository {
    constructor(database, options = {}) {
      if (!database || typeof database.collection !== 'function') throw new Error('Firestore é obrigatório para SetlistRepository.');
      this.db = database;
      this.clock = options.clock || (() => new Date());
    }
    setlists() { return this.db.collection('setlists'); }
    setlistSongs() { return this.db.collection('setlistSongs'); }
    schedules() { return this.db.collection('schedules'); }
    members() { return this.db.collection('scheduleMembers'); }
    events() { return this.db.collection('events'); }
    users() { return this.db.collection('users'); }
    functions() { return this.db.collection('ministryFunctions'); }
    keys() { return this.db.collection('songMinisterKeys'); }
    auditLogs() { return this.db.collection('auditLogs'); }

    async getSetlist(id) { return entity(await this.setlists().doc(id).get()); }
    async getSchedule(id) { return entity(await this.schedules().doc(id).get()); }
    async getEvent(id) { return entity(await this.events().doc(id).get()); }

    async findSetlistBySchedule(scheduleId) {
      const snapshot = await this.setlists().where('scheduleId', '==', scheduleId).limit(1).get();
      return snapshot.empty ? null : { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    }

    async ensureForSchedule(schedule, actorUserId) {
      if (!schedule?.id || !schedule?.eventId) throw new Error('Escala inválida para criação do Setlist.');
      const existing = await this.findSetlistBySchedule(schedule.id);
      if (existing) return { ...existing, idempotent: true };
      const event = await this.getEvent(schedule.eventId);
      const id = event?.setlistId || setlistIdForSchedule(schedule.id);
      const current = await this.getSetlist(id);
      if (current) return { ...current, idempotent: true };
      const now = this.clock();
      const document = {
        eventId: schedule.eventId,
        scheduleId: schedule.id,
        status: ['CANCELLED', 'COMPLETED'].includes(schedule.status) ? schedule.status : 'DRAFT',
        eventDate: schedule.eventDate || event?.date || null,
        eventTime: schedule.eventTime || event?.time || null,
        createdBy: actorUserId,
        updatedBy: actorUserId,
        createdAt: now,
        updatedAt: now
      };
      await this.setlists().doc(id).set(document, { merge: true });
      return { id, ...document, idempotent: false };
    }

    async listMembers(scheduleId) {
      const snapshot = await this.members().where('scheduleId', '==', scheduleId).get();
      return entities(snapshot).filter(item => item.active !== false);
    }
    async listUsers() { return entities(await this.users().get()).filter(item => item.active !== false); }
    async listFunctions() { return entities(await this.functions().get()).filter(item => item.active !== false); }
    async listMinisterKeys() { return entities(await this.keys().get()); }

    async listSongsLibrary() {
      const modern = await this.db.collection('songs').get();
      if (!modern.empty) return entities(modern).filter(item => item.active !== false);
      const legacy = await this.db.collection('musicas').get();
      return entities(legacy).filter(item => item.active !== false);
    }

    async listSetlistSongs(setlistId) {
      const snapshot = await this.setlistSongs().where('setlistId', '==', setlistId).get();
      return entities(snapshot).filter(item => item.active !== false).sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
    }

    async getPermissionLevel(userId, moduleName = 'setlists') {
      const snapshot = await this.db.collection('permissions').doc(`${userId}__${moduleName}`).get();
      return snapshot.exists ? String(snapshot.data()?.level || 'NONE').toUpperCase() : 'NONE';
    }

    async save(setlistId, patch, songs, actorUserId) {
      const current = await this.getSetlist(setlistId);
      if (!current) throw new Error('Setlist não encontrado.');
      const now = this.clock();
      const previous = await this.listSetlistSongs(setlistId);
      const batch = this.db.batch();
      const activeIds = new Set();

      songs.forEach((song, index) => {
        const id = `${setlistId}__${song.songId}`;
        activeIds.add(id);
        batch.set(this.setlistSongs().doc(id), {
          setlistId,
          songId: song.songId,
          order: index + 1,
          ministerUserId: song.ministerUserId || null,
          executionKey: song.executionKey || null,
          note: song.note || null,
          transition: song.transition || null,
          active: true,
          createdBy: previous.find(item => item.id === id)?.createdBy || actorUserId,
          updatedBy: actorUserId,
          createdAt: previous.find(item => item.id === id)?.createdAt || now,
          updatedAt: now
        }, { merge: true });
      });
      previous.filter(item => !activeIds.has(item.id)).forEach(item => {
        batch.set(this.setlistSongs().doc(item.id), { active: false, removedAt: now, updatedAt: now, updatedBy: actorUserId }, { merge: true });
      });

      const legacySongs = songs.map((song, index) => ({
        id: song.songId,
        titulo: song.title || '',
        artista: song.artist || '',
        tomOriginal: song.originalKey || null,
        tomFinal: song.executionKey || song.originalKey || null,
        ministro: song.ministerName || null,
        ministerUserId: song.ministerUserId || null,
        observacao: song.note || null,
        transicao: song.transition || null,
        ordem: index + 1
      }));
      batch.set(this.setlists().doc(setlistId), {
        ...patch,
        musicas: legacySongs,
        totalMusicas: songs.length,
        updatedBy: actorUserId,
        updatedAt: now
      }, { merge: true });
      batch.set(this.auditLogs().doc(), {
        actorUserId,
        action: 'SETLIST_UPDATED',
        entityType: 'setlist',
        entityId: setlistId,
        details: { scheduleId: current.scheduleId, eventId: current.eventId, songCount: songs.length },
        createdAt: now
      });
      await batch.commit();
      return { ...current, ...patch, id: setlistId, totalMusicas: songs.length, updatedBy: actorUserId, updatedAt: now };
    }
  }

  return Object.freeze({ SetlistRepository, setlistIdForSchedule });
});