const { applicationDefault, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

const projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'louvor-ide';

async function listAllAuthUsers(auth) {
  const users = [];
  let pageToken;
  do {
    const page = await auth.listUsers(1000, pageToken);
    users.push(...page.users);
    pageToken = page.pageToken;
  } while (pageToken);
  return users;
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

async function getAuthUserOrNull(auth, uid) {
  try {
    return await auth.getUser(uid);
  } catch (error) {
    if (error && error.code === 'auth/user-not-found') return null;
    throw error;
  }
}

async function reconcileDuplicateIdentities(auth, db) {
  const profilesSnapshot = await db.collection('users').get();
  const profilesByUid = new Map(profilesSnapshot.docs.map(doc => [doc.id, doc.data() || {}]));
  const expectedUidByEmail = new Map();

  for (const [uid, profile] of profilesByUid) {
    const email = normalizeEmail(profile.email);
    if (!email) continue;
    const current = expectedUidByEmail.get(email);
    if (current && current !== uid) {
      throw new Error(`Existem dois perfis Firestore para o mesmo e-mail ${email}: ${current} e ${uid}.`);
    }
    expectedUidByEmail.set(email, uid);
  }

  const authUsers = await listAllAuthUsers(auth);
  const authByEmail = new Map();
  for (const user of authUsers) {
    const email = normalizeEmail(user.email);
    if (!email) continue;
    if (!authByEmail.has(email)) authByEmail.set(email, []);
    authByEmail.get(email).push(user);
  }

  let removed = 0;
  let restored = 0;
  let realigned = 0;

  for (const [email, expectedUid] of expectedUidByEmail) {
    const candidates = authByEmail.get(email) || [];
    const foreignWithProfile = candidates.filter(user => user.uid !== expectedUid && profilesByUid.has(user.uid));

    if (foreignWithProfile.length) {
      throw new Error(`Não é seguro reconciliar ${email}: há outra identidade Auth com perfil Firestore (${foreignWithProfile.map(user => user.uid).join(', ')}).`);
    }

    for (const duplicate of candidates.filter(user => user.uid !== expectedUid)) {
      await auth.deleteUser(duplicate.uid);
      removed += 1;
      console.log(`🧹 ${email}: identidade Auth duplicada sem perfil removida (${duplicate.uid}).`);
    }

    const profile = profilesByUid.get(expectedUid) || {};
    const canonical = await getAuthUserOrNull(auth, expectedUid);

    if (canonical) {
      const canonicalEmail = normalizeEmail(canonical.email);
      const patch = {};
      if (canonicalEmail !== email) patch.email = email;
      if ((canonical.displayName || '') !== (profile.name || '')) patch.displayName = profile.name || undefined;
      if ((canonical.photoURL || null) !== (profile.photoURL || null)) patch.photoURL = profile.photoURL || undefined;
      if (canonical.disabled !== (profile.active === false)) patch.disabled = profile.active === false;

      if (Object.keys(patch).length) {
        await auth.updateUser(expectedUid, patch);
        realigned += 1;
        console.log(`🔄 ${email}: identidade Auth canônica realinhada ao perfil (${expectedUid}).`);
      }
      continue;
    }

    await auth.createUser({
      uid: expectedUid,
      email,
      displayName: profile.name || undefined,
      photoURL: profile.photoURL || undefined,
      disabled: profile.active === false
    });
    restored += 1;
    console.log(`🔄 ${email}: identidade Auth restaurada com o UID canônico do Firestore (${expectedUid}).`);
  }

  console.log(`✅ Reconciliação de identidades concluída: ${removed} duplicada(s) removida(s), ${restored} identidade(s) restaurada(s), ${realigned} identidade(s) realinhada(s).`);
}

async function main() {
  initializeApp({ credential: applicationDefault(), projectId });
  await reconcileDuplicateIdentities(getAuth(), getFirestore());
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Falha ao reconciliar identidades Firebase Auth:', error);
    process.exitCode = 1;
  });
}

module.exports = { getAuthUserOrNull, listAllAuthUsers, normalizeEmail, reconcileDuplicateIdentities };
