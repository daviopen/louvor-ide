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

    for (const asset of [
      '/js/modules/audit-auth-runtime.js',
      '/repositories/audit-repository.js',
      '/js/modules/audit-page.js',
      '/js/modules/lgpd-service.js'
    ]) {
      const assetResponse = await page.request.get(`${baseUrl}${asset}`);
      assert.equal(assetResponse.status(), 200, `${asset}: artefato de auditoria deve estar publicado`);
      const body = await assetResponse.text();
      assert.ok(body.length > 100, `${asset}: artefato publicado não pode estar vazio`);
    }

    const auditPageAsset = await page.request.get(`${baseUrl}/js/modules/audit-page.js`);
    const auditPageBody = await auditPageAsset.text();
    assert.match(auditPageBody, /Histórico somente leitura/, 'produção deve conter a tela somente leitura de auditoria');
    assert.match(auditPageBody, /audit-user-filter/, 'produção deve conter filtro por usuário');
    assert.match(auditPageBody, /audit-from-filter/, 'produção deve conter filtro por período');
    assert.match(auditPageBody, /audit-action-filter/, 'produção deve conter filtro por ação');
    assert.match(auditPageBody, /audit-entity-filter/, 'produção deve conter filtro por entidade');

    const lgpdAsset = await page.request.get(`${baseUrl}/js/modules/lgpd-service.js`);
    assert.match(await lgpdAsset.text(), /LGPD_CONSENT_ACCEPTED/, 'produção deve auditar consentimento LGPD');

    await context.close();

    console.log('✅ Produção validada em desktop/mobile, acessibilidade e artefatos do Audit Log');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
