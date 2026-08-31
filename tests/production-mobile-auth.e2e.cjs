const assert = require('node:assert/strict');
const { chromium, webkit, devices } = require('playwright');
const admin = require('firebase-admin');

const baseUrl = process.env.E2E_BASE_URL || 'https://louvor-ide.web.app';
const projectId = process.env.FIREBASE_PROJECT_ID || 'louvor-ide';
const expectedAuthDomain = new URL(baseUrl).hostname;
const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const email = `ide-music-mobile-e2e-${runId}@example.com`;
const password = `Aa1!${Math.random().toString(36).slice(2)}${Date.now()}`;

async function waitForAuthCompat(page) {
  await page.waitForFunction(() => Boolean(
    window.MusicIdeAuth
    && window.MusicIdeAuth.__mobileCompatInstalled
    && typeof window.MusicIdeAuth.googleAuthStrategy === 'function'
  ), null, { timeout: 15000 });
}

async function assertFirstPartyAuthDomain(page, label) {
  const authDomain = await page.evaluate(() => window.firebase && window.firebase.app().options.authDomain);
  assert.equal(authDomain, expectedAuthDomain, `${label}: authDomain deve ser first-party`);
}

async function waitForAuthenticatedPage(page, timeout = 20000) {
  await page.waitForURL(url => !/login\.html$/.test(url.pathname), { timeout });
  await page.waitForFunction(() => !document.documentElement.classList.contains('auth-pending'), null, { timeout });
  assert.ok(!/login\.html$/.test(new URL(page.url()).pathname), `usuário voltou ao login: ${page.url()}`);
}

async function validateMobileLogin(browserType, deviceName, expectedEngine) {
  const browser = await browserType.launch({ headless: true });
  const context = await browser.newContext({
    ...devices[deviceName],
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo'
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  try {
    await page.goto(`${baseUrl}/login.html`, { waitUntil: 'domcontentloaded' });
    await waitForAuthCompat(page);
    await assertFirstPartyAuthDomain(page, `${deviceName}/${expectedEngine}`);

    const strategy = await page.evaluate(() => window.MusicIdeAuth.googleAuthStrategy());
    assert.equal(strategy, 'redirect', `${deviceName}/${expectedEngine}: Google deveria usar redirect`);

    await page.getByLabel('E-mail').fill(email);
    await page.getByLabel('Senha').fill(password);
    await page.getByRole('button', { name: 'Entrar com e-mail' }).click();
    await waitForAuthenticatedPage(page);

    await page.goto(`${baseUrl}/module.html?section=schedules`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !document.documentElement.classList.contains('auth-pending'), null, { timeout: 20000 });
    assert.ok(!/login\.html/.test(page.url()), `${deviceName}/${expectedEngine}: sessão não persistiu ao navegar`);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !document.documentElement.classList.contains('auth-pending'), null, { timeout: 20000 });
    assert.ok(!/login\.html/.test(page.url()), `${deviceName}/${expectedEngine}: sessão não persistiu após reload`);

    assert.deepEqual(pageErrors, [], `${deviceName}/${expectedEngine}: erros JavaScript: ${pageErrors.join(' | ')}`);
    console.log(`✅ ${deviceName}/${expectedEngine}: login, navegação e reload`);
  } finally {
    await context.close();
    await browser.close();
  }
}

async function validateEmbeddedBrowserGuard() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ...devices['Pixel 7'],
    userAgent: 'Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 Version/4.0 Chrome/142.0 Mobile Safari/537.36 Instagram 350.0.0.0.0 Android',
    locale: 'pt-BR'
  });
  const page = await context.newPage();
  const googleRequests = [];
  page.on('request', request => {
    if (/accounts\.google\.com|googleapis\.com\/identitytoolkit/i.test(request.url())) googleRequests.push(request.url());
  });

  try {
    await page.goto(`${baseUrl}/login.html`, { waitUntil: 'domcontentloaded' });
    await waitForAuthCompat(page);
    await assertFirstPartyAuthDomain(page, 'navegador interno Android');
    assert.equal(await page.evaluate(() => window.MusicIdeAuth.googleAuthStrategy()), 'external-browser');

    await page.getByRole('button', { name: /Google/i }).click();
    await page.waitForTimeout(300);

    assert.ok(/login\.html/.test(page.url()), 'navegador interno não deveria sair da tela de login');
    const message = ((await page.locator('#auth-message').textContent()) || '').trim();
    assert.match(message, /navegador interno/i);
    assert.match(message, /Chrome/i);
    assert.equal(googleRequests.length, 0, `OAuth Google foi iniciado dentro do navegador interno: ${googleRequests.join(', ')}`);
    console.log('✅ navegador interno: OAuth bloqueado com orientação para Chrome');
  } finally {
    await context.close();
    await browser.close();
  }
}

async function validateDesktopStrategy() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: 'pt-BR' });
  try {
    await page.goto(`${baseUrl}/login.html`, { waitUntil: 'domcontentloaded' });
    await waitForAuthCompat(page);
    await assertFirstPartyAuthDomain(page, 'desktop Chromium');
    assert.equal(await page.evaluate(() => window.MusicIdeAuth.googleAuthStrategy()), 'popup');
    console.log('✅ desktop Chromium: popup mantido');
  } finally {
    await browser.close();
  }
}

(async () => {
  admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId });
  const auth = admin.auth();
  const db = admin.firestore();
  let uid;

  try {
    const user = await auth.createUser({ email, password, displayName: 'E2E Mobile IDE Music' });
    uid = user.uid;
    await db.collection('users').doc(uid).set({
      uid,
      name: 'E2E Mobile IDE Music',
      email,
      active: true,
      role: 'SUPER_ADMIN',
      lgpdConsentVersion: 'terms:2026-08-25|privacy:2026-08-25',
      lgpdTermsVersion: '2026-08-25',
      lgpdPrivacyVersion: '2026-08-25',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    await validateDesktopStrategy();
    await validateMobileLogin(chromium, 'Pixel 7', 'Chromium');
    await validateMobileLogin(webkit, 'iPhone 13', 'WebKit');
    await validateEmbeddedBrowserGuard();
  } finally {
    if (uid) {
      await Promise.allSettled([
        db.collection('users').doc(uid).delete(),
        auth.deleteUser(uid)
      ]);
    }
  }
})().catch(error => {
  console.error('❌ E2E mobile de autenticação falhou:', error);
  process.exitCode = 1;
});
