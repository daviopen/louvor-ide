const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const admin = require('firebase-admin');
const fs = require('node:fs/promises');
const path = require('node:path');

const baseUrl = process.env.E2E_BASE_URL || 'https://louvor-ide.web.app';
const projectId = process.env.FIREBASE_PROJECT_ID || 'louvor-ide';
const artifactsDir = process.env.E2E_ARTIFACTS_DIR || 'test-results/ai-import-production';

const CASES = [
  {
    name: 'grandes-coisas',
    url: 'https://www.cifraclub.com.br/fernandinho/grandes-coisas/',
    expectedKey: 'Db'
  },
  {
    name: 'jesus-filho-de-deus',
    url: 'https://www.cifraclub.com.br/fernandinho/jesus-filho-de-deus/'
  }
];

function countHeader(text, header) {
  return (String(text || '').match(new RegExp(`^${header}:`, 'gmi')) || []).length;
}

function validateIdeMusicChordSheet(chordSheet, caseName) {
  assert.ok(chordSheet.trim(), `${caseName}: cifra não pode ficar vazia`);
  assert.doesNotMatch(chordSheet, /^\s*Capotraste\s*:/gmi, `${caseName}: cifra não pode exibir capotraste`);
  assert.doesNotMatch(chordSheet, /\s—\s/, `${caseName}: separador temporário não pode chegar ao formulário`);
  assert.match(chordSheet, /^(?:Intro|Estrofe(?: \d+)?|Pré-Refrão|Refrão|Ponte|Instrumental|Final):/m, `${caseName}: cifra precisa manter seções naturais`);

  const cueLines = chordSheet.split('\n').filter(line => /\s-\s/.test(line));
  assert.ok(cueLines.length > 0, `${caseName}: cifra precisa possuir pistas vocais curtas`);
  cueLines.forEach(line => {
    const [cue, chords] = line.split(/\s-\s/, 2);
    const words = cue.trim().split(/\s+/).filter(Boolean);
    assert.ok(words.length >= 2 && words.length <= 3, `${caseName}: pista vocal deve ter aproximadamente duas palavras`);
    assert.match(chords || '', /[A-G](?:#|b)?/, `${caseName}: pista vocal precisa estar vinculada a acordes`);
  });

  assert.ok(countHeader(chordSheet, 'Refrão') <= 1, `${caseName}: refrão repetido não deve duplicar a estrutura`);
  assert.ok(countHeader(chordSheet, 'Pré-Refrão') <= 1, `${caseName}: pré-refrão repetido não deve duplicar a estrutura`);
}

async function login(page, email, password) {
  await page.goto(`${baseUrl}/login.html`, { waitUntil: 'domcontentloaded' });
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(password);
  await page.getByRole('button', { name: 'Entrar com e-mail' }).click();
  await page.waitForURL(url => !/login\.html/.test(url.pathname), { timeout: 25000 });
}

async function analyzeCifraClub(page, testCase) {
  await page.goto(`${baseUrl}/nova-musica.html`, { waitUntil: 'domcontentloaded' });
  await page.locator('#song-form').waitFor({ state: 'visible', timeout: 20000 });
  await page.getByRole('button', { name: /Importar com IA/i }).click();

  const input = page.locator('#ai-universal-input');
  await input.waitFor({ state: 'visible' });
  assert.equal((await page.locator('label[for="ai-universal-input"]').textContent() || '').trim(), 'Link do Cifra Club');
  assert.match((await page.locator('.ai-import__hint').textContent() || ''), /Entrada esperada: link da música no Cifra Club/i);

  await input.fill(testCase.url);
  await page.getByRole('button', { name: /Analisar e preencher/i }).click();

  await page.waitForFunction(() => {
    const text = document.querySelector('.ai-import__state')?.textContent || '';
    return /Sugestão aplicada|não pôde ser concluída|indisponível|demorou mais|limite temporário|falhou/i.test(text);
  }, null, { timeout: 150000 });

  const state = (await page.locator('.ai-import__state').textContent() || '').trim();
  assert.match(state, /Sugestão aplicada/i, `${testCase.name}: IA não concluiu a análise: ${state}`);

  const result = await page.evaluate(() => ({
    title: document.querySelector('#titulo')?.value?.trim() || '',
    artist: document.querySelector('#artista')?.value?.trim() || '',
    key: document.querySelector('#tom')?.value?.trim() || '',
    theme: document.querySelector('#tema')?.value?.trim() || '',
    chordSheet: document.querySelector('#cifra')?.value?.trim() || '',
    reference: document.querySelector('#link')?.value?.trim() || '',
    lyricsLength: document.querySelector('#letra')?.value?.trim()?.length || 0
  }));

  assert.ok(result.title, `${testCase.name}: nome da música não foi preenchido`);
  assert.ok(result.artist, `${testCase.name}: artista não foi preenchido`);
  assert.ok(result.key, `${testCase.name}: tom original não foi preenchido`);
  if (testCase.expectedKey) assert.equal(result.key, testCase.expectedKey, `${testCase.name}: tom original divergente`);
  assert.ok(result.theme, `${testCase.name}: tema não foi preenchido`);
  assert.match(result.reference, /^https:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)/i, `${testCase.name}: link de referência precisa ser um vídeo do YouTube`);
  validateIdeMusicChordSheet(result.chordSheet, testCase.name);

  await page.screenshot({ path: path.join(artifactsDir, `${testCase.name}.png`), fullPage: true });
  console.log(`✅ ${testCase.name}: título/artista/tom/tema/cifra/vídeo aderentes; letra remota não é requisito do E2E (tamanho atual: ${result.lyricsLength})`);
}

(async () => {
  await fs.mkdir(artifactsDir, { recursive: true });
  admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId });
  const auth = admin.auth();
  const db = admin.firestore();
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const email = `ide-music-ai-e2e-${suffix}@example.com`;
  const password = `Aa1!${Math.random().toString(36).slice(2)}${Date.now()}`;
  const user = await auth.createUser({ email, password, displayName: 'E2E Importação IA' });
  const profileRef = db.collection('users').doc(user.uid);

  await profileRef.set({
    uid: user.uid,
    name: 'E2E Importação IA',
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
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'pt-BR' });
  const page = await context.newPage();
  page.on('console', message => {
    if (message.type() === 'error') console.log(`BROWSER error: ${message.text()}`);
  });
  page.on('pageerror', error => console.log(`BROWSER pageerror: ${error.message}`));

  try {
    await login(page, email, password);
    for (const testCase of CASES) await analyzeCifraClub(page, testCase);
  } finally {
    await browser.close();
    await Promise.allSettled([profileRef.delete(), auth.deleteUser(user.uid)]);
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
