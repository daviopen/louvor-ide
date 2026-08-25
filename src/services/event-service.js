/**
 * Casos de uso e regras de negócio de eventos.
 * Mantém o ciclo de vida do evento consistente com escala e Setlist vinculados.
 */
(function initEventService(globalScope, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (globalScope) globalScope.MusicIdeEventService = api;
})(typeof window !== 'undefined' ? window : null, function createModule() {
  const EVENT_STATUSES = Object.freeze(['PLANNED', 'CONFIRMED', 'CANCELLED', 'COMPLETED']);
  const EVENT_STATUS_LABELS = Object.freeze({
    PLANNED: 'Planejado',
    CONFIRMED: 'Confirmado',
    CANCELLED: 'Cancelado',
    COMPLETED: 'Concluído'
  });
  const FINAL_STATUSES = Object.freeze(['CANCELLED', 'COMPLETED']);
  const ALLOWED_TRANSITIONS = Object.freeze({
    PLANNED: Object.freeze(['PLANNED', 'CONFIRMED', 'CANCELLED', 'COMPLETED']),
    CONFIRMED: Object.freeze(['PLANNED', 'CONFIRMED', 'CANCELLED', 'COMPLETED']),
    CANCELLED: Object.freeze(['CANCELLED']),
    COMPLETED: Object.freeze(['COMPLETED'])
  });

  function requiredText(value, fieldName, maxLength) {
    const text = String(value == null ? '' : value).trim();
    if (!text) throw new Error(`${fieldName} é obrigatório.`);
    if (maxLength && text.length > maxLength) throw new Error(`${fieldName} deve ter no máximo ${maxLength} caracteres.`);
    return text;
  }

  function optionalText(value, fieldName, maxLength) {
    const text = String(value == null ? '' : value).trim();
    if (!text) return null;
    if (maxLength && text.length > maxLength) throw new Error(`${fieldName} deve ter no máximo ${maxLength} caracteres.`);
    return text;
  }

  function toDate(value) {
    if (!value) return null;
    if (typeof value.toDate === 'function') return value.toDate();
    if (value instanceof Date) return new Date(value.getTime());
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split('-').map(Number);
      return new Date(year, month - 1, day, 12, 0, 0, 0);
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function normalizeDate(value) {
    const date = toDate(value);
    if (!date) throw new Error('Data é obrigatória.');
    date.setHours(12, 0, 0, 0);
    return date;
  }

  function dateKey(value) {
    const date = toDate(value);
    if (!date) return '';
    return `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function normalizeTime(value) {
    if (value == null || String(value).trim() === '') return null;
    const time = String(value).trim();
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('Horário inválido. Use o formato HH:mm.');
    return time;
  }

  function normalizeStatus(value, options = {}) {
    const status = String(value || 'PLANNED').toUpperCase();
    if (!EVENT_STATUSES.includes(status)) throw new Error('Status de evento inválido.');
    if (options.forCreate && FINAL_STATUSES.includes(status)) throw new Error('Um novo evento deve iniciar como Planejado ou Confirmado.');
    return status;
  }

  function normalizeEventInput(input, options = {}) {
    return {
      name: requiredText(input && input.name, 'Nome', 120),
      date: normalizeDate(input && input.date),
      time: normalizeTime(input && input.time),
      description: optionalText(input && input.description, 'Descrição', 1000),
      location: optionalText(input && input.location, 'Local', 160),
      theme: optionalText(input && input.theme, 'Tema', 160),
      status: normalizeStatus(input && input.status, options)
    };
  }

  function actorId(actor) {
    const id = actor && (actor.uid || actor.id);
    if (!id) throw new Error('Usuário autenticado não identificado.');
    return String(id);
  }

  function isSuperAdmin(profile) {
    return Boolean(profile && (profile.isSuperAdmin === true || String(profile.role || '').toUpperCase() === 'SUPER_ADMIN'));
  }

  function embeddedPermission(profile, moduleName) {
    const permission = profile && profile.permissions && profile.permissions[moduleName];
    const level = permission && typeof permission === 'object' ? permission.level || permission.access : permission;
    const normalized = String(level || 'NONE').toUpperCase();
    return ['READ', 'EDIT'].includes(normalized) ? normalized : 'NONE';
  }

  function strongestLevel(left, right) {
    if (left === 'EDIT' || right === 'EDIT') return 'EDIT';
    if (left === 'READ' || right === 'READ') return 'READ';
    return 'NONE';
  }

  function canReadLevel(level) { return level === 'READ' || level === 'EDIT'; }
  function isFinalStatus(status) { return FINAL_STATUSES.includes(String(status || '').toUpperCase()); }

  function assertTransition(currentStatus, nextStatus) {
    const current = normalizeStatus(currentStatus);
    const next = normalizeStatus(nextStatus);
    if (!ALLOWED_TRANSITIONS[current].includes(next)) {
      throw new Error(`Evento ${EVENT_STATUS_LABELS[current]} não pode mudar para ${EVENT_STATUS_LABELS[next]}.`);
    }
    return next;
  }

  function sortEvents(events) {
    return [...(events || [])].sort((a, b) => {
      const left = toDate(a.date)?.getTime() || 0;
      const right = toDate(b.date)?.getTime() || 0;
      if (left !== right) return left - right;
      return String(a.time || '').localeCompare(String(b.time || ''));
    });
  }

  class EventService {
    constructor(repository, options = {}) {
      if (!repository) throw new Error('EventRepository é obrigatório.');
      this.repository = repository;
      this.clock = options.clock || (() => new Date());
    }

    async resolveAccess(actor, profile) {
      const id = actorId(actor);
      if (isSuperAdmin(profile)) {
        return { events: 'EDIT', schedules: 'EDIT', setlists: 'EDIT', canRead: true, canEdit: true, canManageLinked: true };
      }
      const modules = ['events', 'schedules', 'setlists'];
      const levels = {};
      for (const moduleName of modules) {
        const embedded = embeddedPermission(profile, moduleName);
        const stored = typeof this.repository.getPermissionLevel === 'function'
          ? await this.repository.getPermissionLevel(id, moduleName)
          : 'NONE';
        levels[moduleName] = strongestLevel(embedded, String(stored || 'NONE').toUpperCase());
      }
      return {
        ...levels,
        canRead: canReadLevel(levels.events),
        canEdit: levels.events === 'EDIT',
        canManageLinked: levels.events === 'EDIT' && levels.schedules === 'EDIT' && levels.setlists === 'EDIT'
      };
    }

    async list(actor, profile, options = {}) {
      const access = options.access || await this.resolveAccess(actor, profile);
      if (!access.canRead) throw new Error('Você não possui permissão para consultar eventos.');
      return sortEvents(await this.repository.listAll());
    }

    async create(input, actor, profile, options = {}) {
      const id = actorId(actor);
      const access = options.access || await this.resolveAccess(actor, profile);
      if (!access.canEdit) throw new Error('Você não possui permissão de edição em Eventos.');
      if (!access.canManageLinked) {
        throw new Error('Criar evento exige permissão de edição em Eventos, Escalas e Setlists, pois as estruturas vinculadas são criadas automaticamente.');
      }
      const document = normalizeEventInput(input, { forCreate: true });
      const requestId = requiredText(options.requestId || input.requestId, 'Identificador da criação', 100);
      return this.repository.createEventBundle(document, id, requestId);
    }

    async update(eventId, input, actor, profile, options = {}) {
      const id = actorId(actor);
      const access = options.access || await this.resolveAccess(actor, profile);
      if (!access.canEdit) throw new Error('Você não possui permissão de edição em Eventos.');
      const current = await this.repository.getById(eventId);
      if (!current) throw new Error('Evento não encontrado.');
      if (isFinalStatus(current.status)) throw new Error('Eventos concluídos ou cancelados permanecem somente no histórico.');

      const normalized = normalizeEventInput({
        name: input.name ?? current.name,
        date: input.date ?? current.date,
        time: input.time !== undefined ? input.time : current.time,
        description: input.description !== undefined ? input.description : current.description,
        location: input.location !== undefined ? input.location : current.location,
        theme: input.theme !== undefined ? input.theme : current.theme,
        status: input.status ?? current.status
      });
      assertTransition(current.status, normalized.status);

      const linkedChange = dateKey(current.date) !== dateKey(normalized.date)
        || normalizeTime(current.time) !== normalized.time
        || String(current.status || 'PLANNED').toUpperCase() !== normalized.status
        || !current.scheduleId
        || !current.setlistId;
      if (linkedChange && !access.canManageLinked) {
        throw new Error('Alterar data, horário ou status exige permissão de edição em Eventos, Escalas e Setlists.');
      }
      return this.repository.updateEventBundle(eventId, normalized, id, { syncLinked: linkedChange });
    }

    async changeStatus(eventId, status, actor, profile, options = {}) {
      const current = await this.repository.getById(eventId);
      if (!current) throw new Error('Evento não encontrado.');
      return this.update(eventId, { ...current, status }, actor, profile, options);
    }

    async remove(eventId, actor, profile, options = {}) {
      const id = actorId(actor);
      const access = options.access || await this.resolveAccess(actor, profile);
      if (!access.canManageLinked) {
        throw new Error('Excluir evento exige permissão de edição em Eventos, Escalas e Setlists.');
      }
      const current = await this.repository.getById(eventId);
      if (!current) throw new Error('Evento não encontrado.');
      if (String(current.status).toUpperCase() !== 'PLANNED') {
        throw new Error('Somente eventos ainda planejados podem ser excluídos. Use Cancelar para preservar o histórico.');
      }
      const dependencies = await this.repository.getDependencyCounts(current);
      if ((dependencies.scheduleMembers || 0) > 0 || (dependencies.setlistSongs || 0) > 0) {
        throw new Error('O evento já possui integrantes ou músicas vinculadas. Cancele o evento para preservar o histórico.');
      }
      await this.repository.deleteEventBundle(current, id);
      return true;
    }
  }

  return Object.freeze({
    EVENT_STATUSES,
    EVENT_STATUS_LABELS,
    FINAL_STATUSES,
    EventService,
    requiredText,
    optionalText,
    toDate,
    normalizeDate,
    dateKey,
    normalizeTime,
    normalizeStatus,
    normalizeEventInput,
    assertTransition,
    sortEvents,
    isSuperAdmin,
    isFinalStatus
  });
});
