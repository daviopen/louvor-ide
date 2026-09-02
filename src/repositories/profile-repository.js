/**
 * Persistência do perfil do próprio usuário autenticado.
 * Mantém o Firestore fora da UI e limita o payload a dados pessoais editáveis.
 */
(function initProfileRepository(globalScope, factory) {
  const api = factory(globalScope);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (globalScope) globalScope.MusicIdeProfileRepository = api;
})(typeof window !== 'undefined' ? window : null, function createProfileRepositoryModule(globalScope) {
  const SELF_EDITABLE_FIELDS = Object.freeze(['name', 'phone', 'birthDate', 'photoURL']);

  function defaultServerTimestamp(clock) {
    const fieldValue = globalScope?.firebase?.firestore?.FieldValue;
    return fieldValue && typeof fieldValue.serverTimestamp === 'function'
      ? fieldValue.serverTimestamp()
      : clock();
  }

  class ProfileRepository {
    constructor(database, options = {}) {
      if (!database || typeof database.collection !== 'function') throw new Error('Firestore é obrigatório.');
      this.db = database;
      this.clock = options.clock || (() => new Date());
      this.serverTimestamp = options.serverTimestamp || (() => defaultServerTimestamp(this.clock));
    }

    users() { return this.db.collection('users'); }

    async getOwnProfile(userId) {
      const id = String(userId || '').trim();
      if (!id) throw new TypeError('userId é obrigatório.');
      const snapshot = await this.users().doc(id).get();
      return snapshot.exists ? { id: snapshot.id, ...snapshot.data() } : null;
    }

    async updateOwnProfile(userId, patch) {
      const id = String(userId || '').trim();
      if (!id) throw new TypeError('userId é obrigatório.');
      const safePatch = {};
      for (const field of SELF_EDITABLE_FIELDS) {
        if (Object.prototype.hasOwnProperty.call(patch || {}, field)) safePatch[field] = patch[field];
      }
      safePatch.updatedAt = this.serverTimestamp();
      await this.users().doc(id).update(safePatch);
      return this.getOwnProfile(id);
    }
  }

  return Object.freeze({ ProfileRepository, SELF_EDITABLE_FIELDS });
});
