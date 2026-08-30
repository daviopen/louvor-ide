#!/usr/bin/env node
'use strict';

async function loadAdmin() {
  let admin;
  try { admin = require('firebase-admin'); }
  catch { throw new Error('firebase-admin não instalado.'); }
  if (!admin.apps.length) admin.initializeApp();
  return admin;
}

function serialize(value) {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map(serialize);
  if (typeof value === 'object') {
    if (typeof value.toDate === 'function') return value.toDate().toISOString();
    const out = {};
    for (const [key, item] of Object.entries(value)) out[key] = serialize(item);
    return out;
  }
  return value;
}

async function main() {
  const admin = await loadAdmin();
  const db = admin.firestore();
  const [songsSnap, keysSnap, setlistsSnap, setlistSongsSnap] = await Promise.all([
    db.collection('songs').get(),
    db.collection('songMinisterKeys').get(),
    db.collection('setlists').get(),
    db.collection('setlistSongs').get()
  ]);

  const result = {
    generatedAt: new Date().toISOString(),
    songs: songsSnap.docs.map(doc => ({ id: doc.id, ...serialize(doc.data()) })),
    songMinisterKeys: keysSnap.docs.map(doc => ({ id: doc.id, ...serialize(doc.data()) })),
    setlists: setlistsSnap.docs.map(doc => ({ id: doc.id, ...serialize(doc.data()) })),
    setlistSongs: setlistSongsSnap.docs.map(doc => ({ id: doc.id, ...serialize(doc.data()) }))
  };
  process.stdout.write(JSON.stringify(result, null, 2));
}

main().catch(error => {
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
