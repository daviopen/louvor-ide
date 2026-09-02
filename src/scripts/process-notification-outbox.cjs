#!/usr/bin/env node
'use strict';

const admin = require('firebase-admin');

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || 'louvor-ide';
const APP_URL = String(process.env.IDE_MUSIC_APP_URL || 'https://louvor-ide.web.app').replace(/\/$/, '');
const RESEND_API_KEY = String(process.env.RESEND_API_KEY || '').trim();
const EMAIL_FROM = String(process.env.NOTIFICATION_EMAIL_FROM || '').trim();
const MAX_BATCH = Math.max(1, Math.min(50, Number(process.env.NOTIFICATION_BATCH_SIZE || 25)));
const MAX_ATTEMPTS = Math.max(1, Number(process.env.NOTIFICATION_MAX_ATTEMPTS || 5));
const STALE_LOCK_MS = Math.max(5 * 60_000, Number(process.env.NOTIFICATION_STALE_LOCK_MS || 20 * 60_000));

if (!admin.apps.length) admin.initializeApp({ projectId: PROJECT_ID });
const db = admin.firestore();
const messaging = admin.messaging();
const FieldValue = admin.firestore.FieldValue;

function compactError(error) {
  return String(error?.message || error || 'Falha desconhecida').replace(/\s+/g, ' ').slice(0, 500);
}

