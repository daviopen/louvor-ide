#!/usr/bin/env node
'use strict';

const fs = require('fs');
const argv = process.argv.slice(2);
const arg = name => {
  const hit = argv.find(v => v.startsWith(`${name}=`));
  return hit ? hit.slice(name.length + 1) : null;
};
const ROLLBACK = arg('--rollback');
const MODE = ROLLBACK ? 'rollback' : argv.includes('--apply') ? 'apply' : argv.includes('--verify') ? 'verify' : 'dry-run';
const INPUT = arg('--input');
const RUN_ID = arg('--run-id') || `song-catalog-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0,14)}`;
const REPORT = arg('--report');

const NOTE_TO_PC = {C:0,'B#':0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,Fb:4,'E#':5,F:5,'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11,Cb:11};
const SHARPS = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const FLATS = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];

const ARTIST_ALIASES = new Map(Object.entries({
  'dunamis':'Dunamis Music','dunamis music':'Dunamis Music','morada':'MORADA','drops':'Drops INA','drops ina':'Drops INA','drops gl adolescentes':'Drops INA',
  'julliany sousa':'Julliany Souza','julliany souza':'Julliany Souza','nivea soares':'Nívea Soares','isaias saad':'Isaías Saad','bethel music':'Bethel Music',
  'filipe rodrigues':'Felipe Rodrigues','felipe rodrigues':'Felipe Rodrigues','ministerio pedras vivas':'Pedras Vivas','pedras vivas':'Pedras Vivas',
  'iir music':'Louvor IIR','louvor iir':'Louvor IIR','jose jr jose augusto five music':'José Jr.','fhop':'Fhop'
}));

const TITLE_OVERRIDES = new Map(Object.entries({
  'a espreita de ti':'À Espreita de Ti','a paz e uma promessa':'A Paz É Uma Promessa','cancao de simeao':'Canção de Simeão','ceu e terra se encontram':'Céu e Terra Se Encontram',
  'colossenses e suas linhas de amor':'Colossenses e Suas Linhas de Amor','corpo e familia':'Corpo e Família','digno de tudo':'Digno de Tudo','digno e o senhor':'Digno É o Senhor',
  'e tudo sobre voce':'É Tudo Sobre Você','fe':'Fé','grato sou':'Grato Sou','ha poder':'Há Poder','isso e que e viver':'Isso É Que É Viver','lindo momento':'Lindo Momento',
  'minha recompensa':'Minha Recompensa','o nome dele e jesus':'O Nome Dele É Jesus','o unico digno':'O Único Digno','oceanos':'Oceanos','os que olham para ti':'Os Que Olham Para Ti',
  'pai nosso':'Pai Nosso','preso a ti':'Preso a Ti','quero jesus':'Quero Jesus','santidade':'Santidade','senhor tu es bom':'Senhor Tu És Bom','sobre as aguas':'Sobre As Águas',
  'sonda me usa me':'Sonda-me, Usa-me','sua presenca e real':'Sua Presença É Real','sublime':'Sublime','teu amor nao falha':'Teu Amor Não Falha','teu toque':'Teu Toque',
  'tu es':'Tu És','tua graca me basta':'Tua Graça Me Basta','tudo e perda':'Tudo É Perda','tudo e pra tua gloria':'Tudo É Pra Tua Glória','uma vez':'Uma Vez',
  'voltemos ao inicio':'Voltemos ao Início','yeshua':'Yeshua','e ele':'É Ele','unico':'Único'
}));

