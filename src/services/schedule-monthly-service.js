/** Monthly schedule reporting helpers. */
(function initScheduleMonthlyService(globalScope, factory) {
  const api = factory(globalScope);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (globalScope) globalScope.MusicIdeScheduleMonthlyService = api;
})(typeof window !== 'undefined' ? window : null, function createModule(globalScope) {
  function toDate(value) {
    if (!value) return null;
    if (value && typeof value.toDate === 'function') return toDate(value.toDate());
    if (value instanceof Date) return new Date(value.getTime());
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T12:00:00`);
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function dateKey(value) {
    const date = toDate(value);
    if (!date) return '';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function monthKey(value) { return dateKey(value).slice(0, 7); }

  function monthBounds(month) {
    if (!/^\d{4}-\d{2}$/.test(String(month || ''))) return { from: '', to: '' };
    const [year, number] = month.split('-').map(Number);
    const last = new Date(year, number, 0).getDate();
    return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, '0')}` };
  }

  function schedulesForMonth(schedules, month) {
    return (schedules || []).filter(schedule => monthKey(schedule.event?.date || schedule.eventDate) === month);
  }

  function monthlyParticipation(users, schedules, month) {
    const selected = schedulesForMonth(schedules, month);
    return (users || []).filter(user => user.active !== false).map(user => {
      const id = user.id || user.uid;
      let total = 0;
      selected.forEach(schedule => {
        const participates = (schedule.members || []).some(member => member.active !== false && member.userId === id);
        if (participates) total += 1;
      });
      return { userId: id, name: user.name || user.email || 'Usuário', total };
    }).sort((left, right) => right.total - left.total || left.name.localeCompare(right.name, 'pt-BR'));
  }

  function unavailabilityOverlapsMonth(record, month) {
    const bounds = monthBounds(month);
    const start = dateKey(record?.date);
    const end = dateKey(record?.endAt || record?.date) || start;
    if (!start || !bounds.from) return false;
    if (record?.recurrence?.frequency === 'WEEKLY' && record.recurrence.openEnded) return start <= bounds.to;
    return end >= bounds.from && start <= bounds.to;
  }

  return Object.freeze({ toDate, dateKey, monthKey, monthBounds, schedulesForMonth, monthlyParticipation, unavailabilityOverlapsMonth });
});
