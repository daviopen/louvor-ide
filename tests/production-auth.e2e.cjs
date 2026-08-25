const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const baseUrl = process.env.E2E_BASE_URL || 'https://louvor-ide.web.app';
const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

if (!email || !password) {
  throw new Error('E2E_EMAIL e E2E_PASSWORD são obrigatórios.');
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(`${baseUrl}/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/login\.html(?:$|[?#])/, { timeout: 15000 });
    console.log('✅ Rota protegida redirecionou uma sessão anônima para login');

    await page.getByLabel('E-mail').fill(email);
    await page.getByRole('button', { name: 'Esqueci minha senha' }).click();
    const resetMessage = page.locator('#auth-message');
    await resetMessage.waitFor({ state: 'visible', timeout: 15000 });
    const resetText = (await resetMessage.textContent()) || '';
    assert.match(resetText, /instruções|instrucoes/i);
    console.log('✅ Recuperação de senha foi acionada pela interface real');

    const googleButton = page.getByRole('button', { name: /Continuar com Google/i });
    const popupPromise = page.waitForEvent('popup', { timeout: 15000 });
    await googleButton.click();
    const popup = await popupPromise;
    await popup.close().catch(() => null);
    console.log('✅ Fluxo Google abriu o provedor em popup a partir da interface real');

    await page.bringToFront();
    await page.goto(`${baseUrl}/login.html`, { waitUntil: 'domcontentloaded' });
    await page.getByLabel('E-mail').fill(email);
    await page.getByLabel('Senha').fill(password);
    await page.getByRole('button', { name: 'Entrar com e-mail' }).click();

    await page.waitForFunction(
      () => /ainda não foi liberada pela liderança/i.test(
        document.querySelector('#auth-message')?.textContent || ''
      ),
      { timeout: 20000 }
    );

    const message = (await page.locator('#auth-message').textContent()) || '';
    assert.match(message, /ainda não foi liberada pela liderança/i);
    await page.waitForURL(/login\.html(?:$|[?#])/, { timeout: 10000 });

    await page.waitForFunction(
      () => window.firebase && window.firebase.auth().currentUser === null,
      { timeout: 10000 }
    );
    const currentUser = await page.evaluate(() => window.firebase.auth().currentUser);
    assert.equal(currentUser, null);
    console.log('✅ Conta autenticada sem perfil ativo foi bloqueada e teve a sessão encerrada');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
