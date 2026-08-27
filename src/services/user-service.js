/**
 * Regras de negócio do CRUD de usuários.
 */
(function initUserService(globalScope, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (globalScope) globalScope.MusicIdeUserService = api;
})(typeof window !== 'undefined' ? window : null, function createModule() {
  const PAGE_SIZE = 10;
  const DEFAULT_PASSWORD_RESET_URL = 'https://louvor-ide.web.app/login.html';
  const DEFAULT_MEMBER_PERMISSIONS = Object.freeze({
    dashboard: 'READ',
    users: 'NONE',
    permissions: 'NONE',
    unavailability: 'EDIT',
    events: 'NONE',
    schedules: 'READ',
    setlists: 'EDIT',
    songs: 'EDIT',
    audit: 'NONE'
  });

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
      this.firebase = options.firebase || null;
      this.actorProvider = options.actorProvider || (() => null);
      this.passwordResetUrl = options.passwordResetUrl || DEFAULT_PASSWORD_RESET_URL;
      this.directoryCacheTtlMs = Math.max(0, Number(options.directoryCacheTtlMs ?? 30000));
      this.directoryCache = null;
      this.directoryCacheAt = 0;
      this.directoryLoadPromise = null;
    }

    invalidateDirectoryCache() {
      this.directoryCache = null;
      this.directoryCacheAt = 0;
      this.directoryLoadPromise = null;
    }

    async loadDirectory(force = false) {
      const now = Date.now();
      if (!force && this.directoryCache && (now - this.directoryCacheAt) < this.directoryCacheTtlMs) return this.directoryCache;
      if (!force && this.directoryLoadPromise) return this.directoryLoadPromise;

      this.directoryLoadPromise = (async () => {
        const supportsBulkRelations = typeof this.repository.listActiveUserFunctions === 'function';
        const requests = [this.repository.listUsers(), this.repository.listMinistryFunctions()];
        if (supportsBulkRelations) requests.push(this.repository.listActiveUserFunctions());
        const [users, functions, relations = []] = await Promise.all(requests);
        const functionMap = new Map(functions.map(item => [item.id, item]));
        const relationsByUser = new Map();

        if (supportsBulkRelations) {
          for (const relation of relations) {
            if (!relation || !relation.userId || !relation.functionId || relation.active === false) continue;
            if (!relationsByUser.has(relation.userId)) relationsByUser.set(relation.userId, []);
            relationsByUser.get(relation.userId).push(relation.functionId);
          }
        }

        const enriched = supportsBulkRelations
          ? users.map(user => {
              const functionIds = relationsByUser.get(user.id) || [];
              return { ...user, functionIds, functions: functionIds.map(id => functionMap.get(id)).filter(Boolean) };
            })
          : await Promise.all(users.map(async user => {
              const functionIds = await this.repository.listUserFunctionIds(user.id);
              return { ...user, functionIds, functions: functionIds.map(id => functionMap.get(id)).filter(Boolean) };
            }));

        enriched.sort((a, b) => normalize(a.name).localeCompare(normalize(b.name), 'pt-BR'));
        this.directoryCache = { users: enriched, functions };
        this.directoryCacheAt = Date.now();
        return this.directoryCache;
      })();

      try {
        return await this.directoryLoadPromise;
      } finally {
        this.directoryLoadPromise = null;
      }
    }

    async list(filters = {}, page = 1, pageSize = PAGE_SIZE, options = {}) {
      const directory = await this.loadDirectory(options.force === true);
      return { ...paginate(filterUsers(directory.users, filters), page, pageSize), functions: directory.functions };
    }

    async create(input) {
      const email = String(input.email || '').trim().toLowerCase();
      if (!email) throw new Error('E-mail é obrigatório.');
      if (await this.repository.findByEmail(email)) throw new Error('Já existe um usuário com este e-mail.');
      if (!this.firebase || typeof this.firebase.initializeApp !== 'function' || typeof this.firebase.app !== 'function') {
        throw new Error('Firebase Authentication indisponível para provisionar a conta.');
      }

      const appName = `ide-user-provision-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const secondaryApp = this.firebase.initializeApp(this.firebase.app().options, appName);
      let credential = null;
      let profileCreated = false;

      try {
        const temporaryPassword = `${cryptoRandom()}aA1!`;
        credential = await secondaryApp.auth().createUserWithEmailAndPassword(email, temporaryPassword);
        const uid = credential.user.uid;
        const user = await this.repository.createUser({ ...input, uid, email });
        profileCreated = true;
        const functionIds = input.functionIds || [];
        const permissions = input.permissions && typeof input.permissions === 'object'
          ? input.permissions
          : { ...DEFAULT_MEMBER_PERMISSIONS };
        await this.repository.replaceUserFunctions(user.id, functionIds);
        if (typeof this.repository.replaceInitialPermissions === 'function') {
          await this.repository.replaceInitialPermissions(user.id, permissions);
        }
        await this.audit('USER_CREATED', user.id, { functionIds, permissions, provisionedAuth: true });
        this.invalidateDirectoryCache();

        let passwordEmailSent = false;
        let passwordEmailError = null;
        try {
          await this.sendPasswordReset(email, user.id, { audit: false });
          passwordEmailSent = true;
        } catch (emailError) {
          passwordEmailError = emailError && emailError.message ? emailError.message : 'Falha ao solicitar o e-mail de definição de senha.';
          console.error('Conta criada, mas o Firebase não confirmou o envio do e-mail de senha:', emailError);
        }
        return { ...user, passwordEmailSent, passwordEmailError };
      } catch (error) {
        if (!profileCreated && credential && credential.user && typeof credential.user.delete === 'function') {
          try { await credential.user.delete(); } catch (rollbackError) { console.error('Falha ao reverter conta Firebase:', rollbackError); }
        }
        throw error;
      } finally {
        try { await secondaryApp.auth().signOut(); } catch (_) { /* noop */ }
        await secondaryApp.delete();
      }
    }

    async update(id, input) {
      const current = await this.repository.getUser(id);
      if (!current) throw new Error('Usuário não encontrado.');
      const currentEmail = String(current.email || '').trim().toLowerCase();
      const requestedEmail = String(input.email || '').trim().toLowerCase();
      if (!currentEmail) throw new Error('O usuário não possui um e-mail de login válido.');
      if (requestedEmail && normalize(requestedEmail) !== normalize(currentEmail)) {
        throw new Error('O e-mail de login não pode ser alterado após a criação do usuário.');
      }

      const user = await this.repository.updateUser(id, {
        name: input.name,
        email: currentEmail,
        photoURL: input.photoURL || null
      });
      await this.repository.replaceUserFunctions(id, input.functionIds || []);
      await this.audit('USER_UPDATED', id, { functionIds: input.functionIds || [], emailChanged: false });
      this.invalidateDirectoryCache();
      return { ...user, emailChanged: false };
    }

    async setActive(id, active) {
      const user = await this.repository.updateUser(id, { active: Boolean(active) });
      await this.audit(active ? 'USER_REACTIVATED' : 'USER_DEACTIVATED', id, { active: Boolean(active) });
      this.invalidateDirectoryCache();
      return user;
    }

    async sendPasswordReset(email, userId = null, options = {}) {
      if (!this.auth || typeof this.auth.sendPasswordResetEmail !== 'function') throw new Error('Firebase Auth indisponível.');
      const normalizedEmail = String(email || '').trim().toLowerCase();
      if (!normalizedEmail) throw new Error('E-mail é obrigatório.');

      this.auth.languageCode = 'pt-BR';
      const actionCodeSettings = {
        url: this.passwordResetUrl,
        handleCodeInApp: false
      };
      await this.auth.sendPasswordResetEmail(normalizedEmail, actionCodeSettings);
      if (userId && options.audit !== false) {
        await this.audit('USER_PASSWORD_RESET_REQUESTED', userId, {
          email: normalizedEmail,
          continueUrl: this.passwordResetUrl
        });
      }
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

  return Object.freeze({ UserService, filterUsers, paginate, canManageUsers, PAGE_SIZE, DEFAULT_PASSWORD_RESET_URL, DEFAULT_MEMBER_PERMISSIONS });
});
