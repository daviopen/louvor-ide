const fs = require('node:fs');
const path = require('node:path');
const { applicationDefault, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { FieldValue, getFirestore } = require('firebase-admin/firestore');

const projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'louvor-ide';
const configPath = path.resolve(__dirname, '..', 'ops', 'provisioned-users.json');
const allowedRoles = new Set(['MEMBER', 'ADMIN', 'SUPER_ADMIN']);

function readProvisioningConfig() {
  const items = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('ops/provisioned-users.json deve conter ao menos um usuário.');
  }

  return items.map((item, index) => {
    if (!item || typeof item.email !== 'string' || !item.email.includes('@')) {
      throw new Error(`Usuário #${index + 1} sem e-mail válido.`);
    }
    if (!allowedRoles.has(item.role)) {
      throw new Error(`Papel inválido para ${item.email}: ${item.role}`);
    }
    if (typeof item.active !== 'boolean') {
      throw new Error(`Campo active inválido para ${item.email}.`);
    }
    if ('password' in item || 'token' in item || 'credential' in item) {
      throw new Error(`Credenciais não podem existir no arquivo de provisionamento (${item.email}).`);
    }
    return {
      email: item.email.trim().toLowerCase(),
      role: item.role,
      active: item.active
    };
  });
}

async function main() {
  initializeApp({
    credential: applicationDefault(),
    projectId
  });

  const auth = getAuth();
  const db = getFirestore();
  const users = readProvisioningConfig();

  for (const config of users) {
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(config.email);
    } catch (error) {
      if (error && error.code === 'auth/user-not-found') {
        throw new Error(
          `A conta ${config.email} não existe no Firebase Authentication. ` +
          'Crie a conta no Firebase antes de provisioná-la; nenhuma senha é criada por este script.'
        );
      }
      throw error;
    }

    if (userRecord.disabled && config.active) {
      userRecord = await auth.updateUser(userRecord.uid, { disabled: false });
      console.log(`✅ Firebase Authentication reativado para ${config.email}`);
    } else if (!userRecord.disabled && !config.active) {
      userRecord = await auth.updateUser(userRecord.uid, { disabled: true });
      console.log(`✅ Firebase Authentication desativado para ${config.email}`);
    }

    const profileRef = db.collection('users').doc(userRecord.uid);
    const existing = await profileRef.get();
    const payload = {
      uid: userRecord.uid,
      email: userRecord.email || config.email,
      name: userRecord.displayName || userRecord.email || config.email,
      photoURL: userRecord.photoURL || null,
      active: config.active,
      role: config.role,
      updatedAt: FieldValue.serverTimestamp()
    };

    if (!existing.exists) {
      payload.createdAt = FieldValue.serverTimestamp();
    }

    await profileRef.set(payload, { merge: true });

    const verifiedAuth = await auth.getUser(userRecord.uid);
    const verifiedProfile = await profileRef.get();
    const profile = verifiedProfile.data();

    if (verifiedAuth.disabled === config.active) {
      throw new Error(`Estado do Firebase Authentication não corresponde ao esperado para ${config.email}.`);
    }
    if (!profile || profile.active !== config.active || profile.role !== config.role) {
      throw new Error(`Perfil Firestore não corresponde ao provisionamento de ${config.email}.`);
    }

    console.log(`✅ ${config.email}: Auth ${verifiedAuth.disabled ? 'disabled' : 'enabled'}, perfil ${profile.role}/${profile.active ? 'ativo' : 'inativo'}`);
  }
}

main().catch(error => {
  console.error('❌ Falha ao provisionar usuários:', error);
  process.exitCode = 1;
});
