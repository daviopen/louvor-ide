(function bootstrapSetlists(scope){
  'use strict';
  const $=id=>document.getElementById(id); const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const dateValue=v=>{if(!v)return 0;const d=v?.toDate?v.toDate():new Date(v);return Number.isNaN(d.getTime())?0:d.getTime();};
  const formatDate=v=>{if(!v)return 'Data não informada';const d=v?.toDate?v.toDate():new Date(`${String(v).slice(0,10)}T12:00:00`);return Number.isNaN(d.getTime())?String(v):d.toLocaleDateString('pt-BR');};
  async function user(){return new Promise((resolve,reject)=>firebase.auth().onAuthStateChanged(u=>u?resolve(u):reject(new Error('Faça login para consultar Setlists.'))));}
  async function init(){
    try{
      if(!firebase.apps.length) firebase.initializeApp(firebaseConfig); const db=firebase.firestore(); await user();
      const [setlistSnap,eventSnap]=await Promise.all([db.collection('setlists').get(),db.collection('events').get()]); const events=new Map(eventSnap.docs.map(d=>[d.id,{id:d.id,...d.data()}]));
      const items=setlistSnap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>dateValue(b.eventDate||b.data||b.createdAt||b.criadoEm)-dateValue(a.eventDate||a.data||a.createdAt||a.criadoEm));
      $('loading').style.display='none'; if(!items.length){$('empty-state').style.display='block';return;} $('setlists-list').style.display='block';
      $('setlists-list').innerHTML=items.map(item=>{const event=events.get(item.eventId)||{};const name=item.name||item.nome||event.name||'Setlist';const date=item.eventDate||item.data||event.date;const count=Number(item.totalMusicas||item.musicas?.length||0);const status=String(item.status||'DRAFT').toUpperCase();return `<div class="setlist-card" onclick="location.href='setlist.html?edit=${encodeURIComponent(item.id)}'" style="cursor:pointer"><div class="setlist-header"><div class="setlist-info"><h3>${esc(name)}</h3><div class="setlist-meta"><span><i class="fas fa-calendar"></i> ${esc(formatDate(date))}</span><span><i class="fas fa-music"></i> ${count} música${count===1?'':'s'}</span><span><i class="fas fa-link"></i> Vinculado à escala</span></div>${event.theme?`<div class="setlist-description">Tema: ${esc(event.theme)}</div>`:''}</div><div class="setlist-actions" onclick="event.stopPropagation()"><button class="action-btn edit" onclick="location.href='setlist.html?edit=${encodeURIComponent(item.id)}'" title="Abrir Setlist"><i class="fas fa-edit"></i></button></div></div><div class="minister-info"><span><i class="fas fa-circle"></i> <strong>Status:</strong> ${esc(status)}</span></div></div>`;}).join('');
    }catch(error){console.error(error);$('loading').innerHTML=`<p style="color:#b42318">${esc(error.message||'Erro ao carregar Setlists.')}</p>`;}
  }
  document.addEventListener('DOMContentLoaded',init);
})(window);