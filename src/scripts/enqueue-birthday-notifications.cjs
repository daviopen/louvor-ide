#!/usr/bin/env node
'use strict';

const { getApps, initializeApp } = require('firebase-admin/app');
const { FieldValue, getFirestore } = require('firebase-admin/firestore');

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || 'louvor-ide';
const TIME_ZONE = 'America/Sao_Paulo';
if (!getApps().length) initializeApp({ projectId: PROJECT_ID });
const db = getFirestore();

function todayParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return { year: value.year, month: value.month, day: value.day, key: `${value.year}-${value.month}-${value.day}` };
}

function birthdayParts(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') value = value.toDate();
  if (value instanceof Date) {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, month: '2-digit', day: '2-digit' }).formatToParts(value);
    const map = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return { month: map.month, day: map.day };
  }
  const text = String(value).trim();
  const iso = text.match(/^(?:\d{4})-(\d{2})-(\d{2})/);
  if (iso) return { month: iso[1], day: iso[2] };
  const br = text.match(/^(\d{2})\/(\d{2})(?:\/\d{4})?/);
  if (br) return { month: br[2], day: br[1] };
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : birthdayParts(date);
}

async function main() {
  const today = todayParts();
  const snapshot = await db.collection('users').get();
  const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(user => user.active !== false);
  const birthdays = users.filter(user => {
    const birth = birthdayParts(user.birthDate);
    return birth?.month === today.month && birth?.day === today.day;
  });

  if (!birthdays.length) {
    console.log(`birthdays: nenhum aniversariante em ${today.key}.`);
    return;
  }

  let created = 0;
  for (const birthday of birthdays) {
    const birthdayName = String(birthday.name || 'alguém especial').trim();
    const outboxId = `birthday__${today.key}__${birthday.id}`;
    const ref = db.collection('notificationOutbox').doc(outboxId);
    const existing = await ref.get();
    if (existing.exists) continue;
    await ref.create({
      type: 'BIRTHDAY_TODAY',
      aggregateType: 'birthday',
      targetUserIds: users.map(user => user.id),
      channels: { push: true, email: false, calendar: false },
      payload: { birthdayUserId: birthday.id, birthdayName, dateKey: today.key },
      status: 'PENDING',
      attempts: 0,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: 'system:birthday-worker'
    });
    created += 1;
  }
  console.log(`birthdays: aniversariantes=${birthdays.length}; notificacoes_criadas=${created}; destinatarios=${users.length}.`);
}

if (require.main === module) main().catch(error => {
  console.error('birthdays: erro fatal:', error);
  process.exitCode = 1;
});

module.exports = { todayParts, birthdayParts };