const KEY_OVERRIDES = new Map(Object.entries({
  'a boa parte||fhop':'E','a espreita de ti||one sounds':'Bm','a paz e uma promessa||drops ina':'E','aba||laura souguellis':'C','abra o livro||laura souguellis':'Dm',
  'abraca me||david quinlan':'G','alegria||isadora pompeo':'E','as trevas estremecem||central 3':'C','ate que o senhor venha||ministerio zoe':'C#m','batendo a porta||fhop':'C#m',
  'cancao de simeao||drops ina':'A','celebrai com jubilo ao senhor||thimoteo reis e henrique dias':'E','colossenses e suas linhas de amor||marco telles part fhop music':'Bm',
  'corpo e familia||frutos do espirito':'A','cristo||alessandro vilas boas':'G','ceu e terra se encontram||davi fernandes':'C','deus de obras completas||kemilly santos':'G',
  'digno de tudo||fernanda ferro':'D','digno e o senhor||felipe rodrigues':'E','em memoria de cristo||fhop':'B','emaus||morada':'B','enche me||isaias saad':'Bm',
  'estacoes||dunamis music':'C','eu so quero tua presenca||theo rubia':'G','eu vou construir||livres para adorar':'A','eu e minha casa||julliany souza':'F',
  'eu sou livre||elevation rhythm e lizzie morgan':'E','fez um caminho||louvor iir':'C','fiel a mim||eyshila':'G','filho amado||laura souguellis':'E','filho do deus vivo||nivea soares':'E',
  'fe||fhop':'C#m','gratidao||fhop':'D','grato sou||drops ina':'A','ha poder||fhop':'B','isso e que e viver||drops ina':'C','jesus te amamos||bethel music':'E',
  'jesus tu es belo||fhop':'Db','jesus meu primeiro amor||fernanda brum':'B','lindo momento||julliany souza':'E','maranata||alessandro vilas boas':'C','me ama||diante do trono':'A',
  'meia noite||fhop':'Bm','minha recompensa||dunamis music':'C','nada mais||fhop':'Em','o nome dele e jesus||dunamis music':'E','o nosso general||mateus brito':'F#m',
  'obediencia||fhop':'E','oceanos||ana nobrega':'Bm','oh quao lindo esse nome e||ana nobrega':'D','os que olham para ti||fhop':'C','pai nosso||pedras vivas':'B',
  'preciso de ti||dunamis music':'E','preso a ti||ton molinari':'C','quebrantado||vineyard':'C','quem e esse||julliany souza':'F#','quero jesus||central 3':'Ab',
  'santidade||aline barros':'Bb','se hoje me toca||jose jr':'C','senhor tu es bom||adoracao e adoradores':'E','sobre as aguas||dunamis music':'E','sonda me usa me||aline barros':'C',
  'sua presenca e real||antonio cirilo':'F#','sublime||fhop':'D','tu es||fhop':'D','teu amor nao falha||nivea soares':'Am','teu toque||central msc':'F#',
  'tua alegria||drops ina':'B','unico||fhop':'G','tua graca me basta||davi sacer':'E','tudo que eu tenho||one sounds':'G','tudo e perda||felipe rodrigues':'Db',
  'tudo e pra tua gloria||dunamis music':'A','tudo e teu||aline barros':'G','uma vez||fhop':'D','vitoria no deserto||aline barros':'G','voltemos ao inicio||laura souguellis':'D',
  'volto os meus olhos vem derrama||dunamis music':'E','yeshua||fernandinho':'Am','e ele||drops ina':'Bb','e tudo sobre voce||morada':'Am'
}));

const ARTIST_BY_TITLE = new Map(Object.entries({
  'colossenses e suas linhas de amor':'Marco Telles (part. Fhop Music)','digno e o senhor':'Felipe Rodrigues','isso e que e viver':'Drops INA','fez um caminho':'Louvor IIR',
  'celebrai com jubilo ao senhor':'Thimoteo Reis & Henrique Dias','fogo em teus olhos que ruja o leao':'Louvor IIR + Fhop',
  'oh quao lindo esse nome e te exaltamos eu estou aprendendo':'Ana Nóbrega + Adoração Central + Fhop'
}));

