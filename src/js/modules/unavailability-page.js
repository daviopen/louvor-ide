(function initUnavailabilityPage(scope) {
  if (!scope || !scope.document) return;
  const params = new URLSearchParams(scope.location.search);
  if (params.get('section') !== 'unavailability') return;
  const keepAllFuture = params.get('future') === '1';

  const state = {
    records: [],
    users: [],
    events: [],
    access: { level: 'NONE', canManageOthers: false },
    month: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    editingId: null,
    filterUserId: params.get('user') || 'ALL',
    filterMonthKey: '',
    availableMonthKeys: []
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
  function monthKey(value) {
    const date = toDate(value);
    if (!date) return '';
    return `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
  function monthFromKey(value) {
    const match = String(value || '').match(/^(\d{4})-(\d{2})$/);
    return match ? new Date(Number(match[1]), Number(match[2]) - 1, 1) : null;
  }
  function formatMonth(value) {
    const date = typeof value === 'string' ? monthFromKey(value) : toDate(value);
    return date ? new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date) : '';
  }
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
  function isRecurring(record) {
    return Boolean(record?.recurrence?.frequency === 'WEEKLY' && Array.isArray(record.recurrence.weekdays));
  }
  function weekdayNames(record, short = false) {
    if (!isRecurring(record)) return '';
    const labels = scope.MusicIdeUnavailabilityService.WEEKDAY_LABELS || [];
    return record.recurrence.weekdays.map(day => {
      const label = labels[day] || String(day);
      return short ? label.slice(0, 3) : label;
    }).join(', ');
  }
  function formatDateRange(record) {
    if (isRecurring(record)) {
      const start = `A partir de ${formatDate(record.date)}`;
      const end = record.recurrence.openEnded ? 'sem data para terminar' : `até ${formatDate(record.endAt)}`;
      return `${start} · ${end}`;
    }
    const startKey = dateKey(record?.date);
    const endKey = dateKey(record?.endAt || record?.date);
    if (!startKey || !endKey || startKey === endKey) return formatDate(record?.date);
    return `${formatDate(record?.date)} até ${formatDate(record?.endAt)}`;
  }
  function recurrenceTitle(record) {
    if (!isRecurring(record)) return formatDateRange(record);
    const days = weekdayNames(record);
    return record.recurrence.weekdays.length === 1 ? `Toda ${days.toLowerCase()}` : `Toda semana · ${days}`;
  }
  function isEditable(record) {
    return scope.MusicIdeUnavailabilityService.isFutureRecord(record, new Date())
      && (record.userId === actorId() || state.access.canManageOthers);
  }
  function personFilteredRecords() {
    return state.records.filter(record => state.filterUserId === 'ALL' || record.userId === state.filterUserId);
  }
  function recordOverlapsMonth(record, targetMonthKey) {
    const target = monthFromKey(targetMonthKey);
    const start = toDate(record?.date);
    const end = toDate(record?.endAt || record?.date);
    if (!target || !start || !end) return false;
    const first = new Date(target.getFullYear(), target.getMonth(), 1, 0, 0, 0, 0);
    const last = new Date(target.getFullYear(), target.getMonth() + 1, 0, 23, 59, 59, 999);
    if (end < first || start > last) return false;
    if (!isRecurring(record)) return true;

    const from = new Date(Math.max(start.getTime(), first.getTime()));
    const until = new Date(Math.min(end.getTime(), last.getTime()));
    const selected = new Set(record.recurrence.weekdays.map(Number));
    const probe = new Date(from.getFullYear(), from.getMonth(), from.getDate(), 12, 0, 0, 0);
    const maxProbe = new Date(Math.min(until.getTime(), probe.getTime() + (7 * 86400000)));
    while (probe <= maxProbe) {
      if (selected.has(probe.getDay())) return true;
      probe.setDate(probe.getDate() + 1);
    }
    return false;
  }
  function recordsForList() {
    const records = personFilteredRecords();
    if (state.filterMonthKey) return records.filter(record => recordOverlapsMonth(record, state.filterMonthKey));
    const now = new Date();
    return records.filter(record => scope.MusicIdeUnavailabilityService.isFutureRecord(record, now));
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
  function refreshFilterPanel() {
    const panel = el('unavailability-filter-panel');
    if (!panel) return;
    if (scope.MusicIdeFilterPanels && typeof scope.MusicIdeFilterPanels.updatePanel === 'function') {
      scope.MusicIdeFilterPanels.updatePanel(panel);
    } else {
      panel.dispatchEvent(new Event('ideFiltersChanged', { bubbles: true }));
    }
  }

  function ensureEndDateField() {
    if (el('unavailability-end-date')) return;
    const start = el('unavailability-date');
    const startLabel = start && start.closest('label');
    if (!startLabel) return;
    const startLabelText = startLabel.querySelector('.ide-field__label');
    if (startLabelText) startLabelText.innerHTML = 'Data de início <strong aria-hidden="true">*</strong>';
    const label = scope.document.createElement('label');
    label.innerHTML = '<span class="ide-field__label">Data de fim</span><input id="unavailability-end-date" class="ide-field__control ide-field__input" type="date"><small id="unavailability-end-date-help">Opcional. Se ficar em branco, a indisponibilidade vale somente para a data de início.</small>';
    startLabel.insertAdjacentElement('afterend', label);
  }

  function ensureRecurrenceFields() {
    if (el('unavailability-type')) return;
    const userWrap = el('unavailability-user-wrap');
    const start = el('unavailability-date');
    const startLabel = start && start.closest('label');
    if (!startLabel) return;

    const typeLabel = scope.document.createElement('label');
    typeLabel.className = 'full';
    typeLabel.innerHTML = '<span class="ide-field__label">Tipo de indisponibilidade</span><select id="unavailability-type" class="ide-field__control ide-select"><option value="DATE">Por data/período</option><option value="WEEKLY">Recorrente por dia da semana</option></select><small>Use recorrência para restrições fixas, como não poder servir às sextas-feiras.</small>';
    (userWrap || startLabel).insertAdjacentElement(userWrap ? 'afterend' : 'beforebegin', typeLabel);

    const weekdays = scope.document.createElement('fieldset');
    weekdays.id = 'unavailability-weekdays-wrap';
    weekdays.className = 'full unavailability-weekdays-picker';
    weekdays.hidden = true;
    const labels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    weekdays.innerHTML = `<legend class="ide-field__label">Repetir em</legend><div class="unavailability-weekday-options">${labels.map((label, index) => `<label class="unavailability-weekday-option"><input type="checkbox" name="unavailability-weekday" value="${index}"><span>${label}</span></label>`).join('')}</div><small>Selecione um ou mais dias da semana.</small>`;
    const endLabel = el('unavailability-end-date')?.closest('label');
    (endLabel || startLabel).insertAdjacentElement('afterend', weekdays);

    if (!el('unavailability-recurrence-style')) {
      const style = scope.document.createElement('style');
      style.id = 'unavailability-recurrence-style';
      style.textContent = '.unavailability-weekdays-picker{border:0;padding:0;margin:0;min-width:0}.unavailability-weekday-options{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:.4rem;margin-top:.45rem}.unavailability-weekday-option{position:relative}.unavailability-weekday-option input{position:absolute;opacity:0;pointer-events:none}.unavailability-weekday-option span{display:flex;align-items:center;justify-content:center;min-height:42px;padding:.5rem;border:1px solid var(--ide-border,var(--border));border-radius:var(--radius-md);background:var(--ide-surface-secondary,var(--surface-secondary));color:var(--ide-text-primary,var(--text-primary));cursor:pointer;font-weight:600}.unavailability-weekday-option input:checked+span{border-color:var(--ide-primary,var(--primary));background:var(--ide-primary,var(--primary));color:var(--ide-primary-ink,#fff)}.unavailability-weekday-option input:focus-visible+span{outline:2px solid var(--ide-focus,var(--primary));outline-offset:2px}@media(max-width:700px){.unavailability-weekday-options{grid-template-columns:repeat(4,minmax(0,1fr))}}';
      scope.document.head.appendChild(style);
    }
  }

  function selectedWeekdays() {
    return Array.from(scope.document.querySelectorAll('input[name="unavailability-weekday"]:checked')).map(input => Number(input.value));
  }

  function setSelectedWeekdays(days = []) {
    const selected = new Set((days || []).map(Number));
    scope.document.querySelectorAll('input[name="unavailability-weekday"]').forEach(input => { input.checked = selected.has(Number(input.value)); });
  }

  function syncRecurrenceUi() {
    const recurring = el('unavailability-type')?.value === 'WEEKLY';
    const wrap = el('unavailability-weekdays-wrap');
    const end = el('unavailability-end-date');
    const help = el('unavailability-end-date-help');
    if (wrap) wrap.hidden = !recurring;
    if (end) end.required = false;
    if (help) help.textContent = recurring
      ? 'Opcional. Se ficar em branco, a recorrência continuará sem data para terminar.'
      : 'Opcional. Se ficar em branco, a indisponibilidade vale somente para a data de início.';
  }

  function renderList() {
    const records = recordsForList().sort((a, b) => (toDate(a.date) || 0) - (toDate(b.date) || 0));
    const empty = el('unavailability-empty');
    if (empty) {
      empty.hidden = records.length !== 0;
      const strong = empty.querySelector('strong');
      const span = empty.querySelector('span');
      if (strong) strong.textContent = state.filterMonthKey ? `Nenhuma indisponibilidade em ${formatMonth(state.filterMonthKey)}` : 'Nenhuma indisponibilidade futura';
      if (span) span.textContent = 'Ajuste os filtros ou registre uma nova indisponibilidade.';
    }
    const title = el('future-title');
    if (title) title.textContent = state.filterMonthKey ? `Indisponibilidades de ${formatMonth(state.filterMonthKey)}` : 'Indisponibilidades futuras';

    el('unavailability-list').innerHTML = records.map(record => {
      const date = toDate(record.date);
      const recurring = isRecurring(record);
      const day = recurring ? 'REC' : (date ? String(date.getDate()).padStart(2, '0') : '--');
      const month = recurring ? 'semanal' : (date ? new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(date).replace('.', '') : '');
      const titleText = recurrenceTitle(record);
      const range = formatDateRange(record);
      const administrativeLabel = state.access.canManageOthers ? `<strong>${escapeHtml(personName(record.userId))}</strong>` : `<strong>${escapeHtml(titleText)}</strong>`;
      const dateDescription = state.access.canManageOthers ? escapeHtml(titleText) : (recurring ? escapeHtml(range) : '');
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
            ${recurring ? '<span class="ide-badge ide-badge--neutral"><i class="fa-solid fa-rotate" aria-hidden="true"></i> Recorrente</span>' : ''}
            <span class="ide-badge">${escapeHtml(periodName(record.period))}</span>
            <span class="ide-badge ide-badge--neutral">${escapeHtml(eventName(record.eventId))}</span>
          </div>
          ${note}
        </div>
        ${actions}
      </article>`;
    }).join('');
  }

  function renderCalendarNavigation() {
    const prev = el('calendar-prev');
    const next = el('calendar-next');
    const current = monthKey(state.month);
    if (!state.availableMonthKeys.length) {
      if (prev) prev.disabled = false;
      if (next) next.disabled = false;
      return;
    }
    if (prev) prev.disabled = !state.availableMonthKeys.some(key => key < current);
    if (next) next.disabled = !state.availableMonthKeys.some(key => key > current);
  }

  function renderCalendar() {
    const month = state.month;
    el('calendar-label').textContent = formatMonth(month);
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const cursor = new Date(first);
    cursor.setDate(cursor.getDate() - cursor.getDay());
    const today = dateKey(new Date());
    const records = personFilteredRecords();
    const cells = [];
    for (let index = 0; index < 42; index += 1) {
      const date = new Date(cursor);
      date.setDate(cursor.getDate() + index);
      const key = dateKey(date);
      const count = records.filter(record => scope.MusicIdeUnavailabilityService.dateInRange(record, date)).length;
      const outside = date.getMonth() !== month.getMonth();
      const classes = ['unavailability-day'];
      if (outside) classes.push('unavailability-day--outside');
      if (key === today) classes.push('unavailability-day--today');
      if (count) classes.push('unavailability-day--marked');
      const aria = `${formatDate(date)}${count ? `, ${count} indisponibilidade${count === 1 ? '' : 's'}. Abrir detalhes.` : ', nenhuma indisponibilidade. Abrir detalhes.'}`;
      cells.push(`<button type="button" class="${classes.join(' ')}" role="gridcell" data-unavailability-date="${key}" aria-label="${escapeHtml(aria)}"><span class="unavailability-day-number">${date.getDate()}</span>${count ? `<span class="unavailability-day-count" aria-hidden="true">${count}</span>` : ''}</button>`);
    }
    el('unavailability-calendar').innerHTML = cells.join('');
    renderCalendarNavigation();
  }

  function openDayDetails(key) {
    const date = toDate(key);
    if (!date) return;
    const matches = personFilteredRecords()
      .filter(record => scope.MusicIdeUnavailabilityService.dateInRange(record, date))
      .sort((a, b) => personName(a.userId).localeCompare(personName(b.userId), 'pt-BR'));
    el('unavailability-day-title').textContent = formatDate(date);

    if (!matches.length) {
      el('unavailability-day-list').innerHTML = '<div class="ide-empty-state"><i class="fa-solid fa-calendar-check" aria-hidden="true"></i><strong>Ninguém indisponível neste dia</strong><span>Não há registros compatíveis com os filtros atuais.</span></div>';
    } else {
      const grouped = new Map();
      matches.forEach(record => {
        if (!grouped.has(record.userId)) grouped.set(record.userId, []);
        grouped.get(record.userId).push(record);
      });
      el('unavailability-day-list').innerHTML = Array.from(grouped.entries())
        .sort((left, right) => personName(left[0]).localeCompare(personName(right[0]), 'pt-BR'))
        .map(([userId, records]) => `<article class="unavailability-day-person">
          <div class="unavailability-day-person__name"><i class="fa-solid fa-user" aria-hidden="true"></i><strong>${escapeHtml(personName(userId))}</strong></div>
          <div class="unavailability-day-person__records">${records.map(record => `<div class="unavailability-day-record">
            <div class="unavailability-item-meta">
              ${isRecurring(record) ? '<span class="ide-badge ide-badge--neutral"><i class="fa-solid fa-rotate" aria-hidden="true"></i> Recorrente</span>' : ''}
              <span class="ide-badge">${escapeHtml(periodName(record.period))}</span>
              <span class="ide-badge ide-badge--neutral">${escapeHtml(eventName(record.eventId))}</span>
            </div>
            ${record.note ? `<small>${escapeHtml(record.note)}</small>` : ''}
          </div>`).join('')}</div>
        </article>`).join('');
    }

    const dialog = el('unavailability-day-dialog');
    if (dialog && typeof dialog.showModal === 'function') dialog.showModal();
  }

  function monthKeysWithRecords(records) {
    const keys = new Set();
    const todayHorizon = new Date();
    todayHorizon.setDate(1);
    todayHorizon.setMonth(todayHorizon.getMonth() + 24);
    const visibleHorizon = new Date(state.month.getFullYear(), state.month.getMonth() + 24, 1);
    const openEndedHorizon = visibleHorizon > todayHorizon ? visibleHorizon : todayHorizon;

    records.forEach(record => {
      const start = toDate(record?.date);
      const end = toDate(record?.endAt || record?.date);
      if (!start || !end) return;
      const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
      const actualEnd = isRecurring(record) && record.recurrence.openEnded ? openEndedHorizon : end;
      const limit = new Date(actualEnd.getFullYear(), actualEnd.getMonth(), 1);
      let steps = 0;
      while (cursor <= limit && steps < 120) {
        const key = monthKey(cursor);
        if (recordOverlapsMonth(record, key)) keys.add(key);
        cursor.setMonth(cursor.getMonth() + 1);
        steps += 1;
      }
    });
    return Array.from(keys).sort();
  }

  function nearestMonthKey(keys, targetKey) {
    if (!keys.length) return '';
    if (keys.includes(targetKey)) return targetKey;
    const target = Number(String(targetKey || '').replace('-', '')) || 0;
    return keys.reduce((best, key) => {
      if (!best) return key;
      const currentDistance = Math.abs(Number(key.replace('-', '')) - target);
      const bestDistance = Math.abs(Number(best.replace('-', '')) - target);
      return currentDistance < bestDistance ? key : best;
    }, '');
  }

  function refreshMonthOptions({ autoSelect = false } = {}) {
    const select = el('unavailability-month-filter');
    if (!select) return;
    state.availableMonthKeys = monthKeysWithRecords(personFilteredRecords());
    select.innerHTML = `<option value="">Todos os meses</option>${state.availableMonthKeys.map(key => `<option value="${key}">${escapeHtml(formatMonth(key))}</option>`).join('')}`;

    if (state.filterMonthKey && !state.availableMonthKeys.includes(state.filterMonthKey)) state.filterMonthKey = '';
    if (autoSelect && !state.filterMonthKey && state.availableMonthKeys.length) {
      const current = monthKey(new Date());
      state.filterMonthKey = nearestMonthKey(state.availableMonthKeys, current);
    }
    select.value = state.filterMonthKey;
    if (state.filterMonthKey) state.month = monthFromKey(state.filterMonthKey);
    refreshFilterPanel();
  }

  function renderUserOptions() {
    const own = { id: actorId(), name: scope.currentMusicIdeProfile?.name || scope.currentMusicIdeUser?.displayName || scope.currentMusicIdeUser?.email || 'Você' };
    const users = state.access.canManageOthers
      ? [own, ...state.users.filter(item => (item.id || item.uid) !== actorId())]
      : [own];
    const options = users.map(user => `<option value="${escapeHtml(user.id || user.uid)}">${escapeHtml(user.name || user.email || 'Usuário')}</option>`).join('');
    el('unavailability-user').innerHTML = options;
    el('unavailability-user').value = actorId();
    el('unavailability-user').disabled = !state.access.canManageOthers;
    if (state.access.canManageOthers) {
      el('admin-user-filter').innerHTML = `<option value="ALL">Todas</option>${options}`;
      el('admin-user-filter').value = state.filterUserId;
    }
  }

  function renderEventOptions() {
    const now = new Date();
    const events = state.events.filter(event => {
      const date = toDate(event.date);
      return !date || date >= new Date(now.getFullYear(), now.getMonth(), now.getDate());
    });
    el('unavailability-event').innerHTML = '<option value="">Qualquer evento no período</option>' + events.map(event => `<option value="${escapeHtml(event.id)}">${escapeHtml(event.name || 'Evento')} · ${escapeHtml(formatDate(event.date))}</option>`).join('');
  }

  function openForm(record = null) {
    state.editingId = record?.id || null;
    el('unavailability-id').value = state.editingId || '';
    el('unavailability-form-title').textContent = record ? 'Editar indisponibilidade' : 'Nova indisponibilidade';
    const startKey = record ? dateKey(record.date) : dateKey(new Date());
    const endKey = record ? dateKey(record.endAt || record.date) : '';
    const recurring = isRecurring(record);
    el('unavailability-type').value = recurring ? 'WEEKLY' : 'DATE';
    el('unavailability-date').min = dateKey(new Date());
    el('unavailability-date').value = startKey;
    el('unavailability-end-date').min = startKey;
    el('unavailability-end-date').value = recurring && record?.recurrence?.openEnded ? '' : (endKey && endKey !== startKey ? endKey : '');
    setSelectedWeekdays(recurring ? record.recurrence.weekdays : []);
    el('unavailability-period').value = record?.period || '';
    el('unavailability-event').value = record?.eventId || '';
    el('unavailability-note').value = record?.note || '';
    el('unavailability-note-count').textContent = String((record?.note || '').length);
    el('unavailability-user').value = state.access.canManageOthers ? (record?.userId || actorId()) : actorId();
    el('unavailability-user').disabled = !state.access.canManageOthers || Boolean(record);
    syncRecurrenceUi();
    el('unavailability-dialog').showModal();
    el('unavailability-date').focus();
  }

  async function submitForm(event) {
    event.preventDefault();
    const targetUserId = state.access.canManageOthers ? el('unavailability-user').value : actorId();
    const recurring = el('unavailability-type').value === 'WEEKLY';
    const payload = {
      userId: targetUserId,
      date: el('unavailability-date').value,
      endDate: el('unavailability-end-date').value,
      recurrence: recurring ? { frequency: 'WEEKLY', weekdays: selectedWeekdays(), openEnded: !el('unavailability-end-date').value } : null,
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

  function applyMonthFilter(value) {
    state.filterMonthKey = String(value || '');
    if (state.filterMonthKey) state.month = monthFromKey(state.filterMonthKey);
    else state.month = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    renderList();
    renderCalendar();
    refreshFilterPanel();
  }

  function changePersonFilter(value) {
    state.filterUserId = value || 'ALL';
    const previousMonth = state.filterMonthKey || monthKey(state.month);
    refreshMonthOptions();
    if (state.filterMonthKey && !state.availableMonthKeys.includes(state.filterMonthKey)) state.filterMonthKey = '';
    if (!state.filterMonthKey && state.availableMonthKeys.length) {
      state.filterMonthKey = nearestMonthKey(state.availableMonthKeys, previousMonth);
      el('unavailability-month-filter').value = state.filterMonthKey;
      state.month = monthFromKey(state.filterMonthKey);
    }
    renderList();
    renderCalendar();
    refreshFilterPanel();
  }

  function navigateCalendar(direction) {
    const current = monthKey(state.month);
    if (!state.availableMonthKeys.length) {
      state.month = new Date(state.month.getFullYear(), state.month.getMonth() + direction, 1);
      state.filterMonthKey = '';
      el('unavailability-month-filter').value = '';
      renderList();
      renderCalendar();
      refreshFilterPanel();
      return;
    }
    const target = direction < 0
      ? state.availableMonthKeys.filter(key => key < current).pop()
      : state.availableMonthKeys.find(key => key > current);
    if (!target) return;
    state.filterMonthKey = target;
    state.month = monthFromKey(target);
    el('unavailability-month-filter').value = target;
    renderList();
    renderCalendar();
    refreshFilterPanel();
  }

  function clearFilters() {
    state.filterUserId = 'ALL';
    state.filterMonthKey = '';
    state.month = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    if (el('admin-user-filter')) el('admin-user-filter').value = 'ALL';
    refreshMonthOptions();
    el('unavailability-month-filter').value = '';
    renderList();
    renderCalendar();
    refreshFilterPanel();
  }

  async function loadRecords({ initial = false } = {}) {
    setBusy(true);
    try {
      state.records = await service.list(scope.currentMusicIdeUser, scope.currentMusicIdeProfile, { access: state.access, all: state.access.canManageOthers });
      refreshMonthOptions({ autoSelect: initial });
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
      el('unavailability-event-help').textContent = 'O catálogo de eventos não está disponível para sua permissão atual. A indisponibilidade será aplicada de forma geral no período informado.';
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
    el('unavailability-calendar').addEventListener('click', event => {
      const button = event.target.closest('button[data-unavailability-date]');
      if (button) openDayDetails(button.dataset.unavailabilityDate);
    });
    el('unavailability-day-close').addEventListener('click', () => el('unavailability-day-dialog').close());
    el('unavailability-note').addEventListener('input', event => { el('unavailability-note-count').textContent = String(event.target.value.length); });
    el('unavailability-type').addEventListener('change', syncRecurrenceUi);
    el('unavailability-date').addEventListener('change', event => {
      const endInput = el('unavailability-end-date');
      endInput.min = event.target.value;
      if (endInput.value && endInput.value < event.target.value) endInput.value = '';
    });
    el('calendar-prev').addEventListener('click', () => navigateCalendar(-1));
    el('calendar-next').addEventListener('click', () => navigateCalendar(1));
    el('admin-user-filter').addEventListener('change', event => changePersonFilter(event.target.value));
    el('unavailability-month-filter').addEventListener('change', event => applyMonthFilter(event.target.value));
    el('unavailability-clear-filters').addEventListener('click', clearFilters);
  }

  async function bootstrap() {
    const root = el('unavailability-content');
    const placeholder = el('module-placeholder');
    if (root) root.hidden = false;
    if (placeholder) placeholder.hidden = true;
    scope.document.title = 'IDE Music — Indisponibilidade';

    ensureEndDateField();
    ensureRecurrenceFields();
    el('unavailability-event-help').textContent = 'Opcional. Sem evento selecionado, a indisponibilidade vale para qualquer escala compatível no período informado.';

    const authUser = await scope.musicIdeAuthReady;
    if (!authUser) return;
    if (!scope.firebase || typeof scope.firebase.firestore !== 'function') return toast('Firestore indisponível.', 'error');

    repository = new scope.MusicIdeUnavailabilityRepository.UnavailabilityRepository(scope.firebase.firestore());
    service = new scope.MusicIdeUnavailabilityService.UnavailabilityService(repository);
    state.access = await service.resolveAccess(scope.currentMusicIdeUser, scope.currentMusicIdeProfile);
    if (!state.access.canManageOthers) state.filterUserId = actorId();

    el('unavailability-admin-note').hidden = !state.access.canManageOthers;
    el('unavailability-user-wrap').hidden = !state.access.canManageOthers;
    el('admin-user-filter-wrap').hidden = !state.access.canManageOthers;
    wireEvents();
    await loadReferences();
    await loadRecords({ initial: !keepAllFuture });
  }

  if (scope.document.readyState === 'loading') scope.document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
  else bootstrap();
})(window);