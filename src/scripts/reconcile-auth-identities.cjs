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

function parseTargetEmails(value) {
  return [...new Set(String(value || '')
    .split(',')
    .map(normalizeEmail)
    .filter(Boolean))];
}

function providerIds(user) {
  return (user?.providerData || [])
    .map(provider => provider?.providerId)
    .filter(Boolean)
    .sort();
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
  const malformedEmails = [...KNOWN_EMAIL_REPAIRS.keys()];
  if (!malformedEmails.length) return 0;

  const matchingDocs = [];
  for (let index = 0; index < malformedEmails.length; index += 10) {
    const chunk = malformedEmails.slice(index, index + 10);
    const snapshot = await db.collection('users').where('email', 'in', chunk).get();
    matchingDocs.push(...snapshot.docs);
  }

  let repaired = 0;
  for (const profileDoc of matchingDocs) {
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


async function reconcileSelectedIdentities(auth, db, targetEmails) {
  const normalizedTargets = [...new Set((targetEmails || []).map(normalizeEmail).filter(Boolean))];
  if (!normalizedTargets.length) {
    return reconcileDuplicateIdentities(auth, db);
  }

  const matchingDocs = [];
  for (let index = 0; index < normalizedTargets.length; index += 10) {
    const chunk = normalizedTargets.slice(index, index + 10);
    const snapshot = await db.collection('users').where('email', 'in', chunk).get();
    matchingDocs.push(...snapshot.docs);
  }

  const profilesByEmail = new Map();
  for (const profileDoc of matchingDocs) {
    const profile = profileDoc.data() || {};
    const email = normalizeEmail(profile.email);
    if (!profilesByEmail.has(email)) profilesByEmail.set(email, []);
    profilesByEmail.get(email).push({ uid: profileDoc.id, profile });
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

  for (const email of normalizedTargets) {
    const profiles = profilesByEmail.get(email) || [];
    if (!profiles.length) {
      console.log(`⚠️ ${email}: nenhum perfil correspondente encontrado no Firestore.`);
      continue;
    }
    if (profiles.length > 1) {
      throw new Error(`Existem ${profiles.length} perfis Firestore para o mesmo e-mail ${email}: ${profiles.map(item => item.uid).join(', ')}.`);
    }

    const { uid: expectedUid, profile } = profiles[0];
    const candidates = authByEmail.get(email) || [];
    const canonical = candidates.find(user => user.uid === expectedUid) || await getAuthUserOrNull(auth, expectedUid);

    console.log(`🔎 ${email}: perfil=${expectedUid}; authPorEmail=${candidates.length}; authCanônico=${canonical ? 'sim' : 'não'}; provedoresCanônicos=${canonical ? providerIds(canonical).join('+') || 'nenhum' : 'n/a'}.`);

    for (const duplicate of candidates.filter(user => user.uid !== expectedUid)) {
      const duplicateProfile = await db.collection('users').doc(duplicate.uid).get();
      if (duplicateProfile.exists) {
        throw new Error(`Não é seguro reconciliar ${email}: a identidade Auth ${duplicate.uid} também possui perfil Firestore.`);
      }
      console.log(`🧩 ${email}: identidade Auth extra ${duplicate.uid}; provedores=${providerIds(duplicate).join('+') || 'nenhum'}; sem perfil Firestore.`);
      await auth.deleteUser(duplicate.uid);
      removed += 1;
      console.log(`🧹 ${email}: identidade Auth duplicada sem perfil removida (${duplicate.uid}).`);
    }

    const currentCanonical = await getAuthUserOrNull(auth, expectedUid);
    if (currentCanonical) {
      const patch = {};
      if (normalizeEmail(currentCanonical.email) !== email) patch.email = email;
      if ((currentCanonical.displayName || '') !== (profile.name || '')) patch.displayName = profile.name || undefined;
      if ((currentCanonical.photoURL || null) !== (profile.photoURL || null)) patch.photoURL = profile.photoURL || undefined;
      if (currentCanonical.disabled !== (profile.active === false)) patch.disabled = profile.active === false;

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

  console.log(`✅ Reconciliação direcionada concluída: ${removed} duplicada(s) removida(s), ${restored} identidade(s) restaurada(s), ${realigned} identidade(s) realinhada(s).`);
}

async function main() {
  initializeApp({ credential: applicationDefault(), projectId });
  const targetEmails = parseTargetEmails(process.env.AUTH_RECONCILE_EMAILS);
  if (targetEmails.length) {
    console.log(`🔎 Reconciliação direcionada para ${targetEmails.length} e-mail(s).`);
    await reconcileSelectedIdentities(getAuth(), getFirestore(), targetEmails);
    return;
  }
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
  parseTargetEmails,
  providerIds,
  reconcileDuplicateIdentities,
  reconcileSelectedIdentities,
  repairKnownMalformedProfileEmails
};
