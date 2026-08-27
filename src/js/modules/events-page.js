(function loadScheduleAndMonthlyTools(scope) {
  if (!scope || !scope.document) return;
  const section = new URLSearchParams(scope.location.search).get('section');
  const scheduleSections = new Set(['schedules', 'schedules-export', 'schedules-participation']);
  const monthlySections = new Set(['events', 'unavailability', 'schedules', 'schedules-export', 'schedules-participation']);
  if (!monthlySections.has(section)) return;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = scope.document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      scope.document.head.appendChild(script);
    });
  }

  const tasks = [];
  if (scheduleSections.has(section)) {
    const link = scope.document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '../styles/schedules.css?v=20260825-schedules';
    scope.document.head.appendChild(link);
    tasks.push(loadScript('../repositories/schedule-repository.js?v=20260827-monthly'));
  }

  Promise.all(tasks)
    .then(() => scheduleSections.has(section) ? loadScript('../services/schedule-service.js?v=20260827-monthly') : null)
    .then(() => loadScript('../services/schedule-monthly-service.js?v=20260827-monthly'))
    .then(() => section === 'schedules' ? loadScript('../js/modules/schedules-page.js?v=20260827-monthly') : null)
    .then(() => loadScript('../js/modules/schedules-monthly-ui.js?v=20260827-monthly'))
    .catch(error => console.error('Falha ao carregar ferramentas mensais de Escalas.', error));
})(window);

