/**
 * Casos de uso e regras de negócio de indisponibilidades.
 */
(function initUnavailabilityService(globalScope, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (globalScope) globalScope.MusicIdeUnavailabilityService = api;
})(typeof window !== 'undefined' ? window : null, function createModule() {
  const PERIODS = Object.freeze(['MORNING', 'AFTERNOON', 'EVENING']);
  const PERIOD_LABELS = Object.freeze({ MORNING: 'Manhã', AFTERNOON: 'Tarde', EVENING: 'Noite' });

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

  function startOfDay(value) {
    const date = toDate(value);
    if (!date) return null;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  }

  function endOfDay(value) {
    const date = toDate(value);
    if (!date) return null;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
  }

  function dateKey(value) {
    const date = toDate(value);
    if (!date) return '';
    const year = String(date.getFullYear()).padStart(4, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function normalizePeriod(value) {
    if (value == null || value === '' || value === 'ALL_DAY') return null;
    const normalized = String(value).toUpperCase();
    if (!PERIODS.includes(normalized)) throw new Error('Período inválido.');
    return normalized;
  }

  function periodFromTime(value) {
    if (!value) return null;
    if (/^\d{2}:\d{2}$/.test(String(value))) {
      const hour = Number(String(value).slice(0, 2));
      if (hour < 12) return 'MORNING';
      if (hour < 18) return 'AFTERNOON';
      return 'EVENING';
    }
    return normalizePeriod(value);
  }

  function validateDate(value, now = new Date()) {
    const date = startOfDay(value);
    if (!date) throw new Error('Data de início é obrigatória.');
    const today = startOfDay(now);
    if (date < today) throw new Error('A indisponibilidade deve começar hoje ou em uma data futura.');
    return date;
  }

  function validateDateRange(startValue, endValue, now = new Date()) {
    const start = validateDate(startValue, now);
    const end = endValue ? endOfDay(endValue) : endOfDay(start);
    if (!end) throw new Error('Data de fim inválida.');
    if (end < start) throw new Error('A data de fim não pode ser anterior à data de início.');
    return { start, end };
  }

  function isFutureRecord(record, now = new Date()) {
    const end = toDate(record && record.endAt) || endOfDay(record && record.date);
    return Boolean(end && end.getTime() >= now.getTime());
  }

  function sameDate(left, right) {
    return dateKey(left) !== '' && dateKey(left) === dateKey(right);
  }

  function dateInRange(record, value) {
    const start = startOfDay(record && record.date);
    const end = endOfDay((record && record.endAt) || (record && record.date));
    const target = startOfDay(value);
    return Boolean(start && end && target && target >= start && target <= end);
  }

  function periodConflicts(recordPeriod, contextPeriodOrTime) {
    const left = normalizePeriod(recordPeriod);
    const right = periodFromTime(contextPeriodOrTime);
    return !left || !right || left === right;
  }

  function eventConflicts(recordEventId, contextEventId) {
    if (!recordEventId || !contextEventId) return true;
    return String(recordEventId) === String(contextEventId);
  }

  function recordConflicts(record, context = {}) {
    return Boolean(record && dateInRange(record, context.date)
      && periodConflicts(record.period, context.period || context.time)
      && eventConflicts(record.eventId, context.eventId));
  }

  function conflictingRecords(records, context) {
    return (records || []).filter(record => recordConflicts(record, context));
  }

  function filterAvailableUsers(users, records, context) {
    const blocked = new Set(conflictingRecords(records, context).map(record => record.userId));
    return (users || []).filter(user => !blocked.has(user.id || user.uid));
  }

  function embeddedPermission(profile) {
    const permission = profile && profile.permissions && profile.permissions.unavailability;
    const level = permission && typeof permission === 'object' ? permission.level || permission.access : permission;
    return String(level || 'NONE').toUpperCase();
  }

  function roleOf(profile) {
    return String(profile && profile.role || 'MEMBER').toUpperCase();
  }

  function isSuperAdmin(profile) {
    return Boolean(profile && (profile.isSuperAdmin === true || roleOf(profile) === 'SUPER_ADMIN'));
  }

  function isAdmin(profile) {
    return isSuperAdmin(profile) || roleOf(profile) === 'ADMIN';
  }

  function canManageOthers(profile, accessLevel) {
    return isAdmin(profile) && String(accessLevel || '').toUpperCase() === 'EDIT';
  }

  function actorId(actor) {
    const id = actor && (actor.uid || actor.id);
    if (!id) throw new Error('Usuário autenticado não identificado.');
    return id;
  }

  function sanitizeNote(value) {
    const note = String(value || '').trim();
    if (note.length > 240) throw new Error('A observação deve ter no máximo 240 caracteres.');
    return note || null;
  }

  class UnavailabilityService {
    constructor(repository, options = {}) {
      if (!repository) throw new Error('UnavailabilityRepository é obrigatório.');
      this.repository = repository;
      this.clock = options.clock || (() => new Date());
    }

    async resolveAccess(actor, profile) {
      const id = actorId(actor);
      if (isSuperAdmin(profile)) return { level: 'EDIT', canManageOthers: true };
      const profileLevel = embeddedPermission(profile);
      const storedLevel = typeof this.repository.getPermissionLevel === 'function'
        ? await this.repository.getPermissionLevel(id, 'unavailability')
        : 'NONE';
      const level = storedLevel === 'EDIT' || profileLevel === 'EDIT'
        ? 'EDIT'
        : (storedLevel === 'READ' || profileLevel === 'READ' ? 'READ' : 'NONE');
      return { level, canManageOthers: canManageOthers(profile, level) };
    }

    async list(actor, profile, options = {}) {
      const id = actorId(actor);
      const access = options.access || await this.resolveAccess(actor, profile);
      const targetUserId = options.userId || id;
      if (targetUserId !== id && !access.canManageOthers) throw new Error('Você não pode consultar indisponibilidades de outra pessoa.');
      const records = access.canManageOthers && options.all === true
        ? await this.repository.listAll()
        : await this.repository.listByUser(targetUserId);
      return records.sort((a, b) => (toDate(a.date) || 0) - (toDate(b.date) || 0));
    }

    async create(input, actor, profile, options = {}) {
      const id = actorId(actor);
      const access = options.access || await this.resolveAccess(actor, profile);
      const userId = String(input.userId || id);
      if (userId !== id && !access.canManageOthers) throw new Error('Somente um administrador autorizado pode registrar indisponibilidade para outra pessoa.');
      const range = validateDateRange(input.date, input.endDate, this.clock());
      const document = {
        userId,
        date: range.start,
        endAt: range.end,
        period: normalizePeriod(input.period),
        eventId: input.eventId ? String(input.eventId) : null,
        note: sanitizeNote(input.note),
        createdBy: id,
        updatedBy: id
      };
      const created = await this.repository.create(document);
      await this.audit(id, 'UNAVAILABILITY_CREATED', created.id, created, userId !== id);
      return created;
    }

    async update(recordId, input, actor, profile, options = {}) {
      const id = actorId(actor);
      const access = options.access || await this.resolveAccess(actor, profile);
      const current = await this.repository.getById(recordId);
      if (!current) throw new Error('Indisponibilidade não encontrada.');
      if (!isFutureRecord(current, this.clock())) throw new Error('Somente indisponibilidades futuras podem ser editadas.');
      if (current.userId !== id && !access.canManageOthers) throw new Error('Você não pode editar a indisponibilidade de outra pessoa.');
      const startInput = input.date || current.date;
      const endInput = Object.prototype.hasOwnProperty.call(input, 'endDate')
        ? input.endDate
        : (input.date ? null : current.endAt);
      const range = validateDateRange(startInput, endInput, this.clock());
      const patch = {
        date: range.start,
        endAt: range.end,
        period: normalizePeriod(input.period),
        eventId: input.eventId ? String(input.eventId) : null,
        note: sanitizeNote(input.note),
        updatedBy: id
      };
      const updated = await this.repository.update(recordId, patch);
      await this.audit(id, 'UNAVAILABILITY_UPDATED', recordId, updated, current.userId !== id);
      return updated;
    }

    async remove(recordId, actor, profile, options = {}) {
      const id = actorId(actor);
      const access = options.access || await this.resolveAccess(actor, profile);
      const current = await this.repository.getById(recordId);
      if (!current) throw new Error('Indisponibilidade não encontrada.');
      if (!isFutureRecord(current, this.clock())) throw new Error('Somente indisponibilidades futuras podem ser excluídas.');
      if (current.userId !== id && !access.canManageOthers) throw new Error('Você não pode excluir a indisponibilidade de outra pessoa.');
      await this.repository.delete(recordId);
      await this.audit(id, 'UNAVAILABILITY_DELETED', recordId, current, current.userId !== id);
      return true;
    }

    async checkAvailability(userId, context) {
      return conflictingRecords(await this.repository.listByUser(userId), context);
    }

    async validateScheduleSelection(userId, context, actor, profile, options = {}) {
      const conflicts = await this.checkAvailability(userId, context);
      if (!conflicts.length) return { available: true, conflicts: [] };
      if (!options.overrideConfirmed) {
        const error = new Error('A pessoa está indisponível para esta data, período ou evento.');
        error.code = 'UNAVAILABILITY_CONFLICT';
        error.conflicts = conflicts;
        throw error;
      }
      const access = options.access || await this.resolveAccess(actor, profile);
      const scheduleLevel = String(options.scheduleAccessLevel || '').toUpperCase();
      if (!access.canManageOthers || (!isSuperAdmin(profile) && scheduleLevel !== 'EDIT')) {
        throw new Error('Somente um administrador com permissão de edição de escalas pode confirmar esta exceção.');
      }
      const id = actorId(actor);
      await this.repository.addAuditLog(id, 'UNAVAILABILITY_OVERRIDE_CONFIRMED', userId, {
        targetUserId: userId,
        eventId: context.eventId || null,
        date: dateKey(context.date),
        period: periodFromTime(context.period || context.time),
        conflictIds: conflicts.map(item => item.id)
      });
      return { available: true, overridden: true, conflicts };
    }

    async audit(id, action, entityId, record, administrative) {
      if (typeof this.repository.addAuditLog !== 'function') return null;
      return this.repository.addAuditLog(id, action, entityId, {
        targetUserId: record.userId,
        date: dateKey(record.date),
        startDate: dateKey(record.date),
        endDate: dateKey(record.endAt || record.date),
        period: record.period || null,
        eventId: record.eventId || null,
        administrative: Boolean(administrative)
      });
    }
  }

  return Object.freeze({
    PERIODS,
    PERIOD_LABELS,
    UnavailabilityService,
    toDate,
    startOfDay,
    endOfDay,
    dateKey,
    normalizePeriod,
    periodFromTime,
    validateDate,
    validateDateRange,
    isFutureRecord,
    sameDate,
    dateInRange,
    periodConflicts,
    eventConflicts,
    recordConflicts,
    conflictingRecords,
    filterAvailableUsers,
    canManageOthers,
    isAdmin,
    isSuperAdmin
  });
});