function asDate(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function eventDateLabel(event) {
  const date = asDate(event?.date || event?.eventDate);
  const datePart = date ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(date) : '';
  const timePart = String(event?.time || event?.eventTime || '').trim();
  return [datePart, timePart].filter(Boolean).join(' • ');
}

function escapeIcs(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function icsDate(value) {
  const date = asDate(value);
  if (!date) return '';
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function buildCalendarInvite({ schedule, event, user, functionName, cancelled = false }) {
  const baseDate = asDate(event?.date || schedule?.eventDate);
  if (!baseDate) return null;
  const [hour = '00', minute = '00'] = String(event?.time || schedule?.eventTime || '00:00').split(':');
  const start = `${icsDate(baseDate)}T${String(hour).padStart(2, '0')}${String(minute).padStart(2, '0')}00`;
  const endDate = new Date(baseDate.getTime());
  const endHour = Math.min(23, Number(hour || 0) + 2);
  const end = `${icsDate(endDate)}T${String(endHour).padStart(2, '0')}${String(minute).padStart(2, '0')}00`;
  const uid = `schedule-${schedule.id}-${user.id || user.uid}@ide-music`;
  const summary = `IDE Music • ${event?.name || 'Escala'}`;
  const description = [`Função: ${functionName || 'Equipe'}`, `${APP_URL}/module.html?section=schedules`].join('\\n');
  const method = cancelled ? 'CANCEL' : 'REQUEST';
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//IDE Music//Escalas//PT-BR',
    `METHOD:${method}`,
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${escapeIcs(uid)}`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')}`,
    `DTSTART;TZID=America/Sao_Paulo:${start}`,
    `DTEND;TZID=America/Sao_Paulo:${end}`,
    `SUMMARY:${escapeIcs(summary)}`,
    `DESCRIPTION:${escapeIcs(description)}`,
    event?.location ? `LOCATION:${escapeIcs(event.location)}` : null,
    cancelled ? 'STATUS:CANCELLED' : 'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(Boolean).join('\r\n');
}

async function getDoc(collection, id) {
  if (!id) return null;
  const snap = await db.collection(collection).doc(String(id)).get();
  return snap.exists ? { id: snap.id, ...snap.data() } : null;
}

async function resolveRecipients(item, schedule) {
  const explicit = Array.isArray(item.targetUserIds) ? item.targetUserIds.filter(Boolean) : [];
  if (explicit.length) return [...new Set(explicit.map(String))];
  if (!schedule?.id) return [];
  const members = await db.collection('scheduleMembers').where('scheduleId', '==', schedule.id).get();
  return [...new Set(members.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(member => member.active !== false && member.userId)
    .map(member => String(member.userId)))];
}

async function contextFor(item) {
  const schedule = await getDoc('schedules', item.scheduleId);
  const event = await getDoc('events', item.eventId || schedule?.eventId);
  const setlist = item.setlistId ? await getDoc('setlists', item.setlistId) : null;
  const recipientIds = await resolveRecipients(item, schedule);
  const users = await Promise.all(recipientIds.map(id => getDoc('users', id)));
  const functionId = item.payload?.functionId || null;
  const ministryFunction = functionId ? await getDoc('ministryFunctions', functionId) : null;
  return { schedule, event, setlist, users: users.filter(Boolean), ministryFunction };
}

function messageFor(item, context, user) {
  const eventName = context.event?.name || 'evento';
  const when = eventDateLabel(context.event || context.schedule);
  const suffix = when ? ` • ${when}` : '';
  const functionName = context.ministryFunction?.name || '';
  switch (item.type) {
    case 'SCHEDULE_MEMBER_ASSIGNED':
      return {
        title: 'Você foi escalado',
        body: `${eventName}${suffix}${functionName ? ` • ${functionName}` : ''}`,
        url: '/module.html?section=schedules',
        emailSubject: `IDE Music • Você foi escalado para ${eventName}`
      };
    case 'SCHEDULE_MEMBER_REMOVED':
      return {
        title: 'Sua escala foi alterada',
        body: `Você foi removido da escala de ${eventName}${suffix}`,
        url: '/module.html?section=schedules',
        emailSubject: `IDE Music • Alteração na sua escala de ${eventName}`
      };
    case 'SETLIST_UPDATED':
      return {
        title: 'Setlist atualizado',
        body: `O Setlist de ${eventName}${suffix} foi alterado.`,
        url: context.setlist?.id ? `/setlist-view.html?id=${encodeURIComponent(context.setlist.id)}` : '/setlists.html?view=upcoming',
        emailSubject: `IDE Music • Setlist atualizado: ${eventName}`
      };
    default:
      return {
        title: 'Escala atualizada',
        body: `Houve uma alteração na escala de ${eventName}${suffix}.`,
        url: '/module.html?section=schedules',
        emailSubject: `IDE Music • Escala atualizada: ${eventName}`
      };
  }
}

async function subscriptionsFor(userId) {
  const snapshot = await db.collection('pushSubscriptions').where('userId', '==', userId).get();
  return snapshot.docs
    .map(doc => ({ id: doc.id, ref: doc.ref, ...doc.data() }))
    .filter(item => item.enabled !== false && item.token);
}

function invalidTokenCode(code) {
  return ['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'].includes(String(code || ''));
}

async function sendPush(user, message, outboxId) {
  const subscriptions = await subscriptionsFor(user.id || user.uid);
  if (!subscriptions.length) return { status: 'NO_SUBSCRIPTION', sent: 0 };
  const tokens = subscriptions.map(item => item.token);
  const response = await messaging.sendEachForMulticast({
    tokens,
    data: {
      title: String(message.title),
      body: String(message.body),
      url: `${APP_URL}${message.url}`,
      tag: `ide-music-${outboxId}`,
      outboxId: String(outboxId)
    },
    webpush: { headers: { TTL: '86400' } }
  });
  const removals = [];
  response.responses.forEach((result, index) => {
    if (!result.success && invalidTokenCode(result.error?.code)) removals.push(subscriptions[index].ref.delete());
  });
  await Promise.all(removals);
  return { status: response.successCount > 0 ? 'SENT' : 'FAILED', sent: response.successCount, failed: response.failureCount };
}

async function sendEmail(user, message, calendarContent, calendarMethod) {
  if (!user.email) return { status: 'NO_EMAIL' };
  if (!RESEND_API_KEY || !EMAIL_FROM) return { status: 'NOT_CONFIGURED' };
  const html = `<div style="font-family:Arial,sans-serif;line-height:1.5"><h2>${message.title}</h2><p>${message.body}</p><p><a href="${APP_URL}${message.url}">Abrir no IDE Music</a></p><p style="color:#666;font-size:12px">Mensagem automática do IDE Music.</p></div>`;
  const payload = {
    from: EMAIL_FROM,
    to: [user.email],
    subject: message.emailSubject,
    html
  };
  if (calendarContent) {
    payload.attachments = [{
      filename: 'escala-ide-music.ics',
      content: Buffer.from(calendarContent, 'utf8').toString('base64'),
      content_type: `text/calendar; charset=utf-8; method=${calendarMethod}`
    }];
  }
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error(`Resend ${response.status}: ${(await response.text()).slice(0, 240)}`);
  return { status: 'SENT' };
}

async function upsertInAppNotification(item, user, message) {
  const userId = user.id || user.uid;
  const id = `${item.id}__${userId}`;
  await db.collection('notifications').doc(id).set({
    userId,
    outboxId: item.id,
    type: item.type,
    title: message.title,
    body: message.body,
    url: message.url,
    read: false,
    createdAt: item.createdAt || FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });
}

async function claim(ref) {
  return db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists || snap.data().status !== 'PENDING') return null;
    const attempts = Number(snap.data().attempts || 0) + 1;
    tx.update(ref, {
      status: 'PROCESSING',
      attempts,
      lockedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      lastError: FieldValue.delete()
    });
    return { id: snap.id, ...snap.data(), attempts };
  });
}

