import musicRepository from '../../repositories/music-repository.js';
import { COLLECTIONS } from '../../constants/collections.js';

const page = String(window.location.pathname || '').split('/').pop();

function normalizeSongIdentity(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('pt-BR');
}

function songTitle(song) {
  return String(song?.titulo ?? song?.title ?? song?.nome ?? song?.name ?? '').trim();
}

function songArtist(song) {
  return String(song?.artista ?? song?.artist ?? '').trim();
}

function canEditSongs(profile = window.currentMusicIdeProfile) {
  if (!profile) return false;
  if (profile.role === 'SUPER_ADMIN' || profile.isSuperAdmin === true) return true;
  const permission = profile.permissions?.songs;
  const level = typeof permission === 'object' ? permission.level || permission.access : permission;
  return ['EDIT', 'edit', 'write', 'edicao', 'edição'].includes(String(level || ''));
}

async function findDuplicateSong({ titulo, artista, currentId = null }) {
  const normalizedTitle = normalizeSongIdentity(titulo);
  const normalizedArtist = normalizeSongIdentity(artista);
  if (!normalizedTitle || !normalizedArtist) return null;

  const songs = await musicRepository.findAll();
  return songs.find(song => {
    if (currentId && song.id === currentId) return false;
    return normalizeSongIdentity(songTitle(song)) === normalizedTitle
      && normalizeSongIdentity(songArtist(song)) === normalizedArtist;
  }) || null;
}

function setDuplicateStatus(statusEl, duplicate) {
  if (!statusEl) return;
  if (!duplicate) {
    if (statusEl.dataset.duplicateWarning === 'true') {
      statusEl.textContent = '';
      statusEl.className = 'status';
      delete statusEl.dataset.duplicateWarning;
    }
    return;
  }

  statusEl.textContent = `Já existe uma música cadastrada com o nome “${songTitle(duplicate)}” e o artista “${songArtist(duplicate)}”. Abra o cadastro existente em vez de criar uma duplicidade.`;
  statusEl.className = 'status show error';
  statusEl.dataset.duplicateWarning = 'true';
}

