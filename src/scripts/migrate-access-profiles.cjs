const { applicationDefault, initializeApp } = require('firebase-admin/app');
const { FieldValue, getFirestore } = require('firebase-admin/firestore');
const profiles = require('../js/modules/access-profiles.js');

const projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'louvor-ide';
const apply = String(process.env.APPLY_ACCESS_PROFILE_MIGRATION || '').toLowerCase() === 'true';

function normalizePermissionMap(value = {}) {
  return Object.fromEntries(profiles.MODULES.map(moduleName => {
    const raw = value[moduleName];
    const level = typeof raw === 'object' && raw ? raw.level || raw.access : raw;
    const normalized = String(level || 'NONE').toUpperCase();
    return [moduleName, ['READ', 'EDIT'].includes(normalized) ? normalized : 'NONE'];
  }));
}

async function loadPermissionMap(db, userDoc) {
  const data = userDoc.data() || {};
  const mirrored = normalizePermissionMap(data.permissions || {});
  if (Object.values(mirrored).some(level => level !== 'NONE')) return mirrored;

  const snapshot = await db.collection('permissions').where('userId', '==', userDoc.id).get();
  const map = {};
  snapshot.forEach(doc => {
    const permission = doc.data() || {};
    if (profiles.MODULES.includes(permission.module)) map[permission.module] = permission.level;
  });
  return normalizePermissionMap(map);
}

async function main() {
  initializeApp({ credential: applicationDefault(), projectId });
  const db = getFirestore();
  const users = await db.collection('users').get();
  const summary = { alreadyProfiled: 0, inferred: 0, unresolved: 0, superAdmins: 0 };

  for (const userDoc of users.docs) {
    const user = userDoc.data() || {};
    if (String(user.role || '').toUpperCase() === 'SUPER_ADMIN') {
      summary.superAdmins += 1;
      console.log(`↪ ${user.email || userDoc.id}: SUPER_ADMIN preservado`);
      continue;
    }

    const existingProfile = profiles.normalizeProfile(user.accessProfile);
    if (existingProfile) {
      summary.alreadyProfiled += 1;
      console.log(`✅ ${user.email || userDoc.id}: já associado a ${existingProfile}`);
      continue;
    }

    const permissionMap = await loadPermissionMap(db, userDoc);
    const inferredProfile = profiles.inferProfile(permissionMap);
    if (!inferredProfile) {
      summary.unresolved += 1;
      console.warn(`⚠️ ${user.email || userDoc.id}: matriz atual não corresponde exatamente a um perfil canônico; nenhuma alteração aplicada`);
      continue;
    }

    summary.inferred += 1;
    const role = inferredProfile === 'ADMINISTRATOR' ? 'ADMIN' : 'MEMBER';
    if (apply) {
      await userDoc.ref.update({ accessProfile: inferredProfile, role, updatedAt: FieldValue.serverTimestamp() });
      console.log(`🔄 ${user.email || userDoc.id}: associado a ${inferredProfile}`);
    } else {
      console.log(`🔎 ${user.email || userDoc.id}: seria associado a ${inferredProfile}`);
    }
  }

  console.log(`📊 Migração ${apply ? 'APLICADA' : 'DRY-RUN'}: ${summary.inferred} inferido(s), ${summary.alreadyProfiled} já associado(s), ${summary.unresolved} não resolvido(s), ${summary.superAdmins} SUPER_ADMIN preservado(s).`);
  if (summary.unresolved > 0) process.exitCode = 2;
}

main().catch(error => {
  console.error('❌ Falha na migração de perfis de acesso:', error);
  process.exitCode = 1;
});
