/**
 * Regras de negócio do CRUD de usuários.
 */
(function initUserService(globalScope, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (globalScope) globalScope.MusicIdeUserService = api;
})(typeof window !== 'undefined' ? window : null, function createModule() {
  const PAGE_SIZE = 10;
  const DEFAULT_ADMIN_ENDPOINT = 'https://us-central1-louvor-ide.cloudfunctions.net/adminUserManagement';

  function normalize(value) { return String(value || '').trim().toLocaleLowerCase('pt-BR'); }

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
      this.actorProvider = options.actorProvider || (() => null);
      this.adminEndpoint = options.adminEndpoint || DEFAULT_ADMIN_ENDPOINT;
      this.fetchImpl = options.fetchImpl || (typeof fetch === 'function' ? fetch.bind(globalThis) : null);
    }

    async list(filters = {}, page = 1, pageSize = PAGE_SIZE) {
      const [users, functions] = await Promise.all([this.repository.listUsers(), this.repository.listMinistryFunctions()]);
      const functionMap = new Map(functions.map(item => [item.id, item]));
      const enriched = await Promise.all(users.map(async user => {
        const functionIds = await this.repository.listUserFunctionIds(user.id);
        return { ...user, functionIds, functions: functionIds.map(id => functionMap.get(id)).filter(Boolean) };
      }));
      enriched.sort((a, b) => normalize(a.name).localeCompare(normalize(b.name), 'pt-BR'));
      return { ...paginate(filterUsers(enriched, filters), page, pageSize), functions };
    }

    async adminRequest(action, data) {
      if (!this.auth || !this.auth.currentUser || typeof this.auth.currentUser.getIdToken !== 'function') throw new Error('Firebase Auth administrativo indisponível.');
      if (!this.fetchImpl) throw new Error('Cliente HTTP indisponível.');
      const token = await this.auth.currentUser.getIdToken();
      const response = await this.fetchImpl(this.adminEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action, data })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'A operação administrativa falhou.');
      return payload.result;
    }

    async create(input) {
      const email = String(input.email || '').trim().toLowerCase();
      if (await this.repository.findByEmail(email)) throw new Error('Já existe um usuário com este e-mail.');
      return this.adminRequest('createUser', {
        name: input.name,
        email,
        password: input.password,
        photoURL: input.photoURL || null,
        functionIds: input.functionIds || [],
        permissions: input.permissions || {}
      });
    }

    async update(id, input) {
      const user = await this.repository.updateUser(id, { name: input.name, email: input.email, photoURL: input.photoURL || null });
      await this.repository.replaceUserFunctions(id, input.functionIds || []);
      await this.audit('USER_UPDATED', id, { functionIds: input.functionIds || [] });
      return user;
    }

    async setActive(id, active) {
      const user = await this.repository.updateUser(id, { active: Boolean(active) });
      await this.audit(active ? 'USER_REACTIVATED' : 'USER_DEACTIVATED', id, { active: Boolean(active) });
      return user;
    }

    async setPassword(uid, password) {
      return this.adminRequest('setPassword', { uid, password });
    }

    async audit(action, entityId, details) {
      const actor = this.actorProvider();
      const actorUserId = actor && (actor.uid || actor.id);
      if (!actorUserId) throw new Error('Ator administrativo não identificado.');
      return this.repository.addAuditLog(actorUserId, action, entityId, details);
    }
  }

  return Object.freeze({ UserService, filterUsers, paginate, canManageUsers, PAGE_SIZE, DEFAULT_ADMIN_ENDPOINT });
});
