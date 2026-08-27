const { applicationDefault, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { FieldValue, getFirestore } = require('firebase-admin/firestore');

const projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'louvor-ide';
const KNOWN_EMAIL_REPAIRS = new Map([
  ['davi.alves.de.sousa@gmail.com2', 'davi.alves.de.sousa@gmail.com']
]);

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

async function getAuthUserByEmailOrNull(auth, email) {
  try {
    return await auth.getUserByEmail(email);
  } catch (error) {
    if (error && error.code === 'auth/user-not-found') return null;
    throw error;
  }
}

async function repairKnownMalformedProfileEmails(auth, db) {
  const profilesSnapshot = await db.collection('users').get();
  let repaired = 0;

  for (const profileDoc of profilesSnapshot.docs) {
    const profile = profileDoc.data() || {};
    const currentEmail = normalizeEmail(profile.email);
    const correctedEmail = KNOWN_EMAIL_REPAIRS.get(currentEmail);
    if (!correctedEmail) continue;

    const canonicalUid = profileDoc.id;
    const conflictingAuth = await getAuthUserByEmailOrNull(auth, correctedEmail);
    if (conflictingAuth && conflictingAuth.uid !== canonicalUid) {
      const conflictingProfile = await db.collection('users').doc(conflictingAuth.uid).get();
      if (conflictingProfile.exists) {
        throw new Error(`Não é seguro reparar ${correctedEmail}: a identidade conflitante ${conflictingAuth.uid} possui perfil Firestore.`);
      }
      await auth.deleteUser(conflictingAuth.uid);
      console.log(`🧹 ${correctedEmail}: identidade Auth conflitante sem perfil removida (${conflictingAuth.uid}).`);
    }

    let canonicalAuth = await getAuthUserOrNull(auth, canonicalUid);
    if (canonicalAuth) {
      canonicalAuth = await auth.updateUser(canonicalUid, {
        email: correctedEmail,
        displayName: profile.name || undefined,
        photoURL: profile.photoURL || undefined,
        disabled: profile.active === false
      });
    } else {
      canonicalAuth = await auth.createUser({
        uid: canonicalUid,
        email: correctedEmail,
        displayName: profile.name || undefined,
        photoURL: profile.photoURL || undefined,
        disabled: profile.active === false
      });
    }

    await profileDoc.ref.set({
      email: correctedEmail,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });

    repaired += 1;
    console.log(`✅ ${currentEmail} → ${correctedEmail}: perfil e identidade canônica reparados (${canonicalAuth.uid}).`);
  }

  if (repaired) {
    console.log(`✅ Reparos conhecidos de e-mail concluídos: ${repaired} perfil(is) corrigido(s).`);
  }
}

async function reconcileDuplicateIdentities(auth, db) {
  await repairKnownMalformedProfileEmails(auth, db);

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

module.exports = {
  KNOWN_EMAIL_REPAIRS,
  getAuthUserByEmailOrNull,
  getAuthUserOrNull,
  listAllAuthUsers,
  normalizeEmail,
  reconcileDuplicateIdentities,
  repairKnownMalformedProfileEmails
};
