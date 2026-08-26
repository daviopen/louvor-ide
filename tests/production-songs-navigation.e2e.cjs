const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const admin = require('firebase-admin');

const baseUrl = process.env.E2E_BASE_URL || 'https://louvor-ide.web.app';
const projectId = process.env.FIREBASE_PROJECT_ID || 'louvor-ide';

(async () => {
  admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId });
  const auth = admin.auth();
  const db = admin.firestore();
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const email = `ide-music-nav-${suffix}@example.com`;
  const password = `Aa1!${Math.random().toString(36).slice(2)}${Date.now()}`;

  const [songsSnap, legacySnap] = await Promise.all([
    db.collection('songs').get(),
    db.collection('musicas').get()
  ]);
  const expectedIds = new Set([...legacySnap.docs.map(d => d.id), ...songsSnap.docs.map(d => d.id)]);
  assert.ok(expectedIds.size > 0, 'produção precisa possuir músicas para validar a consulta');

  const user = await auth.createUser({ email, password, displayName: 'E2E Navegação Músicas' });
  const uid = user.uid;
  const profileRef = db.collection('users').doc(uid);
  const dashboardPermissionRef = db.collection('permissions').doc(`${uid}__dashboard`);
  const songsPermissionRef = db.collection('permissions').doc(`${uid}__songs`);

  await profileRef.set({
    uid,
    name: 'E2E Navegação Músicas',
    email,
    active: true,
    role: 'MEMBER',
    lgpdConsentVersion: 'terms:2026-08-25|privacy:2026-08-25',
    lgpdTermsVersion: '2026-08-25',
    lgpdPrivacyVersion: '2026-08-25',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
  await Promise.all([
    dashboardPermissionRef.set({ userId: uid, module: 'dashboard', level: 'READ' }),
    songsPermissionRef.set({ userId: uid, module: 'songs', level: 'READ' })
  ]);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  try {
    await page.goto(`${baseUrl}/login.html`, { waitUntil: 'domcontentloaded' });
    await page.getByLabel('E-mail').fill(email);
    await page.getByLabel('Senha').fill(password);
    await page.getByRole('button', { name: 'Entrar com e-mail' }).click();
    await page.waitForURL(url => !/login\.html/.test(url.pathname), { timeout: 20000 });

    const consultLink = page.locator('a.ide-sidebar-link[data-nav-id="songs"]');
    await consultLink.waitFor({ state: 'visible', timeout: 20000 });
    await consultLink.click();
    await page.waitForURL(/consultar\.html(?:$|[?#])/, { timeout: 15000 });

    await page.locator('#songs-loading').waitFor({ state: 'hidden', timeout: 20000 });
    const rows = page.locator('.song-row');
    const rowCount = await rows.count();
    const countText = (await page.locator('#songs-result-count').textContent() || '').trim();
    assert.ok(rowCount > 0, `consulta publicada abriu sem músicas visíveis; contador: ${countText}`);
    assert.match(countText, /\d+\s+músicas?|\d+\s+de\s+\d+/i);

    const firstTitle = (await rows.first().locator('.song-row__title').textContent() || '').trim();
    assert.ok(firstTitle, 'primeira música precisa possuir título visível');
    await rows.first().click();
    await page.locator('#song-detail').waitFor({ state: 'visible', timeout: 10000 });
    const detailTitle = (await page.locator('#song-detail-title').textContent() || '').trim();
    assert.equal(detailTitle, firstTitle);

    console.log(`✅ Navegação real em produção validada: menu → Consultar músicas → ${countText} → detalhe "${detailTitle}"`);
  } finally {
    await browser.close();
    await Promise.allSettled([
      dashboardPermissionRef.delete(),
      songsPermissionRef.delete(),
      profileRef.delete(),
      auth.deleteUser(uid)
    ]);
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
