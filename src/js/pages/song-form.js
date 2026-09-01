import musicRepository from '../../repositories/music-repository.js';
import { mountMusicAIImport, getMusicAIImportMetadata } from '../modules/music-ai-import.js';

const form = document.getElementById('song-form');
const statusEl = document.getElementById('status');
const saveBtn = document.getElementById('save-btn');
const cancelBtn = document.getElementById('cancel-btn');
const ministerList = document.getElementById('minister-list');
const preview = document.getElementById('preview');
const params = new URLSearchParams(location.search);
const editId = params.get('edit') || params.get('id');
let dirty = false;
let saving = false;
let initialSnapshot = '';
let ministers = [];
let activePreview = 'cifra';

function returnUrl() {
  const navigation = window.MusicIdeNavigationState;
  return navigation ? navigation.resolveReturnUrl('consultar.html', 'songs') : 'consultar.html';
}

function currentUser() {
  return window.firebase?.auth?.().currentUser || null;
}

function setStatus(message, type = '') {
  statusEl.textContent = message;
  statusEl.className = `status show ${type}`.trim();
}

function clearStatus() {
  statusEl.className = 'status';
  statusEl.textContent = '';
}

function configureOptionalLyrics() {
  const lyrics = document.getElementById('letra');
  const label = document.querySelector('label[for="letra"]');
  if (lyrics) {
    lyrics.required = false;
    lyrics.removeAttribute('required');
    lyrics.setAttribute('aria-required', 'false');
    lyrics.placeholder = 'Opcional — digite a letra da música, se disponível...';
  }
  label?.classList.remove('required');
}

async function loadMinisters() {
  ministers = await musicRepository.listEligibleMinisters();
  renderMinisters();
}

async function ensureLinkedMinistersVisible(userIds = []) {
  const knownIds = new Set(ministers.map(minister => minister.id));
  const missingIds = [...new Set(userIds.filter(Boolean))].filter(userId => !knownIds.has(userId));
  if (!missingIds.length) return;

  const linkedUsers = await musicRepository.listUsersByIds(missingIds);
  linkedUsers.forEach(user => {
    if (knownIds.has(user.id)) return;
    ministers.push({ ...user, linkedOutsideMinisterRole: true });
    knownIds.add(user.id);
  });
  ministers.sort((a, b) => String(a.name || a.email || '').localeCompare(String(b.name || b.email || ''), 'pt-BR'));
}

function renderMinisters(selected = new Map()) {
  ministerList.replaceChildren();

  if (!ministers.length) {
    const empty = document.createElement('span');
    empty.className = 'help';
    empty.textContent = 'Nenhum usuário ativo com função Ministro foi encontrado.';
    ministerList.appendChild(empty);
    return;
  }

  ministers.forEach(minister => {
    const row = document.createElement('label');
    row.className = 'minister-row';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'minister-check';
    checkbox.dataset.userId = minister.id;
    checkbox.dataset.userName = minister.name || minister.email || 'Ministro';

    const name = document.createElement('span');
    const displayName = minister.name || minister.email || 'Ministro';
    name.textContent = minister.linkedOutsideMinisterRole ? `${displayName} (vínculo existente)` : displayName;
    if (minister.linkedOutsideMinisterRole) {
      row.title = 'Este usuário já está vinculado à música, mas não possui a função Ministro ativa no momento.';
    }

    const key = document.createElement('input');
    key.type = 'text';
    key.className = 'minister-key';
    key.maxLength = 12;
    key.placeholder = 'Tom';
    key.setAttribute('aria-label', `Tom preferido de ${displayName}`);

    if (selected.has(minister.id)) {
      checkbox.checked = true;
      key.value = selected.get(minister.id) || '';
    }

    checkbox.addEventListener('change', () => {
      if (!checkbox.checked) key.value = '';
      markDirty();
    });
    key.addEventListener('input', () => {
      if (key.value.trim()) checkbox.checked = true;
      markDirty();
    });

    row.append(checkbox, name, key);
    ministerList.appendChild(row);
  });
}

function getMinisterSelection() {
  return [...document.querySelectorAll('.minister-row')]
    .map(row => {
      const check = row.querySelector('.minister-check');
      const key = row.querySelector('.minister-key');
      return {
        userId: check.dataset.userId,
        name: check.dataset.userName,
        preferredKey: key.value.trim(),
        selected: check.checked
      };
    })
    .filter(item => item.selected);
}

function getData() {
  const selection = getMinisterSelection();
  const tomMinistro = {};
  selection.forEach(item => {
    if (item.preferredKey) tomMinistro[item.name] = item.preferredKey;
  });
  const aiMetadata = getMusicAIImportMetadata();

  return {
    titulo: document.getElementById('titulo').value.trim(),
    artista: document.getElementById('artista').value.trim(),
    tom: document.getElementById('tom').value.trim(),
    originalKey: document.getElementById('tom').value.trim(),
    tema: document.getElementById('tema').value.trim() || null,
    link: document.getElementById('link').value.trim() || null,
    cifra: document.getElementById('cifra').value.trim(),
    letra: document.getElementById('letra').value.trim(),
    observacoes: document.getElementById('observacoes').value.trim() || null,
    ministros: selection.map(item => item.name),
    ministerUserIds: selection.map(item => item.userId),
    tomMinistro: Object.keys(tomMinistro).length ? tomMinistro : null,
    ...(aiMetadata || { importMethod: 'manual' })
  };
}