(function initEventsPage(scope) {
  if (!scope || !scope.document) return;
  if (new URLSearchParams(scope.location.search).get('section') !== 'events') return;

  const state = {
    events: [],
    access: { events: 'NONE', schedules: 'NONE', setlists: 'NONE', canRead: false, canEdit: false, canManageLinked: false },
    editingId: null,
    requestId: null,
    search: '',
    status: 'ALL',
    dateFrom: '',
    dateTo: ''
  };
  let repository;
  let service;

  function el(id) { return scope.document.getElementById(id); }
  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  }
  function dateKey(value) { return scope.MusicIdeEventService.dateKey(value); }
  function toDate(value) { return scope.MusicIdeEventService.toDate(value); }
  function eventLabel(status) { return scope.MusicIdeEventService.EVENT_STATUS_LABELS[status] || status || 'Planejado'; }
  function formatDate(value) {
    const date = toDate(value);
    return date ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(date) : 'Data inválida';
  }
  function createRequestId() {
    if (scope.crypto && typeof scope.crypto.randomUUID === 'function') return scope.crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  }
  function toast(message, type = 'success') {
    const node = el('events-toast');
    if (!node) return;
    node.textContent = message;
    node.dataset.type = type;
    node.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { node.hidden = true; }, 4500);
  }
  function setBusy(busy) {
    const loading = el('events-loading');
    if (loading) loading.hidden = !busy;
    const root = el('events-content');
    if (root) root.setAttribute('aria-busy', String(busy));
  }
  function ensureFormFeedback() {
    let node = el('event-form-feedback');
    if (node) return node;
    const actions = scope.document.querySelector('.event-dialog-actions');
    if (!actions) return null;
    node = scope.document.createElement('div');
    node.id = 'event-form-feedback';
    node.className = 'event-linked-permission-note';
    node.setAttribute('role', 'alert');
    node.setAttribute('aria-live', 'assertive');
    node.hidden = true;
    actions.insertAdjacentElement('beforebegin', node);
    return node;
  }
  function clearFormFeedback() {
    const node = ensureFormFeedback();
    if (!node) return;
    node.textContent = '';
    node.hidden = true;
    delete node.dataset.type;
  }
  function showFormFeedback(message, type = 'error') {
    const node = ensureFormFeedback();
    if (!node) return;
    node.textContent = message;
    node.dataset.type = type;
    node.hidden = false;
    if (typeof node.scrollIntoView === 'function') {
      scope.requestAnimationFrame(() => node.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
    }
  }
  function saveErrorMessage(error) {
    const code = String(error?.code || '').toLowerCase();
    if (code.includes('permission-denied')) {
      return 'Não foi possível salvar o evento porque sua conta não possui todas as permissões exigidas. Para criar eventos é necessário ter Edição em Eventos, Escalas e Setlists.';
    }
    if (code.includes('unavailable') || code.includes('network-request-failed')) {
      return 'Não foi possível salvar o evento por uma falha de conexão. Verifique a internet e tente novamente.';
    }
    return error?.message || 'Não foi possível salvar o evento.';
  }
  function setSubmitBusy(busy) {
    const submit = el('event-submit');
    const form = el('event-form');
    if (!submit) return;
    if (busy) {
      submit.dataset.idleLabel = submit.textContent;
      submit.textContent = 'Salvando...';
      submit.disabled = true;
      if (form) form.setAttribute('aria-busy', 'true');
      return;
    }
    submit.disabled = false;
    submit.textContent = submit.dataset.idleLabel || 'Salvar evento';
    delete submit.dataset.idleLabel;
    if (form) form.removeAttribute('aria-busy');
  }

  function ensureDateFilters() {
    const toolbar = scope.document.querySelector('.events-toolbar');
    if (!toolbar || el('events-date-from') || el('events-date-to')) return;
    const markup = `
      <label data-events-filter="date"><span>Data inicial</span><input id="events-date-from" class="ide-field__control ide-field__input" type="date" aria-label="Filtrar eventos a partir da data"></label>
      <label data-events-filter="date"><span>Data final</span><input id="events-date-to" class="ide-field__control ide-field__input" type="date" aria-label="Filtrar eventos até a data"></label>`;
    const clearButton = el('events-clear-filters');
    if (clearButton) clearButton.insertAdjacentHTML('beforebegin', markup);
    else toolbar.insertAdjacentHTML('beforeend', markup);
  }

  function filteredEvents() {
    const term = state.search.trim().toLocaleLowerCase('pt-BR');
    return state.events.filter(item => {
      const statusMatch = state.status === 'ALL' || item.status === state.status;
      if (!statusMatch) return false;
      const itemDate = dateKey(item.date);
      if (state.dateFrom && (!itemDate || itemDate < state.dateFrom)) return false;
      if (state.dateTo && (!itemDate || itemDate > state.dateTo)) return false;
      if (!term) return true;
      const haystack = [item.name, item.location, item.theme, item.description].filter(Boolean).join(' ').toLocaleLowerCase('pt-BR');
      return haystack.includes(term);
    });
  }
  function statusClass(status) {
    if (status === 'CONFIRMED') return 'ide-badge ide-badge--success';
    if (status === 'CANCELLED') return 'ide-badge ide-badge--error';
    if (status === 'COMPLETED') return 'ide-badge ide-badge--info';
    return 'ide-badge ide-badge--warning';
  }
  function isFinal(item) { return scope.MusicIdeEventService.FINAL_STATUSES.includes(item.status); }

  function renderStats() {
    const counts = { PLANNED: 0, CONFIRMED: 0, CANCELLED: 0, COMPLETED: 0 };
    state.events.forEach(item => { if (counts[item.status] != null) counts[item.status] += 1; });
    Object.entries(counts).forEach(([status, count]) => {
      const node = el(`events-stat-${status.toLowerCase()}`);
      if (node) node.textContent = String(count);
    });
  }

  function renderList() {
    const items = filteredEvents();
    const list = el('events-list');
    const empty = el('events-empty');
    if (!list || !empty) return;
    empty.hidden = items.length !== 0;
    list.innerHTML = items.map(item => {
      const location = item.location ? `<span><i class="fa-solid fa-location-dot" aria-hidden="true"></i> ${escapeHtml(item.location)}</span>` : '';
      const theme = item.theme ? `<span><i class="fa-solid fa-tag" aria-hidden="true"></i> ${escapeHtml(item.theme)}</span>` : '';
      const description = item.description ? `<p>${escapeHtml(item.description)}</p>` : '';
      const actions = [];
      if (state.access.canEdit && !isFinal(item)) {
        actions.push(`<button class="ide-button ide-button--secondary ide-button--sm" type="button" data-event-action="edit" data-id="${escapeHtml(item.id)}">Editar</button>`);
        if (state.access.canManageLinked && item.status === 'PLANNED') {
          actions.push(`<button class="ide-button ide-button--secondary ide-button--sm" type="button" data-event-action="confirm" data-id="${escapeHtml(item.id)}">Confirmar</button>`);
        }
        if (state.access.canManageLinked && ['PLANNED', 'CONFIRMED'].includes(item.status)) {
          actions.push(`<button class="ide-button ide-button--secondary ide-button--sm" type="button" data-event-action="complete" data-id="${escapeHtml(item.id)}">Concluir</button>`);
          actions.push(`<button class="ide-button ide-button--danger ide-button--sm" type="button" data-event-action="cancel" data-id="${escapeHtml(item.id)}">Cancelar evento</button>`);
        }
      }
      if (state.access.canManageLinked) {
        actions.push(`<button class="ide-button ide-button--danger ide-button--sm" type="button" data-event-action="delete" data-id="${escapeHtml(item.id)}"><i class="fa-solid fa-trash-can" aria-hidden="true"></i> Excluir evento</button>`);
      }
      return `<article class="events-item">
        <div class="events-item-date"><strong>${escapeHtml(formatDate(item.date))}</strong><span>${item.time ? escapeHtml(item.time) : 'Horário a definir'}</span></div>
        <div class="events-item-main">
          <div class="events-item-title"><h3>${escapeHtml(item.name)}</h3><span class="${statusClass(item.status)}">${escapeHtml(eventLabel(item.status))}</span></div>
          <div class="events-item-meta">${location}${theme}</div>
          ${description}
        </div>
        ${actions.length ? `<div class="events-item-actions">${actions.join('')}</div>` : ''}
      </article>`;
    }).join('');
    renderStats();
  }

  function updateLinkedFieldsState(record) {
    const permitted = !record || state.access.canManageLinked;
    ['event-date', 'event-time', 'event-status'].forEach(id => { const node = el(id); if (node) node.disabled = !permitted; });
    const note = el('event-linked-permission-note');
    if (note) note.hidden = permitted;
  }

  function openForm(record = null) {
    if (!state.access.canEdit) return;
    clearFormFeedback();
    state.editingId = record?.id || null;
    state.requestId = record ? null : createRequestId();
    el('event-id').value = state.editingId || '';
    el('event-form-title').textContent = record ? 'Editar evento' : 'Novo evento';
    el('event-name').value = record?.name || '';
    el('event-date').value = record ? dateKey(record.date) : dateKey(new Date());
    el('event-time').value = record?.time || '';
    el('event-status').value = record?.status || 'PLANNED';
    el('event-location').value = record?.location || '';
    el('event-theme').value = record?.theme || '';
    el('event-description').value = record?.description || '';
    el('event-description-count').textContent = String((record?.description || '').length);
    updateLinkedFieldsState(record);
    el('event-dialog').showModal();
    el('event-name').focus();
  }

  function formPayload() {
    return { name: el('event-name').value, date: el('event-date').value, time: el('event-time').value, status: el('event-status').value, location: el('event-location').value, theme: el('event-theme').value, description: el('event-description').value };
  }

  async function submitForm(event) {
    event.preventDefault();
    const form = el('event-form');
    if (form && !form.checkValidity()) {
      form.reportValidity();
      return;
    }
    clearFormFeedback();
    setSubmitBusy(true);
    try {
      if (state.editingId) { await service.update(state.editingId, formPayload(), scope.currentMusicIdeUser, scope.currentMusicIdeProfile, { access: state.access }); toast('Evento atualizado e vínculos sincronizados quando necessário.'); }
      else { if (!state.access.canManageLinked) throw new Error('Criar evento exige edição também em Escalas e Setlists.'); await service.create(formPayload(), scope.currentMusicIdeUser, scope.currentMusicIdeProfile, { access: state.access, requestId: state.requestId }); toast('Evento, escala e Setlist criados com sucesso.'); }
      el('event-dialog').close(); await loadEvents();
    } catch (error) {
      console.error(error);
      const message = saveErrorMessage(error);
      showFormFeedback(message, 'error');
      toast(message, 'error');
    } finally { setSubmitBusy(false); }
  }

  async function changeStatus(record, targetStatus) {
    const question = targetStatus === 'CANCELLED' ? `Cancelar “${record.name}”? A escala e o Setlist também serão cancelados, preservando o histórico.` : targetStatus === 'COMPLETED' ? `Concluir “${record.name}”? O evento, a escala e o Setlist passarão para histórico.` : `Confirmar “${record.name}”?`;
    if (!scope.confirm(question)) return;
    try { await service.changeStatus(record.id, targetStatus, scope.currentMusicIdeUser, scope.currentMusicIdeProfile, { access: state.access }); toast(targetStatus === 'CANCELLED' ? 'Evento cancelado e histórico preservado.' : targetStatus === 'COMPLETED' ? 'Evento concluído.' : 'Evento confirmado.'); await loadEvents(); }
    catch (error) { console.error(error); toast(error.message || 'Não foi possível alterar o status do evento.', 'error'); }
  }

  async function removeEvent(record) {
    const confirmed = scope.confirm(`Excluir permanentemente “${record.name}”? A escala, o Setlist, os integrantes da escala e as músicas vinculadas também serão excluídos. Esta ação não pode ser desfeita.`);
    if (!confirmed) return;
    try {
      await service.remove(record.id, scope.currentMusicIdeUser, scope.currentMusicIdeProfile, { access: state.access });
      toast('Evento, escala e Setlist excluídos com sucesso.');
      await loadEvents();
    } catch (error) { console.error(error); toast(error.message || 'Não foi possível excluir o evento.', 'error'); }
  }

  async function handleListClick(event) {
    const button = event.target.closest('button[data-event-action]'); if (!button) return;
    const record = state.events.find(item => item.id === button.dataset.id); if (!record) return;
    const action = button.dataset.eventAction;
    if (action === 'edit') return openForm(record); if (action === 'confirm') return changeStatus(record, 'CONFIRMED'); if (action === 'complete') return changeStatus(record, 'COMPLETED'); if (action === 'cancel') return changeStatus(record, 'CANCELLED'); if (action === 'delete') return removeEvent(record);
  }

  async function loadEvents() {
    setBusy(true);
    try { state.events = await service.list(scope.currentMusicIdeUser, scope.currentMusicIdeProfile, { access: state.access }); renderList(); }
    catch (error) { console.error(error); toast(error.message || 'Não foi possível carregar os eventos.', 'error'); }
    finally { setBusy(false); }
  }

  function wireEvents() {
    ensureDateFilters();
    ensureFormFeedback();
    el('new-event').addEventListener('click', () => openForm()); el('event-form').addEventListener('submit', submitForm); el('event-close').addEventListener('click', () => el('event-dialog').close()); el('event-cancel').addEventListener('click', () => el('event-dialog').close()); el('events-list').addEventListener('click', handleListClick);
    el('events-search').addEventListener('input', event => { state.search = event.target.value; renderList(); });
    el('events-status-filter').addEventListener('change', event => { state.status = event.target.value; renderList(); });
    el('events-date-from').addEventListener('change', event => { state.dateFrom = event.target.value; renderList(); });
    el('events-date-to').addEventListener('change', event => { state.dateTo = event.target.value; renderList(); });
    el('events-clear-filters').addEventListener('click', () => { state.search = ''; state.status = 'ALL'; state.dateFrom = ''; state.dateTo = ''; el('events-search').value = ''; el('events-status-filter').value = 'ALL'; el('events-date-from').value = ''; el('events-date-to').value = ''; const month=el('events-month-filter'); if(month) month.value=''; el('events-filter-panel').dispatchEvent(new CustomEvent('ideFiltersChanged')); renderList(); });
    el('event-description').addEventListener('input', event => { el('event-description-count').textContent = String(event.target.value.length); });
  }

  async function bootstrap() {
    const root = el('events-content'); const placeholder = el('module-placeholder'); if (root) root.hidden = false; if (placeholder) placeholder.hidden = true; scope.document.title = 'IDE Music — Eventos';
    const authUser = await scope.musicIdeAuthReady; if (!authUser) return;
    if (!scope.firebase || typeof scope.firebase.firestore !== 'function') return toast('Firestore indisponível.', 'error');
    if (!scope.MusicIdeEventRepository || !scope.MusicIdeEventService) return toast('Módulo de eventos indisponível.', 'error');
    repository = new scope.MusicIdeEventRepository.EventRepository(scope.firebase.firestore()); service = new scope.MusicIdeEventService.EventService(repository); state.access = await service.resolveAccess(scope.currentMusicIdeUser, scope.currentMusicIdeProfile);
    if (!state.access.canRead) return toast('Você não possui permissão para consultar eventos.', 'error');
    el('new-event').hidden = !state.access.canEdit; el('new-event').disabled = !state.access.canManageLinked;
    const linkedNote = el('events-linked-note'); if (linkedNote) { linkedNote.hidden = state.access.canManageLinked; linkedNote.textContent = 'Você pode consultar/editar dados básicos de eventos, mas criar eventos ou alterar data, horário e status exige também permissão de edição em Escalas e Setlists.'; }
    wireEvents(); await loadEvents();
  }

  if (scope.document.readyState === 'loading') scope.document.addEventListener('DOMContentLoaded', bootstrap, { once: true }); else bootstrap();
})(window);