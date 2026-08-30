#!/usr/bin/env node
'use strict';

const fs = require('fs');

const argv = process.argv.slice(2);
const arg = name => {
  const hit = argv.find(value => value.startsWith(`${name}=`));
  return hit ? hit.slice(name.length + 1) : null;
};
const MODE = argv.includes('--apply') ? 'apply' : argv.includes('--verify') ? 'verify' : argv.includes('--rollback') ? 'rollback' : 'dry-run';
const RUN_ID = arg('--run-id') || 'song-catalog-format-v3';
const SOURCE_RUN_ID = arg('--source-run-id') || 'song-catalog-production-v2';
const REPORT = arg('--report');
const INPUT_CURRENT = arg('--current');
const INPUT_SOURCE = arg('--source');

const NOTE_PC = { C:0,'B#':0,'C#':1,Db:1,D:2,'D#':3,Eb:3,E:4,Fb:4,'E#':5,F:5,'F#':6,Gb:6,G:7,'G#':8,Ab:8,A:9,'A#':10,Bb:10,B:11,Cb:11 };
const SHARPS = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const FLATS = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
const CHORD_RE = /^([A-G](?:#|b)?)((?:m(?:aj|min)?|maj|min|dim|aug|sus|add|M)?(?:\d+M?|M\d+)?(?:\([^)]+\))?)(?:\/([A-G](?:#|b)?|º))?$/;

function norm(value='') {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
}
function cleanText(value='') { return String(value).replace(/[\u2060\u200B-\u200D\uFEFF]/g,'').replace(/\s+/g,' ').trim(); }
function field(obj,...names) { for (const name of names) { const value=obj?.[name]; if (value!==undefined && value!==null && String(value).trim()!=='') return value; } return ''; }
function titleOf(song){ return String(field(song,'titulo','title')||'').trim(); }
function keyOf(song){ return String(field(song,'tom','originalKey','key')||'').trim(); }
function chordOf(song){ return String(field(song,'cifra','chord','chordSheet')||'').trim(); }
function rootKey(key){ const m=String(key||'').trim().match(/^([A-G](?:#|b)?)/); return m?m[1]:null; }
function useFlats(target){ const root=rootKey(target); return !!root && (root.includes('b') || ['F','Bb','Eb','Ab','Db','Gb','Cb'].includes(root)); }
function transposeNote(note,delta,flats){ if (NOTE_PC[note]===undefined) return note; return (flats?FLATS:SHARPS)[(NOTE_PC[note]+delta+120)%12]; }
function transposeChord(token,sourceKey,targetKey){
  const match=String(token||'').trim().match(CHORD_RE); if(!match)return token;
  const source=rootKey(sourceKey), target=rootKey(targetKey); if(!source||!target||NOTE_PC[source]===undefined||NOTE_PC[target]===undefined)return token;
  const delta=(NOTE_PC[target]-NOTE_PC[source]+12)%12; if(!delta)return token;
  const flats=useFlats(targetKey); const root=transposeNote(match[1],delta,flats); let bass=match[3]||'';
  if(bass && bass!=='º')bass=transposeNote(bass,delta,flats);
  return `${root}${match[2]||''}${bass?`/${bass}`:''}`;
}
function hasChord(text){ return cleanText(text).split(/\s+/).some(token=>CHORD_RE.test(token.replace(/^[\[({]+|[\])},;:.]+$/g,''))); }
function chordTokensFrom(text){
  const out=[]; for(const raw of cleanText(text).split(/\s+/)){ const token=raw.replace(/^[\[({]+|[\])},;:.]+$/g,''); if(CHORD_RE.test(token))out.push(token); } return out;
}
function looksHeading(value){ return /^(intro|introducao|verso|versos|estrofe|estrofes|pre refrao|prerefrao|refrao|ponte|bridge|solo|instrumental|interludio|interlude|final|outro|medley|estrutura|parte \d+|\d+ parte)/.test(norm(value)); }
function sectionHeading(line){
  let raw=cleanText(line).replace(/^#+\s*/,'').replace(/^_+|_+$/g,'').trim(); if(!raw)return null;
  let bracket=false; const bracketParts=[...raw.matchAll(/\[([^\]]+)\]/g)].map(m=>m[1].trim());
  if(bracketParts.length && bracketParts.every(part=>CHORD_RE.test(part)))return null;
  if(raw.startsWith('[') && raw.endsWith(']')){ const inner=raw.slice(1,-1).trim(); if(CHORD_RE.test(inner))return null; raw=inner;bracket=true; }
  else if(raw.startsWith('[')){ const first=raw.slice(1).split(']',1)[0].trim(); if(CHORD_RE.test(first))return null; raw=raw.slice(1).trim();bracket=true; }
  let tail=null;
  if(raw.includes(':')){ const [left,...rest]=raw.split(':'); if(looksHeading(left)){ raw=left.trim(); tail=rest.join(':').trim()||null; } }
  else { const dash=raw.match(/^(.+?)\s+[-–—]\s*(.+)$/); if(dash&&looksHeading(dash[1])&&chordTokensFrom(dash[2]).length){raw=dash[1].trim();tail=dash[2].trim();} }
  const base=raw.split(/\s*[-–—]\s*/,1)[0].trim(); const k=norm(base);
  let section=null;
  if(/^(intro|introducao)(?: \d+)?(?: |$)/.test(k))section='Intro';
  else if(/^(verso|versos|estrofe|estrofes)(?: \d+)?(?: |$)/.test(k))section='Estrofe';
  else if(/^(pre refrao|prerefrao)(?: \d+)?(?: |$)/.test(k))section='Pré-Refrão';
  else if(k.startsWith('refrao final'))section='Final';
  else if(/^refrao(?: \d+)?(?: |$)/.test(k) || k==='refao')section='Refrão';
  else if(/^(ponte|bridge)(?: \d+)?(?: |$)/.test(k) || k.startsWith('bridge tag'))section='Ponte';
  else if(/^solo(?: \d+)?(?: |$)/.test(k))section='Solo';
  else if(k.startsWith('instrumental'))section='Instrumental';
  else if(k.startsWith('interludio')||k.startsWith('interlude'))section='Interlúdio';
  else if(k==='final'||k==='outro')section='Final';
  else if(k.startsWith('medley'))section='Medley';
  else if(k==='estrutura')section='__SKIP__';
  else { const m=k.match(/^(?:parte )?(\d+)$/)||k.match(/^(\d+)(?:a|o)? parte$/); if(m)section=`Parte ${Number(m[1])}`; }
  if(section)return {section,tail};
  if(bracket && raw.split(/\s+/).length<=6)return {section:raw.replace(/\b\w/g,c=>c.toUpperCase()),tail};
  if(String(line).trim().endsWith(':') && raw.split(/\s+/).length<=6 && !hasChord(raw))return {section:raw.replace(/:$/,'').trim(),tail};
  return null;
}
function isChordLine(line){
  const text=cleanText(line); if(!text)return false;
  const tokens=text.split(/\s+/).map(token=>token.replace(/^[\[({]+|[\])},;:.]+$/g,'')).filter(Boolean);
  const chords=tokens.filter(token=>CHORD_RE.test(token));
  const non=tokens.filter(token=>!CHORD_RE.test(token) && !['-','–','—','/','|'].includes(token));
  const allowed=non.every(token=>/^\(?\d+x\)?$/i.test(token)||/^\(?\d+[ªº]?parte\)?$/i.test(token));
  return chords.length>0 && (non.length===0||allowed);
}
function cue(text){
  let value=cleanText(text).replace(/^[\[\](){}]+|[\[\](){}]+$/g,'').replace(/\.{2,}|…/g,'').replace(/\s*[-–—]+\s*$/,'').replace(/^[ ,;:-]+|[ ,;:-]+$/g,'');
  const words=value.match(/[A-Za-zÀ-ÿ0-9']+/g)||[]; return words.slice(0,2).join(' ');
}
function parseInline(line){
  const text=cleanText(line); if(!text)return null;
  const sep=/(?:\s+[-–—]\s*|\.{3}|…)/g; let match;
  while((match=sep.exec(text))){ const left=text.slice(0,match.index).trim(), right=text.slice(match.index+match[0].length).trim(), chords=chordTokensFrom(right); if(chords.length)return {cue:cue(left),chords}; }
  const tokens=text.split(/\s+/); let idx=tokens.length;
  while(idx>0){ const token=tokens[idx-1].replace(/^[\[({]+|[\])},;:.]+$/g,''); if(CHORD_RE.test(token)||/^\(?\d+x\)?$/i.test(token))idx--; else break; }
  if(idx<tokens.length){ const left=tokens.slice(0,idx).join(' '), chords=tokens.slice(idx).map(token=>token.replace(/^[\[({]+|[\])},;:.]+$/g,'')).filter(token=>CHORD_RE.test(token)); if(left.trim()&&chords.length)return {cue:cue(left),chords}; }
  return null;
}
function formatProg(chords,sourceKey,targetKey){ return chords.map(chord=>transposeChord(chord,sourceKey,targetKey)).join(' '); }
function compact(raw,sourceKey,targetKey){
  const lines=String(raw||'').replace(/\r/g,'').split('\n'); const sections=[]; const index=new Map();
  const ensure=section=>{ if(!index.has(section)){index.set(section,sections.length);sections.push({section,lines:[]});} return sections[index.get(section)].lines; };
  let current='Geral'; ensure(current);
  for(let i=0;i<lines.length;){ const line=lines[i].trim(); if(!line){i++;continue;} const heading=sectionHeading(line);
    if(heading){ if(heading.section!=='__SKIP__')current=heading.section; const bucket=ensure(current); if(heading.tail){const chords=chordTokensFrom(heading.tail);if(chords.length){const prog=formatProg(chords,sourceKey,targetKey);if(prog&&!bucket.includes(prog))bucket.push(prog);}} i++;continue; }
    const bucket=ensure(current);
    if(isChordLine(line)){ const prog=formatProg(chordTokensFrom(line),sourceKey,targetKey); let j=i+1;while(j<lines.length&&!lines[j].trim())j++;
      if(j<lines.length&&!sectionHeading(lines[j])&&!isChordLine(lines[j])){ const inline=parseInline(lines[j]); if(!inline){const label=cue(lines[j]);if(label&&prog){const entry=`${label} - ${prog}`;if(!bucket.includes(entry))bucket.push(entry);i=j+1;continue;}} }
      if(prog&&!bucket.includes(prog))bucket.push(prog);i++;continue;
    }
    const inline=parseInline(line); if(inline){ const prog=formatProg(inline.chords,sourceKey,targetKey), entry=inline.cue?`${inline.cue} - ${prog}`:prog; if(entry&&!bucket.includes(entry))bucket.push(entry);i++;continue; }
    const label=cue(line);let j=i+1;while(j<lines.length&&!lines[j].trim())j++;if(label&&j<lines.length&&isChordLine(lines[j])){const prog=formatProg(chordTokensFrom(lines[j]),sourceKey,targetKey),entry=`${label} - ${prog}`;if(!bucket.includes(entry))bucket.push(entry);i=j+1;continue;} i++;
  }
  let cleaned=sections.filter(item=>item.lines.length); if(cleaned.length>1)cleaned=cleaned.filter(item=>item.section!=='Geral');
  let out=cleaned.map(item=>`${item.section==='Geral'?'Estrutura':item.section}:\n${item.lines.join('\n')}`).join('\n\n').trim();
  out=out.replace(/^Parte 0+(\d+):$/gm,'Parte $1:').replace(/^Refão:$/gmi,'Refrão:').replace(/^Pré refrao:$/gmi,'Pré-Refrão:');
  return out;
}

const SOURCE_KEY_OVERRIDES = {
  CJc2d1Aq9UM9OW0Qphp6: 'C#m',
  F4ypYyBrwl9mr4pczpcD: 'Bm',
  KJiHvxsMbqqsJDzQiGju: 'Em',
  MpVFuhpIrT7JN35W88pZ: 'Bm',
  PObRibgJCDX368qZNjdo: 'Am',
  WMXQ9I5qCcnG2KNEstvH: 'Em',
  cXcZSd8QegXelg1YaT4t: 'Bm',
  ch2H7IZxgjJyvqdYNdKE: 'C#m',
  fwXDQCnCm5zqfRZbwNXq: 'Em',
  kQfErxaV7t9GKBoxgS9V: 'C#m',
  mtVADXOu5aJKw47twon5: 'F#m',
  nhkskdcGIJyKRgFEA9Pp: 'Em',
  uP1kjreC3JLuGEbLATHM: 'Em',
  xWuxelGf0ioQEjgoVsXl: 'C#m'
};

const MANUAL = {
  GGW7yj2tNTm5EtAjDN09: `Intro:\nC G Am7 G F\n\nEstrofe:\nMeu Jesus - C G\nOutro igual - Am G F\nTodos os - C/E F C/G Am\nAs maravilhas - A# F/A G4 G\nConsolo - C G\nForça e - Am G F\nCom todo - C/E F C/G Am\nSempre te - A# F/A G4 G\n\nRefrão:\nAclame ao - C Am F G\nPoder - C Am F G\nMontanhas - Am C/G F\nAo som - G F/A G/B\nAlegre te - C Am F G\nFirmado - C Am F G\nIncomparáveis são - Am C/G F\nPra mim - C\n\nMedley:\nC\nPra te - F Am G\nFoi que - F Am G\nMeu prazer - C/E Am G F\nNos átrios - G C\nMeu prazer - G/B Am G F\nOnde flui - C`,
  qPojmtGlSo5fHKqDdcQc: `Intro:\nE\nC#m A E/G# E\n\nEstrofe:\nEu te - E/G# A\nDançando sobre - E\nEu não - C#m B\nEu não - A\nPodem me - E/G# A\nMas eu - E\nDe ti - C#m B\nSei que - E/G# A\nOutro amor - E\nPodem falar - C#m B\n\nRefrão:\nQuebrou as - E/G# A\nEu sou - E\nDos meus - C#m A\nOlho para - E/G# A\nEu deixo - E\nEu canto - C#m A\n\nInterlúdio:\nC#m A E/G# E\n\nPonte:\nFoi para - E/D# E A\nCorreu seu - E/D# E A\nPagou o - E/D# E A\nEu não - E/D# E A\n\nFinal:\nOlho para - E\nEu deixo - E\nEu deixo - E/D# E A`,
  EpHvuH4sPWQjujeDZura: `Intro:\nE B/D# D A/C#\n\nEstrofe:\nSenhor Tu - E B/D# D A/C#\n\nPré-Refrão:\nTodos os - A B C D\n\nRefrão:\nTe adorarei - E B D A\nTe adorarei - E/G# Bm7 C D2\nDeus é - E G A9 E D A/C#\n\nInstrumental:\nD A/C# D A/C#\nD A/C# D A/C# E\nD A/C# D A/C# G E\nPassagem para - E`
};
function formatErrors(text){ const errors=[]; if(!text||!text.trim())errors.push('empty'); if(text.includes('...')||text.includes('…'))errors.push('ellipsis'); if(/^\s*\[/m.test(text))errors.push('bracket'); for(const line of text.split('\n'))if(line.includes(' - ')){const words=(line.split(' - ',1)[0].match(/[A-Za-zÀ-ÿ0-9']+/g)||[]);if(words.length>2)errors.push(`cue>2: ${line}`);} return errors; }

function buildPlan(currentSongs,sourceSongs){ const sourceMap=new Map(sourceSongs.map(song=>[song.id,song])); const updates=[]; const errors=[]; for(const song of currentSongs){ const sourceId=song.catalogMigration?.chordSourceSongId||song.id; const source=sourceMap.get(sourceId); if(!source){errors.push(`missing source ${sourceId} for ${song.id}`);continue;} const sourceKey=SOURCE_KEY_OVERRIDES[song.id]||song.catalogMigration?.chordSourceKey||keyOf(source)||keyOf(song), targetKey=keyOf(song); let cifra=MANUAL[song.id]||compact(chordOf(source),sourceKey,targetKey); const f=formatErrors(cifra); if(f.length)errors.push(`${song.id} ${titleOf(song)}: ${f.join(', ')}`); updates.push({id:song.id,title:titleOf(song),key:targetKey,sourceId,sourceKey,cifra,changed:String(song.cifra||'').trim()!==cifra.trim()}); } return{ok:errors.length===0,errors,updates,changedSongs:updates.filter(x=>x.changed).length,totalSongs:currentSongs.length}; }

async function liveContext(){ const admin=require('firebase-admin'); if(!admin.apps.length)admin.initializeApp(); const db=admin.firestore(); const currentSnap=await db.collection('songs').get(); const currentSongs=currentSnap.docs.map(doc=>({id:doc.id,...doc.data()})); const backupSnap=await db.collection('_migrationRuns').doc(SOURCE_RUN_ID).collection('backups').get(); const sourceSongs=[]; for(const doc of backupSnap.docs){const item=doc.data();if(String(item.path||'').startsWith('songs/')&&item.exists&&item.data)sourceSongs.push({id:String(item.path).split('/')[1],...item.data});} return{admin,db,currentSongs,sourceSongs}; }
function fileContext(){ if(!INPUT_CURRENT||!INPUT_SOURCE)return null; const current=JSON.parse(fs.readFileSync(INPUT_CURRENT,'utf8')), source=JSON.parse(fs.readFileSync(INPUT_SOURCE,'utf8')); return{currentSongs:current.songs||[],sourceSongs:source.songs||[]}; }

async function backupV3(db,admin,currentSongs){ const run=db.collection('_migrationRuns').doc(RUN_ID); const existing=await run.get(); if(existing.exists)throw new Error(`runId ${RUN_ID} already exists (${existing.data()?.status||'unknown'})`); await run.set({type:'songCatalogFormat',status:'BACKING_UP',sourceRunId:SOURCE_RUN_ID,createdAt:admin.firestore.FieldValue.serverTimestamp()}); const writer=db.bulkWriter(); for(const song of currentSongs){const path=`songs/${song.id}`;writer.set(run.collection('backups').doc(Buffer.from(path).toString('base64url')),{path,exists:true,data:Object.fromEntries(Object.entries(song).filter(([key])=>key!=='id'))});} await writer.close(); await run.set({status:'BACKED_UP',backupCount:currentSongs.length},{merge:true}); }
async function rollbackV3(db,admin){ const run=db.collection('_migrationRuns').doc(RUN_ID), snaps=await run.collection('backups').get(); if(snaps.empty)throw new Error(`backup ${RUN_ID} is empty`); const writer=db.bulkWriter(); for(const doc of snaps.docs){const item=doc.data(),id=String(item.path||'').split('/')[1];if(id&&item.exists)writer.set(db.collection('songs').doc(id),item.data||{},{merge:false});} await writer.close(); await run.set({status:'ROLLED_BACK',rolledBackAt:admin.firestore.FieldValue.serverTimestamp()},{merge:true}); return{restored:snaps.size}; }
async function applyV3(db,admin,ctx,plan){ if(ctx.currentSongs.length!==95)throw new Error(`expected 95 current songs, got ${ctx.currentSongs.length}`); if(plan.changedSongs<70)throw new Error(`expected broad reformat, only ${plan.changedSongs} songs would change`); await backupV3(db,admin,ctx.currentSongs); try{const writer=db.bulkWriter(),ts=admin.firestore.FieldValue.serverTimestamp();for(const update of plan.updates)writer.update(db.collection('songs').doc(update.id),{cifra:update.cifra,chord:update.cifra,chordSheet:update.cifra,updatedAt:ts,'catalogMigration.compactFormatVersion':2,'catalogMigration.formatRunId':RUN_ID,'catalogMigration.formattedAt':new Date().toISOString()});await writer.close();const verifyCtx=await liveContext();const verification=buildPlan(verifyCtx.currentSongs,verifyCtx.sourceSongs);const mismatches=[];for(const update of plan.updates){const live=verifyCtx.currentSongs.find(song=>song.id===update.id);if(!live||String(live.cifra||'').trim()!==update.cifra.trim()||String(live.chord||'').trim()!==update.cifra.trim()||String(live.chordSheet||'').trim()!==update.cifra.trim())mismatches.push(update.id);}if(!verification.ok||mismatches.length)throw new Error(`post-apply verification failed: ${verification.errors.join(' | ')} ${mismatches.join(',')}`);await db.collection('_migrationRuns').doc(RUN_ID).set({status:'VERIFIED',verifiedAt:ts,changedSongs:plan.changedSongs},{merge:true});return{ok:true,changedSongs:plan.changedSongs,verifiedSongs:plan.updates.length};}catch(error){await rollbackV3(db,admin);throw error;} }

async function main(){ const files=fileContext(); let ctx=files,admin=null,db=null; if(!ctx){const live=await liveContext();admin=live.admin;db=live.db;ctx={currentSongs:live.currentSongs,sourceSongs:live.sourceSongs};}
  if(MODE==='rollback'){if(!db)throw new Error('--rollback requires Firestore');const result=await rollbackV3(db,admin);console.log(JSON.stringify({mode:MODE,runId:RUN_ID,result},null,2));return;}
  const plan=buildPlan(ctx.currentSongs,ctx.sourceSongs); if(ctx.currentSongs.length!==95)plan.errors.push(`expected 95 songs, got ${ctx.currentSongs.length}`);plan.ok=plan.errors.length===0;
  if(!plan.ok)throw new Error(`plan invalid: ${plan.errors.join(' | ')}`);
  let result={mode:MODE,runId:RUN_ID,sourceRunId:SOURCE_RUN_ID,summary:{totalSongs:plan.totalSongs,changedSongs:plan.changedSongs,formatVersion:2},sample:plan.updates.filter(x=>['GGW7yj2tNTm5EtAjDN09','qPojmtGlSo5fHKqDdcQc','DUevDxKdBh1cF3odEVV6'].includes(x.id)).map(x=>({id:x.id,title:x.title,key:x.key,cifra:x.cifra}))};
  if(MODE==='apply'){if(!db)throw new Error('--apply requires Firestore');result.apply=await applyV3(db,admin,ctx,plan);} else if(MODE==='verify'){const mismatches=plan.updates.filter(x=>x.changed);result.verification={ok:mismatches.length===0,mismatches:mismatches.map(x=>x.id)};if(mismatches.length)throw new Error(`verify found ${mismatches.length} mismatches`);} if(REPORT)fs.writeFileSync(REPORT,JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2)); }

main().catch(error=>{console.error(error.stack||error.message||error);process.exit(1);});
