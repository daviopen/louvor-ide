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

  class MinistryFunctionsService {
    constructor({ ministryFunctionsRepository, userFunctionsRepository }) {
      if (!ministryFunctionsRepository || !userFunctionsRepository) {
        throw new Error('Repositories de funções e vínculos são obrigatórios.');
      }
      this.functions = ministryFunctionsRepository;
      this.userFunctions = userFunctionsRepository;
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

    async listActiveFunctions() {
      return this.functions.listOrdered({ activeOnly: true });
    }

    async createFunction(input) {
      const candidate = createMinistryFunctionDocument(input);
      const existing = await this.functions.findBySlug(candidate.slug);
      if (existing) throw new Error(`Já existe uma função com o slug ${candidate.slug}.`);
      return this.functions.create(candidate);
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

      return this.functions.update(functionId, next);
    }

    async setFunctionActive(functionId, active) {
      if (typeof active !== 'boolean') throw new TypeError('active deve ser booleano.');
      return this.updateFunction(functionId, { active });
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

      return Promise.all(normalized.map(item => this.functions.update(item.functionId, { order: item.order })));
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
      const uniqueIds = [...new Set(functionIds.filter(Boolean))];
      if (uniqueIds.length !== functionIds.filter(Boolean).length) {
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
  }

  return Object.freeze({ MinistryFunctionsService });
});
