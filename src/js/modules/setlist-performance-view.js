(function initSetlistPerformanceView(globalScope) {
  'use strict';

  const KEYS_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const KEY_INDEX = {
    C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5,
    'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11
  };
  const MIN_FONT_SIZE = 14;
  const MAX_FONT_SIZE = 34;
  const DEFAULT_FONT_SIZE = 18;

  function clampFontSize(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return DEFAULT_FONT_SIZE;
    return Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, Math.round(numeric)));
  }

  function shiftKey(key, steps) {
    const normalized = globalScope.LouvorChordTransposer?.normalizeKey(key) || key;
    const index = KEY_INDEX[normalized];
    if (!Number.isInteger(index)) return 'C';
    const target = (index + Number(steps || 0) + 120) % 12;
    return KEYS_SHARP[target];
  }

  function normalizeLyrics(value) {
    if (typeof value !== 'string') return '';
    return value.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  function safeText(value, fallback = '') {
    const text = typeof value === 'string' ? value.trim() : '';
    return text || fallback;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatDate(value) {
    if (!value) return 'Data não informada';
    const date = value?.toDate ? value.toDate() : new Date(value);
    if (Number.isNaN(date.getTime())) return 'Data não informada';
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(date);
  }

  function getAdjacentIndex(currentIndex, direction, length) {
    if (!Number.isInteger(length) || length <= 0) return -1;
    const next = currentIndex + direction;
    if (next < 0 || next >= length) return -1;
    return next;
  }

  const api = { clampFontSize, getAdjacentIndex, normalizeLyrics, shiftKey };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (!globalScope || !globalScope.document) return;

  const document = globalScope.document;
  const params = new URLSearchParams(globalScope.location.search);
  const state = {
    db: null,
    setlistId: params.get('id'),
    songId: params.get('song'),
    setlist: null,
    songs: [],
    activeIndex: 0,
    mode: 'chords',
    fontSize: DEFAULT_FONT_SIZE,
    transposeOffset: 0,
    stageMode: false,
    startInStageMode: params.get('stage') === '1'
  };

  const el = {};
  function cacheElements() {
    [
      'loading', 'error', 'viewer', 'setlist-title', 'setlist-meta', 'song-strip-list', 'song-strip',
      'song-position', 'song-title', 'song-artist', 'song-minister', 'song-key',
      'view-chords', 'view-lyrics', 'transpose-controls', 'transpose-down',
      'transpose-reset', 'transpose-up', 'execution-key', 'font-down', 'font-up',
      'font-size-value', 'chords-content', 'lyrics-content', 'content-empty',
      'previous-song', 'next-song', 'previous-song-label', 'next-song-label', 'song-navigation',
      'stage-mode-button', 'exit-stage-button', 'performance-eyebrow', 'performance-back-link',
      'performance-back-label'
    ].forEach(id => { el[id] = document.getElementById(id); });
  }

  function showError(message) {
    el.loading.hidden = true;
    el.viewer.hidden = true;
    el.error.hidden = false;
    el.error.textContent = message;
    document.documentElement.classList.remove('auth-pending');
  }

  function isValidDocumentId(value) {
    return Boolean(value && /^[A-Za-z0-9._-]+$/.test(value));
  }

  function resolveSetlistSongs(data) {
    if (Array.isArray(data?.musicas)) return data.musicas;
    if (Array.isArray(data?.songs)) return data.songs;
    return [];
  }

  function resolveMinisterName(setlistSong, currentSong) {
    const direct = safeText(setlistSong?.ministro || setlistSong?.ministerName);
    if (direct) return direct;
    const values = Array.isArray(currentSong?.ministros)
      ? currentSong.ministros
      : Array.isArray(currentSong?.ministers) ? currentSong.ministers : [];
    return values.map(value => String(value || '').trim()).filter(Boolean).join(', ') || 'Sem ministro';
  }

  async function loadSong(setlistSong, index) {
    const songId = setlistSong?.id || setlistSong?.songId;
    let currentSong = {};
    if (songId) {
      const snapshot = await state.db.collection('songs').doc(songId).get();
      if (snapshot.exists) currentSong = snapshot.data() || {};
    }

    const originalKey = globalScope.LouvorChordTransposer.normalizeKey(
      currentSong.tom || currentSong.originalKey || setlistSong.tomOriginal || 'C'
    ) || 'C';
    const executionKey = globalScope.LouvorChordTransposer.resolveSetlistFinalKey(setlistSong, currentSong);

    return {
      id: songId || `song-${index}`,
      title: safeText(setlistSong.titulo || setlistSong.title || currentSong.nome || currentSong.titulo || currentSong.title, `Música ${index + 1}`),
      artist: safeText(setlistSong.artista || setlistSong.artist || currentSong.artista || currentSong.artist, 'Artista não informado'),
      minister: resolveMinisterName(setlistSong, currentSong),
      originalKey,
      executionKey,
      chordText: safeText(currentSong.cifra || currentSong.chordSheet || currentSong.chords),
      lyricsText: normalizeLyrics(currentSong.letra || currentSong.lyrics || currentSong.letraCompleta)
    };
  }

  async function loadData() {
    if (!globalScope.firebase) throw new Error('Firebase não foi carregado.');
    const sharedFirebaseConfig = typeof firebaseConfig !== 'undefined' ? firebaseConfig : globalScope.firebaseConfig;
    if (!globalScope.firebase.apps.length) globalScope.firebase.initializeApp(sharedFirebaseConfig);
    state.db = globalScope.firebase.firestore();

    if (state.songId) {
      if (!isValidDocumentId(state.songId)) throw new Error('Música inválida. Volte ao catálogo e abra a música novamente.');
      const snapshot = await state.db.collection('songs').doc(state.songId).get();
      if (!snapshot.exists) throw new Error('Música não encontrada ou sem permissão de leitura.');
      const data = snapshot.data() || {};
      state.setlist = { name: safeText(data.titulo || data.nome || data.title, 'Música') };
      state.songs = [await loadSong({ id: state.songId }, 0)];
      return;
    }

    if (!isValidDocumentId(state.setlistId)) {
      throw new Error('Setlist inválido. Volte à lista e abra o repertório novamente.');
    }

    const setlistSnapshot = await state.db.collection('setlists').doc(state.setlistId).get();
    if (!setlistSnapshot.exists) throw new Error('Setlist não encontrado ou sem permissão de leitura.');

    state.setlist = setlistSnapshot.data() || {};
    const rawSongs = resolveSetlistSongs(state.setlist);
    state.songs = await Promise.all(rawSongs.map(loadSong));
  }

  function renderHeader() {
    if (state.songId) {
      const song = state.songs[0];
      el['performance-eyebrow'].textContent = 'MÚSICA · CIFRA E LETRA';
      el['setlist-title'].textContent = song?.title || 'Música';
      el['setlist-meta'].textContent = `${song?.artist || 'Artista não informado'} · Tom ${song?.executionKey || '—'}`;
      el['performance-back-link'].href = `consultar.html?song=${encodeURIComponent(state.songId)}`;
      el['performance-back-label'].textContent = 'Músicas';
      el['song-strip'].hidden = true;
      el['song-navigation'].hidden = true;
      document.title = `${el['setlist-title'].textContent} — Modo palco | IDE Music`;
      return;
    }

    el['setlist-title'].textContent = safeText(state.setlist?.nome || state.setlist?.name, 'Setlist');
    const date = formatDate(state.setlist?.data || state.setlist?.date);
    const count = state.songs.length;
    el['setlist-meta'].textContent = `${date} · ${count} música${count === 1 ? '' : 's'}`;
    document.title = `${el['setlist-title'].textContent} — Cifra e letra | IDE Music`;
  }

  function renderSongStrip() {
    if (state.songId) return;
    el['song-strip-list'].innerHTML = state.songs.map((song, index) => `
      <button class="song-strip-button${index === state.activeIndex ? ' is-active' : ''}" type="button" data-song-index="${index}" aria-current="${index === state.activeIndex ? 'true' : 'false'}">
        <span>${index + 1}</span><strong>${escapeHtml(song.title)}</strong><small>${escapeHtml(song.executionKey)}</small>
      </button>
    `).join('');
  }

  function getActiveSong() {
    return state.songs[state.activeIndex] || null;
  }

  function renderContent(song) {
    const viewKey = shiftKey(song.executionKey, state.transposeOffset);
    el['song-key'].textContent = `Tom ${viewKey}`;
    el['execution-key'].textContent = song.executionKey;

    const chordSource = song.chordText;
    const transposed = chordSource
      ? globalScope.LouvorChordTransposer.transposeText(chordSource, song.originalKey, viewKey)
      : '';
    el['chords-content'].innerHTML = transposed
      ? globalScope.LouvorChordTransposer.highlightChords(transposed)
      : '';
    el['lyrics-content'].textContent = song.lyricsText;

    const isChords = state.mode === 'chords';
    el['chords-content'].hidden = !isChords || !transposed;
    el['lyrics-content'].hidden = isChords || !song.lyricsText;
    el['transpose-controls'].hidden = !isChords;
    el['view-chords'].classList.toggle('is-active', isChords);
    el['view-lyrics'].classList.toggle('is-active', !isChords);
    el['view-chords'].setAttribute('aria-pressed', String(isChords));
    el['view-lyrics'].setAttribute('aria-pressed', String(!isChords));

    const missing = isChords ? !transposed : !song.lyricsText;
    el['content-empty'].hidden = !missing;
    el['content-empty'].textContent = isChords
      ? 'Cifra não cadastrada para esta música.'
      : 'Letra não cadastrada para esta música.';

    document.documentElement.style.setProperty('--setlist-font-size', `${state.fontSize}px`);
    el['font-size-value'].textContent = `${state.fontSize}px`;
  }

  function renderNavigation() {
    if (state.songId) return;
    const previousIndex = getAdjacentIndex(state.activeIndex, -1, state.songs.length);
    const nextIndex = getAdjacentIndex(state.activeIndex, 1, state.songs.length);
    const previous = previousIndex >= 0 ? state.songs[previousIndex] : null;
    const next = nextIndex >= 0 ? state.songs[nextIndex] : null;

    el['previous-song'].disabled = !previous;
    el['next-song'].disabled = !next;
    el['previous-song-label'].textContent = previous?.title || 'Início do setlist';
    el['next-song-label'].textContent = next?.title || 'Fim do setlist';
  }

  function renderActiveSong({ focusContent = false } = {}) {
    const song = getActiveSong();
    if (!song) {
      el.viewer.hidden = false;
      el['song-title'].textContent = 'Nenhuma música neste setlist';
      el['song-artist'].textContent = 'Adicione músicas na edição do setlist.';
      el['song-position'].textContent = 'Setlist vazio';
      el['song-minister'].textContent = 'Sem ministro';
      el['song-key'].textContent = 'Tom —';
      el['chords-content'].hidden = true;
      el['lyrics-content'].hidden = true;
      el['content-empty'].hidden = false;
      el['content-empty'].textContent = 'Não há músicas para exibir.';
      return;
    }

    el['song-position'].textContent = state.songId ? 'Música avulsa' : `Música ${state.activeIndex + 1} de ${state.songs.length}`;
    el['song-title'].textContent = song.title;
    el['song-artist'].textContent = song.artist;
    el['song-minister'].innerHTML = `<i class="fa-solid fa-user" aria-hidden="true"></i> ${escapeHtml(song.minister)}`;
    renderSongStrip();
    renderContent(song);
    renderNavigation();
    if (focusContent) el[state.mode === 'chords' ? 'chords-content' : 'lyrics-content'].focus({ preventScroll: true });
  }

  function selectSong(index) {
    if (!Number.isInteger(index) || index < 0 || index >= state.songs.length) return;
    state.activeIndex = index;
    state.transposeOffset = 0;
    renderActiveSong();
    document.querySelector('.performance-song')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function setMode(mode) {
    if (!['chords', 'lyrics'].includes(mode)) return;
    state.mode = mode;
    renderActiveSong({ focusContent: true });
  }

  function changeFont(delta) {
    state.fontSize = clampFontSize(state.fontSize + delta);
    renderActiveSong();
  }

  function changeTranspose(delta) {
    state.transposeOffset = Math.max(-11, Math.min(11, state.transposeOffset + delta));
    renderActiveSong();
  }

  function setStageMode(enabled) {
    state.stageMode = Boolean(enabled);
    document.body.classList.toggle('stage-mode', state.stageMode);
    el['stage-mode-button'].setAttribute('aria-pressed', String(state.stageMode));
    el['exit-stage-button'].hidden = !state.stageMode;
    if (state.stageMode && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else if (!state.stageMode && document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  }

  function bindEvents() {
    el['song-strip-list'].addEventListener('click', event => {
      const button = event.target.closest('[data-song-index]');
      if (button) selectSong(Number(button.dataset.songIndex));
    });
    el['view-chords'].addEventListener('click', () => setMode('chords'));
    el['view-lyrics'].addEventListener('click', () => setMode('lyrics'));
    el['transpose-down'].addEventListener('click', () => changeTranspose(-1));
    el['transpose-up'].addEventListener('click', () => changeTranspose(1));
    el['transpose-reset'].addEventListener('click', () => { state.transposeOffset = 0; renderActiveSong(); });
    el['font-down'].addEventListener('click', () => changeFont(-2));
    el['font-up'].addEventListener('click', () => changeFont(2));
    el['previous-song'].addEventListener('click', () => selectSong(state.activeIndex - 1));
    el['next-song'].addEventListener('click', () => selectSong(state.activeIndex + 1));
    el['stage-mode-button'].addEventListener('click', () => setStageMode(!state.stageMode));
    el['exit-stage-button'].addEventListener('click', () => setStageMode(false));

    document.addEventListener('keydown', event => {
      if (event.target.closest('input, textarea, select')) return;
      if (!state.songId && event.key === 'ArrowLeft') selectSong(state.activeIndex - 1);
      if (!state.songId && event.key === 'ArrowRight') selectSong(state.activeIndex + 1);
      if (event.key.toLowerCase() === 'c') setMode('chords');
      if (event.key.toLowerCase() === 'l') setMode('lyrics');
      if (event.key === 'Escape' && state.stageMode) setStageMode(false);
    });
  }

  async function init() {
    cacheElements();
    bindEvents();
    try {
      if (!globalScope.LouvorChordTransposer) throw new Error('Transpositor de acordes indisponível.');
      await loadData();
      renderHeader();
      el.loading.hidden = true;
      el.error.hidden = true;
      el.viewer.hidden = false;
      renderActiveSong();
      document.documentElement.classList.remove('auth-pending');
      if (state.startInStageMode) setStageMode(true);
    } catch (error) {
      console.error('[setlist-performance-view]', error);
      showError(error?.message || 'Não foi possível abrir o repertório.');
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})(typeof window !== 'undefined' ? window : globalThis);