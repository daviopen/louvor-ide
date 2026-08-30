#!/usr/bin/env node
'use strict';

function normalizeText(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function stripVoiceQualifier(title = '') {
  let value = String(title).trim();
  const patterns = [
    /\s*[-–—:]?\s*\(?\s*(?:tom\s+)?(?:voz\s+)?feminin[oa]\s*\)?\s*$/i,
    /\s*[-–—:]?\s*\(?\s*(?:tom\s+)?(?:voz\s+)?masculin[oa]\s*\)?\s*$/i,
    /\s*\[(?:tom\s+)?(?:voz\s+)?feminin[oa]\]\s*$/i,
    /\s*\[(?:tom\s+)?(?:voz\s+)?masculin[oa]\]\s*$/i
  ];
  for (const pattern of patterns) value = value.replace(pattern, '').trim();
  return value || String(title).trim();
}

function field(data, ...names) {
  for (const name of names) {
    if (data[name] !== undefined && data[name] !== null && String(data[name]).trim() !== '') return data[name];
  }
  return '';
}

async function loadAdmin() {
  let admin;
  try {
    admin = require('firebase-admin');
  } catch {
    throw new Error('firebase-admin não instalado.');
  }
  if (!admin.apps.length) admin.initializeApp();
  return admin;
}

async function main() {
  const admin = await loadAdmin();
  const db = admin.firestore();
  const snapshot = await db.collection('songs').get();
  const rows = snapshot.docs.map(doc => {
    const data = doc.data() || {};
    const title = String(field(data, 'titulo', 'title', 'name', 'nome') || '').trim();
    const artist = String(field(data, 'artista', 'artist') || '').trim();
    const originalKey = String(field(data, 'tom', 'originalKey', 'tomOriginal') || '').trim();
    const chord = String(field(data, 'cifra', 'chord', 'chordSheet') || '');
    const lyrics = String(field(data, 'letra', 'lyrics') || '');
    const canonicalTitle = stripVoiceQualifier(title);
    const identity = `${normalizeText(canonicalTitle)}::${normalizeText(artist)}`;
    return {
      id: doc.id,
      title,
      canonicalTitle,
      artist,
      currentOriginalKey: originalKey || null,
      hasChord: chord.trim().length > 0,
      chordChars: chord.length,
      hasLyrics: lyrics.trim().length > 0,
      lyricsChars: lyrics.length,
      active: data.active !== false,
      identity
    };
  });

  const groups = new Map();
  for (const row of rows) {
    if (!groups.has(row.identity)) groups.set(row.identity, []);
    groups.get(row.identity).push(row);
  }

  const duplicates = [...groups.values()]
    .filter(group => group.length > 1)
    .map(group => ({
      identity: group[0].identity,
      canonicalTitle: group[0].canonicalTitle,
      artist: group[0].artist,
      ids: group.map(item => item.id),
      titles: group.map(item => item.title),
      keys: group.map(item => item.currentOriginalKey)
    }));

  const suspiciousVoiceTitles = rows.filter(row => row.title !== row.canonicalTitle);
  const missingLyrics = rows.filter(row => !row.hasLyrics);
  const missingChord = rows.filter(row => !row.hasChord);
  const missingKey = rows.filter(row => !row.currentOriginalKey);

  console.log(JSON.stringify({
    generatedAt: new Date().toISOString(),
    totalSongs: rows.length,
    duplicateGroups: duplicates.length,
    suspiciousVoiceTitles: suspiciousVoiceTitles.length,
    missingLyrics: missingLyrics.length,
    missingChord: missingChord.length,
    missingOriginalKey: missingKey.length,
    songs: rows.sort((a, b) => a.canonicalTitle.localeCompare(b.canonicalTitle, 'pt-BR')),
    duplicates,
    voiceQualifiedSongs: suspiciousVoiceTitles.map(row => ({ id: row.id, title: row.title, canonicalTitle: row.canonicalTitle, artist: row.artist })),
    missingLyricsSongs: missingLyrics.map(row => ({ id: row.id, title: row.title, artist: row.artist })),
    missingChordSongs: missingChord.map(row => ({ id: row.id, title: row.title, artist: row.artist })),
    missingOriginalKeySongs: missingKey.map(row => ({ id: row.id, title: row.title, artist: row.artist }))
  }, null, 2));
}

main().catch(error => {
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
