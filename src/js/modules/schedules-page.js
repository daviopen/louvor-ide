(function initSchedulesPage(scope) {
  if (!scope || !scope.document) return;
  const params = new URLSearchParams(scope.location.search);
  if (params.get('section') !== 'schedules') return;

  const DEFAULT_FILTERS = { term: '', person: 'ALL', functionId: 'ALL', from: '', to: '', sort: 'DATE_ASC' };
  const validSorts = new Set(['DATE_ASC', 'DATE_DESC', 'EVENT_ASC', 'EVENT_DESC']);
  const initialSort = validSorts.has(params.get('sort')) ? params.get('sort') : DEFAULT_FILTERS.sort;
  const state = {
    data: null,
    scheduleId: params.get('scheduleId') || null,
    filters: {
      term: params.get('q') || DEFAULT_FILTERS.term,
      person: params.get('person') || DEFAULT_FILTERS.person,
      functionId: params.get('function') || DEFAULT_FILTERS.functionId,
      from: params.get('from') || DEFAULT_FILTERS.from,
      to: params.get('to') || DEFAULT_FILTERS.to,
      sort: initialSort
    },
    picker: { scheduleId: null, slotId: null }
  };
  let repository;
  let service;
  const el = id => scope.document.getElementById(id);
  const esc = value => String(value == null ? '' : value).replace(/[&<>'\"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;' }[c]));
  const dateKey = value => scope.MusicIdeScheduleService.dateKey(value);
  const formatDate = value => { const key = dateKey(value); return key ? new Intl.DateTimeFormat('pt-BR').format(new Date(`${key}T12:00:00`)) : 'Data a definir'; };
  const userId = user => user.id || user.uid;
  const scheduleEvent = item => item.event || {};

  function syncListState() {
    if (state.scheduleId) return '';
    const navigation = scope.MusicIdeNavigationState;
    if (navigation) {
      const href = navigation.replaceQuery({
        q: state.filters.term,
        person: state.filters.person,
        function: state.filters.functionId,
        from: state.filters.from,
        to: state.filters.to,
        sort: state.filters.sort
      }, { person: DEFAULT_FILTERS.person, function: DEFAULT_FILTERS.functionId, sort: DEFAULT_FILTERS.sort });
      navigation.remember('schedules', href);
      return href;
    }
    return `module.html?section=schedules`;
  }

  function listUrl() {
    const navigation = scope.MusicIdeNavigationState;
    return navigation ? navigation.resolveReturnUrl('module.html?section=schedules', 'schedules') : 'module.html?section=schedules';
  }

  function editorUrl(scheduleId) {
    const target = `module.html?section=schedules&scheduleId=${encodeURIComponent(scheduleId)}`;
    const navigation = scope.MusicIdeNavigationState;
    return navigation ? navigation.withReturnTo(target) : target;
  }

  function injectShell() {
    const placeholder = el('module-placeholder');
    placeholder.className = 'schedules-page';
    placeholder.innerHTML = `<div class="schedules-page__inner" id="schedules-root"></div>
      <div id="schedule-person-backdrop" hidden role="presentation" style="position:fixed;inset:0;z-index:var(--ide-z-modal,10000);background:rgba(0,0,0,.68);padding:max(1rem,env(safe-area-inset-top)) max(.625rem,env(safe-area-inset-right)) max(1rem,env(safe-area-inset-bottom)) max(.625rem,env(safe-area-inset-left));display:none;place-items:center;">
        <section id="schedule-person-dialog" class="schedule-person-options" role="dialog" aria-modal="true" aria-labelledby="schedule-person-dialog-title" style="position:relative;top:auto;left:auto;right:auto;bottom:auto;transform:none;width:min(480px,100%);max-height:min(76dvh,600px);box-shadow:var(--ide-shadow-overlay);overflow:auto;" tabindex="-1"></section>
      </div>
      <div id="schedules-toast" class="schedules-toast" role="status" aria-live="polite" hidden></div>`;
    const backdrop = el('schedule-person-backdrop');
    backdrop.hidden = true;
    backdrop.style.display = 'none';
    backdrop.addEventListener('click', event => { if (event.target === backdrop) closePersonPicker(); });
    scope.document.addEventListener('keydown', event => { if (event.key === 'Escape' && !backdrop.hidden) closePersonPicker(); });
  }

  function toast(message, type='success') {
    const node = el('schedules-toast'); if (!node) return;
    node.textContent=message; node.dataset.type=type; node.hidden=false;
    clearTimeout(toast.timer); toast.timer=setTimeout(()=>{node.hidden=true;},4500);
  }
  function userName(id) { const user=state.data.users.find(item=>userId(item)===id); return user?.name||user?.email||'Usuário'; }
  function functionName(id) { return state.data.functions.find(item=>item.id===id)?.name||'Função'; }
  function currentSchedule() { return state.data?.schedules?.find(item=>item.id===state.scheduleId) || null; }
  function memberForSlot(schedule, slotId) { return schedule.members.find(item=>item.active!==false&&item.slotId===slotId); }
  function userPhoto(user) { return user && (user.photoURL || user.photoUrl || user.avatarUrl || user.avatarURL || user.profileImage || user.imageUrl || user.imageURL) || ''; }
  function userInitials(user) {
    const name=String(user?.name||user?.email||'?').trim();
    const parts=name.split(/\s+/).filter(Boolean);
    return esc(((parts[0]?.[0]||'?')+(parts.length>1?(parts.at(-1)?.[0]||''):'')).toUpperCase());
  }
  function renderAvatar(user, className='schedule-avatar') {
    const photo=userPhoto(user);
    if(photo) return `<span class="${className}"><img src="${esc(photo)}" alt="" loading="lazy" referrerpolicy="no-referrer"></span>`;
    return `<span class="${className}" aria-hidden="true">${userInitials(user)}</span>`;
  }
  function slotFunctionLabel(schedule, slot) {
    const slots=Array.isArray(schedule?.slots)?schedule.slots:[];
    const matches=slots.filter(item=>item.functionId===slot.functionId);
    const base=functionName(slot.functionId);
    if(matches.length<=1)return base;
    const position=matches.findIndex(item=>item.id===slot.id)+1;
    return `${base} ${position > 0 ? position : 1}`;
  }
  function functionColorIndex(functionId) {
    const index=state.data.functions.findIndex(item=>item.id===functionId);
    return ((index < 0 ? 0 : index) % 8) + 1;
  }
  function renderFunctionDot(functionId) {
    return `<span class="schedule-function-dot schedule-function-dot--${functionColorIndex(functionId)}" aria-hidden="true"></span>`;
  }
  function recomputeSchedule(schedule) {
    schedule.completeness = scope.MusicIdeScheduleService.scheduleCompleteness(schedule, schedule.members || []);
    schedule.status = schedule.completeness.complete ? 'COMPLETE' : 'DRAFT';
  }
  function orderScheduleSlots(schedule) {
    if (typeof scope.MusicIdeScheduleService.sortSlotsByFunction === 'function') {
      schedule.slots = scope.MusicIdeScheduleService.sortSlotsByFunction(schedule.slots || [], state.data.functions || []);
    }
  }

  function matchesFilters(schedule) {
    const event=scheduleEvent(schedule), f=state.filters, term=f.term.trim().toLocaleLowerCase('pt-BR');
    if (term && ![event.name,event.location,event.theme].filter(Boolean).join(' ').toLocaleLowerCase('pt-BR').includes(term)) return false;
    const key=dateKey(event.date||schedule.eventDate);
    if (f.from&&key<f.from) return false; if (f.to&&key>f.to) return false;
    if (f.person!=='ALL'&&!schedule.members.some(item=>item.active!==false&&item.userId===f.person)) return false;
    if (f.functionId!=='ALL'&&!schedule.members.some(item=>item.active!==false&&item.functionId===f.functionId)) return false;
    return true;
  }
  function compareSchedules(a,b) {
    const eventA=scheduleEvent(a), eventB=scheduleEvent(b);
    const dateA=dateKey(eventA.date||a.eventDate), dateB=dateKey(eventB.date||b.eventDate);
    if(state.filters.sort==='DATE_DESC') return dateB.localeCompare(dateA);
    if(state.filters.sort==='EVENT_ASC') return String(eventA.name||'').localeCompare(String(eventB.name||''),'pt-BR',{sensitivity:'base'});
    if(state.filters.sort==='EVENT_DESC') return String(eventB.name||'').localeCompare(String(eventA.name||''),'pt-BR',{sensitivity:'base'});
    return dateA.localeCompare(dateB);
  }

  function renderSummaryCard(schedule) {
    const event=scheduleEvent(schedule), members=schedule.members.filter(item=>item.active!==false);
    const complete=schedule.completeness.complete;
    const people=members.length?members.slice(0,5).map(m=>`<span class="schedule-summary-person"><strong>${esc(userName(m.userId))}</strong> · ${esc(functionName(m.functionId))}</span>`).join(''):'<span class="schedule-summary-person schedule-summary-person--empty">Nenhuma pessoa escalada ainda</span>';
    return `<article class="schedule-summary-card"><div class="schedule-summary-card__main"><span class="schedule-card__date">${esc(formatDate(event.date||schedule.eventDate))}${event.time||schedule.eventTime?` · ${esc(event.time||schedule.eventTime)}`:''}</span><h2>${esc(event.name||'Evento')}</h2>${event.location?`<p>${esc(event.location)}</p>`:''}<div class="schedule-summary-people">${people}${members.length>5?`<span>+ ${members.length-5} integrante(s)</span>`:''}</div></div><div class="schedule-summary-card__aside"><span class="${complete?'ide-badge ide-badge--success':'ide-badge ide-badge--warning'}">${complete?'Completa':'Incompleta'}</span><small>${schedule.completeness.filled}/${schedule.completeness.total} posições preenchidas</small><a class="ide-button ide-button--primary ide-button--sm" href="${editorUrl(schedule.id)}">Editar escala</a></div></article>`;
  }

  function renderListView() {
    syncListState();
    scope.document.title='IDE Music — Escalas';
    const items=state.data.schedules.filter(matchesFilters).sort(compareSchedules);
    el('schedules-root').innerHTML=`<header class="schedules-header"><div><div class="ide-module-kicker">Escalas · Operação</div><h1>Escalas</h1><p>Consulte as escalas por evento e abra uma por vez para edição.</p></div></header><details id="schedules-filter-panel" class="ide-filter-panel" data-filter-panel="schedules"><summary class="ide-filter-panel__summary"><span class="ide-filter-panel__summary-main"><i class="fa-solid fa-sliders" aria-hidden="true"></i> Filtros <span class="ide-filter-panel__badge">0</span></span><span class="ide-filter-panel__summary-meta"><span class="ide-filter-panel__state">Mostrar</span></span></summary><div class="ide-filter-panel__body"><section class="schedules-filters" aria-label="Filtros de escalas"><label><span>Buscar evento</span><input id="schedule-filter-term" class="ide-field__control ide-field__input" type="search" placeholder="Evento ou local" value="${esc(state.filters.term)}"></label><label><span>Pessoa</span><select id="schedule-filter-person" class="ide-field__control ide-select" data-filter-neutral="ALL"><option value="ALL">Todas</option>${state.data.users.map(u=>`<option value="${esc(userId(u))}" ${state.filters.person===userId(u)?'selected':''}>${esc(u.name||u.email)}</option>`).join('')}</select></label><label><span>Função</span><select id="schedule-filter-function" class="ide-field__control ide-select" data-filter-neutral="ALL"><option value="ALL">Todas</option>${state.data.functions.map(fn=>`<option value="${esc(fn.id)}" ${state.filters.functionId===fn.id?'selected':''}>${esc(fn.name)}</option>`).join('')}</select></label><label><span>De</span><input id="schedule-filter-from" class="ide-field__control ide-field__input" type="date" value="${esc(state.filters.from)}"></label><label><span>Até</span><input id="schedule-filter-to" class="ide-field__control ide-field__input" type="date" value="${esc(state.filters.to)}"></label><label><span>Ordenar por</span><select id="schedule-sort" class="ide-field__control ide-select" data-filter-neutral="DATE_ASC"><option value="DATE_ASC" ${state.filters.sort==='DATE_ASC'?'selected':''}>Data · mais próxima primeiro</option><option value="DATE_DESC" ${state.filters.sort==='DATE_DESC'?'selected':''}>Data · mais distante primeiro</option><option value="EVENT_ASC" ${state.filters.sort==='EVENT_ASC'?'selected':''}>Evento · A–Z</option><option value="EVENT_DESC" ${state.filters.sort==='EVENT_DESC'?'selected':''}>Evento · Z–A</option></select></label><button id="schedule-clear-filters" class="ide-button ide-button--ghost" type="button"><i class="fa-solid fa-filter-circle-xmark" aria-hidden="true"></i> Limpar filtros</button></section></div></details><div class="ide-empty-state" ${items.length?'hidden':''}><strong>Nenhuma escala encontrada</strong><span>Ajuste os filtros ou crie um evento primeiro.</span></div><section class="schedule-summary-list" aria-live="polite">${items.map(renderSummaryCard).join('')}</section>`;
    if (scope.MusicIdeFilterPanels) scope.MusicIdeFilterPanels.bootstrap();
    wireListFilters();
  }

  function renderPersonOption(user, currentUserId) {
    return `<button class="schedule-person-option${currentUserId===userId(user)?' is-selected':''}" type="button" data-modal-action="select-person" data-user-id="${esc(userId(user))}">${renderAvatar(user,'schedule-person-option__avatar')}<span>${esc(user.name||user.email||'Usuário')}</span>${currentUserId===userId(user)?'<i class="fa-solid fa-check" aria-hidden="true"></i>':''}</button>`;
  }

  function renderSlot(schedule, slot) {
    const member=memberForSlot(schedule,slot.id);
    const current=member?state.data.users.find(user=>userId(user)===member.userId):null;
    const roleLabel=slotFunctionLabel(schedule,slot);
    const roleDot=renderFunctionDot(slot.functionId);
    const avatar=current?renderAvatar(current):'<span class="schedule-avatar schedule-avatar--empty" aria-hidden="true"><i class="fa-solid fa-user-plus"></i></span>';
    const personControl=state.data.access.canEdit?`<button class="schedule-person-trigger" type="button" data-action="open-person-picker" aria-haspopup="dialog"><span class="schedule-person-trigger__content">${current?renderAvatar(current,'schedule-person-trigger__avatar'):'<span class="schedule-person-trigger__avatar schedule-avatar--empty" aria-hidden="true"><i class="fa-solid fa-user-plus"></i></span>'}<span><small>${member?'Pessoa escalada':'Selecionar pessoa'}</small><strong>${current?esc(current.name||current.email):'Escolher integrante'}</strong></span></span><i class="fa-solid fa-chevron-down" aria-hidden="true"></i></button>`:`<div class="schedule-person-readonly">${current?renderAvatar(current,'schedule-person-trigger__avatar'):''}<strong>${current?esc(current.name||current.email):'Nenhuma pessoa definida'}</strong></div>`;
    return `<article class="schedule-slot" data-slot-id="${esc(slot.id)}"><div class="schedule-slot__identity">${avatar}<div><span class="schedule-slot__label">Função</span><strong class="schedule-function-name">${roleDot}${esc(roleLabel)}</strong><span>${member?'Posição preenchida':'Aguardando pessoa'}</span></div></div><div class="schedule-slot__controls">${personControl}<div class="schedule-slot__actions">${member&&state.data.access.canEdit?`<button class="ide-button ide-button--secondary ide-button--sm" data-action="remove-member" data-member-id="${esc(member.id)}" type="button"><i class="fa-solid fa-user-minus" aria-hidden="true"></i> Remover pessoa</button>`:''}${state.data.access.canEdit?'<button class="ide-button ide-button--ghost ide-button--sm schedule-remove-slot" data-action="remove-slot" type="button" aria-label="Remover função"><i class="fa-solid fa-trash-can" aria-hidden="true"></i><span>Remover função</span></button>':''}</div></div></article>`;
  }

  function renderEditorView() {
    const schedule=currentSchedule(), root=el('schedules-root');
    if (!schedule) { root.innerHTML=`<div class="ide-empty-state"><strong>Escala não encontrada</strong><a class="ide-button ide-button--secondary" href="${listUrl()}">Voltar para Escalas</a></div>`; return; }
    orderScheduleSlots(schedule);
    const event=scheduleEvent(schedule), slots=Array.isArray(schedule.slots)?schedule.slots:[], complete=schedule.completeness.complete;
    const addOptions=state.data.functions.map(fn=>`<option value="${esc(fn.id)}">${esc(fn.name)}</option>`).join('');
    scope.document.title=`IDE Music — ${event.name||'Editar escala'}`;
    root.innerHTML=`<nav class="schedule-breadcrumb" aria-label="Breadcrumb"><a href="${listUrl()}">Escalas</a><span>/</span><span>${esc(event.name||'Evento')}</span></nav><header class="schedule-editor-header"><div><a class="schedule-back" href="${listUrl()}"><i class="fa-solid fa-arrow-left"></i> Voltar para escalas</a><span class="schedule-card__date">${esc(formatDate(event.date||schedule.eventDate))}${event.time||schedule.eventTime?` · ${esc(event.time||schedule.eventTime)}`:''}</span><h1>${esc(event.name||'Evento')}</h1>${event.location?`<p>${esc(event.location)}</p>`:''}</div><div class="schedule-card__status"><span class="${complete?'ide-badge ide-badge--success':'ide-badge ide-badge--warning'}">${complete?'Completa':'Incompleta'}</span><small>${schedule.completeness.filled}/${schedule.completeness.total} posições preenchidas</small></div></header><section class="schedule-editor-card" data-schedule-id="${esc(schedule.id)}"><div class="schedule-editor-card__heading"><div><span class="ide-module-kicker">Equipe do evento</span><h2>Monte a escala</h2><p>Selecione somente pessoas disponíveis para cada função.</p></div><strong>${slots.length} posições</strong></div><div class="schedule-slots">${slots.length?slots.map(slot=>renderSlot(schedule,slot)).join(''):'<div class="ide-empty-state schedule-empty"><strong>Nenhuma função adicionada</strong><span>Adicione as funções necessárias para este evento.</span></div>'}</div>${state.data.access.canEdit?`<footer class="schedule-card__footer"><div><span>Precisa de outra posição?</span><small>Adicione apenas para este evento.</small></div><div class="schedule-card__footer-actions"><select class="ide-field__control ide-select" data-new-function><option value="">Adicionar função...</option>${addOptions}</select><button class="ide-button ide-button--primary ide-button--sm" data-action="add-slot" type="button"><i class="fa-solid fa-plus" aria-hidden="true"></i> Adicionar função</button></div></footer>`:''}</section>`;
    root.onclick=handleEditorClick;
  }

  function openPersonPicker(schedule, slot) {
    const event=scheduleEvent(schedule);
    const eligible=service.eligibleUsers(slot.functionId,event,state.data);
    const member=memberForSlot(schedule,slot.id);
    const current=member?state.data.users.find(user=>userId(user)===member.userId):null;
    const currentEligible=current&&eligible.some(user=>userId(user)===member.userId);
    const options=current&&!currentEligible?[current,...eligible]:eligible;
    const uniqueOptions=[...new Map(options.map(user=>[userId(user),user])).values()];
    const dialog=el('schedule-person-dialog');
    state.picker={scheduleId:schedule.id,slotId:slot.id};
    dialog.innerHTML=`<div class="schedule-person-options__header"><div><strong id="schedule-person-dialog-title"><span class="schedule-function-name">${renderFunctionDot(slot.functionId)}${esc(slotFunctionLabel(schedule,slot))}</span></strong><small>${uniqueOptions.length} pessoa${uniqueOptions.length===1?'':'s'} disponível${uniqueOptions.length===1?'':'is'}</small></div><button class="ide-button ide-button--ghost ide-button--sm" type="button" data-modal-action="close" aria-label="Fechar seleção"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button></div>${uniqueOptions.length?uniqueOptions.map(user=>renderPersonOption(user,member?.userId)).join(''):'<div class="schedule-person-options__empty">Nenhuma pessoa disponível para esta função.</div>'}`;
    dialog.onclick=handleModalClick;
    const backdrop=el('schedule-person-backdrop');
    backdrop.hidden=false;
    backdrop.style.display='grid';
    scope.requestAnimationFrame(()=>dialog.focus());
  }
  function closePersonPicker() {
    const backdrop=el('schedule-person-backdrop');
    const dialog=el('schedule-person-dialog');
    if(backdrop){backdrop.hidden=true;backdrop.style.display='none';}
    if(dialog)dialog.innerHTML='';
    state.picker={scheduleId:null,slotId:null};
  }

  async function reload() {
    try {
      state.data=state.scheduleId?await service.loadEditor(state.scheduleId,scope.currentMusicIdeUser,scope.currentMusicIdeProfile):await service.load(scope.currentMusicIdeUser,scope.currentMusicIdeProfile);
      state.scheduleId?renderEditorView():renderListView();
    } catch(error){console.error(error);toast(error.message||'Não foi possível carregar escalas.','error');}
  }

  async function assignOptimistic(schedule,slot,selectedUserId) {
    if(!selectedUserId)return;
    const conflict=service.userConflict(selectedUserId,slot.functionId,schedule,scheduleEvent(schedule),state.data);
    if(conflict.unavailable)throw new Error('Esta pessoa está indisponível para este evento.');
    if(conflict.otherRole&&!scope.confirm(`${userName(selectedUserId)} já está em ${functionName(conflict.otherRole.functionId)}. Deseja manter a pessoa em múltiplas funções?`))return;
    const beforeMembers=[...(schedule.members||[])];
    const existing=memberForSlot(schedule,slot.id);
    const optimistic={id:`pending_${Date.now()}`,scheduleId:schedule.id,slotId:slot.id,userId:selectedUserId,functionId:slot.functionId,active:true};
    schedule.members=beforeMembers.filter(item=>item.id!==existing?.id).concat(optimistic);
    recomputeSchedule(schedule);
    closePersonPicker();
    renderEditorView();
    try {
      const result=await service.assign(schedule.id,slot.id,selectedUserId,scope.currentMusicIdeUser,scope.currentMusicIdeProfile);
      schedule.members=schedule.members.filter(item=>item.id!==optimistic.id).concat(result.member);
      schedule.completeness=result.completeness;
      schedule.status=result.completeness.complete?'COMPLETE':'DRAFT';
      renderEditorView();
      toast('Escala atualizada.');
    } catch(error) {
      schedule.members=beforeMembers;
      recomputeSchedule(schedule);
      renderEditorView();
      throw error;
    }
  }

  async function handleModalClick(event) {
    const button=event.target.closest('[data-modal-action]');
    if(!button)return;
    if(button.dataset.modalAction==='close'){closePersonPicker();return;}
    if(button.dataset.modalAction==='select-person'){
      const schedule=currentSchedule();
      const slot=schedule?.slots?.find(item=>item.id===state.picker.slotId);
      if(!schedule||!slot)return closePersonPicker();
      button.disabled=true;
      try{await assignOptimistic(schedule,slot,button.dataset.userId);}catch(error){console.error(error);toast(error.message||'Não foi possível atualizar a escala.','error');closePersonPicker();}
    }
  }

  async function handleEditorClick(event) {
    const button=event.target.closest('button[data-action]');
    if(!button)return;
    const schedule=currentSchedule(); if(!schedule)return;
    const slotNode=button.closest('[data-slot-id]'), slot=schedule.slots?.find(item=>item.id===slotNode?.dataset.slotId);
    try{
      if(button.dataset.action==='open-person-picker'){if(slot)openPersonPicker(schedule,slot);return;}
      if(button.dataset.action==='add-slot'){
        const functionId=el('schedules-root').querySelector('[data-new-function]').value;
        if(!functionId)return toast('Selecione uma função.','error');
        button.disabled=true;
        const optimistic={id:`pending_slot_${Date.now()}`,functionId};
        schedule.slots=[...(schedule.slots||[]),optimistic]; orderScheduleSlots(schedule); recomputeSchedule(schedule); renderEditorView();
        try{
          const created=await service.addSlot(schedule.id,functionId,scope.currentMusicIdeUser,scope.currentMusicIdeProfile);
          schedule.slots=schedule.slots.map(item=>item.id===optimistic.id?created:item); orderScheduleSlots(schedule); recomputeSchedule(schedule); renderEditorView(); toast('Função adicionada.');
        }catch(error){schedule.slots=schedule.slots.filter(item=>item.id!==optimistic.id);recomputeSchedule(schedule);renderEditorView();throw error;}
        return;
      }
      if(button.dataset.action==='remove-slot'){
        if(!scope.confirm('Remover esta função da escala? A pessoa vinculada, se houver, será removida preservando o histórico.'))return;
        await service.removeSlot(schedule.id,slotNode.dataset.slotId,scope.currentMusicIdeUser,scope.currentMusicIdeProfile);
        schedule.slots=schedule.slots.filter(item=>item.id!==slotNode.dataset.slotId);
        schedule.members=schedule.members.filter(item=>item.slotId!==slotNode.dataset.slotId);
        recomputeSchedule(schedule); renderEditorView(); toast('Função removida.'); return;
      }
      if(button.dataset.action==='remove-member'){
        await service.removeMember(schedule.id,button.dataset.memberId,scope.currentMusicIdeUser,scope.currentMusicIdeProfile);
        schedule.members=schedule.members.filter(item=>item.id!==button.dataset.memberId);
        recomputeSchedule(schedule); renderEditorView(); toast('Pessoa removida.'); return;
      }
    }catch(error){console.error(error);toast(error.message||'Não foi possível atualizar a escala.','error');if(button)button.disabled=false;}
  }

  function wireListFilters(){
    [['schedule-filter-term','term','input'],['schedule-filter-person','person','change'],['schedule-filter-function','functionId','change'],['schedule-filter-from','from','change'],['schedule-filter-to','to','change'],['schedule-sort','sort','change']].forEach(([id,key,type])=>el(id).addEventListener(type,event=>{state.filters[key]=event.target.value;renderListView();if(key==='term')el('schedule-filter-term').focus();}));
    el('schedule-clear-filters').addEventListener('click',()=>{state.filters={...DEFAULT_FILTERS};renderListView();});
  }

  async function bootstrap(){
    injectShell();
    const authUser=await scope.musicIdeAuthReady;if(!authUser)return;
    if(!scope.firebase?.firestore||!scope.MusicIdeScheduleRepository||!scope.MusicIdeScheduleService)return toast('Módulo de escalas indisponível.','error');
    repository=new scope.MusicIdeScheduleRepository.ScheduleRepository(scope.firebase.firestore());
    service=new scope.MusicIdeScheduleService.ScheduleService(repository);
    await reload();
  }
  if(scope.document.readyState==='loading')scope.document.addEventListener('DOMContentLoaded',bootstrap,{once:true});else bootstrap();
})(window);