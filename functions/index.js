const { onRequest } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { FieldValue, getFirestore } = require('firebase-admin/firestore');

initializeApp();

const db = getFirestore();
const auth = getAuth();
const ALLOWED_ORIGINS = new Set([
  'https://louvor-ide.web.app',
  'https://louvor-ide.firebaseapp.com',
  'http://localhost:5000',
  'http://127.0.0.1:5000'
]);
const ALLOWED_MODULES = new Set(['dashboard','users','permissions','unavailability','events','schedules','setlists','songs','audit']);
const ALLOWED_LEVELS = new Set(['READ', 'EDIT']);

function cors(req, res) {
  const origin = req.get('origin');
  if (origin && ALLOWED_ORIGINS.has(origin)) res.set('Access-Control-Allow-Origin', origin);
  res.set('Vary', 'Origin');
  res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function assertPassword(value) {
  const password = String(value || '');
  if (password.length < 8) throw Object.assign(new Error('A senha deve ter no mínimo 8 caracteres.'), { status: 400 });
  if (password.length > 128) throw Object.assign(new Error('A senha deve ter no máximo 128 caracteres.'), { status: 400 });
  return password;
}

async function requireAdmin(req) {
  const header = req.get('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) throw Object.assign(new Error('Autenticação obrigatória.'), { status: 401 });
  const decoded = await auth.verifyIdToken(match[1]);
  const profile = await db.collection('users').doc(decoded.uid).get();
  if (!profile.exists || profile.data().active === false) throw Object.assign(new Error('Usuário administrativo inativo ou sem perfil.'), { status: 403 });
  const role = String(profile.data().role || '').toUpperCase();
  if (!['ADMIN', 'SUPER_ADMIN'].includes(role) && decoded.superAdmin !== true && decoded.role !== 'ADMIN') {
    throw Object.assign(new Error('Permissão administrativa insuficiente.'), { status: 403 });
  }
  return { uid: decoded.uid, role };
}

async function createUser(actor, input) {
  const name = String(input.name || '').trim();
  const email = normalizeEmail(input.email);
  const password = assertPassword(input.password);
  const photoURL = input.photoURL ? String(input.photoURL).trim() : null;
  const functionIds = Array.isArray(input.functionIds) ? [...new Set(input.functionIds.map(String).filter(Boolean))] : [];
  const permissions = input.permissions && typeof input.permissions === 'object' ? input.permissions : {};
  if (!name) throw Object.assign(new Error('Nome é obrigatório.'), { status: 400 });
  if (!email || !email.includes('@')) throw Object.assign(new Error('E-mail inválido.'), { status: 400 });

  try {
    await auth.getUserByEmail(email);
    throw Object.assign(new Error('Já existe uma conta no Firebase Authentication com este e-mail.'), { status: 409 });
  } catch (error) {
    if (error.status === 409) throw error;
    if (error.code !== 'auth/user-not-found') throw error;
  }

  const existingProfile = await db.collection('users').where('email', '==', email).limit(1).get();
  if (!existingProfile.empty) throw Object.assign(new Error('Já existe um perfil da aplicação com este e-mail.'), { status: 409 });

  const record = await auth.createUser({ email, password, displayName: name, photoURL: photoURL || undefined, disabled: false });
  try {
    const now = FieldValue.serverTimestamp();
    const batch = db.batch();
    batch.set(db.collection('users').doc(record.uid), {
      uid: record.uid,
      name,
      email,
      photoURL,
      active: true,
      role: 'MEMBER',
      createdAt: now,
      updatedAt: now,
      lastAccessAt: null,
      permissions: Object.fromEntries(Object.entries(permissions)
        .map(([moduleName, level]) => [moduleName, String(level || '').toUpperCase()])
        .filter(([moduleName, level]) => ALLOWED_MODULES.has(moduleName) && ALLOWED_LEVELS.has(level)))
    });
    functionIds.forEach(functionId => {
      batch.set(db.collection('userFunctions').doc(`${record.uid}__${functionId}`), {
        userId: record.uid,
        functionId,
        active: true,
        unassignedAt: null,
        createdAt: now,
        updatedAt: now
      }, { merge: true });
    });
    Object.entries(permissions).forEach(([moduleName, rawLevel]) => {
      const level = String(rawLevel || '').toUpperCase();
      if (!ALLOWED_MODULES.has(moduleName) || !ALLOWED_LEVELS.has(level)) return;
      batch.set(db.collection('permissions').doc(`${record.uid}__${moduleName}`), {
        userId: record.uid,
        module: moduleName,
        level,
        createdAt: now,
        updatedAt: now
      }, { merge: true });
    });
    batch.set(db.collection('auditLogs').doc(), {
      actorUserId: actor.uid,
      action: 'USER_CREATED',
      entityType: 'user',
      entityId: record.uid,
      details: { functionIds, permissions: Object.fromEntries(Object.entries(permissions).filter(([moduleName]) => ALLOWED_MODULES.has(moduleName))), passwordDefinedByAdmin: true },
      createdAt: now
    });
    await batch.commit();
    return { uid: record.uid, email, name };
  } catch (error) {
    await auth.deleteUser(record.uid).catch(() => {});
    throw error;
  }
}

async function setPassword(actor, input) {
  const uid = String(input.uid || '').trim();
  if (!uid) throw Object.assign(new Error('Usuário é obrigatório.'), { status: 400 });
  const password = assertPassword(input.password);
  await auth.updateUser(uid, { password });
  await db.collection('auditLogs').add({
    actorUserId: actor.uid,
    action: 'USER_PASSWORD_CHANGED_BY_ADMIN',
    entityType: 'user',
    entityId: uid,
    details: { passwordDefinedByAdmin: true },
    createdAt: FieldValue.serverTimestamp()
  });
  return { uid };
}

exports.adminUserManagement = onRequest({ region: 'us-central1', cors: false }, async (req, res) => {
  cors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
  try {
    const actor = await requireAdmin(req);
    const action = String(req.body && req.body.action || '');
    const data = req.body && req.body.data || {};
    const result = action === 'createUser'
      ? await createUser(actor, data)
      : action === 'setPassword'
        ? await setPassword(actor, data)
        : (() => { throw Object.assign(new Error('Ação inválida.'), { status: 400 }); })();
    return res.status(200).json({ ok: true, result });
  } catch (error) {
    console.error('adminUserManagement:', error);
    return res.status(error.status || 500).json({ error: error.message || 'Falha na operação administrativa.' });
  }
});