function initializeDuplicateGuard() {
  const form = document.getElementById('song-form');
  const titleInput = document.getElementById('titulo');
  const artistInput = document.getElementById('artista');
  const statusEl = document.getElementById('status');
  if (!form || !titleInput || !artistInput) return;

  const params = new URLSearchParams(window.location.search);
  const currentId = params.get('edit') || params.get('id') || null;
  let bypassNextSubmit = false;
  let checkSequence = 0;
  let debounceTimer = null;

  const checkCurrentIdentity = async ({ showStatus = true } = {}) => {
    const sequence = ++checkSequence;
    const duplicate = await findDuplicateSong({
      titulo: titleInput.value,
      artista: artistInput.value,
      currentId
    });
    if (sequence !== checkSequence) return null;
    if (showStatus) setDuplicateStatus(statusEl, duplicate);
    return duplicate;
  };

  const scheduleCheck = () => {
    window.clearTimeout(debounceTimer);
    if (titleInput.value.trim().length < 2 || !artistInput.value.trim()) {
      setDuplicateStatus(statusEl, null);
      return;
    }
    debounceTimer = window.setTimeout(() => {
      checkCurrentIdentity().catch(error => console.warn('Falha ao verificar duplicidade da música.', error));
    }, 350);
  };

  titleInput.addEventListener('input', scheduleCheck);
  artistInput.addEventListener('input', scheduleCheck);
  titleInput.addEventListener('blur', scheduleCheck);
  artistInput.addEventListener('blur', scheduleCheck);

  form.addEventListener('submit', async event => {
    if (bypassNextSubmit) {
      bypassNextSubmit = false;
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();

    try {
      const duplicate = await checkCurrentIdentity();
      if (duplicate) {
        titleInput.focus();
        return;
      }
      bypassNextSubmit = true;
      form.requestSubmit();
    } catch (error) {
      console.error('Erro ao verificar se a música já existe.', error);
      if (statusEl) {
        statusEl.textContent = 'Não foi possível verificar se esta música já está cadastrada. Tente novamente antes de salvar.';
        statusEl.className = 'status show error';
      }
    }
  }, true);
}

async function songUsageInSetlists(songId) {
  const collection = await musicRepository.getCollection(COLLECTIONS.SETLIST_SONGS);
  const [bySongId, byMusicId] = await Promise.all([
    collection.where('songId', '==', songId).limit(1).get(),
    collection.where('musicId', '==', songId).limit(1).get()
  ]);
  return !bySongId.empty || !byMusicId.empty;
}

async function deleteSongAtomically(songId) {
  const song = await musicRepository.findById(songId);
  if (!song) throw new Error('Música não encontrada. Atualize a página e tente novamente.');

  if (await songUsageInSetlists(songId)) {
    throw new Error('Esta música está vinculada a um ou mais setlists. Remova-a dos setlists antes de excluir o cadastro.');
  }

  const database = await musicRepository.getDatabase();
  const songRef = database.collection(COLLECTIONS.SONGS).doc(songId);
  const ministerKeys = await database.collection(COLLECTIONS.SONG_MINISTER_KEYS).where('songId', '==', songId).get();
  const batch = database.batch();
  ministerKeys.docs.forEach(doc => batch.delete(doc.ref));
  batch.delete(songRef);
  await batch.commit();

  const actor = window.currentMusicIdeUser || window.firebase?.auth?.().currentUser;
  if (actor?.uid) {
    try {
      await musicRepository.addAuditLog(actor.uid, 'SONG_DELETED', songId, {
        titulo: songTitle(song) || null,
        artista: songArtist(song) || null,
        removedMinisterKeys: ministerKeys.size || 0
      });
    } catch (error) {
      console.warn('Música excluída, mas o registro de auditoria falhou.', error);
    }
  }
}

function initializeDeleteAction() {
  const actions = document.querySelector('.song-detail__actions');
  if (!actions || document.getElementById('song-detail-delete')) return;

  const button = document.createElement('button');
  button.id = 'song-detail-delete';
  button.type = 'button';
  button.className = 'ide-button ide-button--danger ide-button--sm';
  button.hidden = true;
  button.innerHTML = '<i class="fa-solid fa-trash" aria-hidden="true"></i> Excluir';
  actions.appendChild(button);

  const refreshAccess = () => {
    button.hidden = !canEditSongs(window.currentMusicIdeProfile);
  };
  refreshAccess();
  window.addEventListener('musicIdeAuthReady', refreshAccess);
  Promise.resolve(window.musicIdeAuthReady).then(refreshAccess).catch(() => {});

  button.addEventListener('click', async () => {
    const songId = new URLSearchParams(window.location.search).get('song');
    if (!songId) return;
    if (!canEditSongs(window.currentMusicIdeProfile)) {
      window.alert('Seu perfil não possui permissão para excluir músicas.');
      return;
    }

    const song = await musicRepository.findById(songId).catch(() => null);
    const label = songTitle(song) || 'esta música';
    if (!window.confirm(`Excluir “${label}”? Esta ação não poderá ser desfeita.`)) return;

    const originalHtml = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Excluindo...';

    try {
      await deleteSongAtomically(songId);
      const url = new URL(window.location.href);
      url.searchParams.delete('song');
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
      window.alert('Música excluída com sucesso.');
    } catch (error) {
      console.error('Não foi possível excluir a música.', error);
      window.alert(error?.message || 'Não foi possível excluir a música.');
    } finally {
      button.disabled = false;
      button.innerHTML = originalHtml;
    }
  });
}

function initialize() {
  if (page === 'nova-musica.html') initializeDuplicateGuard();
  if (page === 'consultar.html') initializeDeleteAction();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
else initialize();

export { normalizeSongIdentity, findDuplicateSong };
