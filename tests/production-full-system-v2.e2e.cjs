const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const admin = require('firebase-admin');

const baseUrl = process.env.E2E_BASE_URL || 'https://louvor-ide.web.app';
const projectId = process.env.FIREBASE_PROJECT_ID || 'louvor-ide';
const artifactsDir = path.resolve(process.env.E2E_ARTIFACTS_DIR || 'test-results/full-system');
const runId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const email = `ide-music-full-e2e-${runId}@example.com`;
const password = `Aa1!${Math.random().toString(36).slice(2)}${Date.now()}`;
const songTitle = `E2E Música ${runId}`;
const eventName = `E2E Evento ${runId}`;
const futureDate = new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 10);

fs.mkdirSync(artifactsDir, { recursive: true });
const summary = { baseUrl, runId, startedAt: new Date().toISOString(), checks: [], browserErrors: [], failedResponses: [] };

function record(name, detail = '') {
  summary.checks.push({ name, detail, at: new Date().toISOString() });
  console.log(`✅ ${name}${detail ? ` — ${detail}` : ''}`);
}

async function waitHydrated(page, timeout = 15000) {
  await page.waitForLoadState('domcontentloaded');
  await page.locator('body').waitFor({ state: 'visible', timeout });
  await page.waitForFunction(() => {
    const text = document.body?.innerText?.trim() || '';
    const pending = document.documentElement.classList.contains('auth-pending');
    return text.length > 20 && !pending;
  }, null, { timeout }).catch(async () => {
    const state = await page.evaluate(() => ({
      text: document.body?.innerText?.trim() || '',
      classes: document.documentElement.className,
      url: location.href
    }));
    throw new Error(`Página não hidratou: ${JSON.stringify(state)}`);
  });
}

async function assertHealthy(page, label) {
  await waitHydrated(page);
  const url = new URL(page.url());
  assert.equal(url.origin, new URL(baseUrl).origin, `${label}: saiu do domínio esperado`);
  assert.ok(!/login\.html/.test(url.pathname), `${label}: redirecionou usuário autorizado ao login`);
  const text = (await page.locator('body').innerText()).trim();
  assert.doesNotMatch(text, /internal server error|application error|erro 500/i, `${label}: erro fatal visível`);
  record(`Página saudável: ${label}`, url.pathname + url.search);
}

async function waitForDialogSave(page, dialogSelector, toastSelector, timeout = 25000) {
  const dialog = page.locator(dialogSelector);
  const toast = page.locator(toastSelector);
  await page.waitForFunction(({ dialogSelector, toastSelector }) => {
    const dialog = document.querySelector(dialogSelector);
    const toast = document.querySelector(toastSelector);
    const closed = !dialog || !dialog.open;
    const visibleToast = toast && !toast.hidden && (toast.textContent || '').trim().length > 0;
    return closed || visibleToast;
  }, { dialogSelector, toastSelector }, { timeout });

  if (await dialog.evaluate(node => Boolean(node.open)).catch(() => false)) {
    const message = ((await toast.textContent().catch(() => '')) || '').trim();
    throw new Error(`Falha reportada pela interface ao salvar: ${message || 'mensagem não informada'}`);
  }
}

async function waitForSongSave(page, timeout = 30000) {
  const status = page.locator('#status');
  await page.waitForFunction(() => {
    const status = document.querySelector('#status');
    if (!status) return false;
    const message = (status.textContent || '').trim();
    return status.classList.contains('success') || status.classList.contains('error') || /consultar\.html/.test(location.pathname);
  }, null, { timeout });

  if (/consultar\.html/.test(new URL(page.url()).pathname)) return;

  const message = ((await status.textContent().catch(() => '')) || '').trim();
  const isError = await status.evaluate(node => node.classList.contains('error')).catch(() => false);
  if (isError) throw new Error(`Falha reportada pela interface ao salvar música: ${message || 'mensagem não informada'}`);

  assert.ok(await status.evaluate(node => node.classList.contains('success')).catch(() => false), `salvamento da música não confirmou sucesso: ${message || 'sem mensagem'}`);
}

async function cleanupByField(db, collection, field, value) {
  const snap = await db.collection(collection).where(field, '==', value).get().catch(() => null);
  if (snap) await Promise.allSettled(snap.docs.map(doc => doc.ref.delete()));
}

