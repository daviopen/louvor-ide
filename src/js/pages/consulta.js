/**
 * Catálogo de músicas — orquestração de UI.
 * Regras de busca, filtros e paginação pertencem ao MusicService.
 */
import musicService from '../modules/music-service.js?v=20260826-catalog-fix2';

const PAGE_SIZE = 10;
const LOAD_TIMEOUT_MS = 12000;

class MusicCatalogPage {
  constructor() {
    this.allSongs = [];
    this.filteredSongs = [];
    this.selectedSongId = null;
    this.page = 1;
    this.unsubscribe = null;
    this.loadTimeout = null;
    this.started = false;
  }

  init() {
    this.cacheElements();
    if (!this.list || !this.search) return;
    this.bindEvents();
    this.startWhenAuthenticated();
  }

  cacheElements() {
    this.search = document.getElementById('song-search');
    this.artist = document.getElementById('song-artist-filter');
    this.minister = document.getElementById('song-minister-filter');
    this.key = document.getElementById('song-key-filter');
    this.theme = document.getElementById('song-theme-filter');
    this.filterPanel = document.getElementById('songs-filter-panel');
    this.clear = document.getElementById('songs-clear-filters');
    this.count = document.getElementById('songs-result-count');
    this.loading = document.getElementById('songs-loading');
    this.list = document.getElementById('songs-list');
    this.pagination = document.getElementById('songs-pagination');
    this.prev = document.getElementById('songs-prev-page');
    this.next = document.getElementById('songs-next-page');
    this.pageLabel = document.getElementById('songs-page-label');
    this.emptyViewer = document.getElementById('songs-empty-viewer');
    this.detail = document.getElementById('song-detail');
    this.detailTitle = document.getElementById('song-detail-title');
    this.detailArtist = document.getElementById('song-detail-artist');
    this.detailMeta = document.getElementById('song-detail-meta');
    this.detailCifra = document.getElementById('song-detail-cifra');
    this.detailLink = document.getElementById('song-detail-link');
    this.detailEdit = document.getElementById('song-detail-edit');
    this.detailStage = document.getElementById('song-detail-stage');
  }

  bindEvents() {
    const resetPageAndRender = () => {
      this.page = 1;
      this.render();
    };

    this.search.addEventListener('input', resetPageAndRender);
    [this.artist, this.minister, this.key, this.theme].forEach(select => select?.addEventListener('change', resetPageAndRender));
    this.clear?.addEventListener('click', () => this.clearFilters());
    this.prev?.addEventListener('click', () => this.changePage(-1));
    this.next?.addEventListener('click', () => this.changePage(1));
    window.addEventListener('beforeunload', () => {
      this.clearLoadTimeout();
      if (typeof this.unsubscribe === 'function') this.unsubscribe();
    }, { once: true });
  }

  startWhenAuthenticated() {
    const profile = window.currentMusicIdeProfile;
    if (window.currentMusicIdeUser && profile?.active === true) {
      this.subscribe();
      return;
    }

    const handleAuthReady = event => {
      const { user, profile: readyProfile } = event.detail || {};
      if (!user || readyProfile?.active !== true) return;
      window.removeEventListener('musicIdeAuthReady', handleAuthReady);
      this.subscribe();
    };
    window.addEventListener('musicIdeAuthReady', handleAuthReady);

    Promise.resolve(window.musicIdeAuthReady).then(() => {
      const readyProfile = window.currentMusicIdeProfile;
      if (window.currentMusicIdeUser && readyProfile?.active === true) {
        window.removeEventListener('musicIdeAuthReady', handleAuthReady);
        this.subscribe();
      }
    }).catch(error => this.showLoadError(error));
  }

  async subscribe() {
    if (this.started) return;
    this.started = true;

    try {
      this.setLoading(true);
      this.armLoadTimeout();
      const initialSongs = await musicService.getAllMusicsArray();
      this.consumeSongs(initialSongs);
      this.unsubscribe = await musicService.loadAllMusics(
        snapshot => this.consumeSnapshot(snapshot),
        error => {
          console.error('Falha na atualização em tempo real do catálogo:', error);
          if (this.allSongs.length === 0) this.showLoadError(error);
        }
      );
    } catch (error) {
      this.showLoadError(error);
    }
  }

  armLoadTimeout() {
    this.clearLoadTimeout();
    this.loadTimeout = window.setTimeout(() => {
      if (!this.loading?.hidden) this.showLoadError(new Error('Tempo limite excedido ao carregar o repertório.'));
    }, LOAD_TIMEOUT_MS);
  }