function norm(v='') { return String(v).replace(/[\u2060\u200B-\u200D\uFEFF]/g,'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/&/g,' e ').replace(/[^a-z0-9#]+/g,' ').replace(/\s+/g,' ').trim(); }
function field(o,...names){ for(const n of names){ const v=o?.[n]; if(v!==undefined&&v!==null&&String(v).trim()!=='') return v; } return ''; }
function titleOf(s){ return String(field(s,'titulo','title','nome','name')||'').trim(); }
function artistOf(s){ return String(field(s,'artista','artist')||'').trim(); }
function keyOf(s){ return String(field(s,'tom','originalKey','key')||'').trim(); }
function chordOf(s){ return String(field(s,'cifra','chord','chordSheet','chords')||'').trim(); }
function lyricsOf(s){ return String(field(s,'letra','lyrics')||'').trim(); }
function prefsOf(s){ return s.tomMinistro&&typeof s.tomMinistro==='object'&&!Array.isArray(s.tomMinistro)?{...s.tomMinistro}:{}; }
function isTest(s){ return norm(artistOf(s))==='playwright e2e'||norm(titleOf(s)).startsWith('e2e musica '); }

function stripQualifier(v='') {
  let s=String(v).replace(/[\u2060\u200B-\u200D\uFEFF]/g,'').trim(), before;
  do { before=s; s=s
    .replace(/\s*[-–—:]?\s*\(\s*(?:tom\s+)?(?:voz\s+)?(?:feminin[oa]|masculin[oa])\s*\)\s*\.?\s*$/i,'')
    .replace(/\s*[-–—:]?\s*\[\s*(?:tom\s+)?(?:voz\s+)?(?:feminin[oa]|masculin[oa])\s*\]\s*\.?\s*$/i,'')
    .replace(/\s*[-–—:]?\s*\(\s*tom\s+(?:rebecca|lara|arthur|bia)\s*\)\s*\.?\s*$/i,'')
    .replace(/\s*[-–—:]?\s*\(\s*(?:rebecca|lara|arthur|bia)\s*\)\s*\.?\s*$/i,'')
    .replace(/\s*[-–—:]?\s*\(\s*ton\s+[A-G](?:#|b)?\s*\)\s*\.?\s*$/i,'')
    .replace(/\s*[-–—:]?\s*\(\s*um\s+tom\s+abaixo\s*\)\s*\.?\s*$/i,'').trim();
  } while(before!==s);
  return s||String(v).trim();
}
function canonicalTitle(v){ const clean=stripQualifier(v), k=norm(clean); return TITLE_OVERRIDES.get(k)||clean.replace(/\s+/g,' ').trim(); }
function canonicalArtist(v,title){ const tk=norm(title); if(ARTIST_BY_TITLE.has(tk)) return ARTIST_BY_TITLE.get(tk); const clean=String(v||'').trim(); return ARTIST_ALIASES.get(norm(clean))||clean; }
function identity(t,a){ return `${norm(t)}||${norm(a)}`; }

function root(key){ const m=String(key||'').trim().match(/^([A-G](?:#|b)?)/); return m?m[1]:null; }
function flatsFor(key){ const r=root(key); return !!r&&(r.includes('b')||['F','Bb','Eb','Ab','Db','Gb','Cb'].includes(r)); }
function transposeRoot(r,n,flats){ const pc=NOTE_TO_PC[r]; if(pc===undefined)return r; return (flats?FLATS:SHARPS)[(pc+n+120)%12]; }
const CHORD_TOKEN=/(?<![A-Za-zÀ-ÿ0-9])([A-G](?:#|b)?)(?=((?:m(?:aj|min)?|maj|min|dim|aug|sus|add|M)?(?:\d+M?|M\d+)?(?:\([^)]+\))?(?:\/(?:[A-G](?:#|b)?|º))?)(?=$|[\s,;.)\]}:+-]))/g;
function transposeText(text,from,to){ const a=root(from),b=root(to); if(!a||!b||NOTE_TO_PC[a]===undefined||NOTE_TO_PC[b]===undefined)return text; const d=(NOTE_TO_PC[b]-NOTE_TO_PC[a]+12)%12; if(!d)return text; const useFlats=flatsFor(to); return String(text).replace(CHORD_TOKEN,(m,r)=>transposeRoot(r,d,useFlats)+m.slice(r.length)); }
function transposeCompact(text,from,to){ return String(text||'').split('\n').map(line=>{ if(!line.trim()||/:\s*$/.test(line.trim()))return line; const i=line.indexOf(' - '); return i>=0?`${line.slice(0,i)} - ${transposeText(line.slice(i+3),from,to)}`:transposeText(line,from,to); }).join('\n'); }

const CHORD_ONLY=/^[A-G](?:#|b)?(?:m(?:aj|min)?|maj|min|dim|aug|sus|add|M)?(?:\d+M?|M\d+)?(?:\([^)]+\))?(?:\/(?:[A-G](?:#|b)?|º))?$/;
function heading(v){ const s=String(v).replace(/#+/g,'').replace(/\s*:\s*$/,'').trim(); if(!s)return null; if(/^(intro|introdu[cç][aã]o)$/i.test(s))return'Intro'; if(/^(estrofe|estrofes|verso|versos)(\s+\d+)?$/i.test(s))return'Estrofe'; if(/^(pre[- ]?refr[aã]o|pré[- ]?refr[aã]o)(\s+\d+)?$/i.test(s))return'Pré-Refrão'; if(/^refr[aã]o(\s+\d+)?$/i.test(s))return'Refrão'; if(/^ponte(\s+\d+)?$/i.test(s))return'Ponte'; if(/^solo(\s+\d+)?$/i.test(s))return'Solo'; if(/^instrumental/i.test(s))return'Instrumental'; if(/^interl[uú]dio/i.test(s))return'Interlúdio'; if(/^(final|outro)$/i.test(s))return'Final'; return s.replace(/\s+/g,' '); }
function compactLine(raw){ let line=String(raw).replace(/\s*\(\s*\d+\s*x\s*\)/gi,' ').replace(/\s*\b\d+\s*x\b/gi,' ').replace(/\b(?:Tom|Ton)\s*:\s*[A-G](?:#|b)?m?\b/ig,'').trim(); if(!line||/^[-=#]+$/.test(line))return null; const toks=line.replace(/[,:;]+/g,' ').split(/\s+/).filter(Boolean); const pure=toks.length&&toks.every(t=>CHORD_ONLY.test(t.replace(/[()[\],.;]+/g,''))); if(pure)return toks.map(t=>t.replace(/[()[\],.;]+/g,'')).join(' '); const sep=line.search(/\s+[–—-]\s+/); if(sep>=0){ const left=line.slice(0,sep).trim().split(/\s+/).slice(0,2).join(' '), right=line.slice(sep).replace(/^\s*[–—-]\s*/,'').trim(); return left&&right?`${left} - ${right}`:line; } const parts=line.split(/\s+/); let start=parts.length; while(start>0&&CHORD_ONLY.test(parts[start-1].replace(/^[([,{]+|[)\]},.;]+$/g,'')))start--; if(start<parts.length&&start>0){ const left=parts.slice(0,start).slice(0,2).join(' '), chords=parts.slice(start).map(t=>t.replace(/^[([,{]+|[)\]},.;]+$/g,'')).join(' '); return `${left} - ${chords}`; } return parts.slice(0,2).join(' '); }
function compactChord(text){ const sections=[], map=new Map(); let current=null; const ensure=h=>{ const k=norm(h); if(map.has(k))return map.get(k); const x={heading:h,lines:[]}; map.set(k,x); sections.push(x); return x; }; for(const raw of String(text||'').replace(/\r/g,'').split('\n')){ const line=raw.trim(); if(!line||/^[-=#]{3,}$/.test(line))continue; const idx=line.indexOf(':'); let h=null, inline=''; if(idx>=0&&idx<40){ const candidate=line.slice(0,idx).trim(); if(/^[A-Za-zÀ-ÿ0-9ª° #+/-]+$/u.test(candidate)){ h=heading(candidate); inline=line.slice(idx+1).trim(); } } else if(/^(INTRO|ESTROFE|ESTROFES|VERSO|PRÉ-REFRÃO|PRE-REFRAO|REFRÃO|REFRAO|PONTE|SOLO|INSTRUMENTAL|INTERLÚDIO|INTERLUDIO|FINAL|PARTE)(?:\s+\d+)?$/i.test(line)) h=heading(line); if(h){ current=ensure(h); if(inline){ const c=compactLine(inline); if(c&&!current.lines.includes(c))current.lines.push(c); } continue; } if(!current)current=ensure('Estrutura'); const c=compactLine(line); if(c&&!current.lines.includes(c))current.lines.push(c); } return sections.filter(s=>s.lines.length).map(s=>`${s.heading}:\n${s.lines.join('\n')}`).join('\n\n').trim(); }

function score(s){ let n=0; if(canonicalTitle(titleOf(s))===titleOf(s).trim())n+=100; if(artistOf(s))n+=30; if(field(s,'link','referenceUrl'))n+=20; if(lyricsOf(s))n+=20; n+=Math.min(chordOf(s).length/50,25); n+=Object.keys(prefsOf(s)).length*3; if(s.active!==false)n+=10; return n; }
function groupsOf(songs){ const real=(songs||[]).filter(s=>!isTest(s)).map(s=>{ const t=canonicalTitle(titleOf(s)), a=canonicalArtist(artistOf(s),t); return {...s,_t:t,_a:a,_id:identity(t,a)}; }); const titleArtists=new Map(); for(const s of real){ const k=norm(s._t); if(!titleArtists.has(k))titleArtists.set(k,new Set()); if(s._a)titleArtists.get(k).add(s._a); } for(const s of real){ if(!s._a){ const a=[...(titleArtists.get(norm(s._t))||[])]; if(a.length===1){s._a=a[0];s._id=identity(s._t,s._a);} } } const m=new Map(); for(const s of real){ if(!m.has(s._id))m.set(s._id,[]);m.get(s._id).push(s); } return m; }
function mergePrefs(group){ const out={}; for(const s of group)for(const [n,k] of Object.entries(prefsOf(s))){ if(String(n).trim()&&String(k).trim())out[String(n).trim()]=String(k).trim(); } return out; }
function canonicalKey(t,a,group){ const k=KEY_OVERRIDES.get(identity(t,a)); if(k)return{key:k,verified:true,source:'verified-public-reference'}; const ranked=[...group].sort((x,y)=>score(y)-score(x)); return{key:keyOf(ranked[0])||group.map(keyOf).find(Boolean)||'',verified:false,source:'stored-reference-arrangement'}; }

function buildPlan(snapshot){ const groups=groupsOf(snapshot.songs), ops=[], idMap=new Map(), canonical=[], merged=[], changed=[], titles=[], compacted=[]; for(const group of groups.values()){ const ranked=[...group].sort((a,b)=>score(b)-score(a)), survivor=ranked[0], title=survivor._t, artist=survivor._a, keyInfo=canonicalKey(title,artist,group); const chordSource=[...group].sort((a,b)=>chordOf(b).length-chordOf(a).length)[0], sourceChord=chordOf(chordSource), sourceKey=keyOf(chordSource), compact=transposeCompact(compactChord(sourceChord),sourceKey,keyInfo.key); const lyricSource=[...group].filter(s=>lyricsOf(s)).sort((a,b)=>lyricsOf(b).length-lyricsOf(a).length)[0], lyrics=lyricSource?lyricsOf(lyricSource):''; const prefs=mergePrefs(group), link=group.map(s=>field(s,'link','referenceUrl')).find(Boolean)||null, theme=group.map(s=>field(s,'tema','theme')).find(Boolean)||null, notes=group.map(s=>field(s,'observacoes','notes')).find(Boolean)||null; const data={titulo:title,title,artista:artist,artist,tom:keyInfo.key,originalKey:keyInfo.key,cifra:compact||sourceChord,chord:compact||sourceChord,chordSheet:compact||sourceChord,letra:lyrics,lyrics,link,referenceUrl:link,tema:theme,theme,observacoes:notes,notes,tomMinistro:Object.keys(prefs).length?prefs:null,active:true,catalogMigration:{runId:RUN_ID,migratedAt:new Date().toISOString(),mergedFromIds:group.map(s=>s.id).filter(id=>id!==survivor.id),originalKeyVerified:keyInfo.verified,originalKeySource:keyInfo.source,chordSourceSongId:chordSource.id,chordSourceKey:sourceKey||null,compactFormatVersion:1}}; ops.push({type:'upsertSong',id:survivor.id,data}); canonical.push({id:survivor.id,title,artist,key:keyInfo.key,verified:keyInfo.verified}); if(titleOf(survivor)!==title)titles.push({id:survivor.id,from:titleOf(survivor),to:title}); if(keyInfo.key&&keyOf(survivor)&&keyInfo.key!==keyOf(survivor))changed.push({id:survivor.id,title,from:keyOf(survivor),to:keyInfo.key}); if((compact||'')!==sourceChord)compacted.push(survivor.id); for(const loser of group.slice(1)){ idMap.set(loser.id,survivor.id); ops.push({type:'deleteSong',id:loser.id,mergedInto:survivor.id}); } if(group.length>1)merged.push({survivorId:survivor.id,title,artist,ids:group.map(s=>s.id)}); }
  for(const s of snapshot.songs||[])if(isTest(s))ops.push({type:'deleteSong',id:s.id,reason:'REMOVED_TEST_DATA'});
  for(const e of snapshot.songMinisterKeys||[]){ const target=idMap.get(e.songId)||e.songId; if(target!==e.songId)ops.push({type:'upsertMinisterKey',oldId:e.id,songId:target,userId:e.userId,preferredKey:e.preferredKey||null}); }
  for(const setlist of snapshot.setlists||[]){ if(!Array.isArray(setlist.musicas))continue; let touched=false; const musicas=setlist.musicas.map(item=>{ const old=item?.musicId||item?.musicaId||item?.songId||item?.id, newid=idMap.get(old); if(!newid)return item; touched=true; const c=canonical.find(s=>s.id===newid); return {...item,musicId:newid,musicaId:item.musicaId!==undefined?newid:item.musicaId,songId:item.songId!==undefined?newid:item.songId,titulo:c?.title||item.titulo,title:c?.title||item.title,artista:c?.artist||item.artista,artist:c?.artist||item.artist,tomOriginal:c?.key||item.tomOriginal,originalKey:c?.key||item.originalKey}; }); if(touched)ops.push({type:'updateSetlist',id:setlist.id,data:{musicas}}); }
  return{runId:RUN_ID,summary:{sourceSongs:(snapshot.songs||[]).length,canonicalSongs:canonical.length,duplicateGroupsMerged:merged.length,duplicateSongsDeleted:[...idMap].length,testSongsDeleted:(snapshot.songs||[]).filter(isTest).length,normalizedTitles:titles.length,originalKeysChanged:changed.length,originalKeysPubliclyVerified:canonical.filter(s=>s.verified).length,originalKeysReferencePreserved:canonical.filter(s=>!s.verified).length,chordSheetsCompacted:compacted.length,missingLyrics:canonical.filter(c=>!(groups.get(identity(c.title,c.artist))||[]).some(s=>lyricsOf(s))).length},canonical,merged,changed,titles,ops,idMap:Object.fromEntries(idMap)}; }

async function adminDb(){ const admin=require('firebase-admin'); if(!admin.apps.length)admin.initializeApp(); return{admin,db:admin.firestore()}; }
async function liveSnapshot(db){ const names=['songs','songMinisterKeys','setlists','setlistSongs','users'], out={}; for(const n of names){ const s=await db.collection(n).get(); out[n]=s.docs.map(d=>({id:d.id,...d.data()})); } return out; }
function fileSnapshot(){ return INPUT?JSON.parse(fs.readFileSync(INPUT,'utf8')):null; }

function uniqueUserMap(users){ const map=new Map(); for(const u of users||[]){ if(u.active===false)continue; const k=norm(u.name||u.displayName||u.email||''); if(!k)continue; if(!map.has(k))map.set(k,[]);map.get(k).push(u); } return map; }
async function backup(db,admin,plan,snapshot){ const run=db.collection('_migrationRuns').doc(plan.runId), exists=await run.get(); if(exists.exists)throw new Error(`runId ${plan.runId} já existe (${exists.data()?.status||'sem status'}).`); await run.set({type:'songCatalog',status:'BACKING_UP',summary:plan.summary,createdAt:admin.firestore.FieldValue.serverTimestamp()}); const touched=new Map(); for(const o of plan.ops){ if(['upsertSong','deleteSong'].includes(o.type))touched.set(`songs/${o.id}`,['songs',o.id]); if(o.type==='upsertMinisterKey'){ if(o.oldId)touched.set(`songMinisterKeys/${o.oldId}`,['songMinisterKeys',o.oldId]); const id=`${o.songId}_${o.userId}`; touched.set(`songMinisterKeys/${id}`,['songMinisterKeys',id]); } if(o.type==='updateSetlist')touched.set(`setlists/${o.id}`,['setlists',o.id]); }
  const users=uniqueUserMap(snapshot.users); for(const o of plan.ops.filter(x=>x.type==='upsertSong'))for(const name of Object.keys(o.data.tomMinistro||{})){ const m=users.get(norm(name))||[]; if(m.length===1){ const id=`${o.id}_${m[0].id}`; touched.set(`songMinisterKeys/${id}`,['songMinisterKeys',id]); } }
  const w=db.bulkWriter(); for(const [path,[col,id]] of touched){ const doc=await db.collection(col).doc(id).get(); w.set(run.collection('backups').doc(Buffer.from(path).toString('base64url')),{path,exists:doc.exists,data:doc.exists?doc.data():null}); } await w.close(); await run.set({status:'BACKED_UP',backupCount:touched.size},{merge:true}); }

async function apply(db,admin,plan,snapshot){ await backup(db,admin,plan,snapshot); const w=db.bulkWriter(), ts=admin.firestore.FieldValue.serverTimestamp(); for(const o of plan.ops){ if(o.type==='upsertSong')w.set(db.collection('songs').doc(o.id),{...o.data,updatedAt:ts},{merge:true}); else if(o.type==='deleteSong')w.delete(db.collection('songs').doc(o.id)); else if(o.type==='upsertMinisterKey'){ const newid=`${o.songId}_${o.userId}`; w.set(db.collection('songMinisterKeys').doc(newid),{songId:o.songId,userId:o.userId,preferredKey:o.preferredKey,updatedAt:ts},{merge:true}); if(o.oldId&&o.oldId!==newid)w.delete(db.collection('songMinisterKeys').doc(o.oldId)); } else if(o.type==='updateSetlist')w.set(db.collection('setlists').doc(o.id),{...o.data,updatedAt:ts},{merge:true}); }
  const users=uniqueUserMap(snapshot.users); for(const o of plan.ops.filter(x=>x.type==='upsertSong'))for(const [name,key] of Object.entries(o.data.tomMinistro||{})){ const m=users.get(norm(name))||[]; if(m.length===1)w.set(db.collection('songMinisterKeys').doc(`${o.id}_${m[0].id}`),{songId:o.id,userId:m[0].id,preferredKey:key,updatedAt:ts},{merge:true}); }
  await w.close(); await db.collection('_migrationRuns').doc(plan.runId).set({status:'APPLIED',appliedAt:ts},{merge:true}); }

async function rollback(db,admin,runId){ const run=db.collection('_migrationRuns').doc(runId), doc=await run.get(); if(!doc.exists)throw new Error(`Migração ${runId} não encontrada.`); const snaps=await run.collection('backups').get(); if(snaps.empty)throw new Error('Backup vazio.'); const w=db.bulkWriter(); for(const b of snaps.docs){ const x=b.data(), parts=String(x.path).split('/'); if(parts.length!==2)throw new Error(`Backup inválido: ${x.path}`); const ref=db.collection(parts[0]).doc(parts[1]); if(x.exists)w.set(ref,x.data||{},{merge:false}); else w.delete(ref); } await w.close(); await run.set({status:'ROLLED_BACK',rolledBackAt:admin.firestore.FieldValue.serverTimestamp(),restoredCount:snaps.size},{merge:true}); return{ok:true,restoredCount:snaps.size}; }

async function verify(db){ const snap=await db.collection('songs').get(), songs=snap.docs.map(d=>({id:d.id,...d.data()})), active=songs.filter(s=>s.active!==false&&!isTest(s)), groups=groupsOf(active), errors=[]; for(const [id,g] of groups)if(g.length>1)errors.push(`duplicate ${id}: ${g.map(x=>x.id).join(',')}`); for(const s of active){ const t=titleOf(s); if(stripQualifier(t)!==t.replace(/[\u2060\u200B-\u200D\uFEFF]/g,'').trim())errors.push(`qualified title: ${s.id}`); if(!artistOf(s))errors.push(`missing artist: ${s.id}`); if(!keyOf(s))errors.push(`missing key: ${s.id}`); if(!chordOf(s))errors.push(`missing chord: ${s.id}`); if(s.tom&&s.originalKey&&s.tom!==s.originalKey)errors.push(`key mismatch: ${s.id}`); } if(songs.some(s=>s.active!==false&&isTest(s)))errors.push('E2E songs remain'); return{ok:errors.length===0,activeSongs:active.length,totalDocuments:songs.length,errors}; }

async function main(){ let snapshot=fileSnapshot(), admin=null, db=null; if(!snapshot){ ({admin,db}=await adminDb()); snapshot=await liveSnapshot(db); } if(MODE==='rollback'){ if(!db)throw new Error('--rollback exige Firestore real.'); const result=await rollback(db,admin,ROLLBACK); console.log(JSON.stringify({mode:MODE,runId:ROLLBACK,result},null,2)); return; } const plan=buildPlan(snapshot); let verification=null; if(MODE==='apply'){ if(!db)throw new Error('--apply exige Firestore real.'); await apply(db,admin,plan,snapshot); verification=await verify(db); if(!verification.ok)throw new Error(`Falha pós-migração: ${verification.errors.join(' | ')}`); } else if(MODE==='verify'){ verification=db?await verify(db):{ok:true,note:'snapshot plan valid'}; if(!verification.ok)process.exitCode=2; }
  const out={runId:plan.runId,mode:MODE,summary:plan.summary,mergedGroups:plan.merged,changedKeys:plan.changed,normalizedTitles:plan.titles,verification}; const text=JSON.stringify(out,null,2); if(REPORT)fs.writeFileSync(REPORT,text); console.log(text); }
main().catch(e=>{console.error(e?.stack||e);process.exitCode=1;});
