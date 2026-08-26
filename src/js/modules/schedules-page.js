(function initSchedulesPage(scope) {
  if (!scope || !scope.document) return;
  const params = new URLSearchParams(scope.location.search);
  if (params.get('section') !== 'schedules') return;

  const state = { data: null, scheduleId: params.get('scheduleId') || null, filters: { term: '', person: 'ALL', functionId: 'ALL', from: '', to: '' } };
  let repository;
  let service;
  const el = id => scope.document.getElementById(id);
  const esc = value => String(value == null ? '' : value).replace(/[&<>'\"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;' }[c]));
  const dateKey = value => scope.MusicIdeScheduleService.dateKey(value);
  const formatDate = value => { const key = dateKey(value); return key ? new Intl.DateTimeFormat('pt-BR').format(new Date(`${key}T12:00:00`)) : 'Data a definir'; };
  const userId = user => user.id || user.uid;
  const scheduleEvent = item => item.event || {};
  const listUrl = () => 'module.html?section=schedules';
  const editorUrl = scheduleId => `module.html?section=schedules&scheduleId=${encodeURIComponent(scheduleId)}`;

  function injectShell() {
    const placeholder = el('module-placeholder');
    placeholder.className = 'schedules-page';
    placeholder.innerHTML = `<div class="schedules-page__inner" id="schedules-root"></div><div id="schedules-toast" class="schedules-toast" role="status" aria-live="polite" hidden></div>`;
  }
  function toast(message, type='success') { const node = el('schedules-toast'); if (!node) return; node.textContent=message; node.dataset.type=type; node.hidden=false; clearTimeout(toast.timer); toast.timer=setTimeout(()=>{node.hidden=true;},4500); }
  function userName(id) { const user=state.data.users.find(item=>userId(item)===id); return user?.name||user?.email||'Usuário'; }
  function functionName(id) { return state.data.functions.find(item=>item.id===id)?.name||'Função'; }
  function functionUsers(functionId) { const allowed=new Set(state.data.userFunctions.filter(item=>item.active!==false&&item.functionId===functionId).map(item=>item.userId)); return state.data.users.filter(item=>allowed.has(userId(item))); }
  function memberForSlot(schedule, slotId) { return schedule.members.find(item=>item.active!==false&&item.slotId===slotId); }

  function matchesFilters(schedule) {
    const event=scheduleEvent(schedule), f=state.filters, term=f.term.trim().toLocaleLowerCase('pt-BR');
    if (term && ![event.name,event.location,event.theme].filter(Boolean).join(' ').toLocaleLowerCase('pt-BR').includes(term)) return false;
    const key=dateKey(event.date||schedule.eventDate);
    if (f.from&&key<f.from) return false; if (f.to&&key>f.to) return false;
    if (f.person!=='ALL'&&!schedule.members.some(item=>item.active!==false&&item.userId===f.person)) return false;
    if (f.functionId!=='ALL'&&!schedule.members.some(item=>item.active!==false&&item.functionId===f.functionId)) return false;
    return true;
  }

  function renderSummaryCard(schedule) {
    const event=scheduleEvent(schedule), members=schedule.members.filter(item=>item.active!==false);
    const complete=schedule.completeness.complete;
    const people=members.length?members.slice(0,5).map(m=>`<span class="schedule-summary-person"><strong>${esc(userName(m.userId))}</strong> · ${esc(functionName(m.functionId))}</span>`).join(''):'<span class="schedule-summary-person schedule-summary-person--empty">Nenhuma pessoa escalada ainda</span>';
    return `<article class="schedule-summary-card"><div class="schedule-summary-card__main"><span class="schedule-card__date">${esc(formatDate(event.date||schedule.eventDate))}${event.time||schedule.eventTime?` · ${esc(event.time||schedule.eventTime)}`:''}</span><h2>${esc(event.name||'Evento')}</h2>${event.location?`<p>${esc(event.location)}</p>`:''}<div class="schedule-summary-people">${people}${members.length>5?`<span>+ ${members.length-5} integrante(s)</span>`:''}</div></div><div class="schedule-summary-card__aside"><span class="${complete?'ide-badge ide-badge--success':'ide-badge ide-badge--warning'}">${complete?'Completa':'Incompleta'}</span><small>${schedule.completeness.filled}/${schedule.completeness.total} posições preenchidas</small><a class="ide-button ide-button--primary ide-button--sm" href="${editorUrl(schedule.id)}">Editar escala</a></div></article>`;
  }

  function renderListView() {
    scope.document.title='IDE Music — Escalas';
    const items=state.data.schedules.filter(matchesFilters).sort((a,b)=>dateKey(scheduleEvent(b).date||b.eventDate).localeCompare(dateKey(scheduleEvent(a).date||a.eventDate)));
    el('schedules-root').innerHTML=`<header class="schedules-header"><div><div class="ide-module-kicker">Escalas · Operação</div><h1>Escalas</h1><p>Consulte as escalas por evento e abra uma por vez para edição.</p></div></header><details id="schedules-filter-panel" class="ide-filter-panel" data-filter-panel="schedules"><summary class="ide-filter-panel__summary"><span class="ide-filter-panel__summary-main"><i class="fa-solid fa-sliders" aria-hidden="true"></i> Filtros <span class="ide-filter-panel__badge">0</span></span><span class="ide-filter-panel__summary-meta"><span class="ide-filter-panel__state">Mostrar</span></span></summary><div class="ide-filter-panel__body"><section class="schedules-filters" aria-label="Filtros de escalas"><label><span>Buscar evento</span><input id="schedule-filter-term" class="ide-field__control ide-field__input" type="search" placeholder="Evento ou local" value="${esc(state.filters.term)}"></label><label><span>Pessoa</span><select id="schedule-filter-person" class="ide-field__control ide-select" data-filter-neutral="ALL"><option value="ALL">Todas</option>${state.data.users.map(u=>`<option value="${esc(userId(u))}" ${state.filters.person===userId(u)?'selected':''}>${esc(u.name||u.email)}</option>`).join('')}</select></label><label><span>Função</span><select id="schedule-filter-function" class="ide-field__control ide-select" data-filter-neutral="ALL"><option value="ALL">Todas</option>${state.data.functions.map(fn=>`<option value="${esc(fn.id)}" ${state.filters.functionId===fn.id?'selected':''}>${esc(fn.name)}</option>`).join('')}</select></label><label><span>De</span><input id="schedule-filter-from" class="ide-field__control ide-field__input" type="date" value="${esc(state.filters.from)}"></label><label><span>Até</span><input id="schedule-filter-to" class="ide-field__control ide-field__input" type="date" value="${esc(state.filters.to)}"></label><button id="schedule-clear-filters" class="ide-button ide-button--ghost" type="button"><i class="fa-solid fa-filter-circle-xmark" aria-hidden="true"></i> Limpar filtros</button></section></div></details><div class="ide-empty-state" ${items.length?'hidden':''}><strong>Nenhuma escala encontrada</strong><span>Ajuste os filtros ou crie um evento primeiro.</span></div><section class="schedule-summary-list" aria-live="polite">${items.map(renderSummaryCard).join('')}</section>`;
    if (scope.MusicIdeFilterPanels) scope.MusicIdeFilterPanels.bootstrap();
    wireListFilters();
  }

  function candidateLabel(user) { return user.email?`${user.name||user.email} · ${user.email}`:(user.name||'Usuário'); }

  function renderSlot(schedule, slot) {
    const member=memberForSlot(schedule,slot.id), event=scheduleEvent(schedule);
    const eligible=service.eligibleUsers(slot.functionId,event,state.data), eligibleIds=new Set(eligible.map(userId));
    const unavailable=functionUsers(slot.functionId).filter(user=>!eligibleIds.has(userId(user))&&userId(user)!==member?.userId);
    const current=member?state.data.users.find(user=>userId(user)===member.userId):null;
    const normal=current&&!eligibleIds.has(member.userId)?[current,...eligible]:eligible;
    const listId=`schedule-users-${String(slot.id).replace(/[^a-zA-Z0-9_-]/g,'-')}`;
    const avatar=member?`<span class="schedule-avatar" aria-hidden="true">${esc((userName(member.userId)[0]||'?').toUpperCase())}</span>`:'<span class="schedule-avatar schedule-avatar--empty" aria-hidden="true">+</span>';
    return `<article class="schedule-slot" data-slot-id="${esc(slot.id)}"><div class="schedule-slot__identity">${avatar}<div><strong>${esc(functionName(slot.functionId))}</strong><span>${member?esc(userName(member.userId)):'Nenhuma pessoa definida'}</span></div></div><div class="schedule-slot__controls"><label class="schedule-person-combobox"><span>${member?'Trocar pessoa':'Selecionar pessoa'}</span><input class="ide-field__control ide-field__input" type="text" data-user-combobox list="${esc(listId)}" value="${esc(current?candidateLabel(current):'')}" placeholder="Digite o nome..." autocomplete="off" ${state.data.access.canEdit?'':'disabled'}><datalist id="${esc(listId)}">${normal.map(user=>`<option value="${esc(candidateLabel(user))}"></option>`).join('')}</datalist></label>${member&&state.data.access.canEdit?`<button class="ide-button ide-button--secondary ide-button--sm" data-action="remove-member" data-member-id="${esc(member.id)}" type="button">Remover pessoa</button>`:''}${state.data.access.canEdit?'<button class="ide-button ide-button--danger ide-button--sm" data-action="remove-slot" type="button">Remover função</button>':''}</div>${unavailable.length&&state.data.access.canEdit?`<details class="schedule-exception-panel"><summary>Exceção administrativa</summary><div><p>Use somente quando for necessário escalar alguém com indisponibilidade registrada.</p><select class="ide-field__control ide-select" data-exception-user><option value="">Selecionar pessoa indisponível...</option>${unavailable.map(user=>`<option value="${esc(userId(user))}">${esc(user.name||user.email)}</option>`).join('')}</select><button class="ide-button ide-button--secondary ide-button--sm" data-action="assign-exception" type="button">Registrar exceção</button></div></details>`:''}${member?.exception?.override?`<span class="schedule-exception"><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i> Exceção administrativa: ${esc(member.exception.reason)}</span>`:''}</article>`;
  }

  function renderEditorView() {
    const schedule=state.data.schedules.find(item=>item.id===state.scheduleId), root=el('schedules-root');
    if (!schedule) { root.innerHTML=`<div class="ide-empty-state"><strong>Escala não encontrada</strong><a class="ide-button ide-button--secondary" href="${listUrl()}">Voltar para Escalas</a></div>`; return; }
    const event=scheduleEvent(schedule), slots=Array.isArray(schedule.slots)?schedule.slots:[], complete=schedule.completeness.complete;
    const addOptions=state.data.functions.map(fn=>`<option value="${esc(fn.id)}">${esc(fn.name)}</option>`).join('');
    scope.document.title=`IDE Music — ${event.name||'Editar escala'}`;
    root.innerHTML=`<nav class="schedule-breadcrumb" aria-label="Breadcrumb"><a href="${listUrl()}">Escalas</a><span>/</span><span>${esc(event.name||'Evento')}</span></nav><header class="schedule-editor-header"><div><a class="schedule-back" href="${listUrl()}"><i class="fa-solid fa-arrow-left"></i> Voltar para escalas</a><span class="schedule-card__date">${esc(formatDate(event.date||schedule.eventDate))}${event.time||schedule.eventTime?` · ${esc(event.time||schedule.eventTime)}`:''}</span><h1>${esc(event.name||'Evento')}</h1>${event.location?`<p>${esc(event.location)}</p>`:''}</div><div class="schedule-card__status"><span class="${complete?'ide-badge ide-badge--success':'ide-badge ide-badge--warning'}">${complete?'Completa':'Incompleta'}</span><small>${schedule.completeness.filled}/${schedule.completeness.total} posições preenchidas</small></div></header><section class="schedule-editor-card" data-schedule-id="${esc(schedule.id)}"><div class="schedule-slots">${slots.length?slots.map(slot=>renderSlot(schedule,slot)).join(''):'<div class="ide-empty-state schedule-empty"><strong>Nenhuma função adicionada</strong><span>Adicione as funções necessárias para este evento.</span></div>'}</div>${state.data.access.canEdit?`<footer class="schedule-card__footer"><select class="ide-field__control ide-select" data-new-function><option value="">Adicionar função...</option>${addOptions}</select><button class="ide-button ide-button--primary ide-button--sm" data-action="add-slot" type="button">Adicionar função</button></footer>`:''}</section>`;
    root.addEventListener('click',handleEditorClick); root.addEventListener('change',handleEditorChange);
  }

  async function reload() { try { state.data=await service.load(scope.currentMusicIdeUser,scope.currentMusicIdeProfile); state.scheduleId?renderEditorView():renderListView(); } catch(error){console.error(error);toast(error.message||'Não foi possível carregar escalas.','error');} }

  async function assign(schedule,slot,selectedUserId,options={}) { if(!selectedUserId)return; const conflict=service.userConflict(selectedUserId,slot.functionId,schedule,scheduleEvent(schedule),state.data); if(conflict.unavailable&&!options.override)throw new Error('Usuário indisponível. Use o fluxo explícito de exceção administrativa.'); if(conflict.otherRole&&!scope.confirm(`${userName(selectedUserId)} já está em ${functionName(conflict.otherRole.functionId)}. Deseja manter a pessoa em múltiplas funções?`))return; await service.assign(schedule.id,slot.id,selectedUserId,scope.currentMusicIdeUser,scope.currentMusicIdeProfile,options); toast(options.override?'Exceção administrativa registrada.':'Escala atualizada.'); await reload(); }

  function resolveComboboxUser(slot,value) { const schedule=state.data.schedules.find(item=>item.id===state.scheduleId), eligible=service.eligibleUsers(slot.functionId,scheduleEvent(schedule),state.data), normalized=String(value||'').trim().toLocaleLowerCase('pt-BR'); return eligible.find(user=>candidateLabel(user).toLocaleLowerCase('pt-BR')===normalized)||null; }

  async function handleEditorChange(event) {
    if(!event.target.matches('[data-user-combobox]'))return;
    const schedule=state.data.schedules.find(item=>item.id===state.scheduleId), slotNode=event.target.closest('[data-slot-id]'), slot=schedule?.slots?.find(item=>item.id===slotNode?.dataset.slotId); if(!schedule||!slot)return;
    const user=resolveComboboxUser(slot,event.target.value), current=memberForSlot(schedule,slot.id), currentUser=current?state.data.users.find(item=>userId(item)===current.userId):null;
    if(!user){ if(!currentUser||event.target.value!==candidateLabel(currentUser)){toast('Selecione uma pessoa da lista de disponíveis para esta função.','error');event.target.value=currentUser?candidateLabel(currentUser):'';} return; }
    try{await assign(schedule,slot,userId(user));}catch(error){console.error(error);toast(error.message||'Não foi possível escalar a pessoa.','error');await reload();}
  }

  async function handleEditorClick(event) {
    const button=event.target.closest('button[data-action]'); if(!button)return; const schedule=state.data.schedules.find(item=>item.id===state.scheduleId); if(!schedule)return; const slotNode=button.closest('[data-slot-id]'), slot=schedule.slots?.find(item=>item.id===slotNode?.dataset.slotId);
    try{
      if(button.dataset.action==='add-slot'){const functionId=el('schedules-root').querySelector('[data-new-function]').value;if(!functionId)return toast('Selecione uma função.','error');await service.addSlot(schedule.id,functionId,scope.currentMusicIdeUser,scope.currentMusicIdeProfile);toast('Função adicionada.');return reload();}
      if(button.dataset.action==='remove-slot'){if(!scope.confirm('Remover esta função da escala? A pessoa vinculada, se houver, será removida preservando o histórico.'))return;await service.removeSlot(schedule.id,slotNode.dataset.slotId,scope.currentMusicIdeUser,scope.currentMusicIdeProfile);toast('Função removida.');return reload();}
      if(button.dataset.action==='remove-member'){await service.removeMember(schedule.id,button.dataset.memberId,scope.currentMusicIdeUser,scope.currentMusicIdeProfile);toast('Pessoa removida.');return reload();}
      if(button.dataset.action==='assign-exception'){const selectedUserId=slotNode.querySelector('[data-exception-user]').value;if(!selectedUserId)return toast('Selecione a pessoa indisponível.','error');if(!scope.confirm(`Confirmar exceção administrativa para escalar ${userName(selectedUserId)} mesmo com indisponibilidade registrada?`))return;const reason=scope.prompt('Informe o motivo da exceção administrativa:');if(!String(reason||'').trim())return toast('A exceção exige um motivo.','error');return assign(schedule,slot,selectedUserId,{override:true,reason:String(reason).trim()});}
    }catch(error){console.error(error);toast(error.message||'Não foi possível atualizar a escala.','error');}
  }

  function wireListFilters(){
    [['schedule-filter-term','term','input'],['schedule-filter-person','person','change'],['schedule-filter-function','functionId','change'],['schedule-filter-from','from','change'],['schedule-filter-to','to','change']].forEach(([id,key,type])=>el(id).addEventListener(type,event=>{state.filters[key]=event.target.value;renderListView();if(key==='term')el('schedule-filter-term').focus();}));
    el('schedule-clear-filters').addEventListener('click',()=>{state.filters={term:'',person:'ALL',functionId:'ALL',from:'',to:''};renderListView();});
  }

  async function bootstrap(){injectShell();const authUser=await scope.musicIdeAuthReady;if(!authUser)return;if(!scope.firebase?.firestore||!scope.MusicIdeScheduleRepository||!scope.MusicIdeScheduleService)return toast('Módulo de escalas indisponível.','error');repository=new scope.MusicIdeScheduleRepository.ScheduleRepository(scope.firebase.firestore());service=new scope.MusicIdeScheduleService.ScheduleService(repository);await reload();}
  if(scope.document.readyState==='loading')scope.document.addEventListener('DOMContentLoaded',bootstrap,{once:true});else bootstrap();
})(window);
