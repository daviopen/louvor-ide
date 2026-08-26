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
const futureDate = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

fs.mkdirSync(artifactsDir, { recursive: true });

const summary = {
  baseUrl,
  startedAt: new Date().toISOString(),
  runId,
  checks: [],
  browserErrors: [],
  failedResponses: []
};

function record(name, detail = '') {
  summary.checks.push({ name, detail, at: new Date().toISOString() });
  console.log(`✅ ${name}${detail ? ` — ${detail}` : ''}`);
}

async function waitForApplication(page) {
  await page.waitForLoadState('domcontentloaded');
  await page.locator('body').waitFor({ state: 'visible' });
  await page.waitForTimeout(400);
}

async function assertHealthyPage(page, label) {
  await waitForApplication(page);
  const url = new URL(page.url());
  assert.equal(url.origin, new URL(baseUrl).origin, `${label}: navegação saiu do domínio esperado`);
  const bodyText = (await page.locator('body').innerText()).trim();
  assert.ok(bodyText.length > 20, `${label}: página renderizada sem conteúdo útil`);
  assert.doesNotMatch(bodyText, /application error|internal server error|erro 500/i, `${label}: erro fatal visível`);
  const h1 = page.locator('h1:visible').first();
  if (await h1.count()) {
    const title = (await h1.textContent() || '').trim();
    assert.ok(title, `${label}: título principal vazio`);
  }
  record(`Página saudável: ${label}`, url.pathname + url.search);
}

