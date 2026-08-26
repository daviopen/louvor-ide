const { chromium } = require('playwright');
const assert = require('node:assert/strict');

const baseUrl = process.env.E2E_BASE_URL || 'https://louvor-ide.web.app';

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of [
      { name: 'desktop', width: 1440, height: 900 },
      { name: 'mobile', width: 390, height: 844 }
    ]) {
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
      const page = await context.newPage();
      const response = await page.goto(`${baseUrl}/login.html`, { waitUntil: 'networkidle' });
      assert.equal(response?.status(), 200, `${viewport.name}: login deve responder 200`);

      await page.getByRole('heading', { name: 'Bem-vindo' }).waitFor();
      assert.equal(await page.getByLabel('E-mail').count(), 1, `${viewport.name}: e-mail precisa de label acessível`);
      assert.equal(await page.getByLabel('Senha').count(), 1, `${viewport.name}: senha precisa de label acessível`);
      assert.equal(await page.getByRole('button', { name: 'Continuar com Google' }).count(), 1);
      assert.equal(await page.getByRole('button', { name: 'Entrar com e-mail' }).count(), 1);

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.ok(overflow <= 1, `${viewport.name}: não deve haver overflow horizontal (${overflow}px)`);

      await page.keyboard.press('Tab');
      const focusVisible = await page.evaluate(() => {
        const element = document.activeElement;
        if (!element || element === document.body) return false;
        const style = getComputedStyle(element);
        return style.outlineStyle !== 'none' || style.boxShadow !== 'none';
      });
      assert.equal(focusVisible, true, `${viewport.name}: primeiro controle navegável deve ter foco visível`);

      await context.close();
    }

    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto(`${baseUrl}/login.html`, { waitUntil: 'networkidle' });
    const transition = await page.getByRole('button', { name: 'Continuar com Google' }).evaluate(el => getComputedStyle(el).transitionDuration);
    assert.match(transition, /(^|,\s*)0s/, 'prefers-reduced-motion deve remover transição do login');
    await context.close();

    console.log('✅ Produção validada em desktop/mobile com semântica, teclado, overflow e reduced motion');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
