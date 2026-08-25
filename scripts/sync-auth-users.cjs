#!/usr/bin/env node
const admin = require('firebase-admin');

if (!admin.apps.length) admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'louvor-ide' });

const db = admin.firestore();
const auth = admin.auth();
const checkOnly = process.env.SYNC_AUTH_CHECK_ONLY === '1';

async function findAuthUser(profileId, email) {
  try {
    return await auth.getUser(profileId);
  } catch (error) {
    if (error.code !== 'auth/user-not-found') throw error;
  }
  if (!email) return null;
  try {
    return await auth.getUserByEmail(email);
  } catch (error) {
    if (error.code !== 'auth/user-not-found') throw error;
    return null;
  }
}

async function main() {
  const snapshot = await db.collection('users').get();
  let repaired = 0;
  let mismatches = 0;

  for (const doc of snapshot.docs) {
    const profile = doc.data() || {};
    const email = String(profile.email || '').trim().toLowerCase();
    if (!email) continue;

    const existing = await findAuthUser(doc.id, email);
    if (existing) {
      if (existing.uid !== doc.id) {
        mismatches += 1;
        console.error(`❌ ${email}: Auth UID ${existing.uid} difere do perfil Firestore ${doc.id}`);
        continue;
      }
      const shouldBeDisabled = profile.active === false;
      if (!checkOnly && existing.disabled !== shouldBeDisabled) {
        await auth.updateUser(existing.uid, { disabled: shouldBeDisabled });
        console.log(`🔄 ${email}: estado Auth sincronizado (${shouldBeDisabled ? 'desativado' : 'ativo'})`);
      }
      continue;
    }

    if (checkOnly) {
      mismatches += 1;
      console.error(`❌ ${email}: perfil Firestore sem conta correspondente no Firebase Authentication`);
      continue;
    }

    await auth.createUser({
      uid: doc.id,
      email,
      displayName: profile.name || undefined,
      photoURL: profile.photoURL || undefined,
      disabled: profile.active === false
    });
    repaired += 1;
    console.log(`✅ ${email}: conta Firebase Authentication criada com UID ${doc.id}`);
  }

  if (mismatches) throw new Error(`${mismatches} inconsistência(s) entre Firestore e Firebase Authentication.`);
  console.log(`✅ Sincronização Auth concluída. Perfis: ${snapshot.size}; reparados: ${repaired}; modo: ${checkOnly ? 'validação' : 'reparo'}.`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
