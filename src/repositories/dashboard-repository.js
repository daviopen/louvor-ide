/**
 * Read model for the operational Dashboard.
 * All Firestore access required by the Dashboard is centralized here.
 */
(function initDashboardRepository(globalScope, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (globalScope) globalScope.MusicIdeDashboardRepository = api;
})(typeof window !== 'undefined' ? window : null, function createDashboardRepositoryModule() {
  function snapshotToEntities(snapshot) {
    if (!snapshot || !Array.isArray(snapshot.docs)) return [];
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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

    async listEvents() {
      return snapshotToEntities(await this.db.collection('events').get());
    }

    async listSchedules() {
      return snapshotToEntities(await this.db.collection('schedules').get());
    }

    async listScheduleMembers() {
      return snapshotToEntities(await this.db.collection('scheduleMembers').get());
    }

    async listSetlists() {
      return snapshotToEntities(await this.db.collection('setlists').get());
    }

    async listOwnUnavailability(userId) {
      const snapshot = await this.db.collection('unavailability').where('userId', '==', userId).get();
      return snapshotToEntities(snapshot);
    }
  }

  return Object.freeze({ DashboardRepository, snapshotToEntities });
});