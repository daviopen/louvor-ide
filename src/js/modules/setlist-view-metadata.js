(function initSetlistViewMetadata(globalScope) {
  'use strict';

  if (!globalScope || !globalScope.document) return;

  const document = globalScope.document;

  function normalizeDressCodeColors(value) {
    if (!Array.isArray(value)) return [];
    return value
      .map(color => String(color || '').trim().toUpperCase())
      .filter(color => /^#[0-9A-F]{6}$/.test(color))
      .slice(0, 3);
  }

  function formatDate(value) {
    if (!value) return '';
    const date = value?.toDate ? value.toDate() : new Date(`${String(value).slice(0, 10)}T12:00:00`);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(date);
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function updateHeaderMeta(setlist) {
    const meta = document.getElementById('setlist-meta');
    if (!meta) return;
    const date = formatDate(setlist?.eventDate || setlist?.data || setlist?.date);
    if (!date) return;
    const count = Number(setlist?.totalMusicas ?? setlist?.musicas?.length ?? setlist?.songs?.length ?? 0);
    meta.textContent = `${date} · ${count} música${count === 1 ? '' : 's'}`;
  }

  function renderDressCode(setlist) {
    const section = document.getElementById('dress-code-view');
    const colorsContainer = document.getElementById('dress-code-colors');
    const empty = document.getElementById('dress-code-empty');
    if (!section || !colorsContainer || !empty) return;

    const colors = normalizeDressCodeColors(setlist?.dressCodeColors);
    section.hidden = false;
    colorsContainer.hidden = colors.length === 0;
    empty.hidden = colors.length > 0;
    colorsContainer.innerHTML = colors.map((color, index) => (
      `<span class="performance-dress-code__swatch" style="--dress-color:${escapeHtml(color)}" title="Cor ${index + 1}: ${escapeHtml(color)}">${escapeHtml(color)}</span>`
    )).join('');
  }

  async function loadSetlistMetadata() {
    const params = new URLSearchParams(globalScope.location.search);
    const setlistId = params.get('id');
    if (!setlistId || params.get('song')) return;
    if (!/^[A-Za-z0-9._-]+$/.test(setlistId)) return;

    try {
      if (!globalScope.firebase || !globalScope.MusicIdeSetlistRepository) return;
      const sharedFirebaseConfig = typeof firebaseConfig !== 'undefined' ? firebaseConfig : globalScope.firebaseConfig;
      if (!globalScope.firebase.apps.length) globalScope.firebase.initializeApp(sharedFirebaseConfig);
      const repository = new globalScope.MusicIdeSetlistRepository.SetlistRepository(globalScope.firebase.firestore());
      const setlist = await repository.getSetlist(setlistId);
      if (!setlist) return;
      updateHeaderMeta(setlist);
      renderDressCode(setlist);
    } catch (error) {
      console.warn('[setlist-view-metadata] Não foi possível carregar metadados do Setlist.', error);
    }
  }

  document.addEventListener('DOMContentLoaded', loadSetlistMetadata);
})(typeof window !== 'undefined' ? window : globalThis);