  clearLoadTimeout() {
    if (this.loadTimeout) window.clearTimeout(this.loadTimeout);
    this.loadTimeout = null;
  }

  showLoadError(error) {
    console.error('Erro ao carregar catálogo de músicas:', error);
    this.clearLoadTimeout();
    this.setLoading(false);
    if (this.count) this.count.textContent = 'Não foi possível carregar as músicas.';
    if (this.list) {
      this.list.replaceChildren();
      this.renderEmptyList('Falha ao carregar o repertório', 'Atualize a página. Se o problema continuar, verifique sua permissão de Músicas.');
    }
    if (this.pagination) this.pagination.hidden = true;
  }

  consumeSnapshot(snapshot) {
    const songs = [];
    if (snapshot && typeof snapshot.forEach === 'function') {
      snapshot.forEach(doc => {
        const data = typeof doc.data === 'function' ? doc.data() : doc.data;
        if (doc?.id && data) songs.push({ id: doc.id, ...data });
      });
    }
    this.consumeSongs(songs);
  }

  consumeSongs(songs) {
    this.clearLoadTimeout();
    this.allSongs = (Array.isArray(songs) ? songs : [])
      .filter(song => song && song.id)
      .sort((a, b) => this.songTitle(a).localeCompare(this.songTitle(b), 'pt-BR', { sensitivity: 'base' }));
    this.setLoading(false);
    this.populateFilterOptions();
    this.render();

    if (this.selectedSongId) {
      const selected = this.allSongs.find(song => song.id === this.selectedSongId);
      if (selected) this.renderDetail(selected);
      else this.clearSelection();
    }
  }

  songTitle(song) {
    return String(song?.titulo ?? song?.title ?? song?.nome ?? song?.name ?? '').trim();
  }

  currentFilters() {
    return {
      search: this.search?.value || '',
      artist: this.artist?.value || '',
      minister: this.minister?.value || '',
      key: this.key?.value || '',
      theme: this.theme?.value || ''
    };
  }

  hasActiveFilters() {
    return Object.values(this.currentFilters()).some(Boolean);
  }

  canEditSongs() {
    const profile = window.currentMusicIdeProfile;
    if (!profile) return false;
    if (profile.role === 'SUPER_ADMIN' || profile.isSuperAdmin === true) return true;
    const permission = profile.permissions?.songs;
    const level = typeof permission === 'object' ? permission.level || permission.access : permission;
    return ['EDIT', 'edit', 'write', 'edicao', 'edição'].includes(String(level || ''));
  }

  notifyFilterPanel() {
    this.filterPanel?.dispatchEvent(new CustomEvent('ideFiltersChanged'));
  }

  populateFilterOptions() {
    const current = this.currentFilters();
    const options = musicService.getCatalogOptions(this.allSongs);
    this.fillSelect(this.artist, options.artists, current.artist);
    this.fillSelect(this.minister, options.ministers, current.minister);
    this.fillSelect(this.key, options.keys, current.key);
    this.fillSelect(this.theme, options.themes, current.theme);
  }

