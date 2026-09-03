/**
 * Business rules and read model composition for the personal IDE Music Dashboard.
 */
(function initDashboardService(globalScope, factory) {
  const completenessApi = typeof module !== 'undefined' && module.exports
    ? require('./schedule-completeness.js')
    : globalScope?.MusicIdeScheduleCompleteness;
  const api = factory(completenessApi);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (globalScope) globalScope.MusicIdeDashboardService = api;
})(typeof window !== 'undefined' ? window : null, function createDashboardServiceModule(completenessApi) {
  const ACTIVE_SCHEDULE_STATUSES = new Set(['DRAFT', 'COMPLETE']);
  const scheduleCompleteness = completenessApi?.scheduleCompleteness;
  if (typeof scheduleCompleteness !== 'function') throw new Error('Regra de completude de escalas indisponível.');

  function toDate(value) {
    if (!value) return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    if (typeof value.toDate === 'function') return toDate(value.toDate());
    if (typeof value === 'object' && Number.isFinite(value.seconds)) return new Date(value.seconds * 1000);
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  function startOfDay(value) {
    const date = toDate(value) || new Date();
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function eventDate(event) {
    return toDate(event && (event.date || event.eventDate));
  }

  function linkedDate(item, eventsById) {
    const event = item && eventsById.get(item.eventId);
    return eventDate(event) || toDate(item && item.eventDate);
  }

  function futureOrToday(date, today) {
    return Boolean(date && date.getTime() >= today.getTime());
  }

  function byDate(a, b) {
    return a.date.getTime() - b.date.getTime();
  }

  function normalizeLimit(value, fallback = 5) {
    return Number.isInteger(value) && value > 0 ? value : fallback;
  }

  function buildDashboardViewModel(data, options = {}) {
    const today = startOfDay(options.now || new Date());
    const limit = normalizeLimit(options.limit);
    const events = Array.isArray(data.events) ? data.events : [];
    const schedules = Array.isArray(data.schedules) ? data.schedules : [];
    const members = Array.isArray(data.scheduleMembers) ? data.scheduleMembers : [];
    const setlists = Array.isArray(data.setlists) ? data.setlists : [];
    const unavailability = Array.isArray(data.unavailability) ? data.unavailability : [];
    const profile = data.profile || {};
    const userId = profile.id || profile.uid || data.userId || null;
    const eventsById = new Map(events.map(event => [event.id, event]));

    const ownMembers = members.filter(member => member && member.active !== false && (!userId || member.userId === userId));
    const ownScheduleIds = new Set(ownMembers.map(member => member.scheduleId).filter(Boolean));

    const membersBySchedule = new Map();
    members.filter(member => member?.active !== false).forEach(member => {
      if (!member.scheduleId) return;
      if (!membersBySchedule.has(member.scheduleId)) membersBySchedule.set(member.scheduleId, []);
      membersBySchedule.get(member.scheduleId).push(member);
    });

    const upcomingSchedulesAll = schedules
      .filter(schedule => ownScheduleIds.has(schedule.id))
      .filter(schedule => ACTIVE_SCHEDULE_STATUSES.has(String(schedule.status || '').toUpperCase()))
      .map(schedule => {
        const completeness = scheduleCompleteness(schedule, membersBySchedule.get(schedule.id) || []);
        return {
          ...schedule,
          status: completeness.complete ? 'COMPLETE' : 'DRAFT',
          completeness,
          date: linkedDate(schedule, eventsById),
          event: eventsById.get(schedule.eventId) || null
        };
      })
      .filter(schedule => futureOrToday(schedule.date, today))
      .sort(byDate);

    const ownUpcomingScheduleIds = new Set(upcomingSchedulesAll.map(schedule => schedule.id));
    const ownUpcomingEventIds = new Set(upcomingSchedulesAll.map(schedule => schedule.eventId).filter(Boolean));

    const upcomingSetlistsAll = setlists
      .filter(setlist => ownUpcomingScheduleIds.has(setlist.scheduleId) || ownUpcomingEventIds.has(setlist.eventId))
      .map(setlist => ({
        ...setlist,
        date: linkedDate(setlist, eventsById),
        event: eventsById.get(setlist.eventId) || null
      }))
      .filter(setlist => futureOrToday(setlist.date, today))
      .sort(byDate);

    const upcomingUnavailabilityAll = unavailability
      .map(item => ({ ...item, date: toDate(item.date), endAt: toDate(item.endAt) }))
      .filter(item => futureOrToday(item.endAt || item.date, today))
      .sort(byDate);

    const userIndicators = {
      upcomingSchedules: upcomingSchedulesAll.length,
      draftSchedules: upcomingSchedulesAll.filter(item => String(item.status || '').toUpperCase() === 'DRAFT').length,
      upcomingSetlists: upcomingSetlistsAll.length,
      upcomingUnavailability: upcomingUnavailabilityAll.length
    };

    return {
      profile,
      upcomingSchedules: upcomingSchedulesAll.slice(0, limit),
      upcomingSetlists: upcomingSetlistsAll.slice(0, limit),
      upcomingUnavailability: upcomingUnavailabilityAll.slice(0, limit),
      userIndicators
    };
  }

  class DashboardService {
    constructor(repository, options = {}) {
      if (!repository) throw new TypeError('DashboardService exige um repository.');
      this.repository = repository;
      this.clock = options.clock || (() => new Date());
      this.limit = normalizeLimit(options.limit);
    }

    async load(userId) {
      if (!userId) throw new TypeError('userId é obrigatório para carregar o Dashboard.');
      const [profile, scheduleMembers, unavailability] = await Promise.all([
        this.repository.getOwnProfile(userId),
        this.repository.listOwnScheduleMembers(userId),
        this.repository.listOwnUnavailability(userId)
      ]);
      if (!profile || profile.active !== true) throw new Error('Perfil ativo não encontrado para o Dashboard.');

      const scheduleIds = [...new Set(scheduleMembers.map(member => member.scheduleId).filter(Boolean))];
      const schedules = await this.repository.getSchedulesByIds(scheduleIds);
      const eventIds = [...new Set(schedules.map(schedule => schedule.eventId).filter(Boolean))];
      const events = await this.repository.getEventsByIds(eventIds);
      const today = startOfDay(this.clock());
      const eventsById = new Map(events.map(event => [event.id, event]));
      const upcomingSchedules = schedules.filter(schedule => (
        ACTIVE_SCHEDULE_STATUSES.has(String(schedule.status || '').toUpperCase())
        && futureOrToday(linkedDate(schedule, eventsById), today)
      ));
      const upcomingScheduleIds = upcomingSchedules.map(schedule => schedule.id).filter(Boolean);
      const upcomingEventIds = [...new Set(upcomingSchedules.map(schedule => schedule.eventId).filter(Boolean))];
      const [setlists, scheduleMembersForStatus] = await Promise.all([
        this.repository.listSetlistsForTargets({ scheduleIds: upcomingScheduleIds, eventIds: upcomingEventIds }),
        this.repository.listMembersForSchedules(upcomingScheduleIds)
      ]);

      return buildDashboardViewModel(
        { profile, userId, events, schedules, scheduleMembers: scheduleMembersForStatus, setlists, unavailability },
        { now: today, limit: this.limit }
      );
    }
  }

  return Object.freeze({ DashboardService, buildDashboardViewModel, toDate, startOfDay });
});
