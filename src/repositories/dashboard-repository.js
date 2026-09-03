/**
 * Read model for the personal Dashboard.
 * All Firestore access required by the Dashboard is centralized here.
 */
(function initDashboardRepository(globalScope, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (globalScope) globalScope.MusicIdeDashboardRepository = api;
})(typeof window !== 'undefined' ? window : null, function createDashboardRepositoryModule() {
  const QUERY_CHUNK_SIZE = 10;

  function snapshotToEntities(snapshot) {
    if (!snapshot || !Array.isArray(snapshot.docs)) return [];
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  function uniqueIds(values) {
    return [...new Set((values || []).filter(Boolean).map(String))];
  }

  function chunks(values, size = QUERY_CHUNK_SIZE) {
    const result = [];
    for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
    return result;
  }

  class DashboardRepository {
    constructor(database) {
      if (!database || typeof database.collection !== 'function') {
        throw new TypeError('DashboardRepository exige uma instância válida do Firestore.');
      }
      this.db = database;
    }

    async getOwnProfile(userId) {
      const snapshot = await this.db.collection('users').doc(userId).get();
      return snapshot && snapshot.exists ? { id: snapshot.id, ...snapshot.data() } : null;
    }

    async listOwnScheduleMembers(userId) {
      const snapshot = await this.db.collection('scheduleMembers').where('userId', '==', userId).get();
      return snapshotToEntities(snapshot).filter(item => item.active !== false);
    }

    async getSchedulesByIds(scheduleIds) {
      const ids = uniqueIds(scheduleIds);
      const snapshots = await Promise.all(ids.map(id => this.db.collection('schedules').doc(id).get()));
      return snapshots.filter(snapshot => snapshot && snapshot.exists).map(snapshot => ({ id: snapshot.id, ...snapshot.data() }));
    }

    async listMembersForSchedules(scheduleIds) {
      const ids = uniqueIds(scheduleIds);
      const queries = chunks(ids).map(group => {
        let query = this.db.collection('scheduleMembers');
        query = group.length === 1 ? query.where('scheduleId', '==', group[0]) : query.where('scheduleId', 'in', group);
        return query.get();
      });
      const snapshots = await Promise.all(queries);
      return snapshots.flatMap(snapshotToEntities).filter(item => item.active !== false);
    }

    async getEventsByIds(eventIds) {
      const ids = uniqueIds(eventIds);
      const snapshots = await Promise.all(ids.map(id => this.db.collection('events').doc(id).get()));
      return snapshots.filter(snapshot => snapshot && snapshot.exists).map(snapshot => ({ id: snapshot.id, ...snapshot.data() }));
    }

    async listSetlistsForTargets({ scheduleIds = [], eventIds = [] } = {}) {
      const schedules = uniqueIds(scheduleIds);
      const events = uniqueIds(eventIds);
      const queries = [];
      for (const group of chunks(schedules)) {
        let query = this.db.collection('setlists');
        query = group.length === 1 ? query.where('scheduleId', '==', group[0]) : query.where('scheduleId', 'in', group);
        queries.push(query.get());
      }
      for (const group of chunks(events)) {
        let query = this.db.collection('setlists');
        query = group.length === 1 ? query.where('eventId', '==', group[0]) : query.where('eventId', 'in', group);
        queries.push(query.get());
      }
      const snapshots = await Promise.all(queries);
      const byId = new Map();
      snapshots.flatMap(snapshotToEntities).forEach(item => byId.set(item.id, item));
      return [...byId.values()];
    }

    async listOwnUnavailability(userId) {
      const snapshot = await this.db.collection('unavailability').where('userId', '==', userId).get();
      return snapshotToEntities(snapshot);
    }
  }

  return Object.freeze({ DashboardRepository, snapshotToEntities, uniqueIds, chunks });
});
