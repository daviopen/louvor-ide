import musicRepository from '../../repositories/music-repository.js';
import {
  buildMusicAIImportMetadata,
  buildSourceType,
  normalizeBpm,
  normalizeMusicalKey,
  normalizeTimeSignature,
  parseYouTubeReference,
  validateMusicAIInput
} from '../../services/music-ai-contract.js';
import { createMusicAIProvider } from '../../services/music-ai-provider.js';

const form = document.getElementById('song-form');
const statusEl = document.getElementById('status');
const saveBtn = document.getElementById('save-btn');
const cancelBtn = document.getElementById('cancel-btn');
const ministerList = document.getElementById('minister-list');
const preview = document.getElementById('preview');
const params = new URLSearchParams(location.search);
const editId = params.get('edit') || params.get('id');
const aiProvider = createMusicAIProvider(window);

let dirty = false;
let saving = false;
let aiBusy = false;
let initialSnapshot = '';
let ministers = [];
let activePreview = 'cifra';
let pendingAiMetadata = null;
let aiSuggestionApplied = false;

function returnUrl() {
  const navigation = window.MusicIdeNavigationState;
  return navigation ? navigation.resolveReturnUrl('consultar.html', 'songs') : 'consultar.html';
}

function currentUser() {
  return window.firebase?.auth?.().currentUser || null;
}

function canUseAI() {
  const actor = currentUser();
  const profile = window.currentMusicIdeProfile;
  if (!actor?.uid || !profile || profile.active !== true) return false;
  if (String(profile.role || '').toUpperCase() === 'SUPER_ADMIN') return true;
  return String(profile.permissions?.songs || '').toUpperCase() === 'EDIT';
}

function setStatus(message, type = '') {
  statusEl.textContent = message;
  statusEl.className = `status show ${type}`.trim();
}

function clearStatus() {
  statusEl.className = 'status';
  statusEl.textContent = '';
}

