/**
 * Business rules and read model composition for the IDE Music Dashboard.
 */
(function initDashboardService(globalScope, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (globalScope) globalScope.MusicIdeDashboardService = api;
})(typeof window !== 'undefined' ? window : null, function createDashboardServiceModule() {
  const ACTIVE_EVENT_STATUSES = new Set(['PLANNED', 'CONFIRMED']);
  const ACTIVE_SCHEDULE_STATUSES = new Set(['DRAFT', 'COMPLETE']);
  const PENDING_SETLIST_STATUSES = new Set(['DRAFT']);
  const ADMIN_ROLES = new Set(['ADMIN', 'SUPER_ADMIN']);

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
    const eventsById = new Map(events.map(event => [event.id, event]));
    const memberCountBySchedule = members.reduce((counts, member) => {
      if (member && member.active !== false && member.scheduleId) {
        counts.set(member.scheduleId, (counts.get(member.scheduleId) || 0) + 1);
      }
      return counts;
    }, new Map());

    const upcomingEventsAll = events
      .filter(event => ACTIVE_EVENT_STATUSES.has(String(event.status || '').toUpperCase()))
      .map(event => ({ ...event, date: eventDate(event) }))
      .filter(event => futureOrToday(event.date, today))
      .sort(byDate);

    const upcomingSchedulesAll = schedules
      .filter(schedule => ACTIVE_SCHEDULE_STATUSES.has(String(schedule.status || '').toUpperCase()))
      .map(schedule => ({
        ...schedule,
        date: linkedDate(schedule, eventsById),
        event: eventsById.get(schedule.eventId) || null,
        memberCount: memberCountBySchedule.get(schedule.id) || 0
      }))
      .filter(schedule => futureOrToday(schedule.date, today))
      .sort(byDate);

    const pendingSetlistsAll = setlists
      .filter(setlist => PENDING_SETLIST_STATUSES.has(String(setlist.status || '').toUpperCase()))
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

    const role = String(profile.role || 'MEMBER').toUpperCase();
    const adminIndicators = ADMIN_ROLES.has(role) ? {
      upcomingEvents: upcomingEventsAll.length,
      upcomingSchedules: upcomingSchedulesAll.length,
      incompleteSchedules: upcomingSchedulesAll.filter(item => String(item.status || '').toUpperCase() === 'DRAFT').length,
      pendingSetlists: pendingSetlistsAll.length
    } : null;

    return {
      profile,
      upcomingEvents: upcomingEventsAll.slice(0, limit),
      upcomingSchedules: upcomingSchedulesAll.slice(0, limit),
      pendingSetlists: pendingSetlistsAll.slice(0, limit),
      upcomingUnavailability: upcomingUnavailabilityAll.slice(0, limit),
      adminIndicators
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
      const [profile, events, schedules, scheduleMembers, setlists, unavailability] = await Promise.all([
        this.repository.getOwnProfile(userId),
        this.repository.listEvents(),
        this.repository.listSchedules(),
        this.repository.listScheduleMembers(),
        this.repository.listSetlists(),
        this.repository.listOwnUnavailability(userId)
      ]);
      if (!profile || profile.active !== true) throw new Error('Perfil ativo não encontrado para o Dashboard.');
      return buildDashboardViewModel(
        { profile, events, schedules, scheduleMembers, setlists, unavailability },
        { now: this.clock(), limit: this.limit }
      );
    }
  }

  return Object.freeze({ DashboardService, buildDashboardViewModel, toDate, startOfDay });
});