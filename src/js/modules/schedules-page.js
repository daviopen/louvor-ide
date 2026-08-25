(function initSchedulesPage(scope) {
  if (!scope || !scope.document) return;
  if (new URLSearchParams(scope.location.search).get('section') !== 'schedules') return;

  const state = { data: null, selectedId: null, filters: { term: '', person: 'ALL', functionId: 'ALL', from: '', to: '' } };
  let repository;
  let service;
  const el = id => scope.document.getElementById(id);
  const esc = value => String(value == null ? '' : value).replace(/[&<>'"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[c]));
  const dateKey = value => scope.MusicIdeScheduleService.dateKey(value);
  const formatDate = value => { const key = dateKey(value); if (!key) return 'Data a definir'; return new Intl.DateTimeFormat('pt-BR').format(new Date(`${key}T12:00:00`)); };

  function injectMarkup() {
    const placeholder = el('module-placeholder');
    placeholder.className = 'schedules-page';
    placeholder.innerHTML = `<div class="schedules-page__inner">
      <header class="schedules-header"><div><div class="ide-module-kicker">Escalas · Operação</div><h1>Escalas</h1><p>Monte cada equipe por função, respeitando disponibilidade e mantendo conflitos e exceções auditáveis.</p></div></header>
      <section class="ide-section-card schedules-filters" aria-label="Filtros de escalas">
        <label><span>Buscar evento</span><input id="schedule-filter-term" class="ide-field__control ide-field__input" type="search" placeholder="Evento ou local"></label>
        <label><span>Pessoa</span><select id="schedule-filter-person" class="ide-field__control ide-select"><option value="ALL">Todas</option></select></label>
        <label><span>Função</span><select id="schedule-filter-function" class="ide-field__control ide-select"><option value="ALL">Todas</option></select></label>
        <label><span>De</span><input id="schedule-filter-from" class="ide-field__control ide-field__input" type="date"></label>
        <label><span>Até</span><input id="schedule-filter-to" class="ide-field__control ide-field__input" type="date"></label>
      </section>
      <div id="schedules-loading" class="schedules-loading" role="status">Carregando escalas...</div>
      <div id="schedules-empty" class="ide-empty-state" hidden><i class="fa-solid fa-users-rectangle" aria-hidden="true"></i><strong>Nenhuma escala encontrada</strong><span>Ajuste os filtros ou crie um evento primeiro.</span></div>
      <section id="schedules-list" class="schedules-list" aria-live="polite"></section>
    </div>
    <div id="schedules-toast" class="schedules-toast" role="status" aria-live="polite" hidden></div>`;
  }

  function toast(message, type='success') {
    const node = el('schedules-toast'); if (!node) return;
    node.textContent = message; node.dataset.type = type; node.hidden = false;
    clearTimeout(toast.timer); toast.timer = setTimeout(() => { node.hidden = true; }, 4500);
  }

  function userId(user) { return user.id || user.uid; }
  function userName(id) { const user = state.data.users.find(item => userId(item) === id); return user?.name || user?.email || 'Usuário'; }
  function functionName(id) { return state.data.functions.find(item => item.id === id)?.name || 'Função'; }
  function functionUsers(functionId) { const allowed = new Set(state.data.userFunctions.filter(item => item.active !== false && item.functionId === functionId).map(item => item.userId)); return state.data.users.filter(item => allowed.has(userId(item))); }
  function scheduleEvent(item) { return item.event || {}; }

  function matchesFilters(schedule) {
    const event = scheduleEvent(schedule); const f = state.filters;
    const term = f.term.trim().toLocaleLowerCase('pt-BR');
    if (term && ![event.name,event.location,event.theme].filter(Boolean).join(' ').toLocaleLowerCase('pt-BR').includes(term)) return false;
    const key = dateKey(event.date || schedule.eventDate);
    if (f.from && key < f.from) return false; if (f.to && key > f.to) return false;
    if (f.person !== 'ALL' && !schedule.members.some(item => item.active !== false && item.userId === f.person)) return false;
    if (f.functionId !== 'ALL' && !schedule.members.some(item => item.active !== false && item.functionId === f.functionId)) return false;
    return true;
  }

  function renderFilters() {
    el('schedule-filter-person').innerHTML = `<option value="ALL">Todas</option>${state.data.users.map(u => `<option value="${esc(userId(u))}">${esc(u.name || u.email)}</option>`).join('')}`;
    el('schedule-filter-function').innerHTML = `<option value="ALL">Todas</option>${state.data.functions.map(fn => `<option value="${esc(fn.id)}">${esc(fn.name)}</option>`).join('')}`;
  }

  function memberForSlot(schedule, slotId) { return schedule.members.find(item => item.active !== false && item.slotId === slotId); }

  function renderSlot(schedule, slot) {
    const member = memberForSlot(schedule, slot.id);
    const event = scheduleEvent(schedule);
    const candidates = functionUsers(slot.functionId);
    const options = candidates.map(user => {
      const id = userId(user); const conflict = service.userConflict(id, slot.functionId, schedule, event, state.data);
      const current = member?.userId === id;
      const label = `${user.name || user.email}${conflict.unavailable ? ' — indisponível' : conflict.otherRole ? ` — também em ${functionName(conflict.otherRole.functionId)}` : ''}`;
      return `<option value="${esc(id)}" ${current?'selected':''}>${esc(label)}</option>`;
    }).join('');
    const avatar = member ? `<span class="schedule-avatar" aria-hidden="true">${esc((userName(member.userId)[0] || '?').toUpperCase())}</span>` : `<span class="schedule-avatar schedule-avatar--empty" aria-hidden="true">+</span>`;
    return `<div class="schedule-slot" data-slot-id="${esc(slot.id)}">
      <div class="schedule-slot__identity">${avatar}<div><strong>${esc(functionName(slot.functionId))}</strong><span>${member ? esc(userName(member.userId)) : 'Selecione uma pessoa'}</span></div></div>
      <div class="schedule-slot__controls">
        <select class="ide-field__control ide-select" data-schedule-user ${state.data.access.canEdit?'':'disabled'}><option value="">Selecionar...</option>${options}</select>
        ${member && state.data.access.canEdit ? `<button class="ide-button ide-button--secondary ide-button--sm" data-action="remove-member" data-member-id="${esc(member.id)}" type="button">Remover pessoa</button>` : ''}
        ${state.data.access.canEdit ? `<button class="ide-button ide-button--danger ide-button--sm" data-action="remove-slot" type="button">Remover função</button>` : ''}
      </div>
      ${member?.exception?.override ? `<span class="schedule-exception"><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i> Exceção administrativa: ${esc(member.exception.reason)}</span>` : ''}
    </div>`;
  }

  function renderSchedule(schedule) {
    const event = scheduleEvent(schedule); const slots = Array.isArray(schedule.slots) ? schedule.slots : [];
    const status = schedule.completeness.complete ? 'Completa' : 'Incompleta';
    const statusClass = schedule.completeness.complete ? 'ide-badge ide-badge--success' : 'ide-badge ide-badge--warning';
    const addOptions = state.data.functions.map(fn => `<option value="${esc(fn.id)}">${esc(fn.name)}</option>`).join('');
    return `<article class="schedule-card" data-schedule-id="${esc(schedule.id)}">
      <header class="schedule-card__header"><div><span class="schedule-card__date">${esc(formatDate(event.date || schedule.eventDate))}${event.time || schedule.eventTime ? ` · ${esc(event.time || schedule.eventTime)}` : ''}</span><h2>${esc(event.name || 'Evento')}</h2><p>${esc(event.location || '')}</p></div><div class="schedule-card__status"><span class="${statusClass}">${status}</span><small>${schedule.completeness.filled}/${schedule.completeness.total} posições preenchidas</small></div></header>
      <div class="schedule-slots">${slots.length ? slots.map(slot => renderSlot(schedule, slot)).join('') : `<div class="ide-empty-state schedule-empty"><strong>Nenhuma função adicionada</strong><span>Adicione as funções necessárias para este evento.</span></div>`}</div>
      ${state.data.access.canEdit ? `<footer class="schedule-card__footer"><label><span class="sr-only">Nova função</span><select class="ide-field__control ide-select" data-new-function><option value="">Adicionar função...</option>${addOptions}</select></label><button class="ide-button ide-button--primary ide-button--sm" data-action="add-slot" type="button">Adicionar</button></footer>` : ''}
    </article>`;
  }

  function render() {
    const items = state.data.schedules.filter(matchesFilters).sort((a,b) => dateKey(scheduleEvent(b).date || b.eventDate).localeCompare(dateKey(scheduleEvent(a).date || a.eventDate)));
    el('schedules-empty').hidden = items.length !== 0;
    el('schedules-list').innerHTML = items.map(renderSchedule).join('');
  }

  async function reload() {
    el('schedules-loading').hidden = false;
    try { state.data = await service.load(scope.currentMusicIdeUser, scope.currentMusicIdeProfile); renderFilters(); render(); }
    catch (error) { console.error(error); toast(error.message || 'Não foi possível carregar escalas.', 'error'); }
    finally { el('schedules-loading').hidden = true; }
  }

  async function assign(schedule, slot, selectedUserId) {
    if (!selectedUserId) return;
    const conflict = service.userConflict(selectedUserId, slot.functionId, schedule, scheduleEvent(schedule), state.data);
    const options = {};
    if (conflict.unavailable) {
      if (!scope.confirm(`${userName(selectedUserId)} está indisponível para este evento. Deseja registrar uma exceção administrativa?`)) { render(); return; }
      const reason = scope.prompt('Informe o motivo da exceção administrativa:');
      if (!String(reason || '').trim()) { toast('A exceção exige um motivo.', 'error'); render(); return; }
      options.override = true; options.reason = reason;
    } else if (conflict.otherRole && !scope.confirm(`${userName(selectedUserId)} já está em ${functionName(conflict.otherRole.functionId)}. Deseja manter a pessoa em múltiplas funções?`)) { render(); return; }
    await service.assign(schedule.id, slot.id, selectedUserId, scope.currentMusicIdeUser, scope.currentMusicIdeProfile, options);
    toast('Escala atualizada.'); await reload();
  }

  async function handleClick(event) {
    const button = event.target.closest('button[data-action]'); if (!button) return;
    const card = button.closest('[data-schedule-id]'); const schedule = state.data.schedules.find(item => item.id === card?.dataset.scheduleId); if (!schedule) return;
    try {
      if (button.dataset.action === 'add-slot') {
        const functionId = card.querySelector('[data-new-function]').value; if (!functionId) return toast('Selecione uma função.', 'error');
        await service.addSlot(schedule.id, functionId, scope.currentMusicIdeUser, scope.currentMusicIdeProfile); toast('Função adicionada à escala.'); await reload();
      }
      if (button.dataset.action === 'remove-slot') {
        if (!scope.confirm('Remover esta função da escala? A pessoa vinculada, se houver, será removida preservando o histórico.')) return;
        await service.removeSlot(schedule.id, button.closest('[data-slot-id]').dataset.slotId, scope.currentMusicIdeUser, scope.currentMusicIdeProfile); toast('Função removida.'); await reload();
      }
      if (button.dataset.action === 'remove-member') {
        await service.removeMember(schedule.id, button.dataset.memberId, scope.currentMusicIdeUser, scope.currentMusicIdeProfile); toast('Pessoa removida da escala.'); await reload();
      }
    } catch (error) { console.error(error); toast(error.message || 'Não foi possível atualizar a escala.', 'error'); }
  }

  async function handleChange(event) {
    if (event.target.matches('[data-schedule-user]')) {
      const card = event.target.closest('[data-schedule-id]'); const slotNode = event.target.closest('[data-slot-id]');
      const schedule = state.data.schedules.find(item => item.id === card?.dataset.scheduleId); const slot = schedule?.slots?.find(item => item.id === slotNode?.dataset.slotId);
      if (!schedule || !slot) return;
      try { await assign(schedule, slot, event.target.value); } catch (error) { console.error(error); toast(error.message || 'Não foi possível escalar a pessoa.', 'error'); render(); }
    }
  }

  function wireFilters() {
    [['schedule-filter-term','term','input'],['schedule-filter-person','person','change'],['schedule-filter-function','functionId','change'],['schedule-filter-from','from','change'],['schedule-filter-to','to','change']].forEach(([id,key,type]) => el(id).addEventListener(type, e => { state.filters[key] = e.target.value; render(); }));
    el('schedules-list').addEventListener('click', handleClick); el('schedules-list').addEventListener('change', handleChange);
  }

  async function bootstrap() {
    injectMarkup(); scope.document.title = 'IDE Music — Escalas';
    const authUser = await scope.musicIdeAuthReady; if (!authUser) return;
    if (!scope.firebase?.firestore || !scope.MusicIdeScheduleRepository || !scope.MusicIdeScheduleService) return toast('Módulo de escalas indisponível.', 'error');
    repository = new scope.MusicIdeScheduleRepository.ScheduleRepository(scope.firebase.firestore()); service = new scope.MusicIdeScheduleService.ScheduleService(repository);
    wireFilters(); await reload();
  }

  if (scope.document.readyState === 'loading') scope.document.addEventListener('DOMContentLoaded', bootstrap, { once:true }); else bootstrap();
})(window);
