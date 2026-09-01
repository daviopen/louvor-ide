/**
 * Regras de negócio de Escalas.
 */
(function initScheduleService(globalScope, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (globalScope) globalScope.MusicIdeScheduleService = api;
})(typeof window !== 'undefined' ? window : null, function createModule() {
  function toDate(value) {
    if (!value) return null;
    if (value && typeof value.toDate === 'function') return toDate(value.toDate());
    if (value instanceof Date) return new Date(value.getTime());
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split('-').map(Number);
      return new Date(year, month - 1, day, 12, 0, 0, 0);
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function dateKey(value) {
    const date = toDate(value);
    if (!date) return '';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function periodForTime(time) {
    if (!time) return null;
    const hour = Number(String(time).split(':')[0]);
    if (!Number.isFinite(hour)) return null;
    if (hour < 12) return 'MORNING';
    if (hour < 18) return 'AFTERNOON';
    return 'EVENING';
  }

  function dateMatchesUnavailability(record, eventDate) {
    const target = toDate(eventDate);
    const start = toDate(record?.date);
    const end = toDate(record?.endAt || record?.date);
    if (!(target && start && end)) return false;

    const targetKey = dateKey(target);
    const startKey = dateKey(start);
    const endKey = dateKey(end);
    if (targetKey < startKey || targetKey > endKey) return false;

    const recurrence = record?.recurrence;
    if (!recurrence || String(recurrence.frequency || '').toUpperCase() !== 'WEEKLY') return true;
    const weekdays = Array.isArray(recurrence.weekdays) ? recurrence.weekdays.map(Number) : [];
    return weekdays.includes(target.getDay());
  }

  function unavailabilityMatches(record, event) {
    if (!record || !event || !dateMatchesUnavailability(record, event.date)) return false;
    if (record.eventId && String(record.eventId) !== String(event.id)) return false;
    if (!record.period) return true;
    const eventPeriod = periodForTime(event.time);
    return !eventPeriod || String(record.period).toUpperCase() === eventPeriod;
  }

  function normalizeLevel(value) {
    const level = String(value || 'NONE').toUpperCase();
    return ['NONE', 'READ', 'EDIT'].includes(level) ? level : 'NONE';
  }

  function scheduleCompleteness(schedule, members) {
    const slots = Array.isArray(schedule?.slots) ? schedule.slots : [];
    const active = (members || []).filter(item => item.active !== false);
    if (!slots.length) return { complete: false, filled: 0, total: 0, missingSlotIds: [] };
    const occupied = new Set(active.map(item => item.slotId).filter(Boolean));
    const missingSlotIds = slots.map(item => item.id).filter(id => !occupied.has(id));
    return { complete: missingSlotIds.length === 0, filled: slots.length - missingSlotIds.length, total: slots.length, missingSlotIds };
  }

  function sortSlotsByFunction(slots, functions) {
    const order = new Map((functions || []).map((item, index) => [String(item.id), index]));
    return [...(Array.isArray(slots) ? slots : [])]
      .map((slot, index) => ({ slot, index }))
      .sort((left, right) => {
        const leftOrder = order.has(String(left.slot.functionId)) ? order.get(String(left.slot.functionId)) : Number.MAX_SAFE_INTEGER;
        const rightOrder = order.has(String(right.slot.functionId)) ? order.get(String(right.slot.functionId)) : Number.MAX_SAFE_INTEGER;
        if (leftOrder !== rightOrder) return leftOrder - rightOrder;
        const byFunction = String(left.slot.functionId || '').localeCompare(String(right.slot.functionId || ''), 'pt-BR');
        return byFunction || left.index - right.index;
      })
      .map(item => item.slot);
  }

  class ScheduleService {
    constructor(repository) {
      if (!repository) throw new Error('ScheduleRepository é obrigatório.');
      this.repository = repository;
    }

    actorId(user) {
      const id = user && (user.uid || user.id);
      if (!id) throw new Error('Usuário autenticado não identificado.');
      return id;
    }

    async resolveAccess(user, profile = null) {
      const userId = this.actorId(user);
      const role = String(profile?.role || '').toUpperCase();
      if (role === 'SUPER_ADMIN' || profile?.isSuperAdmin === true) return { level: 'EDIT', canRead: true, canEdit: true };
      const level = normalizeLevel(await this.repository.getPermissionLevel(userId, 'schedules'));
      return { level, canRead: level === 'READ' || level === 'EDIT', canEdit: level === 'EDIT' };
    }

    async load(user, profile = null) {
      const access = await this.resolveAccess(user, profile);
      if (!access.canRead) throw new Error('Você não possui permissão para consultar escalas.');
      const [schedules, users, functions, userFunctions, unavailability, members] = await Promise.all([
        this.repository.listSchedules(), this.repository.listActiveUsers(), this.repository.listActiveFunctions(),
        this.repository.listUserFunctions(), this.repository.listUnavailability(), this.repository.listAllMembers()
      ]);
      const membersBySchedule = new Map();
      members.forEach(member => {
        if (!member.scheduleId) return;
        if (!membersBySchedule.has(member.scheduleId)) membersBySchedule.set(member.scheduleId, []);
        membersBySchedule.get(member.scheduleId).push(member);
      });
      const result = schedules.map(schedule => {
        const scheduleMembers = membersBySchedule.get(schedule.id) || [];
        return { ...schedule, members: scheduleMembers, completeness: scheduleCompleteness(schedule, scheduleMembers) };
      });
      return { access, schedules: result, users, functions, userFunctions, unavailability };
    }

    async loadEditor(scheduleId, user, profile = null) {
      const access = await this.resolveAccess(user, profile);
      if (!access.canRead) throw new Error('Você não possui permissão para consultar escalas.');
      const schedule = await this.repository.getSchedule(scheduleId);
      if (!schedule) return { access, schedules: [], users: [], functions: [], userFunctions: [], unavailability: [] };
      const [event, members, users, functions, userFunctions, unavailability] = await Promise.all([
        this.repository.getEvent(schedule.eventId), this.repository.listMembers(scheduleId),
        this.repository.listActiveUsers(), this.repository.listActiveFunctions(),
        this.repository.listUserFunctions(), this.repository.listUnavailability()
      ]);
      const activeMembers = members.filter(item => item.active !== false);
      const orderedSchedule = { ...schedule, slots: sortSlotsByFunction(schedule.slots, functions) };
      return {
        access,
        schedules: [{ ...orderedSchedule, event: event || null, members: activeMembers, completeness: scheduleCompleteness(orderedSchedule, activeMembers) }],
        users, functions, userFunctions, unavailability
      };
    }

    eligibleUsers(functionId, event, context) {
      const functionUsers = new Set((context.userFunctions || []).filter(item => item.active !== false && item.functionId === functionId).map(item => item.userId));
      return (context.users || []).filter(user => {
        if (user.active === false || !functionUsers.has(user.id || user.uid)) return false;
        const id = user.id || user.uid;
        return !(context.unavailability || []).some(item => item.userId === id && unavailabilityMatches(item, event));
      });
    }

    userConflict(userId, functionId, schedule, event, context) {
      const unavailable = (context.unavailability || []).find(item => item.userId === userId && unavailabilityMatches(item, event));
      const duplicateFunction = (schedule.members || []).find(item => item.active !== false && item.userId === userId && item.functionId === functionId);
      const otherRole = (schedule.members || []).find(item => item.active !== false && item.userId === userId && item.functionId !== functionId);
      return { unavailable: Boolean(unavailable), unavailability: unavailable || null, duplicateFunction: Boolean(duplicateFunction), otherRole: otherRole || null };
    }

    async addSlot(scheduleId, functionId, user, profile = null) {
      const access = await this.resolveAccess(user, profile);
      if (!access.canEdit) throw new Error('Você não possui permissão para editar escalas.');
      const schedule = await this.repository.getSchedule(scheduleId);
      if (!schedule) throw new Error('Escala não encontrada.');
      const slots = Array.isArray(schedule.slots) ? [...schedule.slots] : [];
      const slot = { id: `slot_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, functionId };
      slots.push(slot);
      await this.repository.updateSchedule(scheduleId, { slots, status: 'DRAFT' }, this.actorId(user));
      await this.repository.addAuditLog(this.actorId(user), 'SCHEDULE_SLOT_ADDED', scheduleId, { slotId: slot.id, functionId });
      return slot;
    }

    async removeSlot(scheduleId, slotId, user, profile = null) {
      const access = await this.resolveAccess(user, profile);
      if (!access.canEdit) throw new Error('Você não possui permissão para editar escalas.');
      const schedule = await this.repository.getSchedule(scheduleId);
      if (!schedule) throw new Error('Escala não encontrada.');
      const members = await this.repository.listMembers(scheduleId);
      await Promise.all(members.filter(item => item.slotId === slotId).map(member => this.repository.removeMember(member.id, this.actorId(user))));
      const slots = (schedule.slots || []).filter(item => item.id !== slotId);
      await this.repository.updateSchedule(scheduleId, { slots, status: 'DRAFT' }, this.actorId(user));
      await this.repository.addAuditLog(this.actorId(user), 'SCHEDULE_SLOT_REMOVED', scheduleId, { slotId });
    }

    async loadAssignmentContext(scheduleId, userId) {
      const schedule = await this.repository.getSchedule(scheduleId);
      if (!schedule) throw new Error('Escala não encontrada.');
      const [members, event, selectedUser, userFunctions, unavailability] = await Promise.all([
        this.repository.listMembers(scheduleId), this.repository.getEvent(schedule.eventId), this.repository.getUser(userId),
        this.repository.listUserFunctionsForUser(userId), this.repository.listUnavailabilityForUser(userId)
      ]);
      return { schedule, members, event, selectedUser, userFunctions, unavailability };
    }

    async assign(scheduleId, slotId, userId, user, profile = null, options = {}) {
      const access = await this.resolveAccess(user, profile);
      if (!access.canEdit) throw new Error('Você não possui permissão para editar escalas.');
      const { schedule, members, event, selectedUser, userFunctions, unavailability } = await this.loadAssignmentContext(scheduleId, userId);
      const slot = (schedule.slots || []).find(item => item.id === slotId);
      if (!slot) throw new Error('Função/posição não encontrada na escala.');
      if (!selectedUser || selectedUser.active === false) throw new Error('Usuário inativo ou inexistente.');
      const hasFunction = userFunctions.some(item => item.active !== false && item.functionId === slot.functionId && item.userId === userId);
      if (!hasFunction) throw new Error('O usuário selecionado não possui esta função ministerial.');
      const existing = members.find(item => item.slotId === slotId && item.active !== false);
      if (existing?.userId === userId && existing.functionId === slot.functionId) {
        return {
          member: existing,
          conflict: { unavailable: false, unavailability: null, duplicateFunction: false, otherRole: null },
          completeness: scheduleCompleteness(schedule, members),
          unchanged: true
        };
      }
      const comparableMembers = members.filter(item => item.active !== false && item.id !== existing?.id);
      const fullSchedule = { ...schedule, members: comparableMembers };
      const conflict = this.userConflict(userId, slot.functionId, fullSchedule, event, { unavailability });
      if (conflict.duplicateFunction) throw new Error('Este usuário já está escalado nesta mesma função.');
      if (conflict.unavailable && !options.override) throw new Error('Usuário indisponível para este evento. Confirme uma exceção administrativa para continuar.');
      if (conflict.unavailable && options.override && !String(options.reason || '').trim()) throw new Error('Informe o motivo da exceção administrativa.');
      if (existing) await this.repository.removeMember(existing.id, this.actorId(user));
      const member = await this.repository.createMember({
        scheduleId, slotId, userId, functionId: slot.functionId,
        exception: conflict.unavailable ? { override: true, reason: String(options.reason).trim() } : null
      }, this.actorId(user));
      const nextMembers = comparableMembers.concat(member);
      const completeness = scheduleCompleteness(schedule, nextMembers);
      await this.repository.updateSchedule(scheduleId, { status: completeness.complete ? 'COMPLETE' : 'DRAFT' }, this.actorId(user));
      await this.repository.addAuditLog(this.actorId(user), conflict.unavailable ? 'SCHEDULE_MEMBER_OVERRIDE_ASSIGNED' : 'SCHEDULE_MEMBER_ASSIGNED', scheduleId, {
        memberId: member.id, slotId, userId, functionId: slot.functionId, reason: options.reason || null
      });
      return { member, conflict, completeness };
    }

    async removeMember(scheduleId, memberId, user, profile = null) {
      const access = await this.resolveAccess(user, profile);
      if (!access.canEdit) throw new Error('Você não possui permissão para editar escalas.');
      await this.repository.removeMember(memberId, this.actorId(user));
      const schedule = await this.repository.getSchedule(scheduleId);
      const members = await this.repository.listMembers(scheduleId);
      const completeness = scheduleCompleteness(schedule, members);
      await this.repository.updateSchedule(scheduleId, { status: completeness.complete ? 'COMPLETE' : 'DRAFT' }, this.actorId(user));
      await this.repository.addAuditLog(this.actorId(user), 'SCHEDULE_MEMBER_REMOVED', scheduleId, { memberId });
      return completeness;
    }
  }

  return Object.freeze({ ScheduleService, dateKey, periodForTime, dateMatchesUnavailability, unavailabilityMatches, scheduleCompleteness, sortSlotsByFunction });
});