  fillSelect(select, options, selectedValue) {
    if (!select) return;
    select.replaceChildren();
    const all = document.createElement('option');
    all.value = '';
    all.textContent = 'Todos';
    select.appendChild(all);
    options.forEach(value => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    });
    if ([...select.options].some(option => option.value === selectedValue)) select.value = selectedValue;
  }

  render() {
    this.filteredSongs = musicService.filterCatalog(this.allSongs, this.currentFilters());
    const pagination = musicService.paginateCatalog(this.filteredSongs, this.page, PAGE_SIZE);
    this.page = pagination.page;

    if (this.clear) this.clear.disabled = !this.hasActiveFilters();
    if (this.count) this.count.textContent = this.resultLabel(this.filteredSongs.length, this.allSongs.length);
    this.list.replaceChildren();

    if (pagination.items.length === 0) {
      this.renderEmptyList(
        this.hasActiveFilters() ? 'Nenhuma música encontrada' : 'Nenhuma música cadastrada',
        this.hasActiveFilters() ? 'Ajuste ou limpe os filtros para ampliar a busca.' : 'Cadastre a primeira música para iniciar o repertório.'
      );
    } else {
      pagination.items.forEach(song => this.list.appendChild(this.createSongRow(song)));
    }

    this.pagination.hidden = pagination.total <= PAGE_SIZE;
    this.prev.disabled = pagination.page <= 1;
    this.next.disabled = pagination.page >= pagination.totalPages;
    this.pageLabel.textContent = `Página ${pagination.page} de ${pagination.totalPages}`;
    this.notifyFilterPanel();
  }

  resultLabel(filtered, total) {
    if (filtered === total) return `${total} ${total === 1 ? 'música' : 'músicas'}`;
    return `${filtered} de ${total} ${total === 1 ? 'música' : 'músicas'}`;
  }

  renderEmptyList(title, description) {
    const empty = document.createElement('div');
    empty.className = 'songs-empty';
    const content = document.createElement('div');
    const icon = document.createElement('i');
    icon.className = 'fa-solid fa-magnifying-glass';
    icon.setAttribute('aria-hidden', 'true');
    const heading = document.createElement('h3');
    heading.textContent = title;
    const text = document.createElement('p');
    text.textContent = description;
    content.append(icon, heading, text);
    if (this.hasActiveFilters()) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ide-button ide-button--secondary ide-button--sm';
      button.textContent = 'Limpar filtros';
      button.addEventListener('click', () => this.clearFilters());
      content.appendChild(button);
    }
    empty.appendChild(content);
    this.list.appendChild(empty);
  }

  createSongRow(song) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'song-row';
    button.setAttribute('aria-current', String(song.id === this.selectedSongId));
    button.addEventListener('click', () => this.selectSong(song));

    const title = document.createElement('span');
    title.className = 'song-row__title';
    title.textContent = this.songTitle(song) || 'Música sem título';

    const meta = document.createElement('span');
    meta.className = 'song-row__meta';
    const values = [
      song.artista ?? song.artist,
      song.tom ?? song.originalKey ?? song.key,
      ...musicService.getMinisterNames(song).slice(0, 2)
    ].filter(Boolean);
    values.forEach(value => {
      const item = document.createElement('span');
      item.textContent = value;
      meta.appendChild(item);
    });

    button.append(title, meta);
    return button;
  }

  selectSong(song) {
    this.selectedSongId = song.id;
    this.renderDetail(song);
    this.render();
    if (window.matchMedia('(max-width: 900px)').matches) this.detail?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  renderDetail(song) {
    this.emptyViewer.hidden = true;
    this.detail.hidden = false;
    this.detailTitle.textContent = this.songTitle(song) || 'Música sem título';
    this.detailArtist.textContent = song.artista || song.artist || 'Artista não informado';
    this.detailCifra.textContent = song.cifra || song.chordSheet || song.chords || 'Cifra não cadastrada.';
    this.detailMeta.replaceChildren();

    const chips = [
      ['Tom', song.tom ?? song.originalKey ?? song.key],
      ['Ministro', musicService.getMinisterNames(song).join(', ')],
      ['Tema', musicService.getThemeValues(song).join(', ')],
      ['BPM', song.bpm]
    ].filter(([, value]) => value !== undefined && value !== null && String(value).trim());

    chips.forEach(([label, value]) => {
      const chip = document.createElement('span');
      chip.className = 'song-chip';
      chip.textContent = `${label}: ${value}`;
      this.detailMeta.appendChild(chip);
    });

    const songId = encodeURIComponent(song.id);
    if (this.detailStage) this.detailStage.href = `setlist-view.html?song=${songId}&stage=1`;
    if (this.detailEdit) {
      this.detailEdit.href = `nova-musica.html?edit=${songId}`;
      this.detailEdit.hidden = !this.canEditSongs();
    }

    const reference = String(song.link || song.referenceUrl || '').trim();
    this.detailLink.hidden = !reference;
    if (reference) this.detailLink.href = reference;
  }

  clearSelection() {
    this.selectedSongId = null;
    this.emptyViewer.hidden = false;
    this.detail.hidden = true;
  }

  clearFilters() {
    this.search.value = '';
    [this.artist, this.minister, this.key, this.theme].forEach(select => { if (select) select.value = ''; });
    this.page = 1;
    this.render();
    this.search.focus();
  }

  changePage(delta) {
    const pagination = musicService.paginateCatalog(this.filteredSongs, this.page + delta, PAGE_SIZE);
    if (pagination.page === this.page) return;
    this.page = pagination.page;
    this.render();
    document.getElementById('catalog-title')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  setLoading(isLoading) {
    if (this.loading) this.loading.hidden = !isLoading;
  }
}

const start = () => new MusicCatalogPage().init();
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
else start();

export { LOAD_TIMEOUT_MS, PAGE_SIZE, MusicCatalogPage };