(async () => {
  admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId });
  const auth = admin.auth();
  const db = admin.firestore();
  let uid;
  let browser;
  let context;
  let page;

  try {
    const user = await auth.createUser({ email, password, displayName: 'E2E Sistema Completo' });
    uid = user.uid;
    await db.collection('users').doc(uid).set({
      uid, name: 'E2E Sistema Completo', email, active: true, role: 'SUPER_ADMIN',
      lgpdConsentVersion: 'terms:2026-08-25|privacy:2026-08-25',
      lgpdTermsVersion: '2026-08-25', lgpdPrivacyVersion: '2026-08-25',
      createdAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    record('Fixture SUPER_ADMIN criada');

    browser = await chromium.launch({ headless: true });
    context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
    page = await context.newPage();

    page.on('pageerror', error => summary.browserErrors.push(error.message));
    page.on('response', response => {
      if (response.status() >= 500 && response.url().startsWith(baseUrl)) summary.failedResponses.push({ status: response.status(), url: response.url() });
    });

    await page.goto(`${baseUrl}/login.html`, { waitUntil: 'domcontentloaded' });
    await page.getByLabel('E-mail').fill(email);
    await page.getByLabel('Senha').fill(password);
    await page.getByRole('button', { name: 'Entrar com e-mail' }).click();
    await page.waitForURL(url => !/login\.html/.test(url.pathname), { timeout: 20000 });
    await assertHealthy(page, 'login/dashboard');
    record('Autenticação real por e-mail/senha');

    const discovered = await page.locator('a[href]:visible').evaluateAll((links, origin) => {
      const routes = [];
      for (const link of links) {
        const href = link.getAttribute('href');
        if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) continue;
        try {
          const url = new URL(href, origin);
          if (url.origin === new URL(origin).origin) routes.push(url.pathname + url.search);
        } catch (_) {}
      }
      return [...new Set(routes)];
    }, baseUrl);

    const mandatory = [
      '/index.html', '/consultar.html', '/nova-musica.html', '/users.html', '/setlists.html',
      '/module.html?section=events', '/module.html?section=schedules',
      '/module.html?section=unavailability', '/module.html?section=permissions'
    ];
    const routes = [...new Set([...mandatory, ...discovered])]
      .filter(route => !/login\.html|termos\.html|privacidade\.html|consentimento\.html/.test(route));

    for (const route of routes) {
      await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded' });
      await assertHealthy(page, route);
    }
    record('Crawl da navegação administrativa', `${routes.length} rotas`);

    await page.goto(`${baseUrl}/nova-musica.html`, { waitUntil: 'domcontentloaded' });
    await waitHydrated(page);
    await page.locator('#titulo').fill(songTitle);
    await page.locator('#artista').fill('Playwright E2E');
    await page.locator('#tom').fill('C');
    await page.locator('#tema').fill('Teste automatizado');
    await page.locator('#cifra').fill('Intro: C G\nEstrofe: C Am F G');
    await page.locator('#letra').fill('Conteúdo temporário de teste automatizado.');
    await page.locator('#observacoes').fill(`E2E ${runId}`);
    await page.locator('#save-btn').click();
    await waitForSongSave(page);

    if (!/consultar\.html/.test(new URL(page.url()).pathname)) {
      await page.goto(`${baseUrl}/consultar.html`, { waitUntil: 'domcontentloaded' });
    }
    await waitHydrated(page);
    await page.locator('#songs-loading').waitFor({ state: 'hidden', timeout: 20000 });
    await page.locator('#song-search').fill(songTitle);
    await page.waitForTimeout(700);
    const songRow = page.locator('.song-row').filter({ hasText: songTitle }).first();
    await songRow.waitFor({ state: 'visible', timeout: 15000 });
    await songRow.click();
    await page.locator('#song-detail').waitFor({ state: 'visible', timeout: 10000 });
    assert.equal(((await page.locator('#song-detail-title').textContent()) || '').trim(), songTitle);
    record('Música: cadastrar → consultar → abrir detalhe');

    await page.goto(`${baseUrl}/module.html?section=events`, { waitUntil: 'domcontentloaded' });
    await waitHydrated(page);
    await page.locator('#events-loading').waitFor({ state: 'hidden', timeout: 20000 });
    await page.locator('#new-event').click();
    await page.locator('#event-name').fill(eventName);
    await page.locator('#event-date').fill(futureDate);
    await page.locator('#event-time').fill('19:30');
    await page.locator('#event-location').fill('E2E Playwright');
    await page.locator('#event-theme').fill('Validação automática');
    await page.locator('#event-description').fill('Evento temporário do teste E2E completo.');
    await page.locator('#event-submit').click();
    await waitForDialogSave(page, '#event-dialog', '#events-toast');
    await page.locator('#events-loading').waitFor({ state: 'hidden', timeout: 20000 });
    await page.locator('#events-search').fill(eventName);
    await page.waitForFunction(expected => {
      const list = document.querySelector('#events-list');
      return Boolean(list && (list.textContent || '').includes(expected));
    }, eventName, { timeout: 15000 });
    record('Evento: cadastrar → consultar');

    await page.goto(`${baseUrl}/module.html?section=unavailability`, { waitUntil: 'domcontentloaded' });
    await waitHydrated(page);
    await page.locator('#unavailability-loading').waitFor({ state: 'hidden', timeout: 20000 }).catch(() => {});
    await page.locator('#new-unavailability').click();
    await page.locator('#unavailability-date').fill(futureDate);
    await page.locator('#unavailability-period').selectOption('EVENING');
    await page.locator('#unavailability-note').fill(`E2E ${runId}`);
    await page.locator('#unavailability-submit').click();
    await page.locator('#unavailability-dialog').waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(700);
    assert.ok((await page.locator('#unavailability-list').innerText()).trim().length > 0, 'indisponibilidade não apareceu na lista');
    record('Indisponibilidade: cadastrar → visualizar');

    await page.setViewportSize({ width: 390, height: 844 });
    for (const route of ['/index.html', '/consultar.html', '/nova-musica.html', '/setlists.html', '/module.html?section=unavailability']) {
      await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded' });
      await waitHydrated(page);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.ok(overflow <= 2, `${route}: overflow horizontal de ${overflow}px`);
    }
    record('Responsividade mobile', '390x844 sem overflow horizontal nas rotas críticas');

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${baseUrl}/index.html`, { waitUntil: 'domcontentloaded' });
    await waitHydrated(page);
    const logout = page.getByRole('button', { name: /^sair$/i }).or(page.getByRole('link', { name: /^sair$/i })).first();
    assert.ok(await logout.count(), 'controle Sair não encontrado');
    await logout.click();
    await page.waitForURL(/login\.html/, { timeout: 10000 });
    record('Logout');

    assert.deepEqual(summary.browserErrors, [], `erros JavaScript: ${summary.browserErrors.join(' | ')}`);
    assert.deepEqual(summary.failedResponses, [], `HTTP 5xx: ${JSON.stringify(summary.failedResponses)}`);
    record('Nenhum pageerror ou HTTP 5xx');
  } catch (error) {
    summary.failure = { message: error.message, stack: error.stack };
    if (page) await page.screenshot({ path: path.join(artifactsDir, 'failure.png'), fullPage: true }).catch(() => {});
    throw error;
  } finally {
    summary.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(artifactsDir, 'summary.json'), JSON.stringify(summary, null, 2));
    if (context) await context.tracing.stop({ path: path.join(artifactsDir, 'trace.zip') }).catch(() => {});
    if (browser) await browser.close().catch(() => {});
    await Promise.allSettled([
      cleanupByField(db, 'songs', 'title', songTitle), cleanupByField(db, 'songs', 'titulo', songTitle),
      cleanupByField(db, 'musicas', 'titulo', songTitle), cleanupByField(db, 'events', 'name', eventName),
      cleanupByField(db, 'events', 'title', eventName), uid ? cleanupByField(db, 'unavailability', 'userId', uid) : Promise.resolve(),
      uid ? cleanupByField(db, 'indisponibilidades', 'userId', uid) : Promise.resolve()
    ]);
    if (uid) await Promise.allSettled([db.collection('users').doc(uid).delete(), auth.deleteUser(uid)]);
  }
})().catch(error => {
  console.error('❌ Full-system E2E falhou:', error);
  process.exitCode = 1;
});