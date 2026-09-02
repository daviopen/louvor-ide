/** Regras de negócio do Setlist por escala. */
(function initSetlistService(globalScope, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (globalScope) globalScope.MusicIdeSetlistService = api;
})(typeof window !== 'undefined' ? window : null, function createModule() {
  function normalize(value) { return String(value || '').trim(); }
  function functionIsMinister(item) {
    const value = `${item?.name || ''} ${item?.code || ''} ${item?.slug || ''}`.toLocaleLowerCase('pt-BR');
    return /(^|\s)ministro($|\s)/.test(value) || value.includes('ministro');
  }
  function normalizeOrder(items) { return (items || []).map((item, index) => ({ ...item, order: index + 1 })); }
  function normalizeHexColor(value) {
    const raw = normalize(value).toUpperCase();
    if (!raw) return '';
    const hex = raw.startsWith('#') ? raw : `#${raw}`;
    if (!/^#[0-9A-F]{6}$/.test(hex)) throw new Error(`Cor inválida: “${value}”. Use o formato #RRGGBB.`);
    return hex;
  }
  function normalizeDressCodeColors(colors) {
    const compact = (colors || []).map(normalizeHexColor).filter(Boolean);
    if (compact.length > 3) throw new Error('O Dress Code permite no máximo 3 cores.');
    if (new Set(compact).size !== compact.length) throw new Error('O Dress Code não deve repetir a mesma cor.');
    return compact;
  }
  function eligibleMinisters(members, functions, users) {
    const ministerFunctionIds = new Set((functions || []).filter(functionIsMinister).map(item => item.id));
    const userMap = new Map((users || []).map(user => [user.id || user.uid, user]));
    const seen = new Set();
    return (members || []).filter(member => member.active !== false && ministerFunctionIds.has(member.functionId)).map(member => {
      const user = userMap.get(member.userId);
      if (!user || seen.has(member.userId)) return null;
      seen.add(member.userId);
      return { id: member.userId, name: user.name || user.displayName || user.email || 'Ministro', email: user.email || '', avatar: user.avatar || user.photoURL || '' };
    }).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }
  function preferredKey(song, ministerUserId, ministerName, keys) {
    const songId = song?.id || song?.songId;
    const explicit = (keys || []).find(item => item.songId === songId && item.userId === ministerUserId && item.active !== false);
    if (explicit?.preferredKey) return explicit.preferredKey;
    if (song?.tomMinistro && ministerName && song.tomMinistro[ministerName]) return song.tomMinistro[ministerName];
    return song?.preferredKey || song?.key || song?.tom || 'C';
  }
  function validateSongs(songs, ministers) {
    const eligibleIds = new Set((ministers || []).map(item => item.id));
    const seen = new Set();
    for (const song of songs || []) {
      if (!normalize(song.songId)) throw new Error('Há uma música inválida no Setlist.');
      if (seen.has(song.songId)) throw new Error('A mesma música não pode aparecer duas vezes no Setlist.');
      seen.add(song.songId);
      if (!normalize(song.ministerUserId)) throw new Error(`Defina o ministro de “${song.title || 'música'}”.`);
      if (!eligibleIds.has(song.ministerUserId)) throw new Error(`O ministro de “${song.title || 'música'}” não está escalado como Ministro neste evento.`);
      if (!normalize(song.executionKey)) throw new Error(`Defina o tom de execução de “${song.title || 'música'}”.`);
    }
    return true;
  }
  function profilePermissionLevel(profile, moduleName) {
    const permission = profile?.permissions?.[moduleName];
    const level = permission && typeof permission === 'object' ? permission.level || permission.access : permission;
    const normalized = String(level || 'NONE').toUpperCase();
    return ['READ', 'EDIT'].includes(normalized) ? normalized : 'NONE';
  }
  function hasProfilePermission(profile, moduleName) {
    return Boolean(profile?.permissions && Object.prototype.hasOwnProperty.call(profile.permissions, moduleName));
  }

  class SetlistService {
    constructor(repository) { if (!repository) throw new Error('SetlistRepository é obrigatório.'); this.repository = repository; }
    actorId(user) { const id = user && (user.uid || user.id); if (!id) throw new Error('Usuário autenticado não identificado.'); return id; }
    async resolveAccess(user, profile = null) {
      const role = String(profile?.role || '').toUpperCase();
      if (role === 'SUPER_ADMIN' || profile?.isSuperAdmin === true) return { level: 'EDIT', canRead: true, canEdit: true };
      const level = hasProfilePermission(profile, 'setlists')
        ? profilePermissionLevel(profile, 'setlists')
        : String(await this.repository.getPermissionLevel(this.actorId(user), 'setlists') || 'NONE').toUpperCase();
      return { level, canRead: level === 'READ' || level === 'EDIT', canEdit: level === 'EDIT' };
    }
    async load(setlistId, user, profile = null) {
      const access = await this.resolveAccess(user, profile);
      if (!access.canRead) throw new Error('Você não possui permissão para consultar Setlists.');
      const setlist = await this.repository.getSetlist(setlistId);
      if (!setlist) throw new Error('Setlist não encontrado.');
      const [schedule, event, members, users, functions, library, keys, persistedSongs] = await Promise.all([
        this.repository.getSchedule(setlist.scheduleId), this.repository.getEvent(setlist.eventId), this.repository.listMembers(setlist.scheduleId),
        this.repository.listUsers(), this.repository.listFunctions(), this.repository.listSongsLibrary(), this.repository.listMinisterKeys(), this.repository.listSetlistSongs(setlistId)
      ]);
      const ministers = eligibleMinisters(members, functions, users);
      const userMap = new Map(users.map(item => [item.id || item.uid, item]));
      const functionMap = new Map(functions.map(item => [item.id, item]));
      const songMap = new Map(library.map(item => [item.id, item]));
      const detailedMembers = members.map(member => ({ ...member, user: userMap.get(member.userId) || null, function: functionMap.get(member.functionId) || null }));
      let songs = persistedSongs.map(item => {
        const source = songMap.get(item.songId) || {};
        return { ...item, title: source.title || source.titulo || 'Música', artist: source.artist || source.artista || '', originalKey: source.key || source.tom || 'C' };
      });
      if (!songs.length && Array.isArray(setlist.musicas)) {
        songs = setlist.musicas.map((item, index) => ({
          songId: item.id, title: item.titulo || 'Música', artist: item.artista || '', originalKey: item.tomOriginal || item.tom || 'C',
          executionKey: item.tomFinal || item.tomOriginal || item.tom || 'C', ministerUserId: item.ministerUserId || '', note: item.observacao || '', transition: item.transicao || '', order: item.ordem || index + 1
        }));
      }
      return { access, setlist: { ...setlist, dressCodeColors: normalizeDressCodeColors(setlist.dressCodeColors || []) }, schedule, event, members: detailedMembers, ministers, library, keys, songs: normalizeOrder(songs) };
    }
    async ensureForSchedule(scheduleId, user, profile = null) {
      const access = await this.resolveAccess(user, profile);
      if (!access.canEdit) throw new Error('Você não possui permissão para editar Setlists.');
      const schedule = await this.repository.getSchedule(scheduleId);
      if (!schedule) throw new Error('Escala não encontrada.');
      return this.repository.ensureForSchedule(schedule, this.actorId(user));
    }
    suggestExecutionKey(song, ministerUserId, ministers, keys) {
      const minister = (ministers || []).find(item => item.id === ministerUserId);
      return preferredKey(song, ministerUserId, minister?.name, keys);
    }
    async save(setlistId, input, user, profile = null) {
      const access = await this.resolveAccess(user, profile);
      if (!access.canEdit) throw new Error('Você não possui permissão para editar Setlists.');
      const current = await this.load(setlistId, user, profile);
      if (['COMPLETED', 'CANCELLED'].includes(String(current.setlist.status || '').toUpperCase())) throw new Error('Este Setlist está em modo somente leitura.');
      const songs = normalizeOrder(input.songs || []);
      validateSongs(songs, current.ministers);
      const dressCodeColors = normalizeDressCodeColors(input.dressCodeColors || []);
      const ministerMap = new Map(current.ministers.map(item => [item.id, item]));
      const payloadSongs = songs.map(song => ({ ...song, ministerName: ministerMap.get(song.ministerUserId)?.name || '', note: normalize(song.note), transition: normalize(song.transition) }));
      return this.repository.save(setlistId, {
        name: normalize(input.name) || current.event?.name || 'Setlist', description: normalize(input.description), dressCodeColors,
        status: songs.length ? 'READY' : 'DRAFT', eventId: current.setlist.eventId, scheduleId: current.setlist.scheduleId,
        eventDate: current.event?.date || current.setlist.eventDate || null, eventTime: current.event?.time || current.setlist.eventTime || null
      }, payloadSongs, this.actorId(user));
    }
  }

  return Object.freeze({ SetlistService, functionIsMinister, eligibleMinisters, preferredKey, normalizeOrder, validateSongs, normalizeHexColor, normalizeDressCodeColors, profilePermissionLevel, hasProfilePermission });
});