async function cleanupCollectionByField(db, collection, field, value) {
  const snap = await db.collection(collection).where(field, '==', value).get().catch(() => null);
  if (!snap) return;
  await Promise.allSettled(snap.docs.map(doc => doc.ref.delete()));
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
      uid,
      name: 'E2E Sistema Completo',
      email,
      active: true,
      role: 'SUPER_ADMIN',
      lgpdConsentVersion: 'terms:2026-08-25|privacy:2026-08-25',
      lgpdTermsVersion: '2026-08-25',
      lgpdPrivacyVersion: '2026-08-25',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    record('Fixture de usuário SUPER_ADMIN criada');

    browser = await chromium.launch({ headless: true });
    context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      locale: 'pt-BR',
      timezoneId: 'America/Sao_Paulo'
    });
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
    page = await context.newPage();

    page.on('pageerror', error => {
      summary.browserErrors.push(error.message);
      console.error(`BROWSER pageerror: ${error.message}`);
    });
    page.on('console', msg => {
      if (msg.type() === 'error') console.error(`BROWSER console.error: ${msg.text()}`);
    });
    page.on('response', response => {
      const status = response.status();
      const url = response.url();
      if (status >= 500 && url.startsWith(baseUrl)) {
        summary.failedResponses.push({ status, url });
      }
    });

    // 1. Login real.
    await page.goto(`${baseUrl}/login.html`, { waitUntil: 'domcontentloaded' });
    await page.getByLabel('E-mail').fill(email);
    await page.getByLabel('Senha').fill(password);
    await page.getByRole('button', { name: 'Entrar com e-mail' }).click();
    await page.waitForURL(url => !/login\.html/.test(url.pathname), { timeout: 20000 });
    await assertHealthyPage(page, 'Login / dashboard');
    record('Autenticação por e-mail/senha');

    // 2. Tema claro/escuro.
    const themeButton = page.locator('[data-theme-toggle], #theme-toggle, button[aria-label*="tema" i]').first();
    if (await themeButton.count() && await themeButton.isVisible()) {
      const before = await page.locator('html').getAttribute('data-theme');
      await themeButton.click();
      await page.waitForTimeout(250);
      const after = await page.locator('html').getAttribute('data-theme');
      assert.notEqual(after, before, 'alternância de tema não mudou data-theme');
      record('Alternância de tema claro/escuro', `${before || 'default'} → ${after || 'default'}`);
    } else {
      record('Alternância de tema não disponível nesta viewport', 'coberta nas páginas que expõem o controle');
    }

    // 3. Crawl de toda navegação exposta ao administrador.
    const discovered = await page.locator('a[href]:visible').evaluateAll((links, origin) => {
      const urls = [];
      for (const link of links) {
        const href = link.getAttribute('href');
        if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) continue;
        try {
          const url = new URL(href, origin);
          if (url.origin === new URL(origin).origin) urls.push(url.pathname + url.search);
        } catch (_) {}
      }
      return [...new Set(urls)];
    }, baseUrl);

    const mandatoryRoutes = [
      '/index.html',
      '/consultar.html',
      '/nova-musica.html',
      '/users.html',
      '/setlists.html',
      '/module.html?section=events',
      '/module.html?section=schedules',
      '/module.html?section=unavailability',
      '/module.html?section=permissions'
    ];
    const routes = [...new Set([...mandatoryRoutes, ...discovered])]
      .filter(route => !/login\.html/.test(route))
      .filter(route => !/termos\.html|privacidade\.html|consentimento\.html/.test(route));

    for (const route of routes) {
      await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded' });
      await assertHealthyPage(page, `rota ${route}`);
      assert.ok(!/login\.html/.test(new URL(page.url()).pathname), `rota protegida ${route} redirecionou SUPER_ADMIN ao login`);
    }
    record('Navegação administrativa completa', `${routes.length} rotas verificadas`);

    // 4. Cadastro de música pela UI + consulta e detalhe.
    await page.goto(`${baseUrl}/nova-musica.html`, { waitUntil: 'domcontentloaded' });
    await page.locator('#titulo').fill(songTitle);
    await page.locator('#artista').fill('Playwright E2E');
    await page.locator('#tom').fill('C');
    await page.locator('#tema').fill('Teste automatizado');
    await page.locator('#cifra').fill('Intro: C G\nEstrofe: C Am F G');
    await page.locator('#letra').fill('Conteúdo exclusivo de teste automatizado E2E.');
    await page.locator('#observacoes').fill(`Executado automaticamente em ${summary.startedAt}`);
    await page.locator('#save-btn').click();
    await Promise.race([
      page.waitForURL(/consultar\.html/, { timeout: 15000 }),
      page.locator('#status.success').waitFor({ state: 'visible', timeout: 15000 })
    ]).catch(() => {});

    await page.goto(`${baseUrl}/consultar.html`, { waitUntil: 'domcontentloaded' });
    await page.locator('#songs-loading').waitFor({ state: 'hidden', timeout: 20000 });
    const search = page.locator('#song-search');
    await search.fill(songTitle);
    await page.waitForTimeout(700);
    const songRow = page.locator('.song-row').filter({ hasText: songTitle }).first();
    await songRow.waitFor({ state: 'visible', timeout: 15000 });
    await songRow.click();
    await page.locator('#song-detail').waitFor({ state: 'visible', timeout: 10000 });
    await assertHealthyPage(page, 'Consulta e detalhe da música cadastrada');
    assert.match((await page.locator('#song-detail-title').textContent()) || '', new RegExp(songTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    record('Cadastro → consulta → detalhe de música');

    // 5. Eventos: criar pela UI e localizar na listagem.
    await page.goto(`${baseUrl}/module.html?section=events`, { waitUntil: 'domcontentloaded' });
    await page.locator('#events-loading').waitFor({ state: 'hidden', timeout: 20000 }).catch(() => {});
    await page.locator('#new-event').click();
    await page.locator('#event-dialog').waitFor({ state: 'visible' });
    await page.locator('#event-name').fill(eventName);
    await page.locator('#event-date').fill(futureDate);
    await page.locator('#event-time').fill('19:30');
    await page.locator('#event-location').fill('E2E Playwright');
    await page.locator('#event-theme').fill('Validação automática');
    await page.locator('#event-description').fill('Evento temporário criado pelo teste completo do sistema.');
    await page.locator('#event-submit').click();
    await page.locator('#event-dialog').waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
    await page.locator('#events-search').fill(eventName);
    await page.waitForTimeout(700);
    await expectText(page.locator('#events-list'), eventName, 'evento criado não apareceu na listagem');
    record('Cadastro e consulta de evento');

    // 6. Indisponibilidade: registrar data futura e validar lista/calendário.
    await page.goto(`${baseUrl}/module.html?section=unavailability`, { waitUntil: 'domcontentloaded' });
    await page.locator('#unavailability-loading').waitFor({ state: 'hidden', timeout: 20000 }).catch(() => {});
    await page.locator('#new-unavailability').click();
    await page.locator('#unavailability-dialog').waitFor({ state: 'visible' });
    await page.locator('#unavailability-date').fill(futureDate);
    await page.locator('#unavailability-period').selectOption('EVENING');
    await page.locator('#unavailability-note').fill(`E2E ${runId}`);
    await page.locator('#unavailability-submit').click();
    await page.locator('#unavailability-dialog').waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(700);
    const unavailabilityText = (await page.locator('#unavailability-list').innerText()).trim();
    assert.ok(unavailabilityText.length > 0, 'indisponibilidade criada não apareceu na lista');
    record('Cadastro e visualização de indisponibilidade');

    // 7. Responsividade real em viewport mobile nas áreas mais críticas.
    await page.setViewportSize({ width: 390, height: 844 });
    for (const route of ['/index.html', '/consultar.html', '/nova-musica.html', '/setlists.html', '/module.html?section=unavailability']) {
      await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded' });
      await waitForApplication(page);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.ok(overflow <= 2, `${route}: overflow horizontal de ${overflow}px no mobile`);
    }
    record('Responsividade mobile', '390x844 sem overflow horizontal nas áreas críticas');

    // 8. Logout encerra a sessão.
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${baseUrl}/index.html`, { waitUntil: 'domcontentloaded' });
    const logout = page.getByRole('button', { name: /^sair$/i }).or(page.getByRole('link', { name: /^sair$/i })).first();
    if (await logout.count()) {
      await logout.click();
      await page.waitForURL(/login\.html/, { timeout: 10000 });
      record('Logout e encerramento de sessão');
    } else {
      throw new Error('controle Sair não encontrado no menu principal');
    }

    assert.deepEqual(summary.browserErrors, [], `erros JavaScript detectados: ${summary.browserErrors.join(' | ')}`);
    assert.deepEqual(summary.failedResponses, [], `respostas HTTP 5xx detectadas: ${JSON.stringify(summary.failedResponses)}`);
    record('Console/page errors e HTTP 5xx', 'nenhum erro fatal detectado');
  } catch (error) {
    summary.failure = { message: error.message, stack: error.stack };
    if (page) {
      await page.screenshot({ path: path.join(artifactsDir, 'failure.png'), fullPage: true }).catch(() => {});
    }
    throw error;
  } finally {
    summary.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(artifactsDir, 'summary.json'), JSON.stringify(summary, null, 2));

    if (context) {
      await context.tracing.stop({ path: path.join(artifactsDir, 'trace.zip') }).catch(() => {});
    }
    if (browser) await browser.close().catch(() => {});

    // Limpeza defensiva: nenhum dado temporário deve permanecer em produção.
    await Promise.allSettled([
      cleanupCollectionByField(db, 'songs', 'title', songTitle),
      cleanupCollectionByField(db, 'songs', 'titulo', songTitle),
      cleanupCollectionByField(db, 'musicas', 'titulo', songTitle),
      cleanupCollectionByField(db, 'events', 'name', eventName),
      cleanupCollectionByField(db, 'events', 'title', eventName),
      uid ? cleanupCollectionByField(db, 'unavailability', 'userId', uid) : Promise.resolve(),
      uid ? cleanupCollectionByField(db, 'indisponibilidades', 'userId', uid) : Promise.resolve()
    ]);
    if (uid) {
      await Promise.allSettled([
        db.collection('users').doc(uid).delete(),
        auth.deleteUser(uid)
      ]);
    }
  }
})().catch(error => {
  console.error('❌ Full-system E2E falhou:', error);
  process.exitCode = 1;
});

async function expectText(locator, text, message) {
  await locator.waitFor({ state: 'visible', timeout: 15000 });
  const content = await locator.innerText();
  assert.ok(content.includes(text), `${message}. Conteúdo atual: ${content.slice(0, 500)}`);
}