function validate(data) {
  const errors = [];
  if (data.titulo.length < 2) errors.push('Informe o nome da música.');
  if (!data.artista) errors.push('Informe o artista.');
  if (!data.tom) errors.push('Informe o tom original.');
  if (!/^(?:[A-G](?:#|b)?)(?:m|maj|min|sus|dim|aug)?(?:\d{0,2})?$/i.test(data.tom)) errors.push('Informe um tom musical válido.');
  if (!data.cifra) errors.push('Informe a cifra.');
  if (data.bpm !== null && data.bpm !== undefined && (!Number.isInteger(Number(data.bpm)) || Number(data.bpm) < 30 || Number(data.bpm) > 260)) {
    errors.push('O BPM deve estar entre 30 e 260.');
  }
  if (data.link) {
    try { new URL(data.link); } catch { errors.push('Informe um link de referência válido.'); }
  }
  if (new Set(data.ministerUserIds).size !== data.ministerUserIds.length) {
    errors.push('Não é permitido repetir o mesmo ministro.');
  }
  return errors;
}

function snapshot() {
  return JSON.stringify(getData());
}

function markDirty() {
  if (!initialSnapshot) return;
  dirty = snapshot() !== initialSnapshot;
  updatePreview();
}

function updatePreview() {
  const value = document.getElementById(activePreview).value.trim();
  preview.textContent = value || `A pré-visualização da ${activePreview} aparecerá aqui.`;
}

async function loadEdit() {
  if (!editId) return null;

  document.title = 'Editar Música — IDE Music';
  document.getElementById('page-title').textContent = 'Editar música';
  setStatus('Carregando música...');

  const song = await musicRepository.findById(editId);
  if (!song) throw new Error('Música não encontrada.');

  document.getElementById('titulo').value = song.titulo || '';
  document.getElementById('artista').value = song.artista || '';
  document.getElementById('tom').value = song.tom || song.originalKey || '';
  document.getElementById('tema').value = song.tema || song.theme || '';
  document.getElementById('link').value = song.link || song.referenceUrl || song.video?.url || '';
  document.getElementById('cifra').value = song.cifra || song.chordSheet || '';
  document.getElementById('letra').value = song.letra || song.lyrics || '';
  document.getElementById('observacoes').value = song.observacoes || song.notes || '';

  const keys = new Map();
  try {
    const entries = await musicRepository.getMinisterKeys(editId);
    entries.forEach(item => keys.set(item.userId, item.preferredKey || ''));
  } catch (error) {
    console.warn('Falha ao carregar tons por ministro.', error);
  }

  if (!keys.size && Array.isArray(song.ministerUserIds)) {
    song.ministerUserIds.forEach(userId => keys.set(userId, ''));
  }
  await ensureLinkedMinistersVisible([...keys.keys()]);
  renderMinisters(keys);
  clearStatus();
  return song;
}

async function save(event) {
  event.preventDefault();
  if (saving) return;
  clearStatus();

  const data = getData();
  const errors = validate(data);
  if (errors.length) {
    setStatus(errors.join(' '), 'error');
    return;
  }

  const actor = currentUser();
  if (!actor?.uid) {
    setStatus('Sua sessão expirou. Entre novamente para salvar a música.', 'error');
    return;
  }

  saving = true;
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...';

  try {
    let before = null;
    let songId = editId;
    if (editId) {
      before = await musicRepository.findById(editId);
      await musicRepository.update(editId, { ...data, updatedAt: new Date() });
    } else {
      const result = await musicRepository.create({ ...data, createdAt: new Date(), updatedAt: new Date() });
      songId = result.id;
    }

    await musicRepository.replaceMinisterKeys(songId, getMinisterSelection());
    const auditDetails = {
      importMethod: data.importMethod || 'manual',
      aiProvider: data.aiProvider || null,
      aiModel: data.aiModel || null,
      aiSchemaVersion: data.aiSchemaVersion || null,
      changedFields: Object.keys(data).filter(key => !['cifra', 'letra', 'observacoes'].includes(key))
    };
    await musicRepository.addAuditLog(actor.uid, editId ? 'SONG_UPDATED' : 'SONG_CREATED', songId, auditDetails);

    initialSnapshot = snapshot();
    dirty = false;
    setStatus(editId ? 'Música atualizada com sucesso.' : 'Música criada com sucesso.', 'success');
    setTimeout(() => { location.href = returnUrl(); }, 700);
  } catch (error) {
    console.error(error);
    setStatus(error?.message || 'Não foi possível salvar a música.', 'error');
  } finally {
    saving = false;
    saveBtn.disabled = false;
    saveBtn.innerHTML = '<i class="fa-solid fa-save"></i> Salvar música';
  }
}

function leavePage() {
  if (!dirty || confirm('Há alterações não salvas. Deseja sair sem salvar?')) {
    location.href = returnUrl();
  }
}

async function init() {
  try {
    configureOptionalLyrics();
    mountMusicAIImport();
    await loadMinisters();
    await loadEdit();
    updatePreview();
    initialSnapshot = snapshot();

    form.querySelectorAll('input, textarea').forEach(el => el.addEventListener('input', markDirty));
    document.querySelectorAll('[data-preview]').forEach(button => button.addEventListener('click', () => {
      document.querySelectorAll('[data-preview]').forEach(item => item.classList.remove('active'));
      button.classList.add('active');
      activePreview = button.dataset.preview;
      updatePreview();
    }));
    form.addEventListener('submit', save);
    cancelBtn.addEventListener('click', leavePage);
    window.addEventListener('beforeunload', event => {
      if (dirty && !saving) {
        event.preventDefault();
        event.returnValue = '';
      }
    });
  } catch (error) {
    console.error(error);
    setStatus(error?.message || 'Não foi possível carregar o formulário.', 'error');
  }
}

void init();
