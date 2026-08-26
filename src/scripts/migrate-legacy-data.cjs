#!/usr/bin/env node
'use strict';

/**
 * Migração idempotente do legado para o modelo canônico do IDE Music.
 *
 * Segurança:
 * - dry-run por padrão;
 * - preserva IDs;
 * - nunca remove a origem;
 * - não sobrescreve documentos canônicos existentes;
 * - grava manifesto de rollback somente para documentos criados pela migração.
 *
 * Uso:
 *   node src/scripts/migrate-legacy-data.cjs --dry-run
 *   node src/scripts/migrate-legacy-data.cjs --apply
 *   node src/scripts/migrate-legacy-data.cjs --verify
 *   node src/scripts/migrate-legacy-data.cjs --rollback=<runId>
 */

const crypto = require('node:crypto');

const MODE = process.argv.includes('--apply')
  ? 'apply'
  : process.argv.includes('--verify')
    ? 'verify'
    : process.argv.find(arg => arg.startsWith('--rollback='))
      ? 'rollback'
      : 'dry-run';
const ROLLBACK_RUN_ID = (process.argv.find(arg => arg.startsWith('--rollback=')) || '').split('=')[1] || null;

const LEGACY_MAPPINGS = Object.freeze([
  { source: 'musicas', target: 'songs', transform: normalizeSong },
  { source: 'usuarios', target: 'users', transform: passthrough },
  { source: 'funcoesMinisteriais', target: 'ministryFunctions', transform: passthrough },
  { source: 'funcoesUsuarios', target: 'userFunctions', transform: passthrough },
  { source: 'permissoes', target: 'permissions', transform: passthrough },
  { source: 'indisponibilidades', target: 'unavailability', transform: passthrough },
  { source: 'eventos', target: 'events', transform: passthrough },
  { source: 'escalas', target: 'schedules', transform: passthrough },
  { source: 'membrosEscala', target: 'scheduleMembers', transform: passthrough },
  { source: 'repertorios', target: 'setlists', transform: passthrough }
]);

function passthrough(data) {
  return { ...data };
}

function compactObject(value) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
}

function normalizeSong(data = {}) {
  return compactObject({
    ...data,
    title: data.title || data.titulo || data.nome || '',
    artist: data.artist || data.artista || '',
    originalKey: data.originalKey || data.tomOriginal || data.tom || '',
    theme: data.theme || data.tema || '',
    referenceLink: data.referenceLink || data.link || '',
    chord: data.chord || data.cifra || '',
    lyrics: data.lyrics || data.letra || '',
    notes: data.notes || data.observacoes || data.observação || '',
    migratedAt: new Date(),
    migratedFrom: 'musicas'
  });
}

function normalizeForCompare(value) {
  if (value == null) return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(normalizeForCompare);
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value)
      .filter(([key]) => !['migratedAt'].includes(key))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => [key, normalizeForCompare(item)]));
  }
  return value;
}

async function loadAdmin() {
  let admin;
  try {
    admin = require('firebase-admin');
  } catch (error) {
    throw new Error('firebase-admin não está instalado. Execute `npm install --no-save firebase-admin@13.4.0`.');
  }
  if (!admin.apps.length) admin.initializeApp();
  return admin;
}

async function countCollection(db, name) {
  const snapshot = await db.collection(name).get();
  return { count: snapshot.size, docs: snapshot.docs };
}

async function inspectMapping(db, mapping) {
  const source = await countCollection(db, mapping.source);
  const target = await countCollection(db, mapping.target);
  let missing = 0;
  let conflicts = 0;
  for (const sourceDoc of source.docs) {
    const targetDoc = await db.collection(mapping.target).doc(sourceDoc.id).get();
    if (!targetDoc.exists) {
      missing += 1;
      continue;
    }
    const expected = normalizeForCompare(mapping.transform(sourceDoc.data()));
    const current = normalizeForCompare(targetDoc.data());
    if (mapping.source === 'musicas') {
      const expectedTitle = expected.title || expected.titulo || '';
      const currentTitle = current.title || current.titulo || '';
      if (expectedTitle && currentTitle && expectedTitle !== currentTitle) conflicts += 1;
    }
  }
  return {
    source: mapping.source,
    target: mapping.target,
    sourceCount: source.count,
    targetCount: target.count,
    missing,
    conflicts
  };
}

