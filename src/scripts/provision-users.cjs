const fs = require('node:fs');
const path = require('node:path');
const { applicationDefault, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { FieldValue, getFirestore } = require('firebase-admin/firestore');

const projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'louvor-ide';
const configPath = path.resolve(process.cwd(), 'ops', 'provisioned-users.json');
const allowedRoles = new Set(['MEMBER', 'ADMIN', 'SUPER_ADMIN']);

const defaultMinistryFunctions = Object.freeze([
  { name: 'Ministro', slug: 'ministro', order: 10 },
  { name: 'Back Vocal', slug: 'back-vocal', order: 20 },
  { name: 'Bateria', slug: 'bateria', order: 30 },
  { name: 'Baixo', slug: 'baixo', order: 40 },
  { name: 'Guitarra', slug: 'guitarra', order: 50 },
  { name: 'Violão', slug: 'violao', order: 60 },
  { name: 'Teclado', slug: 'teclado', order: 70 },
  { name: 'Sax', slug: 'sax', order: 80 },
  { name: 'DM', slug: 'dm', order: 90 }
]);

const legacyFunctionAliases = Object.freeze({
  ministro: 'ministro',
  ministra: 'ministro',
  vocal: 'ministro',
  'back-vocal': 'back-vocal',
  back: 'back-vocal',
  backing: 'back-vocal',
  bateria: 'bateria',
  baterista: 'bateria',
  baixo: 'baixo',
  baixista: 'baixo',
  guitarra: 'guitarra',
  guitarrista: 'guitarra',
  violao: 'violao',
  violonista: 'violao',
  teclado: 'teclado',
  tecladista: 'teclado',
  sax: 'sax',
  saxofone: 'sax',
  saxofonista: 'sax',
  dm: 'dm',
  'diretor-musical': 'dm',
  'direcao-musical': 'dm'
});

function normalizeFunctionLabel(value) {
  return String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function canonicalFunctionSlug(value) {
  const normalized = normalizeFunctionLabel(value);
  return legacyFunctionAliases[normalized] || normalized;
}

function extractLegacyFunctionLabels(profile) {
  const labels = [];
  const append = value => {
    if (!value) return;
    if (Array.isArray(value)) return value.forEach(append);
    if (typeof value === 'object') {
      append(value.name || value.label || value.function || value.funcao || value.instrument || value.instrumento);
      return;
    }
    String(value).split(/[;,|]/).map(item => item.trim()).filter(Boolean).forEach(item => labels.push(item));
  };

  [profile.functions, profile.ministryFunctions, profile.funcoes, profile.funcao, profile.instrumentos, profile.instrumento].forEach(append);
  return [...new Set(labels)];
}

function relationDocumentId(userId, functionId) {
  return `${encodeURIComponent(userId)}__${encodeURIComponent(functionId)}`;
}

function readProvisioningConfig() {
  const items = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  if (!Array.isArray(items) || items.length === 0) throw new Error('ops/provisioned-users.json deve conter ao menos um usuário.');

  const seen = new Set();
  return items.map((item, index) => {
    if (!item || typeof item.email !== 'string' || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(item.email.trim())) {
      throw new Error(`Usuário #${index + 1} sem e-mail válido.`);
    }
    if (typeof item.name !== 'string' || !item.name.trim()) throw new Error(`Nome inválido para ${item.email}.`);
    if (!allowedRoles.has(item.role)) throw new Error(`Papel inválido para ${item.email}: ${item.role}`);
    if (typeof item.active !== 'boolean') throw new Error(`Campo active inválido para ${item.email}.`);
    if ('password' in item || 'token' in item || 'credential' in item) throw new Error(`Credenciais não podem existir no arquivo de provisionamento (${item.email}).`);

    const email = item.email.trim().toLowerCase();
    if (seen.has(email)) throw new Error(`E-mail duplicado no provisionamento: ${email}.`);
    seen.add(email);

    return { email, name: item.name.trim(), role: item.role, active: item.active };
  });
}

async function reconcileMinistryFunctions(db) {
  const functionsRef = db.collection('ministryFunctions');
  const snapshot = await functionsRef.get();
  const bySlug = new Map();

  for (const doc of snapshot.docs) {
    const data = doc.data() || {};
    const slug = canonicalFunctionSlug(data.slug || data.name || '');
    if (slug) bySlug.set(slug, { id: doc.id, ...data });
  }

  let created = 0;
  for (const seed of defaultMinistryFunctions) {
    const current = bySlug.get(seed.slug);
    if (current) {
      const patch = {};
      if (!current.slug) patch.slug = seed.slug;
      if (!current.name) patch.name = seed.name;
      if (typeof current.active !== 'boolean') patch.active = true;
      if (!Number.isInteger(current.order)) patch.order = seed.order;
      if (Object.keys(patch).length) {
        patch.updatedAt = FieldValue.serverTimestamp();
        await functionsRef.doc(current.id).set(patch, { merge: true });
      }
      continue;
    }

    const ref = functionsRef.doc(seed.slug);
    await ref.set({ ...seed, active: true, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    bySlug.set(seed.slug, { id: ref.id, ...seed, active: true });
    created += 1;
  }

  const profiles = await db.collection('users').get();
  let migratedRelations = 0;
  for (const profileDoc of profiles.docs) {
    const labels = extractLegacyFunctionLabels(profileDoc.data() || {});
    for (const label of labels) {
      const target = bySlug.get(canonicalFunctionSlug(label));
      if (!target) continue;
      const relationId = relationDocumentId(profileDoc.id, target.id);
      const relationRef = db.collection('userFunctions').doc(relationId);
      const existing = await relationRef.get();
      if (!existing.exists || existing.data().active !== true) migratedRelations += 1;
      await relationRef.set({
        userId: profileDoc.id,
        functionId: target.id,
        active: true,
        unassignedAt: null,
        createdAt: existing.exists && existing.data().createdAt ? existing.data().createdAt : FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
    }
  }

  console.log(`✅ Funções ministeriais reconciliadas: ${defaultMinistryFunctions.length} padrão, ${created} criada(s), ${migratedRelations} vínculo(s) legado(s) migrado(s).`);
}

async function reconcileApplicationUsers(auth, db) {
  const profiles = await db.collection('users').get();
  let repaired = 0;

  for (const profileDoc of profiles.docs) {
    const profile = profileDoc.data() || {};
    const email = String(profile.email || '').trim().toLowerCase();
    if (!email) continue;

    let authUser = null;
    try {
      authUser = await auth.getUser(profileDoc.id);
    } catch (error) {
      if (error.code !== 'auth/user-not-found') throw error;
    }

    if (!authUser) {
      try {
        const byEmail = await auth.getUserByEmail(email);
        if (byEmail.uid !== profileDoc.id) throw new Error(`UID divergente para ${email}: Auth=${byEmail.uid}, Firestore=${profileDoc.id}.`);
        authUser = byEmail;
      } catch (error) {
        if (error.code !== 'auth/user-not-found') throw error;
      }
    }

    if (!authUser) {
      authUser = await auth.createUser({
        uid: profileDoc.id,
        email,
        displayName: profile.name || undefined,
        photoURL: profile.photoURL || undefined,
        disabled: profile.active === false
      });
      repaired += 1;
      console.log(`✅ ${email}: conta ausente criada no Firebase Authentication com UID ${authUser.uid}`);
    }

    const shouldBeDisabled = profile.active === false;
    const patch = {};
    if (authUser.disabled !== shouldBeDisabled) patch.disabled = shouldBeDisabled;
    if (profile.name && authUser.displayName !== profile.name) patch.displayName = profile.name;
    if (Object.keys(patch).length) {
      await auth.updateUser(authUser.uid, patch);
      console.log(`🔄 ${email}: estado/dados do Authentication sincronizados com o perfil da aplicação`);
    }
  }

  console.log(`✅ Reconciliação Firestore ↔ Firebase Auth concluída: ${profiles.size} perfil(is), ${repaired} conta(s) reparada(s).`);
}

async function provisionRosterUser(auth, db, config) {
  let userRecord;
  let createdAuth = false;

  try {
    userRecord = await auth.getUserByEmail(config.email);
  } catch (error) {
    if (!error || error.code !== 'auth/user-not-found') throw error;
    userRecord = await auth.createUser({
      email: config.email,
      displayName: config.name,
      disabled: !config.active
    });
    createdAuth = true;
    console.log(`🆕 ${config.email}: conta criada no Firebase Authentication com UID ${userRecord.uid}`);
  }

  const authPatch = {};
  if (userRecord.disabled === config.active) authPatch.disabled = !config.active;
  if (userRecord.displayName !== config.name) authPatch.displayName = config.name;
  if (Object.keys(authPatch).length) {
    userRecord = await auth.updateUser(userRecord.uid, authPatch);
    console.log(`🔄 ${config.email}: dados do Firebase Authentication sincronizados`);
  }

  const profileRef = db.collection('users').doc(userRecord.uid);
  const existing = await profileRef.get();
  const payload = {
    uid: userRecord.uid,
    email: userRecord.email || config.email,
    name: config.name,
    photoURL: userRecord.photoURL || null,
    active: config.active,
    role: config.role,
    updatedAt: FieldValue.serverTimestamp()
  };
  if (!existing.exists) payload.createdAt = FieldValue.serverTimestamp();
  await profileRef.set(payload, { merge: true });

  const verifiedAuth = await auth.getUser(userRecord.uid);
  const verifiedProfile = (await profileRef.get()).data();
  if (verifiedAuth.disabled === config.active) throw new Error(`Estado do Firebase Authentication não corresponde ao esperado para ${config.email}.`);
  if (!verifiedProfile || verifiedProfile.active !== config.active || verifiedProfile.role !== config.role || verifiedProfile.name !== config.name || verifiedProfile.email.toLowerCase() !== config.email) {
    throw new Error(`Perfil Firestore não corresponde ao provisionamento de ${config.email}.`);
  }

  console.log(`✅ ${config.email}: ${createdAuth ? 'CRIADO' : 'EXISTENTE/RECONCILIADO'} | Auth ${verifiedAuth.disabled ? 'disabled' : 'enabled'} | perfil ${verifiedProfile.role}/${verifiedProfile.active ? 'ativo' : 'inativo'} (${verifiedProfile.name})`);
  return createdAuth ? 'created' : 'reconciled';
}

async function main() {
  initializeApp({ credential: applicationDefault(), projectId });
  const auth = getAuth();
  const db = getFirestore();
  const users = readProvisioningConfig();
  const summary = { created: [], reconciled: [] };

  for (const config of users) {
    const result = await provisionRosterUser(auth, db, config);
    summary[result].push(config.email);
  }

  await reconcileMinistryFunctions(db);
  await reconcileApplicationUsers(auth, db);

  console.log(`📊 Provisionamento concluído: ${summary.created.length} criado(s), ${summary.reconciled.length} existente(s)/reconciliado(s), ${users.length} total.`);
  if (summary.created.length) console.log(`🆕 Criados: ${summary.created.join(', ')}`);
  if (summary.reconciled.length) console.log(`🔄 Existentes/reconciliados: ${summary.reconciled.join(', ')}`);
}

main().catch(error => {
  console.error('❌ Falha ao provisionar usuários:', error);
  process.exitCode = 1;
});
