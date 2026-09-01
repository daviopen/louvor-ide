/**
 * Repositório especializado para o CRUD de usuários.
 * Mantém Firestore fora da UI e preserva relações N:N com funções ministeriais.
 */
(function initUserRepository(globalScope, factory) {
  const dataModel = globalScope && globalScope.MusicIdeDataModel
    ? globalScope.MusicIdeDataModel
    : (typeof module !== 'undefined' && module.exports ? require('../models/data-model.js') : null);
  const api = factory(dataModel, globalScope);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (globalScope) globalScope.MusicIdeUserRepository = api;
})(typeof window !== 'undefined' ? window : null, function createModule(dataModel, globalScope) {
  if (!dataModel) throw new Error('MusicIdeDataModel é obrigatório.');
  const {
    normalizeEmail,
    userFunctionDocumentId,
    permissionDocumentId,
    PERMISSION_MODULES,
    PERMISSION_LEVELS
  } = dataModel;

  function entity(snapshot) {
    return snapshot && snapshot.exists ? { id: snapshot.id, ...snapshot.data() } : null;
  }

  function defaultServerTimestamp(clock) {
    const fieldValue = globalScope?.firebase?.firestore?.FieldValue;
    if (fieldValue && typeof fieldValue.serverTimestamp === 'function') return fieldValue.serverTimestamp();
    return clock();
  }

  class UserRepository {
    constructor(database, options = {}) {
      if (!database || typeof database.collection !== 'function') throw new Error('Firestore é obrigatório.');
      this.db = database;
      this.clock = options.clock || (() => new Date());
      this.serverTimestamp = options.serverTimestamp || (() => defaultServerTimestamp(this.clock));
    }

    users() { return this.db.collection('users'); }
    functions() { return this.db.collection('ministryFunctions'); }
    userFunctions() { return this.db.collection('userFunctions'); }
    permissions() { return this.db.collection('permissions'); }
    audits() { return this.db.collection('auditLogs'); }

    async listUsers() {
      const snapshot = await this.users().get();
      return snapshot.docs.map(entity);
    }

    async getUser(id) {
      return entity(await this.users().doc(id).get());
    }

    async findByEmail(email) {
      const normalized = normalizeEmail(email);
      const snapshot = await this.users().where('email', '==', normalized).limit(1).get();
      return snapshot.empty ? null : entity(snapshot.docs[0]);
    }

    async createUser(input) {
      const uid = String(input.uid || '').trim();
      if (!uid) throw new TypeError('uid é obrigatório.');
      const now = this.clock();
      const accessProfile = String(input.accessProfile || 'PARTICIPANT').trim().toUpperCase();
      const document = {
        uid,
        name: String(input.name || '').trim(),
        email: normalizeEmail(input.email),
        photoURL: input.photoURL || null,
        active: input.active !== false,
        role: accessProfile === 'ADMINISTRATOR' ? 'ADMIN' : 'MEMBER',
        accessProfile,
        createdAt: now,
        updatedAt: now,
        lastAccessAt: input.lastAccessAt || null
      };
      if (!document.name) throw new TypeError('name é obrigatório.');
      await this.users().doc(uid).set(document);
      return { id: uid, ...document };
    }

    async updateUser(id, patch) {
      const allowed = ['name', 'email', 'photoURL', 'active', 'accessProfile', 'role'];
      const safe = {};
      allowed.forEach(key => {
        if (Object.prototype.hasOwnProperty.call(patch, key)) safe[key] = patch[key];
      });
      if (safe.email != null) safe.email = normalizeEmail(safe.email);
      if (safe.name != null) {
        safe.name = String(safe.name).trim();
        if (!safe.name) throw new TypeError('name é obrigatório.');
      }
      if (safe.accessProfile != null) safe.accessProfile = String(safe.accessProfile).trim().toUpperCase();
      safe.updatedAt = this.clock();
      await this.users().doc(id).update(safe);
      return this.getUser(id);
    }

    async listMinistryFunctions() {
      const snapshot = await this.functions().orderBy('order', 'asc').get();
      return snapshot.docs.map(entity);
    }

    async listActiveUserFunctions() {
      const snapshot = await this.userFunctions().where('active', '==', true).get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    async listUserFunctionIds(userId) {
      const snapshot = await this.userFunctions().where('userId', '==', userId).where('active', '==', true).get();
      return snapshot.docs.map(doc => doc.data().functionId);
    }

    async replaceUserFunctions(userId, functionIds) {
      const desired = new Set(functionIds);
      const snapshot = await this.userFunctions().where('userId', '==', userId).get();
      const current = new Map(snapshot.docs.map(doc => [doc.data().functionId, { id: doc.id, ...doc.data() }]));
      const now = this.clock();
      const writes = [];

      for (const [functionId, relation] of current.entries()) {
        if (!desired.has(functionId) && relation.active !== false) {
          writes.push(this.userFunctions().doc(relation.id).set({ active: false, unassignedAt: now, updatedAt: now }, { merge: true }));
        }
      }
      for (const functionId of desired) {
        const id = userFunctionDocumentId(userId, functionId);
        writes.push(this.userFunctions().doc(id).set({
          userId,
          functionId,
          active: true,
          unassignedAt: null,
          updatedAt: now,
          createdAt: current.get(functionId)?.createdAt || now
        }, { merge: true }));
      }
      await Promise.all(writes);
      return [...desired];
    }

    normalizePermissionMap(permissionMap = {}) {
      const normalized = {};
      for (const moduleName of PERMISSION_MODULES) {
        const requested = String(permissionMap[moduleName] || 'NONE').toUpperCase();
        normalized[moduleName] = PERMISSION_LEVELS.includes(requested) ? requested : 'NONE';
      }
      return normalized;
    }

    async replaceInitialPermissions(userId, permissionMap = {}) {
      const now = this.clock();
      const normalized = this.normalizePermissionMap(permissionMap);
      const writes = [];
      for (const moduleName of PERMISSION_MODULES) {
        const level = normalized[moduleName];
        const id = permissionDocumentId(userId, moduleName);
        if (level === 'NONE') {
          writes.push(this.permissions().doc(id).delete().catch(error => {
            if (error && error.code === 'not-found') return null;
            throw error;
          }));
        } else {
          writes.push(this.permissions().doc(id).set({
            userId,
            module: moduleName,
            level,
            createdAt: now,
            updatedAt: now
          }, { merge: true }));
        }
      }
      const profilePermissions = Object.fromEntries(
        Object.entries(normalized).filter(([, level]) => level !== 'NONE')
      );
      writes.push(this.users().doc(userId).update({ permissions: profilePermissions, updatedAt: now }));
      await Promise.all(writes);
      return normalized;
    }

    async assignAccessProfile(userId, accessProfile, permissionMap = {}) {
      const profileId = String(accessProfile || '').trim().toUpperCase();
      if (!profileId) throw new TypeError('accessProfile é obrigatório.');
      const current = await this.getUser(userId);
      if (!current) throw new Error('Usuário não encontrado.');

      const normalized = this.normalizePermissionMap(permissionMap);
      const now = this.clock();
      const batch = this.db.batch();

      for (const moduleName of PERMISSION_MODULES) {
        const level = normalized[moduleName];
        const ref = this.permissions().doc(permissionDocumentId(userId, moduleName));
        if (level === 'NONE') batch.delete(ref);
        else batch.set(ref, { userId, module: moduleName, level, createdAt: now, updatedAt: now }, { merge: true });
      }

      const profilePermissions = Object.fromEntries(
        Object.entries(normalized).filter(([, level]) => level !== 'NONE')
      );
      const role = current.role === 'SUPER_ADMIN'
        ? 'SUPER_ADMIN'
        : profileId === 'ADMINISTRATOR' ? 'ADMIN' : 'MEMBER';

      batch.update(this.users().doc(userId), {
        accessProfile: profileId,
        role,
        permissions: profilePermissions,
        updatedAt: now
      });
      await batch.commit();
      return this.getUser(userId);
    }

    async addAuditLog(actorUserId, action, entityId, details = {}) {
      const createdAt = this.serverTimestamp();
      const ref = await this.audits().add({
        actorUserId,
        action,
        entityType: 'user',
        entityId,
        details,
        createdAt
      });
      return { id: ref.id, actorUserId, action, entityType: 'user', entityId, details, createdAt };
    }
  }

  return Object.freeze({ UserRepository });
});