function installAIStyles() {
  if (document.querySelector('link[data-music-ai-styles]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '../styles/music-ai-import.css';
  link.dataset.musicAiStyles = 'true';
  document.head.appendChild(link);
}

function createField({ id, label, type = 'text', placeholder = '', full = false, attrs = {} }) {
  const wrapper = document.createElement('div');
  wrapper.className = `field${full ? ' full' : ''}`;
  const labelEl = document.createElement('label');
  labelEl.htmlFor = id;
  labelEl.textContent = label;
  const input = document.createElement(type === 'textarea' ? 'textarea' : 'input');
  input.id = id;
  if (type !== 'textarea') input.type = type;
  if (placeholder) input.placeholder = placeholder;
  Object.entries(attrs).forEach(([key, value]) => input.setAttribute(key, String(value)));
  wrapper.append(labelEl, input);
  return wrapper;
}

function installMetadataFields() {
  if (document.getElementById('bpm')) return;
  const referenceField = document.getElementById('link')?.closest('.field');
  const grid = referenceField?.parentElement;
  if (!referenceField || !grid) return;

  const bpmField = createField({
    id: 'bpm',
    label: 'BPM',
    type: 'number',
    placeholder: 'Ex.: 72',
    attrs: { min: 30, max: 300, inputmode: 'numeric' }
  });
  const timeSignatureField = createField({
    id: 'compasso',
    label: 'Compasso',
    placeholder: 'Ex.: 4/4',
    attrs: { maxlength: 12 }
  });
  const youtubeField = createField({
    id: 'youtube',
    label: 'Vídeo de referência (YouTube)',
    type: 'url',
    placeholder: 'https://www.youtube.com/watch?v=...',
    full: true,
    attrs: { maxlength: 2048 }
  });

  referenceField.after(bpmField, timeSignatureField, youtubeField);
}

function createAIImportUI() {
  if (editId || document.getElementById('ai-import-panel')) return;
  const panel = form.querySelector('.panel');
  const formGrid = panel?.querySelector('.form-grid');
  if (!panel || !formGrid) return;

  const switcher = document.createElement('div');
  switcher.className = 'song-mode-switch';
  switcher.setAttribute('role', 'tablist');
  switcher.setAttribute('aria-label', 'Modo de cadastro');

  const manualButton = document.createElement('button');
  manualButton.type = 'button';
  manualButton.id = 'manual-mode-btn';
  manualButton.className = 'song-mode-button';
  manualButton.setAttribute('role', 'tab');
  manualButton.setAttribute('aria-selected', 'true');
  manualButton.textContent = 'Cadastro manual';

  const aiButton = document.createElement('button');
  aiButton.type = 'button';
  aiButton.id = 'ai-mode-btn';
  aiButton.className = 'song-mode-button';
  aiButton.setAttribute('role', 'tab');
  aiButton.setAttribute('aria-selected', 'false');
  aiButton.setAttribute('aria-controls', 'ai-import-panel');
  aiButton.textContent = 'Importar com IA';
  switcher.append(manualButton, aiButton);

  const aiPanel = document.createElement('section');
  aiPanel.id = 'ai-import-panel';
  aiPanel.className = 'ai-import-panel';
  aiPanel.hidden = true;
  aiPanel.setAttribute('role', 'tabpanel');
  aiPanel.setAttribute('aria-labelledby', 'ai-mode-btn');

  const intro = document.createElement('div');
  intro.className = 'ai-import-intro';
  const badge = document.createElement('span');
  badge.className = 'ai-badge';
  badge.textContent = 'Assistido por IA';
  const title = document.createElement('h3');
  title.textContent = 'Analise uma cifra antes de preencher o cadastro';
  const description = document.createElement('p');
  description.textContent = 'Cole a cifra ou o texto. Você também pode informar uma URL pública. A IA somente sugere dados: nada é salvo até você revisar o formulário e clicar em Salvar música.';
  intro.append(badge, title, description);

  const grid = document.createElement('div');
  grid.className = 'ai-import-grid';
  const urlField = createField({
    id: 'ai-source-url',
    label: 'URL da cifra ou fonte (opcional)',
    type: 'url',
    placeholder: 'https://...',
    full: true,
    attrs: { maxlength: 2048, 'data-ai-input': 'true' }
  });
  const textField = createField({
    id: 'ai-source-text',
    label: 'Cifra ou texto para análise',
    type: 'textarea',
    placeholder: 'Cole aqui a cifra, letra ou estrutura que você possui...',
    full: true,
    attrs: { maxlength: 120000, 'data-ai-input': 'true' }
  });
  const textHelp = document.createElement('span');
  textHelp.className = 'help';
  textHelp.textContent = 'Se a URL não puder ser acessada, cole o conteúdo aqui e tente novamente. Não há Tap Tempo e não usamos scraper próprio.';
  textField.appendChild(textHelp);
  grid.append(urlField, textField);

  const actions = document.createElement('div');
  actions.className = 'ai-import-actions';
  const analyzeButton = document.createElement('button');
  analyzeButton.type = 'button';
  analyzeButton.id = 'ai-analyze-btn';
  analyzeButton.className = 'ai-action primary';
  analyzeButton.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i><span>Analisar com IA</span>';
  const fallbackButton = document.createElement('button');
  fallbackButton.type = 'button';
  fallbackButton.id = 'ai-manual-fallback-btn';
  fallbackButton.className = 'ai-action secondary';
  fallbackButton.textContent = 'Continuar manualmente';
  actions.append(analyzeButton, fallbackButton);

  const aiStatus = document.createElement('p');
  aiStatus.id = 'ai-inline-status';
  aiStatus.className = 'ai-inline-status';
  aiStatus.setAttribute('role', 'status');
  aiStatus.setAttribute('aria-live', 'polite');

  aiPanel.append(intro, grid, actions, aiStatus);

  const review = document.createElement('div');
  review.id = 'ai-review-banner';
  review.className = 'ai-review-banner';
  review.hidden = true;
  review.setAttribute('role', 'status');

  formGrid.before(switcher, aiPanel, review);

  manualButton.addEventListener('click', () => setImportMode('manual'));
  aiButton.addEventListener('click', () => setImportMode('ai'));
  fallbackButton.addEventListener('click', () => setImportMode('manual'));
  analyzeButton.addEventListener('click', analyzeWithAI);
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

function setImportMode(mode) {
  const aiPanel = document.getElementById('ai-import-panel');
  const manualButton = document.getElementById('manual-mode-btn');
  const aiButton = document.getElementById('ai-mode-btn');
  if (!aiPanel || !manualButton || !aiButton) return;
  const useAI = mode === 'ai';
  aiPanel.hidden = !useAI;
  manualButton.setAttribute('aria-selected', String(!useAI));
  aiButton.setAttribute('aria-selected', String(useAI));
  if (useAI) document.getElementById('ai-source-text')?.focus();
}

function setAIStatus(message = '', state = '') {
  const element = document.getElementById('ai-inline-status');
  if (!element) return;
  element.textContent = message;
  element.dataset.state = state;
}

function showAIReview(result) {
  const banner = document.getElementById('ai-review-banner');
  if (!banner) return;
  banner.replaceChildren();

  const title = document.createElement('strong');
  title.textContent = 'Sugestões preenchidas — revise antes de salvar';
  const copy = document.createElement('span');
  copy.textContent = 'Os campos abaixo continuam totalmente editáveis. A música só será persistida quando você clicar em Salvar música.';
  banner.append(title, copy);

  if (result.warnings?.length) {
    const list = document.createElement('ul');
    result.warnings.forEach(warning => {
      const item = document.createElement('li');
      item.textContent = warning;
      list.appendChild(item);
    });
    banner.appendChild(list);
  }
  banner.hidden = false;
}

function setSuggestedValue(id, value) {
  const element = document.getElementById(id);
  if (!element || value == null || value === '') return;
  if (!element.value.trim()) element.value = String(value);
}

function applyAISuggestion(result, aiInput) {
  setSuggestedValue('titulo', result.title);
  setSuggestedValue('artista', result.artist);
  setSuggestedValue('tom', result.originalKey);
  setSuggestedValue('cifra', result.chordSheet);
  setSuggestedValue('letra', result.lyrics);
  setSuggestedValue('compasso', result.timeSignature);
  setSuggestedValue('bpm', result.bpm);
  setSuggestedValue('youtube', result.video?.url);
  setSuggestedValue('link', aiInput.sourceUrl);

  pendingAiMetadata = {
    ...buildMusicAIImportMetadata(result, aiInput, result.providerInfo, new Date()),
    suggestedBpm: result.bpm,
    fallbackUsed: Boolean(result.fallbackUsed)
  };
  aiSuggestionApplied = true;
  showAIReview(result);
  markDirty();
  updatePreview();
}

function getAIInput() {
  return {
    pastedText: document.getElementById('ai-source-text')?.value || '',
    sourceUrl: document.getElementById('ai-source-url')?.value || '',
    youtubeUrl: document.getElementById('youtube')?.value || '',
    manualBpm: document.getElementById('bpm')?.value || ''
  };
}

async function recordAIUsage(action, details) {
  const actor = currentUser();
  if (!actor?.uid) return;
  try {
    await musicRepository.addAuditLog(actor.uid, action, editId || 'new-song-ai-import', details);
  } catch (error) {
    console.warn('Não foi possível registrar auditoria da IA.', error);
  }
}

async function analyzeWithAI() {
  if (aiBusy) return;
  if (!canUseAI()) {
    setAIStatus('Sua sessão não possui permissão de edição de músicas para usar a importação assistida.', 'error');
    return;
  }

  const input = getAIInput();
  const validation = validateMusicAIInput(input);
  if (!validation.valid) {
    setAIStatus(validation.errors.join(' '), 'error');
    return;
  }

  const button = document.getElementById('ai-analyze-btn');
  const providerInfo = aiProvider.getInfo?.() || { provider: 'unknown', model: null };
  aiBusy = true;
  if (button) {
    button.disabled = true;
    button.innerHTML = '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i><span>Analisando...</span>';
  }
  setAIStatus('Analisando o material. Nada será salvo automaticamente.');

  try {
    const result = await aiProvider.analyze(input);
    applyAISuggestion(result, input);
    setAIStatus('Análise concluída. Revise as sugestões no formulário antes de salvar.', 'success');
    await recordAIUsage('SONG_AI_IMPORT_SUCCEEDED', {
      provider: result.providerInfo?.provider || providerInfo.provider,
      model: result.providerInfo?.model || providerInfo.model,
      schemaVersion: result.schemaVersion,
      sourceType: buildSourceType(input),
      hasPastedText: Boolean(validation.value.pastedText),
      hasSourceUrl: Boolean(validation.value.sourceUrl),
      fallbackUsed: Boolean(result.fallbackUsed),
      warningCount: result.warnings?.length || 0
    });
  } catch (error) {
    const message = error?.message || 'A IA não pôde concluir a análise. Continue pelo cadastro manual.';
    setAIStatus(`${message} Você pode continuar pelo cadastro manual sem perder o que já digitou.`, 'error');
    await recordAIUsage('SONG_AI_IMPORT_FAILED', {
      provider: providerInfo.provider,
      model: providerInfo.model,
      sourceType: buildSourceType(input),
      errorCode: String(error?.code || 'FAILED').slice(0, 80),
      hasPastedText: Boolean(validation.value.pastedText),
      hasSourceUrl: Boolean(validation.value.sourceUrl)
    });
  } finally {
    aiBusy = false;
    if (button) {
      button.disabled = false;
      button.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i><span>Analisar com IA</span>';
    }
  }
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

  const originalKey = document.getElementById('tom').value.trim();
  const bpmValue = document.getElementById('bpm')?.value ?? '';
  const timeSignature = document.getElementById('compasso')?.value.trim() || '';
  const youtubeUrl = document.getElementById('youtube')?.value.trim() || '';
  const video = parseYouTubeReference(youtubeUrl);

  return {
    titulo: document.getElementById('titulo').value.trim(),
    artista: document.getElementById('artista').value.trim(),
    tom: originalKey,
    originalKey,
    bpm: bpmValue === '' ? null : Number(bpmValue),
    compasso: timeSignature || null,
    timeSignature: timeSignature || null,
    tema: document.getElementById('tema').value.trim() || null,
    link: document.getElementById('link').value.trim() || null,
    youtubeUrl: youtubeUrl || null,
    video,
    cifra: document.getElementById('cifra').value.trim(),
    letra: document.getElementById('letra').value.trim(),
    observacoes: document.getElementById('observacoes').value.trim() || null,
    ministros: selection.map(item => item.name),
    ministerUserIds: selection.map(item => item.userId),
    tomMinistro: Object.keys(tomMinistro).length ? tomMinistro : null
  };
}

function validate(data) {
  const errors = [];
  if (data.titulo.length < 2) errors.push('Informe o nome da música.');
  if (!data.artista) errors.push('Informe o artista.');
  if (!data.tom) errors.push('Informe o tom original.');
  else if (!normalizeMusicalKey(data.tom)) errors.push('Informe um tom musical válido, como E, F#, Bb ou Am.');
  if (!data.cifra) errors.push('Informe a cifra.');
  if (data.bpm != null && normalizeBpm(data.bpm) == null) errors.push('Informe um BPM entre 30 e 300.');
  if (data.timeSignature && !normalizeTimeSignature(data.timeSignature)) errors.push('Informe um compasso válido, como 4/4 ou 6/8.');
  if (data.link) {
    try { new URL(data.link); } catch { errors.push('Informe um link de referência válido.'); }
  }
  if (data.youtubeUrl && !parseYouTubeReference(data.youtubeUrl)) errors.push('Informe uma URL válida do YouTube.');
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

  document.getElementById('titulo').value = song.titulo || song.title || '';
  document.getElementById('artista').value = song.artista || song.artist || '';
  document.getElementById('tom').value = song.originalKey || song.tom || '';
  document.getElementById('bpm').value = song.bpm || '';
  document.getElementById('compasso').value = song.timeSignature || song.compasso || '';
  document.getElementById('tema').value = song.tema || song.theme || '';
  document.getElementById('link').value = song.link || song.referenceUrl || song.sourceUrl || '';
  document.getElementById('youtube').value = song.video?.url || song.youtubeUrl || '';
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

function summarizeSongForAudit(data = {}) {
  return {
    titulo: data.titulo || null,
    artista: data.artista || null,
    originalKey: data.originalKey || data.tom || null,
    bpm: data.bpm ?? null,
    timeSignature: data.timeSignature || null,
    theme: data.tema || null,
    hasChordSheet: Boolean(data.cifra),
    hasLyrics: Boolean(data.letra),
    ministerUserIds: Array.isArray(data.ministerUserIds) ? data.ministerUserIds : [],
    creationMode: data.creationMode || null,
    sourceType: data.sourceType || null,
    sourceProvider: data.sourceProvider || null
  };
}

function buildPersistablePayload(data) {
  const normalizedKey = normalizeMusicalKey(data.originalKey);
  const normalizedBpm = normalizeBpm(data.bpm);
  const normalizedTimeSignature = normalizeTimeSignature(data.timeSignature);
  const base = {
    ...data,
    tom: normalizedKey,
    originalKey: normalizedKey,
    bpm: normalizedBpm,
    compasso: normalizedTimeSignature,
    timeSignature: normalizedTimeSignature,
    creationMode: aiSuggestionApplied ? 'ai_assisted' : 'manual'
  };

  if (!aiSuggestionApplied || !pendingAiMetadata) return base;
  const importedAt = new Date();
  const bpmSource = normalizedBpm == null
    ? null
    : Number(pendingAiMetadata.suggestedBpm) === normalizedBpm ? 'ai' : 'manual';

  return {
    ...base,
    sourceUrl: pendingAiMetadata.sourceUrl || null,
    sourceProvider: pendingAiMetadata.sourceProvider || null,
    sourceType: pendingAiMetadata.sourceType || null,
    importedAt,
    sections: pendingAiMetadata.sections || [],
    fieldProvenance: pendingAiMetadata.fieldProvenance || [],
    bpmSource,
    aiImport: {
      schemaVersion: pendingAiMetadata.schemaVersion,
      provider: pendingAiMetadata.provider,
      model: pendingAiMetadata.model,
      fallbackUsed: Boolean(pendingAiMetadata.fallbackUsed),
      warningCount: pendingAiMetadata.warnings?.length || 0,
      importedAt
    }
  };
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
    const payload = buildPersistablePayload(data);
    if (editId) {
      before = await musicRepository.findById(editId);
      await musicRepository.update(editId, { ...payload, updatedAt: new Date() });
    } else {
      const result = await musicRepository.create({ ...payload, createdAt: new Date(), updatedAt: new Date() });
      songId = result.id;
    }

    await musicRepository.replaceMinisterKeys(songId, getMinisterSelection());
    await musicRepository.addAuditLog(actor.uid, editId ? 'SONG_UPDATED' : 'SONG_CREATED', songId, {
      before: summarizeSongForAudit(before || {}),
      after: summarizeSongForAudit(payload),
      creationMode: payload.creationMode,
      aiProvider: payload.aiImport?.provider || null,
      aiModel: payload.aiImport?.model || null
    });

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
    installAIStyles();
    installMetadataFields();
    createAIImportUI();
    configureOptionalLyrics();
    await loadMinisters();
    await loadEdit();
    updatePreview();
    initialSnapshot = snapshot();

    form.querySelectorAll('input:not([data-ai-input]), textarea:not([data-ai-input])').forEach(el => el.addEventListener('input', markDirty));
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
