#!/usr/bin/env node
'use strict';

/**
 * Limpeza pós-migração da collection legada `musicas`.
 *
 * O modo padrão é dry-run. `--apply` só remove a origem após:
 * 1) confirmar que todo ID legado existe em `songs`;
 * 2) arquivar os documentos em `_legacyArchives/musicas/documents`;
 * 3) confirmar que o arquivo contém todos os IDs.
 *
 * `--restore-musicas` restaura `musicas` a partir do arquivo.
 */

const SOURCE = 'musicas';
const TARGET = 'songs';
const ARCHIVE_ROOT = '_legacyArchives';
const ARCHIVE_DOC = 'musicas';
const BATCH_SIZE = 400;

const mode = process.argv.includes('--apply')
  ? 'apply'
  : process.argv.includes('--restore-musicas')
    ? 'restore'
    : 'dry-run';

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

function chunks(items, size = BATCH_SIZE) {
  const result = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}

async function fetchDocs(db, collectionPath) {
  const snapshot = await db.collection(collectionPath).get();
  return snapshot.docs;
}

async function assertCanonicalCoverage(db, sourceDocs) {
  const missing = [];
  for (const sourceDoc of sourceDocs) {
    const targetDoc = await db.collection(TARGET).doc(sourceDoc.id).get();
    if (!targetDoc.exists) missing.push(sourceDoc.id);
  }
  if (missing.length) {
    throw new Error(`Limpeza abortada: ${missing.length} documento(s) de ${SOURCE} não existem em ${TARGET}: ${missing.slice(0, 10).join(', ')}`);
  }
}

async function archive(db, sourceDocs) {
  const rootRef = db.collection(ARCHIVE_ROOT).doc(ARCHIVE_DOC);
  const archiveCollection = rootRef.collection('documents');

  for (const group of chunks(sourceDocs)) {
    const batch = db.batch();
    for (const sourceDoc of group) {
      batch.set(archiveCollection.doc(sourceDoc.id), {
        ...sourceDoc.data(),
        _legacySource: SOURCE,
        _archivedAt: new Date()
      });
    }
    await batch.commit();
  }

  await rootRef.set({
    sourceCollection: SOURCE,
    canonicalCollection: TARGET,
    archivedAt: new Date(),
    documentCount: sourceDocs.length,
    status: 'ARCHIVED'
  }, { merge: true });

  for (const sourceDoc of sourceDocs) {
    const archived = await archiveCollection.doc(sourceDoc.id).get();
    if (!archived.exists) throw new Error(`Arquivo incompleto: ${sourceDoc.id} não foi arquivado.`);
  }
}

async function removeSource(db, sourceDocs) {
  for (const group of chunks(sourceDocs)) {
    const batch = db.batch();
    group.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }

  const remaining = await db.collection(SOURCE).get();
  if (!remaining.empty) throw new Error(`Limpeza incompleta: ${remaining.size} documento(s) ainda existem em ${SOURCE}.`);

  await db.collection(ARCHIVE_ROOT).doc(ARCHIVE_DOC).set({
    cleanedAt: new Date(),
    status: 'CLEANED'
  }, { merge: true });
}

async function restore(db) {
  const archiveCollection = db.collection(ARCHIVE_ROOT).doc(ARCHIVE_DOC).collection('documents');
  const archived = await archiveCollection.get();
  if (archived.empty) throw new Error('Arquivo de músicas legadas não encontrado.');

  for (const group of chunks(archived.docs)) {
    const batch = db.batch();
    for (const archivedDoc of group) {
      const data = { ...archivedDoc.data() };
      delete data._legacySource;
      delete data._archivedAt;
      batch.set(db.collection(SOURCE).doc(archivedDoc.id), data, { merge: false });
    }
    await batch.commit();
  }

  const restored = await db.collection(SOURCE).get();
  if (restored.size < archived.size) throw new Error('Restauração incompleta da collection legada.');

  await db.collection(ARCHIVE_ROOT).doc(ARCHIVE_DOC).set({
    restoredAt: new Date(),
    status: 'RESTORED'
  }, { merge: true });

  console.log(JSON.stringify({ mode: 'restore', restored: archived.size }, null, 2));
}

async function main() {
  const admin = await loadAdmin();
  const db = admin.firestore();

  if (mode === 'restore') {
    await restore(db);
    return;
  }

  const sourceDocs = await fetchDocs(db, SOURCE);
  const targetDocs = await fetchDocs(db, TARGET);
  await assertCanonicalCoverage(db, sourceDocs);

  const summary = {
    mode,
    source: SOURCE,
    target: TARGET,
    sourceCount: sourceDocs.length,
    targetCount: targetDocs.length,
    canonicalCoverage: true
  };

  if (mode === 'dry-run' || sourceDocs.length === 0) {
    console.log(JSON.stringify({ ...summary, noOp: sourceDocs.length === 0 }, null, 2));
    return;
  }

  await archive(db, sourceDocs);
  await removeSource(db, sourceDocs);

  const targetAfter = await db.collection(TARGET).get();
  if (targetAfter.size < sourceDocs.length) {
    throw new Error(`Validação final falhou: ${TARGET} possui ${targetAfter.size}, esperado ao menos ${sourceDocs.length}.`);
  }

  console.log(JSON.stringify({
    ...summary,
    archived: sourceDocs.length,
    deletedFromLegacy: sourceDocs.length,
    legacyRemaining: 0,
    targetCountAfter: targetAfter.size,
    ok: true
  }, null, 2));
}

if (require.main === module) {
  main().catch(error => {
    console.error(error && error.stack ? error.stack : error);
    process.exitCode = 1;
  });
}

module.exports = {
  SOURCE,
  TARGET,
  ARCHIVE_ROOT,
  ARCHIVE_DOC,
  BATCH_SIZE,
  chunks
};
