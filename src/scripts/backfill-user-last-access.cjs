const { applicationDefault, initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || 'louvor-ide';
initializeApp({ credential: applicationDefault(), projectId });
const db = getFirestore();

function toMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value.toDate === 'function') return value.toDate().getTime();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

async function main() {
  const auditSnapshot = await db.collection('auditLogs').where('action', '==', 'AUTH_LOGIN').get();
  const latestByUser = new Map();

  for (const doc of auditSnapshot.docs) {
    const data = doc.data() || {};
    const uid = String(data.actorUserId || '').trim();
    if (!uid || !data.createdAt) continue;
    const current = latestByUser.get(uid);
    if (!current || toMillis(data.createdAt) > toMillis(current)) latestByUser.set(uid, data.createdAt);
  }

  if (!latestByUser.size) {
    console.log('Nenhum AUTH_LOGIN encontrado; nada para atualizar.');
    return;
  }

  const userRefs = [...latestByUser.keys()].map(uid => db.collection('users').doc(uid));
  const userSnapshots = await db.getAll(...userRefs);
  const pending = [];

  for (const userSnapshot of userSnapshots) {
    if (!userSnapshot.exists) continue;
    const latestLogin = latestByUser.get(userSnapshot.id);
    const currentLastAccess = userSnapshot.data()?.lastAccessAt || null;
    if (toMillis(latestLogin) <= toMillis(currentLastAccess)) continue;
    pending.push({ ref: userSnapshot.ref, lastAccessAt: latestLogin });
  }

  const chunkSize = 450;
  for (let offset = 0; offset < pending.length; offset += chunkSize) {
    const batch = db.batch();
    pending.slice(offset, offset + chunkSize).forEach(item => {
      batch.update(item.ref, { lastAccessAt: item.lastAccessAt });
    });
    await batch.commit();
  }

  console.log(`Último acesso reconciliado para ${pending.length} usuário(s), com base em ${auditSnapshot.size} login(s) auditado(s).`);
}

main().catch(error => {
  console.error('Falha ao reconciliar último acesso dos usuários:', error);
  process.exitCode = 1;
});