async function migrateMapping(db, mapping, runId) {
  const sourceSnapshot = await db.collection(mapping.source).get();
  const created = [];
  let skipped = 0;
  for (const sourceDoc of sourceSnapshot.docs) {
    const targetRef = db.collection(mapping.target).doc(sourceDoc.id);
    const targetDoc = await targetRef.get();
    if (targetDoc.exists) {
      skipped += 1;
      continue;
    }
    const payload = mapping.transform(sourceDoc.data());
    await targetRef.set(payload);
    created.push({ collection: mapping.target, id: sourceDoc.id });
  }
  return { created, skipped };
}

async function writeManifest(db, runId, entries, summary) {
  await db.collection('_migrationRuns').doc(runId).set({
    runId,
    migration: 'roadmap-p8-legacy-to-canonical',
    createdAt: new Date(),
    entries,
    summary
  });
}

async function rollback(db, runId) {
  if (!runId) throw new Error('Informe o runId em --rollback=<runId>.');
  const manifest = await db.collection('_migrationRuns').doc(runId).get();
  if (!manifest.exists) throw new Error(`Manifesto ${runId} não encontrado.`);
  const entries = Array.isArray(manifest.data().entries) ? manifest.data().entries : [];
  for (const entry of entries) {
    if (!entry || !entry.collection || !entry.id) continue;
    await db.collection(entry.collection).doc(entry.id).delete();
  }
  await db.collection('_migrationRuns').doc(runId).set({ rolledBackAt: new Date(), rolledBack: true }, { merge: true });
  console.log(JSON.stringify({ mode: 'rollback', runId, removed: entries.length }, null, 2));
}

async function main() {
  const admin = await loadAdmin();
  const db = admin.firestore();

  if (MODE === 'rollback') {
    await rollback(db, ROLLBACK_RUN_ID);
    return;
  }

  const before = [];
  for (const mapping of LEGACY_MAPPINGS) before.push(await inspectMapping(db, mapping));

  if (MODE === 'dry-run') {
    console.log(JSON.stringify({ mode: MODE, mappings: before }, null, 2));
    return;
  }

  if (MODE === 'verify') {
    const failures = before.filter(item => item.missing > 0 || item.conflicts > 0);
    console.log(JSON.stringify({ mode: MODE, ok: failures.length === 0, mappings: before }, null, 2));
    if (failures.length) process.exitCode = 1;
    return;
  }

  const runId = `migration_${new Date().toISOString().replace(/[:.]/g, '-')}_${crypto.randomBytes(4).toString('hex')}`;
  const created = [];
  const applySummary = [];
  for (const mapping of LEGACY_MAPPINGS) {
    const result = await migrateMapping(db, mapping, runId);
    created.push(...result.created);
    applySummary.push({ source: mapping.source, target: mapping.target, created: result.created.length, skipped: result.skipped });
  }
  await writeManifest(db, runId, created, applySummary);

  const after = [];
  for (const mapping of LEGACY_MAPPINGS) after.push(await inspectMapping(db, mapping));
  const failures = after.filter(item => item.missing > 0 || item.conflicts > 0);
  console.log(JSON.stringify({ mode: MODE, runId, created: created.length, applySummary, verification: after, ok: failures.length === 0 }, null, 2));
  if (failures.length) process.exitCode = 1;
}

if (require.main === module) {
  main().catch(error => {
    console.error(error && error.stack ? error.stack : error);
    process.exitCode = 1;
  });
}

module.exports = { LEGACY_MAPPINGS, normalizeSong, normalizeForCompare };
