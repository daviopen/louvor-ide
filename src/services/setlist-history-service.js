/**
 * Regras puras para listagem de próximos Setlists e Histórico.
 * Mantém filtros/paginação fora da camada de UI e facilita testes.
 */
(function initSetlistHistoryService(globalScope, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (globalScope) globalScope.MusicIdeSetlistHistory = api;
})(typeof window !== 'undefined' ? window : null, function createModule() {
  const text = value => String(value ?? '').trim();
  const lower = value => text(value).toLocaleLowerCase('pt-BR');

  function toDate(value) {
    if (!value) return null;
    const date = value && typeof value.toDate === 'function'
      ? value.toDate()
      : new Date(String(value).length <= 10 ? `${String(value).slice(0, 10)}T12:00:00` : value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function dateKey(value) {
    const date = toDate(value);
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function normalizeDressCodeColors(value) {
    if (!Array.isArray(value)) return [];
    return [...new Set(value
      .map(color => text(color).toUpperCase())
      .filter(color => /^#[0-9A-F]{6}$/.test(color)))]
      .slice(0, 3);
  }

  function normalizeItem(setlist, context = {}) {
    const event = context.event || {};
    const songs = Array.isArray(context.songs) ? context.songs : [];
    const users = context.users || new Map();
    const library = context.library || new Map();
    const date = setlist.eventDate || setlist.data || event.date || setlist.createdAt || null;
    const normalizedSongs = songs.map(song => {
      const source = library.get ? (library.get(song.songId) || {}) : {};
      const minister = users.get ? (users.get(song.ministerUserId) || {}) : {};
      return {
        ...song,
        title: song.title || song.titulo || source.title || source.titulo || '',
        ministerName: song.ministerName || song.ministro || minister.name || minister.displayName || minister.email || ''
      };
    });
    return {
      ...setlist,
      event,
      date,
      dateKey: dateKey(date),
      name: setlist.name || setlist.nome || event.name || 'Setlist',
      theme: setlist.theme || event.theme || '',
      dressCodeColors: normalizeDressCodeColors(setlist.dressCodeColors),
      songs: normalizedSongs,
      ministerNames: [...new Set(normalizedSongs.map(song => text(song.ministerName)).filter(Boolean))],
      songTitles: normalizedSongs.map(song => text(song.title)).filter(Boolean),
      totalSongs: Number(setlist.totalMusicas ?? normalizedSongs.length ?? 0),
      status: text(setlist.status || event.status || 'DRAFT').toUpperCase()
    };
  }

  function isHistory(item, today = new Date()) {
    const status = text(item.status).toUpperCase();
    if (['COMPLETED', 'CANCELLED'].includes(status)) return true;
    const date = toDate(item.date);
    if (!date) return false;
    const boundary = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    return date.getTime() < boundary.getTime();
  }

  function split(items, today = new Date()) {
    const history = [];
    const upcoming = [];
    items.forEach(item => (isHistory(item, today) ? history : upcoming).push(item));
    upcoming.sort((a, b) => (toDate(a.date)?.getTime() || Number.MAX_SAFE_INTEGER) - (toDate(b.date)?.getTime() || Number.MAX_SAFE_INTEGER));
    history.sort((a, b) => (toDate(b.date)?.getTime() || 0) - (toDate(a.date)?.getTime() || 0));
    return { upcoming, history };
  }

  function matches(item, filters = {}) {
    const from = text(filters.from);
    const to = text(filters.to);
    if (from && item.dateKey && item.dateKey < from) return false;
    if (to && item.dateKey && item.dateKey > to) return false;
    if ((from || to) && !item.dateKey) return false;

    const eventTerm = lower(filters.event);
    if (eventTerm && !lower(`${item.name} ${item.event?.name || ''}`).includes(eventTerm)) return false;

    const ministerTerm = lower(filters.minister);
    if (ministerTerm && !item.ministerNames.some(name => lower(name).includes(ministerTerm))) return false;

    const songTerm = lower(filters.song);
    if (songTerm && !item.songTitles.some(title => lower(title).includes(songTerm))) return false;

    const themeTerm = lower(filters.theme);
    if (themeTerm && !lower(item.theme).includes(themeTerm)) return false;

    return true;
  }

  function filter(items, filters = {}) {
    return items.filter(item => matches(item, filters));
  }

  function paginate(items, page = 1, pageSize = 8) {
    const safeSize = Math.max(1, Number(pageSize) || 8);
    const total = items.length;
    const totalPages = Math.max(1, Math.ceil(total / safeSize));
    const safePage = Math.min(totalPages, Math.max(1, Number(page) || 1));
    const start = (safePage - 1) * safeSize;
    return {
      items: items.slice(start, start + safeSize),
      page: safePage,
      pageSize: safeSize,
      total,
      totalPages
    };
  }

  return Object.freeze({ toDate, dateKey, normalizeDressCodeColors, normalizeItem, isHistory, split, matches, filter, paginate });
});