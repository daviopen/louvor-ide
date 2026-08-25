(function initUnavailabilityPage(scope) {
  if (!scope || !scope.document) return;
  if (new URLSearchParams(scope.location.search).get('section') !== 'unavailability') return;

  const state = {
    records: [],
    users: [],
    events: [],
    access: { level: 'NONE', canManageOthers: false },
    month: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    editingId: null,
    filterUserId: 'ALL'
  };
  let repository;
  let service;

  function el(id) { return scope.document.getElementById(id); }
  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, char => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[char]));
  }
  function toDate(value) { return scope.MusicIdeUnavailabilityService.toDate(value); }
  function dateKey(value) { return scope.MusicIdeUnavailabilityService.dateKey(value); }
  function actorId() { return scope.currentMusicIdeUser && scope.currentMusicIdeUser.uid; }
  function personName(userId) {
    if (userId === actorId()) return scope.currentMusicIdeProfile?.name || scope.currentMusicIdeUser?.displayName || scope.currentMusicIdeUser?.email || 'Você';
    const user = state.users.find(item => (item.id || item.uid) === userId);
    return user?.name || user?.email || 'Pessoa do ministério';
  }
  function eventName(eventId) {
    if (!eventId) return 'Qualquer evento';
    return state.events.find(item => item.id === eventId)?.name || 'Evento específico';
  }
  function periodName(period) {
    return period ? (scope.MusicIdeUnavailabilityService.PERIOD_LABELS[period] || period) : 'Dia inteiro';
  }
  function formatDate(value) {
    const date = toDate(value);
    return date ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(date) : 'Data inválida';
  }
  function isEditable(record) {
    return scope.MusicIdeUnavailabilityService.isFutureRecord(record, new Date())
      && (record.userId === actorId() || state.access.canManageOthers);
  }
  function filteredRecords() {
    return state.records.filter(record => state.filterUserId === 'ALL' || record.userId === state.filterUserId);
  }
  function futureRecords() {
    const now = new Date();
    return filteredRecords().filter(record => scope.MusicIdeUnavailabilityService.isFutureRecord(record, now));
  }
  function toast(message, type = 'success') {
    const node = el('unavailability-toast');
    if (!node) return;
    node.textContent = message;
    node.dataset.type = type;
    node.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { node.hidden = true; }, 4500);
  }
  function setBusy(busy) {
    const node = el('unavailability-loading');
    if (node) node.hidden = !busy;
    const root = el('unavailability-content');
    if (root) root.setAttribute('aria-busy', String(busy));
  }

  function renderList() {
    const records = futureRecords();
    el('unavailability-empty').hidden = records.length !== 0;
    el('unavailability-list').innerHTML = records.map(record => {
      const date = toDate(record.date);
      const day = date ? String(date.getDate()).padStart(2, '0') : '--';
      const month = date ? new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(date).replace('.', '') : '';
      const administrativeLabel = state.access.canManageOthers ? `<strong>${escapeHtml(personName(record.userId))}</strong>` : `<strong>${escapeHtml(formatDate(record.date))}</strong>`;
      const dateDescription = state.access.canManageOthers ? escapeHtml(formatDate(record.date)) : '';
      const note = record.note ? `<small>${escapeHtml(record.note)}</small>` : '';
      const actions = isEditable(record) ? `<div class="unavailability-item-actions">
        <button class="ide-button ide-button--secondary ide-button--sm" type="button" data-unavailability-action="edit" data-id="${escapeHtml(record.id)}">Editar</button>
        <button class="ide-button ide-button--danger ide-button--sm" type="button" data-unavailability-action="delete" data-id="${escapeHtml(record.id)}">Excluir</button>
      </div>` : '';
      return `<article class="unavailability-item">
        <div class="unavailability-date-badge"><strong>${day}</strong><span>${escapeHtml(month)}</span></div>
        <div class="unavailability-item-main">
          ${administrativeLabel}
          ${dateDescription ? `<small>${dateDescription}</small>` : ''}
          <div class="unavailability-item-meta">
            <span class="ide-badge">${escapeHtml(periodName(record.period))}</span>
            <span class="ide-badge ide-badge--neutral">${escapeHtml(eventName(record.eventId))}</span>
          </div>
          ${note}
        </div>
        ${actions}
      </article>`;
    }).join('');
  }

  function renderCalendar() {
    const month = state.month;
    el('calendar-label').textContent = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(month);
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const cursor = new Date(first);
    cursor.setDate(cursor.getDate() - cursor.getDay());
    const today = dateKey(new Date());
    const counts = new Map();
    filteredRecords().forEach(record => {
      const key = dateKey(record.date);
      if (key) counts.set(key, (counts.get(key) || 0) + 1);
    });
    const cells = [];
    for (let index = 0; index < 42; index += 1) {
      const date = new Date(cursor);
      date.setDate(cursor.getDate() + index);
      const key = dateKey(date);
      const count = counts.get(key) || 0;
      const outside = date.getMonth() !== month.getMonth();
      const classes = ['unavailability-day'];
      if (outside) classes.push('unavailability-day--outside');
      if (key === today) classes.push('unavailability-day--today');
      if (count) classes.push('unavailability-day--marked');
      const aria = `${formatDate(date)}${count ? `, ${count} indisponibilidade${count === 1 ? '' : 's'}` : ''}`;
      cells.push(`<div class="${classes.join(' ')}" role="gridcell" aria-label="${escapeHtml(aria)}"><span class="unavailability-day-number">${date.getDate()}</span>${count ? `<span class="unavailability-day-count" aria-hidden="true">${count}</span>` : ''}</div>`);
    }
    el('unavailability-calendar').innerHTML = cells.join('');
  }

  function renderUserOptions() {
    if (!state.access.canManageOthers) return;
    const own = { id: actorId(), name: scope.currentMusicIdeProfile?.name || scope.currentMusicIdeUser?.displayName || scope.currentMusicIdeUser?.email || 'Você' };
    const users = [own, ...state.users.filter(item => (item.id || item.uid) !== actorId())];
    const options = users.map(user => `<option value="${escapeHtml(user.id || user.uid)}">${escapeHtml(user.name || user.email || 'Usuário')}</option>`).join('');
    el('unavailability-user').innerHTML = options;
    el('admin-user-filter').innerHTML = `<option value="ALL">Todas</option>${options}`;
    el('admin-user-filter').value = state.filterUserId;
  }

  function renderEventOptions() {
    const now = new Date();
    const events = state.events.filter(event => {
      const date = toDate(event.date);
      return !date || date >= new Date(now.getFullYear(), now.getMonth(), now.getDate());
    });
    el('unavailability-event').innerHTML = '<option value="">Qualquer evento nesta data</option>' + events.map(event => `<option value="${escapeHtml(event.id)}">${escapeHtml(event.name || 'Evento')} · ${escapeHtml(formatDate(event.date))}</option>`).join('');
  }

  function openForm(record = null) {
    state.editingId = record?.id || null;
    el('unavailability-id').value = state.editingId || '';
    el('unavailability-form-title').textContent = record ? 'Editar indisponibilidade' : 'Nova indisponibilidade';
    el('unavailability-date').min = dateKey(new Date());
    el('unavailability-date').value = record ? dateKey(record.date) : dateKey(new Date());
    el('unavailability-period').value = record?.period || '';
    el('unavailability-event').value = record?.eventId || '';
    el('unavailability-note').value = record?.note || '';
    el('unavailability-note-count').textContent = String((record?.note || '').length);
    if (state.access.canManageOthers) {
      el('unavailability-user').value = record?.userId || actorId();
      el('unavailability-user').disabled = Boolean(record);
    }
    el('unavailability-dialog').showModal();
    el('unavailability-date').focus();
  }

  async function submitForm(event) {
    event.preventDefault();
    const targetUserId = state.access.canManageOthers ? el('unavailability-user').value : actorId();
    const payload = {
      userId: targetUserId,
      date: el('unavailability-date').value,
      period: el('unavailability-period').value,
      eventId: el('unavailability-event').value || null,
      note: el('unavailability-note').value
    };
    if (state.access.canManageOthers && targetUserId !== actorId()) {
      const action = state.editingId ? 'Alterar' : 'Registrar';
      if (!scope.confirm(`${action} a indisponibilidade de ${personName(targetUserId)}? Esta ação ficará registrada na auditoria.`)) return;
    }
    el('unavailability-submit').disabled = true;
    try {
      if (state.editingId) {
        await service.update(state.editingId, payload, scope.currentMusicIdeUser, scope.currentMusicIdeProfile, { access: state.access });
        toast('Indisponibilidade atualizada.');
      } else {
        await service.create(payload, scope.currentMusicIdeUser, scope.currentMusicIdeProfile, { access: state.access });
        toast('Indisponibilidade registrada.');
      }
      el('unavailability-dialog').close();
      await loadRecords();
    } catch (error) {
      console.error(error);
      toast(error.message || 'Não foi possível salvar a indisponibilidade.', 'error');
    } finally {
      el('unavailability-submit').disabled = false;
    }
  }

  async function handleListClick(event) {
    const button = event.target.closest('button[data-unavailability-action]');
    if (!button) return;
    const record = state.records.find(item => item.id === button.dataset.id);
    if (!record) return;
    if (button.dataset.unavailabilityAction === 'edit') return openForm(record);
    if (button.dataset.unavailabilityAction !== 'delete') return;
    const target = record.userId === actorId() ? 'esta indisponibilidade' : `a indisponibilidade de ${personName(record.userId)}`;
    const suffix = record.userId !== actorId() ? ' A ação ficará registrada na auditoria.' : '';
    if (!scope.confirm(`Excluir ${target}?${suffix}`)) return;
    try {
      await service.remove(record.id, scope.currentMusicIdeUser, scope.currentMusicIdeProfile, { access: state.access });
      toast('Indisponibilidade excluída.');
      await loadRecords();
    } catch (error) {
      console.error(error);
      toast(error.message || 'Não foi possível excluir a indisponibilidade.', 'error');
    }
  }

  async function loadRecords() {
    setBusy(true);
    try {
      state.records = await service.list(scope.currentMusicIdeUser, scope.currentMusicIdeProfile, { access: state.access, all: state.access.canManageOthers });
      renderList();
      renderCalendar();
    } catch (error) {
      console.error(error);
      toast(error.message || 'Não foi possível carregar as indisponibilidades.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function loadReferences() {
    if (state.access.canManageOthers) {
      try { state.users = await repository.listActiveUsers(); }
      catch (error) { console.error(error); toast('Não foi possível carregar a lista de pessoas.', 'error'); }
    }
    try {
      state.events = await repository.listEvents();
    } catch (error) {
      state.events = [];
      el('unavailability-event-help').textContent = 'O catálogo de eventos não está disponível para sua permissão atual. A indisponibilidade será aplicada de forma geral na data.';
    }
    renderUserOptions();
    renderEventOptions();
  }

  function wireEvents() {
    el('new-unavailability').addEventListener('click', () => openForm());
    el('unavailability-form').addEventListener('submit', submitForm);
    el('unavailability-close').addEventListener('click', () => el('unavailability-dialog').close());
    el('unavailability-cancel').addEventListener('click', () => el('unavailability-dialog').close());
    el('unavailability-list').addEventListener('click', handleListClick);
    el('unavailability-note').addEventListener('input', event => { el('unavailability-note-count').textContent = String(event.target.value.length); });
    el('calendar-prev').addEventListener('click', () => { state.month = new Date(state.month.getFullYear(), state.month.getMonth() - 1, 1); renderCalendar(); });
    el('calendar-next').addEventListener('click', () => { state.month = new Date(state.month.getFullYear(), state.month.getMonth() + 1, 1); renderCalendar(); });
    el('admin-user-filter').addEventListener('change', event => { state.filterUserId = event.target.value; renderList(); renderCalendar(); });
  }

  async function bootstrap() {
    const root = el('unavailability-content');
    const placeholder = el('module-placeholder');
    if (root) root.hidden = false;
    if (placeholder) placeholder.hidden = true;
    scope.document.title = 'IDE Music — Indisponibilidade';

    const authUser = await scope.musicIdeAuthReady;
    if (!authUser) return;
    if (!scope.firebase || typeof scope.firebase.firestore !== 'function') return toast('Firestore indisponível.', 'error');

    repository = new scope.MusicIdeUnavailabilityRepository.UnavailabilityRepository(scope.firebase.firestore());
    service = new scope.MusicIdeUnavailabilityService.UnavailabilityService(repository);
    state.access = await service.resolveAccess(scope.currentMusicIdeUser, scope.currentMusicIdeProfile);

    el('unavailability-admin-note').hidden = !state.access.canManageOthers;
    el('unavailability-user-wrap').hidden = !state.access.canManageOthers;
    el('admin-user-filter-wrap').hidden = !state.access.canManageOthers;
    wireEvents();
    await loadReferences();
    await loadRecords();
  }

  if (scope.document.readyState === 'loading') scope.document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
  else bootstrap();
})(window);
