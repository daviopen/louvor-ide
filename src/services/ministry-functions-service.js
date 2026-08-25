/**
 * Regras de domínio para funções ministeriais e vínculo Pessoa ↔ Função.
 * Mantém função ministerial completamente separada de permissões do sistema.
 */
(function initMinistryFunctionsService(globalScope, factory) {
  const dataModel = globalScope && globalScope.MusicIdeDataModel
    ? globalScope.MusicIdeDataModel
    : (typeof module !== 'undefined' && module.exports ? require('../models/data-model.js') : null);
  const api = factory(dataModel);

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (globalScope) globalScope.MusicIdeMinistryFunctions = api;
})(typeof window !== 'undefined' ? window : null, function createMinistryFunctionsService(dataModel) {
  if (!dataModel) throw new Error('MusicIdeDataModel é obrigatório.');

  const {
    DEFAULT_MINISTRY_FUNCTIONS,
    createMinistryFunctionDocument,
    normalizeSlug
  } = dataModel;

  const LEGACY_FUNCTION_ALIASES = Object.freeze({
    ministro: 'ministro',
    ministra: 'ministro',
    vocal: 'ministro',
    'back-vocal': 'back-vocal',
    back: 'back-vocal',
    backing: 'back-vocal',
    bateria: 'bateria',
    baterista: 'bateria',
    baixo: 'baixo',
    baixista: 'baixo',
    guitarra: 'guitarra',
    guitarrista: 'guitarra',
    violao: 'violao',
    violonista: 'violao',
    teclado: 'teclado',
    tecladista: 'teclado',
    sax: 'sax',
    saxofone: 'sax',
    saxofonista: 'sax',
    dm: 'dm',
    'diretor-musical': 'dm',
    'direcao-musical': 'dm'
  });

  function canManageMinistryFunctions(profile) {
    if (!profile) return false;
    const role = String(profile.role || '').toUpperCase();
    if (role === 'SUPER_ADMIN' || profile.isSuperAdmin === true) return true;
    const permission = profile.permissions && profile.permissions.users;
    const level = typeof permission === 'object' ? permission.level || permission.access : permission;
    return String(level || '').toLowerCase() === 'edit';
  }

  function normalizeLegacyFunctionLabel(label) {
    const slug = normalizeSlug(label);
    return LEGACY_FUNCTION_ALIASES[slug] || slug;
  }

  class MinistryFunctionsService {
    constructor({ ministryFunctionsRepository, userFunctionsRepository, auditRepository = null, actorProvider = () => null }) {
      if (!ministryFunctionsRepository || !userFunctionsRepository) {
        throw new Error('Repositories de funções e vínculos são obrigatórios.');
      }
      this.functions = ministryFunctionsRepository;
      this.userFunctions = userFunctionsRepository;
      this.auditRepository = auditRepository;
      this.actorProvider = actorProvider;
    }

    async audit(action, entityId, details = {}) {
      if (!this.auditRepository || typeof this.auditRepository.create !== 'function') return null;
      const actor = this.actorProvider();
      const actorUserId = actor && (actor.uid || actor.id);
      if (!actorUserId) throw new Error('Ator administrativo não identificado.');
      return this.auditRepository.create({
        actorUserId,
        action,
        entityType: 'ministryFunction',
        entityId,
        details,
        createdAt: new Date()
      });
    }

    async ensureDefaultFunctions() {
      const created = [];
      for (const seed of DEFAULT_MINISTRY_FUNCTIONS) {
        const existing = await this.functions.findBySlug(seed.slug);
        if (existing) continue;
        created.push(await this.functions.create(createMinistryFunctionDocument(seed)));
      }
      return created;
    }

    async listFunctions() {
      return this.functions.listOrdered({ activeOnly: false });
    }

    async listActiveFunctions() {
      return this.functions.listOrdered({ activeOnly: true });
    }

    async createFunction(input) {
      const candidate = createMinistryFunctionDocument(input);
      const existing = await this.functions.findBySlug(candidate.slug);
      if (existing) throw new Error(`Já existe uma função com o slug ${candidate.slug}.`);
      const created = await this.functions.create(candidate);
      await this.audit('MINISTRY_FUNCTION_CREATED', created.id, {
        name: created.name,
        slug: created.slug,
        order: created.order,
        active: created.active
      });
      return created;
    }

    async updateFunction(functionId, patch) {
      const current = await this.functions.getById(functionId);
      if (!current) throw new Error(`Função não encontrada: ${functionId}.`);

      const next = createMinistryFunctionDocument({
        ...current,
        ...patch,
        slug: patch.slug ? normalizeSlug(patch.slug) : current.slug
      });

      if (next.slug !== current.slug) {
        const duplicate = await this.functions.findBySlug(next.slug);
        if (duplicate && duplicate.id !== functionId) {
          throw new Error(`Já existe uma função com o slug ${next.slug}.`);
        }
      }

      const updated = await this.functions.update(functionId, next);
      await this.audit('MINISTRY_FUNCTION_UPDATED', functionId, {
        before: { name: current.name, slug: current.slug, order: current.order, active: current.active },
        after: { name: updated.name, slug: updated.slug, order: updated.order, active: updated.active }
      });
      return updated;
    }

    async setFunctionActive(functionId, active) {
      if (typeof active !== 'boolean') throw new TypeError('active deve ser booleano.');
      const current = await this.functions.getById(functionId);
      if (!current) throw new Error(`Função não encontrada: ${functionId}.`);
      if (current.active === active) return current;
      const updated = await this.functions.update(functionId, createMinistryFunctionDocument({ ...current, active }));
      await this.audit(active ? 'MINISTRY_FUNCTION_REACTIVATED' : 'MINISTRY_FUNCTION_DEACTIVATED', functionId, {
        name: current.name,
        active
      });
      return updated;
    }

    async reorder(functionOrders) {
      if (!Array.isArray(functionOrders) || functionOrders.length === 0) {
        throw new TypeError('Informe ao menos uma função para reordenar.');
      }

      const seen = new Set();
      const normalized = functionOrders.map((item, index) => {
        if (!item || typeof item.functionId !== 'string' || !item.functionId.trim()) {
          throw new TypeError(`functionId inválido na posição ${index}.`);
        }
        if (seen.has(item.functionId)) throw new Error(`Função duplicada: ${item.functionId}.`);
        seen.add(item.functionId);
        return { functionId: item.functionId, order: index * 10 + 10 };
      });

      if (typeof this.functions.reorder !== 'function') {
        throw new Error('Repository de funções não oferece reordenação atômica.');
      }
      const result = await this.functions.reorder(normalized);
      await this.audit('MINISTRY_FUNCTIONS_REORDERED', 'catalog', {
        order: normalized.map(item => item.functionId)
      });
      return result;
    }

    async assignFunction(userId, functionId) {
      const functionEntity = await this.functions.getById(functionId);
      if (!functionEntity) throw new Error(`Função não encontrada: ${functionId}.`);
      if (!functionEntity.active) throw new Error('Não é possível atribuir uma função inativa.');
      return this.userFunctions.assign(userId, functionId);
    }

    async unassignFunction(userId, functionId) {
      return this.userFunctions.unassign(userId, functionId);
    }

    async listUserFunctions(userId) {
      return this.userFunctions.listByUser(userId, { activeOnly: true });
    }

    async replaceUserFunctions(userId, functionIds) {
      if (!Array.isArray(functionIds)) throw new TypeError('functionIds deve ser um array.');
      const filtered = functionIds.filter(Boolean);
      const uniqueIds = [...new Set(filtered)];
      if (uniqueIds.length !== filtered.length) {
        throw new Error('A mesma função não pode ser atribuída duas vezes ao usuário.');
      }

      const current = await this.userFunctions.listByUser(userId, { activeOnly: false });
      const currentActive = new Set(current.filter(item => item.active).map(item => item.functionId));
      const desired = new Set(uniqueIds);

      for (const functionId of desired) {
        if (!currentActive.has(functionId)) await this.assignFunction(userId, functionId);
      }
      for (const functionId of currentActive) {
        if (!desired.has(functionId)) await this.unassignFunction(userId, functionId);
      }

      return this.listUserFunctions(userId);
    }

    async resolveLegacyFunctionIds(labels) {
      if (!Array.isArray(labels)) throw new TypeError('labels deve ser um array.');
      const functions = await this.listFunctions();
      const bySlug = new Map(functions.map(item => [item.slug, item]));
      return [...new Set(labels.filter(Boolean).map(normalizeLegacyFunctionLabel))]
        .map(slug => bySlug.get(slug))
        .filter(Boolean)
        .map(item => item.id);
    }
  }

  return Object.freeze({
    MinistryFunctionsService,
    LEGACY_FUNCTION_ALIASES,
    normalizeLegacyFunctionLabel,
    canManageMinistryFunctions
  });
});
