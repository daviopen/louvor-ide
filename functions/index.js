const { onRequest } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

initializeApp();

const ALLOWED_ORIGINS = new Set([
  'https://louvor-ide.web.app',
  'https://louvor-ide.firebaseapp.com'
]);

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function permissionLevel(profile, moduleName) {
  const permission = profile && profile.permissions && profile.permissions[moduleName];
  if (permission && typeof permission === 'object') return String(permission.level || permission.access || '').toUpperCase();
  return String(permission || '').toUpperCase();
}

function canManageUsers(profile) {
  const role = String(profile && profile.role || '').toUpperCase();
  return role === 'SUPER_ADMIN' || role === 'ADMIN' || profile && profile.isSuperAdmin === true || permissionLevel(profile, 'users') === 'EDIT';
}

function setCors(req, res) {
  const origin = req.get('origin');
  if (origin && ALLOWED_ORIGINS.has(origin)) res.set('Access-Control-Allow-Origin', origin);
  res.set('Vary', 'Origin');
  res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
}

function fail(res, status, message) {
  return res.status(status).json({ ok: false, error: message });
}

async function authenticatedActor(req) {
  const authorization = String(req.get('authorization') || '');
  if (!authorization.startsWith('Bearer ')) return null;
  const token = authorization.slice(7).trim();
  if (!token) return null;
  return getAuth().verifyIdToken(token, true);
}

async function authUserByEmailOrNull(email) {
  try {
    return await getAuth().getUserByEmail(email);
  } catch (error) {
    if (error && error.code === 'auth/user-not-found') return null;
    throw error;
  }
}

exports.updateUserIdentity = onRequest({ region: 'us-central1', cors: false }, async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).send('');
  if (req.method !== 'POST') return fail(res, 405, 'Método não permitido.');

  const origin = req.get('origin');
  if (origin && !ALLOWED_ORIGINS.has(origin)) return fail(res, 403, 'Origem não autorizada.');

  try {
    const actor = await authenticatedActor(req);
    if (!actor) return fail(res, 401, 'Sessão administrativa inválida.');

    const db = getFirestore();
    const actorSnapshot = await db.collection('users').doc(actor.uid).get();
    if (!actorSnapshot.exists || actorSnapshot.data().active !== true || !canManageUsers(actorSnapshot.data())) {
      return fail(res, 403, 'Você não possui permissão para editar usuários.');
    }

    const userId = String(req.body && req.body.userId || '').trim();
    const name = String(req.body && req.body.name || '').trim();
    const email = normalizeEmail(req.body && req.body.email);
    const photoURL = req.body && req.body.photoURL ? String(req.body.photoURL).trim() : null;

    if (!userId || !name || !email) return fail(res, 400, 'Usuário, nome e e-mail são obrigatórios.');
    if (!validEmail(email)) return fail(res, 400, 'Informe um e-mail válido.');

    const targetRef = db.collection('users').doc(userId);
    const targetSnapshot = await targetRef.get();
    if (!targetSnapshot.exists) return fail(res, 404, 'Usuário não encontrado.');

    const targetProfile = targetSnapshot.data() || {};
    const auth = getAuth();
    let authUser;
    try {
      authUser = await auth.getUser(userId);
    } catch (error) {
      if (error && error.code === 'auth/user-not-found') {
        return fail(res, 409, 'A identidade de login deste usuário não existe no Firebase Authentication.');
      }
      throw error;
    }

    const existingEmailUser = await authUserByEmailOrNull(email);
    if (existingEmailUser && existingEmailUser.uid !== userId) {
      return fail(res, 409, 'Este e-mail já está associado a outra conta de login.');
    }

    const previousAuth = {
      email: authUser.email || null,
      displayName: authUser.displayName || null,
      photoURL: authUser.photoURL || null
    };
    const emailChanged = normalizeEmail(previousAuth.email) !== email;

    await auth.updateUser(userId, { email, displayName: name, photoURL });

    try {
      await targetRef.set({
        uid: targetProfile.uid || userId,
        name,
        email,
        photoURL,
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });

      await db.collection('auditLogs').add({
        actorUserId: actor.uid,
        action: emailChanged ? 'USER_EMAIL_AND_IDENTITY_UPDATED' : 'USER_IDENTITY_UPDATED',
        entityType: 'user',
        entityId: userId,
        details: {
          emailChanged,
          previousEmail: emailChanged ? normalizeEmail(previousAuth.email) : undefined,
          email
        },
        createdAt: FieldValue.serverTimestamp()
      });
    } catch (firestoreError) {
      try {
        await auth.updateUser(userId, {
          email: previousAuth.email || undefined,
          displayName: previousAuth.displayName,
          photoURL: previousAuth.photoURL
        });
      } catch (rollbackError) {
        console.error('Falha ao reverter identidade após erro no Firestore:', rollbackError && rollbackError.code);
      }
      throw firestoreError;
    }

    return res.status(200).json({
      ok: true,
      user: { id: userId, uid: userId, name, email, photoURL },
      emailChanged
    });
  } catch (error) {
    console.error('updateUserIdentity falhou:', error && error.code || 'unknown');
    return fail(res, 500, 'Não foi possível sincronizar o e-mail de login. Tente novamente.');
  }
});
