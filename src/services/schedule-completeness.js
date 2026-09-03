/**
 * Regra de domínio compartilhada para completude de escalas.
 */
(function initScheduleCompleteness(globalScope, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (globalScope) globalScope.MusicIdeScheduleCompleteness = api;
})(typeof window !== 'undefined' ? window : null, function createScheduleCompletenessModule() {
  function scheduleCompleteness(schedule, members) {
    const slots = Array.isArray(schedule?.slots) ? schedule.slots : [];
    const activeMembers = (Array.isArray(members) ? members : []).filter(member => member?.active !== false);
    if (!slots.length) return { complete: false, filled: 0, total: 0, missingSlotIds: [] };

    const occupiedSlotIds = new Set(activeMembers.map(member => member.slotId).filter(Boolean));
    const missingSlotIds = slots.map(slot => slot.id).filter(slotId => !occupiedSlotIds.has(slotId));
    return {
      complete: missingSlotIds.length === 0,
      filled: slots.length - missingSlotIds.length,
      total: slots.length,
      missingSlotIds
    };
  }

  return Object.freeze({ scheduleCompleteness });
});