async function recoverStaleLocks() {
  const snapshot = await db.collection('notificationOutbox').where('status', '==', 'PROCESSING').limit(MAX_BATCH).get();
  const now = Date.now();
  const stale = snapshot.docs.filter(doc => {
    const locked = asDate(doc.data().lockedAt);
    return locked && now - locked.getTime() > STALE_LOCK_MS;
  });
  await Promise.all(stale.map(doc => doc.ref.update({
    status: 'PENDING',
    lockedAt: FieldValue.delete(),
    updatedAt: FieldValue.serverTimestamp(),
    lastError: 'Lock expirado; item devolvido para a fila.'
  })));
  return stale.length;
}

async function processItem(item, ref) {
  const context = await contextFor(item);
  const results = [];
  for (const user of context.users) {
    const message = messageFor(item, context, user);
    await upsertInAppNotification(item, user, message);

    const result = { userId: user.id || user.uid };
    if (item.channels?.push === true) result.push = await sendPush(user, message, item.id);
    if (item.channels?.email === true) {
      const cancelled = item.type === 'SCHEDULE_MEMBER_REMOVED';
      const wantsCalendar = item.channels?.calendar === true;
      const calendar = wantsCalendar ? buildCalendarInvite({
        schedule: context.schedule,
        event: context.event,
        user,
        functionName: context.ministryFunction?.name || '',
        cancelled
      }) : null;
      result.email = await sendEmail(user, message, calendar, cancelled ? 'CANCEL' : 'REQUEST');
      result.calendar = wantsCalendar ? (calendar ? result.email.status : 'NO_EVENT_DATE') : 'DISABLED';
    }
    results.push(result);
  }

  await ref.update({
    status: 'SENT',
    sentAt: FieldValue.serverTimestamp(),
    lockedAt: FieldValue.delete(),
    updatedAt: FieldValue.serverTimestamp(),
    delivery: { recipientCount: context.users.length, results }
  });
}

async function failItem(item, ref, error) {
  const terminal = Number(item.attempts || 0) >= MAX_ATTEMPTS;
  await ref.update({
    status: terminal ? 'FAILED' : 'PENDING',
    lockedAt: FieldValue.delete(),
    updatedAt: FieldValue.serverTimestamp(),
    lastError: compactError(error)
  });
}

async function main() {
  const recovered = await recoverStaleLocks();
  const pending = await db.collection('notificationOutbox')
    .where('status', '==', 'PENDING')
    .orderBy('createdAt', 'asc')
    .limit(MAX_BATCH)
    .get();

  if (pending.empty) {
    console.log(`notification-outbox: 0 pendentes${recovered ? `; ${recovered} lock(s) recuperado(s)` : ''}.`);
    return;
  }

  let sent = 0;
  let failed = 0;
  for (const doc of pending.docs) {
    const item = await claim(doc.ref);
    if (!item) continue;
    try {
      await processItem(item, doc.ref);
      sent += 1;
    } catch (error) {
      failed += 1;
      console.error(`notification-outbox: ${item.id} falhou: ${compactError(error)}`);
      await failItem(item, doc.ref, error);
    }
  }
  console.log(`notification-outbox: processados=${sent + failed} enviados=${sent} falhas=${failed}.`);
  if (failed) process.exitCode = 1;
}

if (require.main === module) main().catch(error => {
  console.error(`notification-outbox: erro fatal: ${compactError(error)}`);
  process.exitCode = 1;
});

module.exports = {
  buildCalendarInvite,
  eventDateLabel,
  messageFor,
  compactError
};
