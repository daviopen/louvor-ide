#!/usr/bin/env node
'use strict';

const argv = process.argv.slice(2);
const arg = name => {
  const hit = argv.find(v => v.startsWith(`${name}=`));
  return hit ? hit.slice(name.length + 1) : null;
};

const MODE = arg('--mode') || 'plan';
const SONG_ID = arg('--song-id');
const RUN_ID = arg('--run-id') || `song-minister-keys-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`;

function norm(v = '') {
  return String(v)
    .replace(/[\u2060\u200B-\u200D\uFEFF]/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function songTitle(s) {
  return String(s.titulo || s.title || s.nome || s.name || '').trim();
}

function ministerPrefs(s) {
  return s.tomMinistro && typeof s.tomMinistro === 'object' && !Array.isArray(s.tomMinistro)
    ? s.tomMinistro
    : {};
}

function userNames(u) {
  return [u.name, u.nome, u.displayName, u.fullName]
    .map(v => String(v || '').trim())
    .filter(Boolean);
}

async function db() {
  const admin = require('firebase-admin');
  if (!admin.apps.length) admin.initializeApp();
  return { admin, db: admin.firestore() };
}

async function readCollection(db, name) {
  const snap = await db.collection(name).get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

function buildUserIndex(users) {
  const index = new Map();
  for (const u of users.filter(x => x.active !== false)) {
    for (const name of userNames(u)) {
      const key = norm(name);
      if (!key) continue;
      if (!index.has(key)) index.set(key, new Map());
      index.get(key).set(u.id, { userId: u.id, matchedName: name });
    }
  }
  return index;
}

function resolveLegacy(song, userIndex, existingKeys) {
  const prefs = ministerPrefs(song);
  const entries = [];
  for (const [legacyName, preferredKeyRaw] of Object.entries(prefs)) {
    const preferredKey = String(preferredKeyRaw || '').trim();
    const matches = [...(userIndex.get(norm(legacyName)) || new Map()).values()];
    const status = matches.length === 1 ? 'resolved' : matches.length === 0 ? 'unresolved' : 'ambiguous';
    const match = matches.length === 1 ? matches[0] : null;
    const existing = match
      ? existingKeys.find(k => k.songId === song.id && k.userId === match.userId)
      : null;
    entries.push({
      legacyName,
      preferredKey,
      status,
      userId: match?.userId || null,
      matchedName: match?.matchedName || null,
      existingPreferredKey: existing?.preferredKey || null,
      alreadyCanonical: Boolean(existing && String(existing.preferredKey || '').trim() === preferredKey),
      candidateCount: matches.length
    });
  }
  return entries;
}

async function plan(db) {
  const [songs, users, existingKeys] = await Promise.all([
    readCollection(db, 'songs'),
    readCollection(db, 'users'),
    readCollection(db, 'songMinisterKeys')
  ]);
  const activeSongs = songs.filter(s => s.active !== false);
  const userIndex = buildUserIndex(users);
  const songPlans = [];
  for (const song of activeSongs) {
    const prefs = ministerPrefs(song);
    if (!Object.keys(prefs).length) continue;
    const entries = resolveLegacy(song, userIndex, existingKeys);
    songPlans.push({
      songId: song.id,
      title: songTitle(song),
      legacyCount: entries.length,
      resolvedCount: entries.filter(e => e.status === 'resolved').length,
      unresolvedCount: entries.filter(e => e.status === 'unresolved').length,
      ambiguousCount: entries.filter(e => e.status === 'ambiguous').length,
      pendingCanonicalCount: entries.filter(e => e.status === 'resolved' && !e.alreadyCanonical).length,
      entries
    });
  }
  const resolved = songPlans.flatMap(s => s.entries).filter(e => e.status === 'resolved').length;
  const unresolved = songPlans.flatMap(s => s.entries).filter(e => e.status === 'unresolved').length;
  const ambiguous = songPlans.flatMap(s => s.entries).filter(e => e.status === 'ambiguous').length;
  const pending = songPlans.flatMap(s => s.entries).filter(e => e.status === 'resolved' && !e.alreadyCanonical).length;
  const pilotCandidates = songPlans
    .filter(s => s.legacyCount >= 2 && s.unresolvedCount === 0 && s.ambiguousCount === 0 && s.pendingCanonicalCount > 0)
    .sort((a, b) => b.legacyCount - a.legacyCount || a.title.localeCompare(b.title, 'pt-BR'))
    .slice(0, 10)
    .map(s => ({ songId: s.songId, title: s.title, legacyCount: s.legacyCount, pendingCanonicalCount: s.pendingCanonicalCount }));
  return {
    generatedAt: new Date().toISOString(),
    summary: {
      activeUsers: users.filter(u => u.active !== false).length,
      songsWithLegacyMinisterKeys: songPlans.length,
      legacyMinisterKeyEntries: resolved + unresolved + ambiguous,
      resolved,
      unresolved,
      ambiguous,
      pendingCanonicalWrites: pending,
      existingCanonicalDocuments: existingKeys.length,
      pilotCandidates: pilotCandidates.length
    },
    pilotCandidates,
    songs: songPlans
  };
}

async function backupAndApplyPilot(admin, db, fullPlan, songId) {
  const song = fullPlan.songs.find(s => s.songId === songId);
  if (!song) throw new Error(`Música ${songId} não encontrada entre as músicas com tomMinistro.`);
  if (song.unresolvedCount || song.ambiguousCount) {
    throw new Error(`Piloto inseguro: ${song.unresolvedCount} não resolvido(s), ${song.ambiguousCount} ambíguo(s).`);
  }
  const writes = song.entries.filter(e => e.status === 'resolved' && !e.alreadyCanonical);
  if (!writes.length) throw new Error('Piloto não possui gravações pendentes.');

  const runRef = db.collection('_migrationRuns').doc(RUN_ID);
  const existingRun = await runRef.get();
  if (existingRun.exists) throw new Error(`runId ${RUN_ID} já existe.`);

  await runRef.set({
    type: 'songMinisterKeysPilot',
    status: 'BACKING_UP',
    songId,
    title: song.title,
    plannedWrites: writes.length,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  for (const e of writes) {
    const id = `${songId}_${e.userId}`;
    const ref = db.collection('songMinisterKeys').doc(id);
    const snap = await ref.get();
    await runRef.collection('backups').doc(Buffer.from(`songMinisterKeys/${id}`).toString('base64url')).set({
      path: `songMinisterKeys/${id}`,
      exists: snap.exists,
      data: snap.exists ? snap.data() : null
    });
  }

  await runRef.set({ status: 'BACKED_UP', backupCount: writes.length }, { merge: true });

  const batch = db.batch();
  for (const e of writes) {
    const id = `${songId}_${e.userId}`;
    batch.set(db.collection('songMinisterKeys').doc(id), {
      songId,
      userId: e.userId,
      preferredKey: e.preferredKey,
      source: 'legacy-tomMinistro',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }
  await batch.commit();
  await runRef.set({ status: 'APPLIED', appliedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  return { songId, title: song.title, writes: writes.map(e => ({ userId: e.userId, matchedName: e.matchedName, preferredKey: e.preferredKey })) };
}

async function verifyPilot(db, fullPlan, songId) {
  const song = fullPlan.songs.find(s => s.songId === songId);
  if (!song) throw new Error(`Música ${songId} não encontrada.`);
  const expected = song.entries.filter(e => e.status === 'resolved');
  const snap = await db.collection('songMinisterKeys').where('songId', '==', songId).get();
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const errors = [];
  for (const e of expected) {
    const doc = docs.find(d => d.userId === e.userId);
    if (!doc) errors.push(`${e.legacyName}: documento ausente`);
    else if (String(doc.preferredKey || '').trim() !== e.preferredKey) errors.push(`${e.legacyName}: esperado ${e.preferredKey}, encontrado ${doc.preferredKey || '(vazio)'}`);
  }
  return {
    ok: errors.length === 0,
    songId,
    title: song.title,
    expectedCount: expected.length,
    canonicalCount: docs.length,
    errors,
    canonical: docs.map(d => ({ userId: d.userId, preferredKey: d.preferredKey }))
  };
}

async function main() {
  const { admin, db: firestore } = await db();
  const fullPlan = await plan(firestore);

  if (MODE === 'plan') {
    console.log(JSON.stringify(fullPlan, null, 2));
    return;
  }

  if (MODE === 'apply-pilot') {
    if (!SONG_ID) throw new Error('--song-id é obrigatório em apply-pilot.');
    const apply = await backupAndApplyPilot(admin, firestore, fullPlan, SONG_ID);
    const refreshed = await plan(firestore);
    const verification = await verifyPilot(firestore, refreshed, SONG_ID);
    if (!verification.ok) throw new Error(`Falha na validação do piloto: ${verification.errors.join(' | ')}`);
    console.log(JSON.stringify({ runId: RUN_ID, mode: MODE, apply, verification }, null, 2));
    return;
  }

  if (MODE === 'verify-pilot') {
    if (!SONG_ID) throw new Error('--song-id é obrigatório em verify-pilot.');
    const verification = await verifyPilot(firestore, fullPlan, SONG_ID);
    if (!verification.ok) process.exitCode = 2;
    console.log(JSON.stringify({ mode: MODE, verification }, null, 2));
    return;
  }

  throw new Error(`Modo não suportado: ${MODE}`);
}

main().catch(err => {
  console.error(err?.stack || err);
  process.exitCode = 1;
});
