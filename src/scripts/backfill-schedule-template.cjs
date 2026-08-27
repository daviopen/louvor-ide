#!/usr/bin/env node
'use strict';

const TEMPLATE_VERSION = 1;
const TEMPLATE = Object.freeze([
  { slug: 'back-vocal', quantity: 4 },
  { slug: 'ministro', quantity: 2 },
  { slug: 'guitarra', quantity: 1 },
  { slug: 'violao', quantity: 1 },
  { slug: 'baixo', quantity: 1 },
  { slug: 'bateria', quantity: 1 },
  { slug: 'teclado', quantity: 1 }
]);

async function loadAdmin() {
  let admin;
  try {
    admin = require('firebase-admin');
  } catch (error) {
    throw new Error('firebase-admin não está instalado.');
  }
  if (!admin.apps.length) admin.initializeApp();
  return admin;
}

function nextSlotId(slug, usedIds) {
  let index = 1;
  let candidate = `slot_${slug}_${index}`;
  while (usedIds.has(candidate)) {
    index += 1;
    candidate = `slot_${slug}_${index}`;
  }
  usedIds.add(candidate);
  return candidate;
}

function mergeTemplate(existingSlots, functions) {
  const slots = Array.isArray(existingSlots) ? existingSlots.map(item => ({ ...item })) : [];
  const activeFunctions = (functions || []).filter(item => item.active !== false && item.slug);
  const bySlug = new Map(activeFunctions.map(item => [String(item.slug), item]));
  const usedIds = new Set(slots.map(item => item?.id).filter(Boolean));
  const counts = new Map();
  slots.forEach(slot => {
    if (!slot?.functionId) return;
    counts.set(slot.functionId, (counts.get(slot.functionId) || 0) + 1);
  });

  for (const template of TEMPLATE) {
    const fn = bySlug.get(template.slug);
    if (!fn) continue;
    const current = counts.get(fn.id) || 0;
    const missing = Math.max(0, template.quantity - current);
    for (let index = 0; index < missing; index += 1) {
      slots.push({ id: nextSlotId(template.slug, usedIds), functionId: fn.id });
    }
    counts.set(fn.id, current + missing);
  }
  return slots;
}

async function main() {
  const admin = await loadAdmin();
  const db = admin.firestore();
  const [functionsSnapshot, schedulesSnapshot] = await Promise.all([
    db.collection('ministryFunctions').get(),
    db.collection('schedules').get()
  ]);
  const functions = functionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  let inspected = 0;
  let updated = 0;
  let skippedVersioned = 0;
  let skippedClosed = 0;
  let addedSlots = 0;

  for (const scheduleDoc of schedulesSnapshot.docs) {
    inspected += 1;
    const schedule = scheduleDoc.data() || {};
    const status = String(schedule.status || 'DRAFT').toUpperCase();
    if (['COMPLETED', 'CANCELLED'].includes(status)) {
      skippedClosed += 1;
      continue;
    }
    if (Number(schedule.defaultTemplateVersion || 0) >= TEMPLATE_VERSION) {
      skippedVersioned += 1;
      continue;
    }

    const before = Array.isArray(schedule.slots) ? schedule.slots : [];
    const slots = mergeTemplate(before, functions);
    const added = slots.length - before.length;
    const patch = {
      slots,
      defaultTemplateVersion: TEMPLATE_VERSION,
      updatedBy: 'system:schedule-template-v1',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    if (status === 'COMPLETE' && added > 0) patch.status = 'DRAFT';

    await scheduleDoc.ref.set(patch, { merge: true });
    await db.collection('auditLogs').add({
      actorUserId: 'system:schedule-template-v1',
      action: 'SCHEDULE_DEFAULT_TEMPLATE_APPLIED',
      entityType: 'schedule',
      entityId: scheduleDoc.id,
      details: {
        templateVersion: TEMPLATE_VERSION,
        previousSlots: before.length,
        totalSlots: slots.length,
        addedSlots: added
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    updated += 1;
    addedSlots += added;
  }

  console.log(JSON.stringify({
    templateVersion: TEMPLATE_VERSION,
    inspected,
    updated,
    addedSlots,
    skippedVersioned,
    skippedClosed
  }, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
