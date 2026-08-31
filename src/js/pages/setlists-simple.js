(function bootstrapSetlists(scope){
  'use strict';
  const initialParams=new URLSearchParams(location.search);
  const initialPage=Math.max(1,Number.parseInt(initialParams.get('page')||'1',10)||1);
  const state={items:[],filtered:[],view:'upcoming',page:initialPage,pageSize:8};
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const formatDate=v=>{const d=MusicIdeSetlistHistory.toDate(v);return d?d.toLocaleDateString('pt-BR'):'Data não informada';};
  const getView=()=>new URLSearchParams(location.search).get('view')==='history'?'history':'upcoming';
  async function user(){return new Promise((resolve,reject)=>firebase.auth().onAuthStateChanged(u=>u?resolve(u):reject(new Error('Faça login para consultar Setlists.'))));}
  const docs=snap=>snap.docs.map(d=>({id:d.id,...d.data()}));
  const filterIds=['filter-from','filter-to','filter-event','filter-minister','filter-status','filter-participant','filter-song','filter-theme'];
  const filterParams={
    'filter-from':'from','filter-to':'to','filter-event':'event','filter-minister':'minister',
    'filter-status':'status','filter-participant':'participant','filter-song':'song','filter-theme':'theme'
  };

  function navigation(){return scope.MusicIdeNavigationState||null;}

  function configureView(){
    state.view=getView();
    const history=state.view==='history';
    $('page-title').textContent=history?'Histórico de Setlists':'Próximos Setlists';
    $('page-subtitle').textContent=history?'Consulte repertórios anteriores com filtros por evento, ministro, música, tema, status e participantes.':'Repertórios dos próximos eventos e escalas. Use os filtros para localizar rapidamente por data, ministro, status ou participante.';
    $('setlists-filter-panel').hidden=false;
    $('filters').hidden=false;
    $('view-hint').textContent=history?'Setlists históricos são abertos em modo somente leitura.':'Edite a montagem ou abra o repertório para usar cifras, letras e modo palco.';
  }

  function filters(){return {from:$('filter-from').value,to:$('filter-to').value,event:$('filter-event').value,minister:$('filter-minister').value,status:$('filter-status').value,participant:$('filter-participant').value,song:$('filter-song').value,theme:$('filter-theme').value};}

  function restoreState(){
    filterIds.forEach(id=>{
      const control=$(id);
      const value=initialParams.get(filterParams[id])||'';
      if(!control||!value)return;
      if(control.tagName==='SELECT'&&![...control.options].some(option=>option.value===value))return;
      control.value=value;
    });
  }

  function syncState(){
    const nav=navigation();
    if(!nav)return;
    const current=filters();
    const href=nav.replaceQuery({
      from:current.from,to:current.to,event:current.event,minister:current.minister,status:current.status,
      participant:current.participant,song:current.song,theme:current.theme,page:state.view==='history'?state.page:1
    },{page:'1'});
    nav.remember('setlists',href);
  }

  function statusLabel(status){
    const normalized=String(status||'DRAFT').trim().toUpperCase();
    return ({READY:'Pronto',DRAFT:'Rascunho',COMPLETED:'Concluído',CANCELLED:'Cancelado'})[normalized]||status||'Rascunho';
  }

  function setSelectOptions(id,values,emptyLabel){
    const select=$(id);
    const previous=select.value;
    const unique=[...new Set(values.map(value=>String(value||'').trim()).filter(Boolean))]
      .sort((a,b)=>a.localeCompare(b,'pt-BR',{sensitivity:'base'}));
    select.innerHTML=`<option value="">${esc(emptyLabel)}</option>${unique.map(value=>`<option value="${esc(value)}">${esc(value)}</option>`).join('')}`;
    if(unique.includes(previous)) select.value=previous;
  }

  function populateFilterOptions(){
    const source=state.view==='history'?state.items.history:state.items.upcoming;
    setSelectOptions('filter-event',source.map(item=>item.name||item.event?.name||''),'Todos os eventos');
    setSelectOptions('filter-minister',source.flatMap(item=>item.ministerNames||[]),'Todos os ministros');
    setSelectOptions('filter-participant',source.flatMap(item=>item.participantNames||[]),'Todos os participantes');
    $('setlists-filter-panel')?.dispatchEvent(new CustomEvent('ideFiltersChanged'));
  }

  function actions(item){
    const id=encodeURIComponent(item.id);
    const hasSongs=Number(item.totalSongs||0)>0;
    const ready=String(item.status||'').trim().toUpperCase()==='READY';
    const nav=navigation();
    const editTarget=`setlist.html?id=${id}`;
    const repertoireTarget=`setlist-view.html?id=${id}`;
    const editHref=nav?nav.withReturnTo(editTarget):editTarget;
    const repertoireHref=nav?nav.withReturnTo(repertoireTarget):repertoireTarget;

    if(state.view==='history'){
      return `<a class="ide-button ide-button--secondary" href="${repertoireHref}"><i class="fa-solid fa-eye" aria-hidden="true"></i> Abrir repertório</a>`;
    }

    if(!hasSongs){
      return `<a class="ide-button ide-button--primary" href="${editHref}"><i class="fa-solid fa-pen-to-square" aria-hidden="true"></i> Editar Setlist</a><span class="ide-button ide-button--secondary btn-disabled" aria-disabled="true" title="Adicione ao menos uma música para abrir o repertório"><i class="fa-solid fa-music" aria-hidden="true"></i> Repertório vazio</span>`;
    }

    if(ready){
      return `<a class="ide-button ide-button--secondary" href="${editHref}"><i class="fa-solid fa-pen-to-square" aria-hidden="true"></i> Editar</a><a class="ide-button ide-button--primary" href="${repertoireHref}"><i class="fa-solid fa-music" aria-hidden="true"></i> Abrir repertório</a>`;
    }

    return `<a class="ide-button ide-button--primary" href="${editHref}"><i class="fa-solid fa-pen-to-square" aria-hidden="true"></i> Editar Setlist</a><a class="ide-button ide-button--secondary" href="${repertoireHref}"><i class="fa-solid fa-music" aria-hidden="true"></i> Abrir repertório</a>`;
  }

  function renderDressCode(item){
    const colors=Array.isArray(item.dressCodeColors)?item.dressCodeColors:[];
    if(!colors.length) return '';
    const swatches=colors.map((color,index)=>`<span class="setlist-dress__swatch" style="--dress-color:${esc(color)}" title="Cor ${index+1}: ${esc(color)}" aria-label="Cor ${index+1} do Dress Code: ${esc(color)}"></span>`).join('');
    return `<div class="setlist-dress" aria-label="Dress Code"><span class="setlist-dress__label"><i class="fa-solid fa-shirt" aria-hidden="true"></i> Dress Code</span><span class="setlist-dress__colors">${swatches}</span></div>`;
  }

  function card(item){
    const ministerTags=item.ministerNames.slice(0,3).map(name=>`<span class="tag"><i class="fa-solid fa-microphone"></i>&nbsp;${esc(name)}</span>`).join('');
    const songTags=item.songTitles.slice(0,3).map(title=>`<span class="tag"><i class="fa-solid fa-music"></i>&nbsp;${esc(title)}</span>`).join('');
    return `<article class="setlist-card"><div class="setlist-card__head"><div class="setlist-card__identity"><h2>${esc(item.name)}</h2><div class="meta"><span><i class="fa-solid fa-calendar"></i> ${esc(formatDate(item.date))}</span><span><i class="fa-solid fa-music"></i> ${item.totalSongs} música${item.totalSongs===1?'':'s'}</span>${item.theme?`<span><i class="fa-solid fa-tag"></i> ${esc(item.theme)}</span>`:''}</div>${renderDressCode(item)}</div><span class="status">${esc(statusLabel(item.status))}</span></div>${ministerTags||songTags?`<div class="tags">${ministerTags}${songTags}</div>`:''}<div class="setlist-card__actions">${actions(item)}</div></article>`;
  }

  function render(){
    const history=state.view==='history';
    const selected=history?state.items.history:state.items.upcoming;
    state.filtered=MusicIdeSetlistHistory.filter(selected,filters());
    const page=history
      ? MusicIdeSetlistHistory.paginate(state.filtered,state.page,state.pageSize)
      : {items:state.filtered,page:1,pageSize:state.filtered.length,total:state.filtered.length,totalPages:1};
    state.page=page.page;
    syncState();
    $('result-count').textContent=`${page.total} Setlist${page.total===1?'':'s'} encontrado${page.total===1?'':'s'}`;
    $('loading').hidden=true; $('setlists-list').hidden=!page.items.length; $('empty-state').hidden=Boolean(page.items.length);
    $('setlists-list').innerHTML=page.items.map(card).join('');
    $('pagination').hidden=!history||page.totalPages<=1;
    $('page-info').textContent=`Página ${page.page} de ${page.totalPages}`;
    $('prev-page').disabled=page.page<=1;
    $('next-page').disabled=page.page>=page.totalPages;
    $('setlists-filter-panel')?.dispatchEvent(new CustomEvent('ideFiltersChanged'));
  }

  function bind(){
    filterIds.forEach(id=>$(id).addEventListener('input',()=>{state.page=1;render();}));
    $('clear-filters').addEventListener('click',()=>{filterIds.forEach(id=>$(id).value='');state.page=1;render();});
    $('prev-page').addEventListener('click',()=>{state.page--;render();window.scrollTo({top:0,behavior:'smooth'});});
    $('next-page').addEventListener('click',()=>{state.page++;render();window.scrollTo({top:0,behavior:'smooth'});});
  }

  async function init(){
    try{
      if(!firebase.apps.length) firebase.initializeApp(firebaseConfig); const db=firebase.firestore(); await user(); configureView(); bind();
      const [setlistSnap,eventSnap,setlistSongSnap,userSnap,songSnap,scheduleMemberSnap]=await Promise.all([
        db.collection('setlists').get(),
        db.collection('events').get(),
        db.collection('setlistSongs').get(),
        db.collection('users').get(),
        db.collection('songs').get(),
        db.collection('scheduleMembers').get()
      ]);
      const events=new Map(docs(eventSnap).map(item=>[item.id,item]));
      const users=new Map(docs(userSnap).map(item=>[item.id,item]));
      let library=docs(songSnap); if(!library.length){try{library=docs(await db.collection('musicas').get());}catch(_){library=[];}}
      const libraryMap=new Map(library.map(item=>[item.id,item]));
      const grouped=new Map();
      docs(setlistSongSnap).filter(item=>item.active!==false).forEach(song=>{const list=grouped.get(song.setlistId)||[];list.push(song);grouped.set(song.setlistId,list);});
      const participantsBySchedule=new Map();
      docs(scheduleMemberSnap).filter(item=>item.active!==false).forEach(member=>{
        const scheduleId=String(member.scheduleId||'').trim();
        if(!scheduleId) return;
        const linkedUser=users.get(member.userId)||{};
        const participantName=member.userName||member.name||linkedUser.name||linkedUser.displayName||linkedUser.email||'';
        if(!participantName) return;
        const names=participantsBySchedule.get(scheduleId)||[];
        names.push(participantName);
        participantsBySchedule.set(scheduleId,names);
      });
      const normalized=docs(setlistSnap).map(item=>{
        const event=events.get(item.eventId)||{};
        const scheduleId=item.scheduleId||event.scheduleId||(item.eventId?`schedule_${item.eventId}`:'');
        return MusicIdeSetlistHistory.normalizeItem(item,{
          event,
          songs:(grouped.get(item.id)||[]).sort((a,b)=>Number(a.order||0)-Number(b.order||0)),
          users,
          library:libraryMap,
          participantNames:participantsBySchedule.get(scheduleId)||[]
        });
      });
      state.items=MusicIdeSetlistHistory.split(normalized,new Date());
      populateFilterOptions();
      restoreState();
      render();
    }catch(error){console.error(error);$('loading').innerHTML=`<p style="color:var(--error,#a63f3f)">${esc(error.message||'Erro ao carregar Setlists.')}</p>`;$('result-count').textContent='Não foi possível carregar os Setlists';}
  }
  document.addEventListener('DOMContentLoaded',init);
})(window);