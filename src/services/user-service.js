/**
 * Regras de negócio do CRUD de usuários.
 */
(function initUserService(globalScope, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (globalScope) globalScope.MusicIdeUserService = api;
})(typeof window !== 'undefined' ? window : null, function createModule() {
  const PAGE_SIZE = 10;

  function normalize(value) {
    return String(value || '').trim().toLocaleLowerCase('pt-BR');
  }

  function canManageUsers(profile) {
    if (!profile) return false;
    const role = String(profile.role || '').toUpperCase();
    if (role === 'SUPER_ADMIN' || role === 'ADMIN' || profile.isSuperAdmin === true) return true;
    const permission = profile.permissions && profile.permissions.users;
    const level = typeof permission === 'object' ? permission.level || permission.access : permission;
    return String(level || '').toLowerCase() === 'edit';
  }

  function filterUsers(users, filters = {}) {
    const search = normalize(filters.search);
    const status = filters.status || 'ALL';
    const functionId = filters.functionId || 'ALL';
    return users.filter(user => {
      const matchesSearch = !search || normalize(user.name).includes(search) || normalize(user.email).includes(search);
      const matchesStatus = status === 'ALL' || (status === 'ACTIVE' ? user.active !== false : user.active === false);
      const matchesFunction = functionId === 'ALL' || (Array.isArray(user.functionIds) && user.functionIds.includes(functionId));
      return matchesSearch && matchesStatus && matchesFunction;
    });
  }

  function paginate(items, page = 1, pageSize = PAGE_SIZE) {
    const safeSize = Math.max(1, Number(pageSize) || PAGE_SIZE);
    const total = items.length;
    const pages = Math.max(1, Math.ceil(total / safeSize));
    const current = Math.min(Math.max(1, Number(page) || 1), pages);
    const start = (current - 1) * safeSize;
    return { items: items.slice(start, start + safeSize), page: current, pageSize: safeSize, total, pages };
  }

  class UserService {
    constructor(repository, options = {}) {
      if (!repository) throw new Error('UserRepository é obrigatório.');
      this.repository = repository;
      this.auth = options.auth || null;
      this.firebase = options.firebase || null;
      this.actorProvider = options.actorProvider || (() => null);
    }

    async list(filters = {}, page = 1, pageSize = PAGE_SIZE) {
      const [users, functions] = await Promise.all([
        this.repository.listUsers(),
        this.repository.listMinistryFunctions()
      ]);
      const functionMap = new Map(functions.map(item => [item.id, item]));
      const enriched = await Promise.all(users.map(async user => {
        const functionIds = await this.repository.listUserFunctionIds(user.id);
        return {
          ...user,
          functionIds,
          functions: functionIds.map(id => functionMap.get(id)).filter(Boolean)
        };
      }));
      enriched.sort((a, b) => normalize(a.name).localeCompare(normalize(b.name), 'pt-BR'));
      return { ...paginate(filterUsers(enriched, filters), page, pageSize), functions };
    }

    async create(input) {
      const email = String(input.email || '').trim().toLowerCase();
      if (await this.repository.findByEmail(email)) throw new Error('Já existe um usuário com este e-mail.');
      let uid = String(input.uid || '').trim();
      let provisionedAuth = false;

      if (!uid) {
        if (!this.firebase || !this.firebase.apps || !this.firebase.app) {
          throw new Error('Informe o UID do Firebase para criar o perfil.');
        }
        const appName = `ide-user-provision-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const secondaryApp = this.firebase.initializeApp(this.firebase.app().options, appName);
        try {
          const randomPassword = `${cryptoRandom()}aA1!`;
          const credential = await secondaryApp.auth().createUserWithEmailAndPassword(email, randomPassword);
          uid = credential.user.uid;
          provisionedAuth = true;
          await secondaryApp.auth().signOut();
        } finally {
          await secondaryApp.delete();
        }
      }

      const user = await this.repository.createUser({ ...input, uid, email });
      const functionIds = input.functionIds || [];
      const permissions = input.permissions || {};
      await this.repository.replaceUserFunctions(user.id, functionIds);
      if (typeof this.repository.replaceInitialPermissions === 'function') {
        await this.repository.replaceInitialPermissions(user.id, permissions);
      }
      await this.audit('USER_CREATED', user.id, { functionIds, permissions, provisionedAuth });
      if (provisionedAuth && this.auth && typeof this.auth.sendPasswordResetEmail === 'function') {
        await this.auth.sendPasswordResetEmail(email);
      }
      return user;
    }

    async update(id, input) {
      const user = await this.repository.updateUser(id, {
        name: input.name,
        email: input.email,
        photoURL: input.photoURL || null
      });
      await this.repository.replaceUserFunctions(id, input.functionIds || []);
      await this.audit('USER_UPDATED', id, { functionIds: input.functionIds || [] });
      return user;
    }

    async setActive(id, active) {
      const user = await this.repository.updateUser(id, { active: Boolean(active) });
      await this.audit(active ? 'USER_REACTIVATED' : 'USER_DEACTIVATED', id, { active: Boolean(active) });
      return user;
    }

    async sendPasswordReset(email) {
      if (!this.auth || typeof this.auth.sendPasswordResetEmail !== 'function') throw new Error('Firebase Auth indisponível.');
      await this.auth.sendPasswordResetEmail(String(email || '').trim().toLowerCase());
      return true;
    }

    async audit(action, entityId, details) {
      const actor = this.actorProvider();
      const actorUserId = actor && (actor.uid || actor.id);
      if (!actorUserId) throw new Error('Ator administrativo não identificado.');
      return this.repository.addAuditLog(actorUserId, action, entityId, details);
    }
  }

  function cryptoRandom() {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const bytes = new Uint32Array(4);
      crypto.getRandomValues(bytes);
      return Array.from(bytes, value => value.toString(36)).join('');
    }
    return `${Date.now()}${Math.random().toString(36).slice(2)}`;
  }

  return Object.freeze({ UserService, filterUsers, paginate, canManageUsers, PAGE_SIZE });
});
