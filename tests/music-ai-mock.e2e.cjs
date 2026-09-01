const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const admin = require('firebase-admin');

const baseUrl = process.env.E2E_BASE_URL || 'http://127.0.0.1:5000';
const projectId = process.env.FIREBASE_PROJECT_ID || 'louvor-ide';

(async () => {
  admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId });
  const auth = admin.auth();
  const db = admin.firestore();
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const email = `ide-music-ai-${suffix}@example.com`;
  const password = `Aa1!${Math.random().toString(36).slice(2)}${Date.now()}`;
  const songTitle = `E2E IA Mock ${suffix}`;
  const uidHolder = { value: null };
  let createdSongId = null;

  const user = await auth.createUser({ email, password, displayName: 'E2E IA Músicas' });
  uidHolder.value = user.uid;
  const profileRef = db.collection('users').doc(user.uid);

  await profileRef.set({
    uid: user.uid,
    name: 'E2E IA Músicas',
    email,
    active: true,
    role: 'SUPER_ADMIN',
    lgpdConsentVersion: 'terms:2026-08-25|privacy:2026-08-25',
    lgpdTermsVersion: '2026-08-25',
    lgpdPrivacyVersion: '2026-08-25',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('console', msg => console.log(`BROWSER ${msg.type()}: ${msg.text()}`));
  page.on('pageerror', error => console.log(`BROWSER pageerror: ${error.message}`));

  await page.addInitScript(({ title }) => {
    window.__MUSIC_AI_PROVIDER__ = {
      getInfo() {
        return { provider: 'mock', model: 'mock-music-ai-e2e' };
      },
      async analyze(input) {
        if (!input?.pastedText) throw new Error('mock exige texto');
        return {
          schemaVersion: '1.0.0',
          title,
          artist: 'Artista E2E',
          originalKey: 'G',
          chordSheet: 'Intro:  G  C\n\nEstrofe:\nG  C  Em  D',
          lyrics: 'Letra de teste E2E',
          timeSignature: '4/4',
          bpm: 84,
          video: null,
          sections: [
            { order: 0, type: 'intro', title: 'Intro', content: null, chords: 'G C' },
            { order: 1, type: 'verse', title: 'Estrofe', content: null, chords: 'G C Em D' }
          ],
          fieldProvenance: [
            { field: 'title', source: 'pasted_text', confidence: 'high', evidence: 'mock E2E' }
          ],
          warnings: [],
          providerInfo: { provider: 'mock', model: 'mock-music-ai-e2e' },
          fallbackUsed: false
        };
      }
    };
  }, { title: songTitle });

  try {
    await page.goto(`${baseUrl}/login.html`, { waitUntil: 'domcontentloaded' });
    await page.getByLabel('E-mail').fill(email);
    await page.getByLabel('Senha').fill(password);
    await page.getByRole('button', { name: 'Entrar com e-mail' }).click();
    await page.waitForURL(url => !/login\.html/.test(url.pathname), { timeout: 20000 });

    await page.goto(`${baseUrl}/nova-musica.html`, { waitUntil: 'domcontentloaded' });
    await page.locator('#song-form').waitFor({ state: 'visible', timeout: 20000 });
    await page.getByRole('tab', { name: 'Importar com IA' }).click();
    await page.locator('#ai-source-text').fill('Intro: G C\nEstrofe: G C Em D');
    await page.getByRole('button', { name: 'Analisar com IA' }).click();

    await page.locator('#ai-inline-status').filter({ hasText: 'Análise concluída' }).waitFor({ state: 'visible', timeout: 10000 });
    assert.equal(await page.locator('#titulo').inputValue(), songTitle);
    assert.equal(await page.locator('#artista').inputValue(), 'Artista E2E');
    assert.equal(await page.locator('#tom').inputValue(), 'G');
    assert.equal(await page.locator('#bpm').inputValue(), '84');
    assert.equal(await page.locator('#compasso').inputValue(), '4/4');
    assert.match(await page.locator('#cifra').inputValue(), /Intro:/);
    assert.equal(await page.locator('#ai-review-banner').isVisible(), true);

    const beforeSave = await db.collection('songs').where('titulo', '==', songTitle).get();
    assert.equal(beforeSave.empty, true, 'análise da IA não pode persistir música automaticamente');

    await page.getByRole('button', { name: 'Salvar música' }).click();
    await page.locator('#status').filter({ hasText: 'Música criada com sucesso' }).waitFor({ state: 'visible', timeout: 15000 });

    let afterSave = null;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      afterSave = await db.collection('songs').where('titulo', '==', songTitle).get();
      if (!afterSave.empty) break;
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    assert.ok(afterSave && !afterSave.empty, 'salvamento explícito deve persistir a música sugerida');
    const createdDoc = afterSave.docs[0];
    createdSongId = createdDoc.id;
    const created = createdDoc.data();
    assert.equal(created.creationMode, 'ai_assisted');
    assert.equal(created.originalKey, 'G');
    assert.equal(created.bpm, 84);
    assert.equal(created.timeSignature, '4/4');
    assert.equal(created.aiImport?.provider, 'mock');
    assert.equal(created.aiImport?.model, 'mock-music-ai-e2e');
    assert.equal(created.sourceType, 'pasted_text');

    const auditSnap = await db.collection('auditLogs').where('actorUserId', '==', user.uid).get();
    const actions = auditSnap.docs.map(doc => doc.data()?.action);
    assert.ok(actions.includes('SONG_AI_IMPORT_SUCCEEDED'), 'análise assistida deve ser auditada');
    assert.ok(actions.includes('SONG_CREATED'), 'criação final deve ser auditada');

    console.log('✅ E2E mock validou IA → revisão → ausência de auto-save → persistência explícita em mobile.');
  } finally {
    await browser.close();

    const cleanup = [];
    if (createdSongId) cleanup.push(db.collection('songs').doc(createdSongId).delete());
    if (createdSongId) {
      const ministerKeys = await db.collection('songMinisterKeys').where('songId', '==', createdSongId).get();
      ministerKeys.docs.forEach(doc => cleanup.push(doc.ref.delete()));
    }
    if (uidHolder.value) {
      const auditSnap = await db.collection('auditLogs').where('actorUserId', '==', uidHolder.value).get();
      auditSnap.docs.forEach(doc => cleanup.push(doc.ref.delete()));
    }
    cleanup.push(profileRef.delete());
    cleanup.push(auth.deleteUser(user.uid));
    await Promise.allSettled(cleanup);
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
