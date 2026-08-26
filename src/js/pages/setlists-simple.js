(function bootstrapSetlists(scope){
  'use strict';
  const state={items:[],filtered:[],view:'upcoming',page:1,pageSize:8};
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const formatDate=v=>{const d=MusicIdeSetlistHistory.toDate(v);return d?d.toLocaleDateString('pt-BR'):'Data não informada';};
  const getView=()=>new URLSearchParams(location.search).get('view')==='history'?'history':'upcoming';
  async function user(){return new Promise((resolve,reject)=>firebase.auth().onAuthStateChanged(u=>u?resolve(u):reject(new Error('Faça login para consultar Setlists.'))));}
  const docs=snap=>snap.docs.map(d=>({id:d.id,...d.data()}));

  function configureView(){
    state.view=getView();
    const history=state.view==='history';
    $('page-title').textContent=history?'Histórico de Setlists':'Próximos Setlists';
    $('page-subtitle').textContent=history?'Consulte repertórios anteriores com filtros por evento, ministro, música, artista e tema.':'Repertórios dos próximos eventos e escalas.';
    $('tab-upcoming').classList.toggle('active',!history); $('tab-history').classList.toggle('active',history);
    $('tab-upcoming').setAttribute('aria-current',history?'false':'page'); $('tab-history').setAttribute('aria-current',history?'page':'false');
    $('filters').hidden=!history;
    $('view-hint').textContent=history?'Setlists históricos são abertos em modo somente leitura.':'Selecione um Setlist para abrir e editar conforme sua permissão.';
  }

  function filters(){return {from:$('filter-from').value,to:$('filter-to').value,event:$('filter-event').value,minister:$('filter-minister').value,song:$('filter-song').value,artist:$('filter-artist').value,theme:$('filter-theme').value};}

  function card(item){
    const readonly=state.view==='history';
    const href=readonly?`setlist-view.html?id=${encodeURIComponent(item.id)}`:`setlist.html?id=${encodeURIComponent(item.id)}`;
    const ministerTags=item.ministerNames.slice(0,3).map(name=>`<span class="tag"><i class="fas fa-microphone"></i>&nbsp;${esc(name)}</span>`).join('');
    const songTags=item.songTitles.slice(0,3).map(title=>`<span class="tag"><i class="fas fa-music"></i>&nbsp;${esc(title)}</span>`).join('');
    return `<article class="setlist-card"><div class="setlist-card__head"><div><h2>${esc(item.name)}</h2><div class="meta"><span><i class="fas fa-calendar"></i> ${esc(formatDate(item.date))}</span><span><i class="fas fa-music"></i> ${item.totalSongs} música${item.totalSongs===1?'':'s'}</span>${item.theme?`<span><i class="fas fa-tag"></i> ${esc(item.theme)}</span>`:''}</div></div><span class="status">${esc(item.status||'DRAFT')}</span></div>${ministerTags||songTags?`<div class="tags">${ministerTags}${songTags}</div>`:''}<div class="setlist-card__actions"><a class="btn ${readonly?'btn-secondary':'btn-primary'}" href="${href}"><i class="fas ${readonly?'fa-eye':'fa-pen-to-square'}"></i> ${readonly?'Abrir somente leitura':'Abrir Setlist'}</a></div></article>`;
  }

  function render(){
    const selected=state.view==='history'?state.items.history:state.items.upcoming;
    state.filtered=state.view==='history'?MusicIdeSetlistHistory.filter(selected,filters()):selected;
    const page=MusicIdeSetlistHistory.paginate(state.filtered,state.page,state.pageSize); state.page=page.page;
    $('result-count').textContent=`${page.total} Setlist${page.total===1?'':'s'} encontrado${page.total===1?'':'s'}`;
    $('loading').hidden=true; $('setlists-list').hidden=!page.items.length; $('empty-state').hidden=Boolean(page.items.length);
    $('setlists-list').innerHTML=page.items.map(card).join('');
    $('pagination').hidden=page.totalPages<=1; $('page-info').textContent=`Página ${page.page} de ${page.totalPages}`; $('prev-page').disabled=page.page<=1; $('next-page').disabled=page.page>=page.totalPages;
  }

  function bind(){
    ['filter-from','filter-to','filter-event','filter-minister','filter-song','filter-artist','filter-theme'].forEach(id=>$(id).addEventListener('input',()=>{state.page=1;render();}));
    $('clear-filters').addEventListener('click',()=>{['filter-from','filter-to','filter-event','filter-minister','filter-song','filter-artist','filter-theme'].forEach(id=>$(id).value='');state.page=1;render();});
    $('prev-page').addEventListener('click',()=>{state.page--;render();window.scrollTo({top:0,behavior:'smooth'});});
    $('next-page').addEventListener('click',()=>{state.page++;render();window.scrollTo({top:0,behavior:'smooth'});});
  }

  async function init(){
    try{
      if(!firebase.apps.length) firebase.initializeApp(firebaseConfig); const db=firebase.firestore(); await user(); configureView(); bind();
      const [setlistSnap,eventSnap,setlistSongSnap,userSnap,songSnap]=await Promise.all([db.collection('setlists').get(),db.collection('events').get(),db.collection('setlistSongs').get(),db.collection('users').get(),db.collection('songs').get()]);
      const events=new Map(docs(eventSnap).map(item=>[item.id,item])); const users=new Map(docs(userSnap).map(item=>[item.id,item]));
      let library=docs(songSnap); if(!library.length){try{library=docs(await db.collection('musicas').get());}catch(_){library=[];}}
      const libraryMap=new Map(library.map(item=>[item.id,item])); const grouped=new Map(); docs(setlistSongSnap).filter(item=>item.active!==false).forEach(song=>{const list=grouped.get(song.setlistId)||[];list.push(song);grouped.set(song.setlistId,list);});
      const normalized=docs(setlistSnap).map(item=>MusicIdeSetlistHistory.normalizeItem(item,{event:events.get(item.eventId)||{},songs:(grouped.get(item.id)||[]).sort((a,b)=>Number(a.order||0)-Number(b.order||0)),users,library:libraryMap}));
      state.items=MusicIdeSetlistHistory.split(normalized,new Date()); render();
    }catch(error){console.error(error);$('loading').innerHTML=`<p style="color:var(--error,#a63f3f)">${esc(error.message||'Erro ao carregar Setlists.')}</p>`;$('result-count').textContent='Não foi possível carregar os Setlists';}
  }
  document.addEventListener('DOMContentLoaded',init);
})(window);