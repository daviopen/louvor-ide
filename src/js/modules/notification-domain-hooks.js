(function initNotificationDomainHooks(scope) {
  'use strict';
  if (!scope) return;
  const PATCHED = Symbol('ideNotificationOutboxPatched');

  function actorId(service, user) {
    try { return service.actorId(user); }
    catch (_) { return user?.uid || user?.id || null; }
  }

  function warn(error, context) {
    if (scope.MusicIdeObservability?.warn) {
      scope.MusicIdeObservability.warn('notifications.outboxEnqueueFailed', 'A alteração foi salva, mas não foi possível colocá-la na fila de notificações.', context || {}, { error });
      return;
    }
    console.warn('Falha ao gravar notificationOutbox:', error);
  }

  function outboxFor(service) {
    const Repo = scope.MusicIdeNotificationOutboxRepository?.NotificationOutboxRepository;
    if (!Repo || !service?.repository?.db) return null;
    return new Repo(service.repository.db);
  }

  async function enqueueSafe(service, input, user) {
    const outbox = outboxFor(service);
    const actor = actorId(service, user);
    if (!outbox || !actor) return null;
    try {
      return await outbox.enqueue(input, actor);
    } catch (error) {
      warn(error, { type: input?.type, scheduleId: input?.scheduleId, setlistId: input?.setlistId });
      return null;
    }
  }

  async function scheduleContext(service, scheduleId) {
    const schedule = await service.repository.getSchedule(scheduleId);
    return { schedule, eventId: schedule?.eventId || null };
  }

  function patchScheduleService() {
    const Service = scope.MusicIdeScheduleService?.ScheduleService;
    if (!Service || Service.prototype[PATCHED]) return false;
    const proto = Service.prototype;

    const originalAddSlot = proto.addSlot;
    proto.addSlot = async function addSlotWithNotification(scheduleId, functionId, user, profile) {
      const result = await originalAddSlot.call(this, scheduleId, functionId, user, profile);
      const { schedule, eventId } = await scheduleContext(this, scheduleId);
      await enqueueSafe(this, {
        type: 'SCHEDULE_UPDATED', aggregateType: 'schedule', scheduleId, eventId,
        targetUserIds: [], channels: { push: true, email: false, calendar: false },
        payload: { changeKind: 'SLOT_ADDED', functionId, slotId: result?.id || null }
      }, user);
      return result;
    };

    const originalRemoveSlot = proto.removeSlot;
    proto.removeSlot = async function removeSlotWithNotification(scheduleId, slotId, user, profile) {
      const before = await this.repository.listMembers(scheduleId);
      const affected = before.filter(member => member.slotId === slotId && member.active !== false);
      const result = await originalRemoveSlot.call(this, scheduleId, slotId, user, profile);
      const { schedule, eventId } = await scheduleContext(this, scheduleId);
      for (const member of affected) {
        await enqueueSafe(this, {
          type: 'SCHEDULE_MEMBER_REMOVED', aggregateType: 'schedule', scheduleId, eventId,
          targetUserIds: [member.userId], channels: { push: true, email: true, calendar: true },
          payload: { changeKind: 'SLOT_REMOVED', memberId: member.id, userId: member.userId, functionId: member.functionId, slotId }
        }, user);
      }
      await enqueueSafe(this, {
        type: 'SCHEDULE_UPDATED', aggregateType: 'schedule', scheduleId, eventId,
        targetUserIds: [], channels: { push: true, email: false, calendar: false },
        payload: { changeKind: 'SLOT_REMOVED', slotId }
      }, user);
      return result;
    };

    const originalAssign = proto.assign;
    proto.assign = async function assignWithNotification(scheduleId, slotId, userId, user, profile, options) {
      const before = await this.repository.listMembers(scheduleId);
      const previous = before.find(member => member.slotId === slotId && member.active !== false) || null;
      const result = await originalAssign.call(this, scheduleId, slotId, userId, user, profile, options);
      if (result?.unchanged) return result;
      const { schedule, eventId } = await scheduleContext(this, scheduleId);
      if (previous && previous.userId !== userId) {
        await enqueueSafe(this, {
          type: 'SCHEDULE_MEMBER_REMOVED', aggregateType: 'schedule', scheduleId, eventId,
          targetUserIds: [previous.userId], channels: { push: true, email: true, calendar: true },
          payload: { changeKind: 'REPLACED', memberId: previous.id, userId: previous.userId, functionId: previous.functionId, slotId }
        }, user);
      }
      await enqueueSafe(this, {
        type: 'SCHEDULE_MEMBER_ASSIGNED', aggregateType: 'schedule', scheduleId, eventId,
        targetUserIds: [userId], channels: { push: true, email: true, calendar: true },
        payload: { changeKind: previous ? 'REPLACED' : 'ASSIGNED', memberId: result?.member?.id || null, userId, functionId: result?.member?.functionId || null, slotId }
      }, user);
      return result;
    };

    const originalRemoveMember = proto.removeMember;
    proto.removeMember = async function removeMemberWithNotification(scheduleId, memberId, user, profile) {
      const before = await this.repository.listMembers(scheduleId, { includeInactive: true });
      const removed = before.find(member => member.id === memberId) || null;
      const result = await originalRemoveMember.call(this, scheduleId, memberId, user, profile);
      if (removed?.userId) {
        const { eventId } = await scheduleContext(this, scheduleId);
        await enqueueSafe(this, {
          type: 'SCHEDULE_MEMBER_REMOVED', aggregateType: 'schedule', scheduleId, eventId,
          targetUserIds: [removed.userId], channels: { push: true, email: true, calendar: true },
          payload: { changeKind: 'REMOVED', memberId, userId: removed.userId, functionId: removed.functionId, slotId: removed.slotId }
        }, user);
      }
      return result;
    };

    Object.defineProperty(proto, PATCHED, { value: true });
    return true;
  }

  function patchSetlistService() {
    const Service = scope.MusicIdeSetlistService?.SetlistService;
    if (!Service || Service.prototype[PATCHED]) return false;
    const proto = Service.prototype;
    const originalSave = proto.save;
    proto.save = async function saveWithNotification(setlistId, input, user, profile) {
      const result = await originalSave.call(this, setlistId, input, user, profile);
      const setlist = await this.repository.getSetlist(setlistId);
      if (setlist?.scheduleId) {
        await enqueueSafe(this, {
          type: 'SETLIST_UPDATED', aggregateType: 'setlist', scheduleId: setlist.scheduleId,
          eventId: setlist.eventId || null, setlistId,
          targetUserIds: [], channels: { push: true, email: false, calendar: false },
          payload: { changeKind: 'SETLIST_SAVED' }
        }, user);
      }
      return result;
    };
    Object.defineProperty(proto, PATCHED, { value: true });
    return true;
  }

  function patchAll() {
    patchScheduleService();
    patchSetlistService();
  }

  function boot() {
    patchAll();
    let attempts = 0;
    const timer = scope.setInterval(() => {
      patchAll();
      attempts += 1;
      if (attempts >= 20 || (
        scope.MusicIdeScheduleService?.ScheduleService?.prototype[PATCHED]
        && scope.MusicIdeSetlistService?.SetlistService?.prototype[PATCHED]
      )) scope.clearInterval(timer);
    }, 250);
  }

  scope.MusicIdeNotificationDomainHooks = Object.freeze({ patchAll });
  if (scope.document?.readyState === 'loading') scope.document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})(typeof window !== 'undefined' ? window : null);
