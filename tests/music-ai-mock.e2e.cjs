const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const baseUrl = process.env.E2E_BASE_URL || 'http://127.0.0.1:5000';
const root = path.resolve(__dirname, '..');
const harnessPath = path.join(root, 'music-ai-e2e-harness.html');
const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const songTitle = `E2E IA Mock ${suffix}`;

function harnessHtml() {
  return `<!DOCTYPE html>
<html lang="pt-BR" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Music AI E2E Harness</title>
  <link rel="stylesheet" href="/styles/tokens.css">
  <link rel="stylesheet" href="/styles/design-system.css">
  <style>
    body { margin: 0; background: var(--ide-background); color: var(--ide-text-primary); font-family: var(--ide-font-family-sans); }
    .song-page { width: min(100% - 20px, 900px); margin: 0 auto; padding: 20px 0 60px; }
    .panel { padding: 20px; border: 1px solid var(--ide-border); border-radius: var(--ide-radius-xl); background: var(--ide-surface); }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .field { display: flex; flex-direction: column; gap: 8px; }
    .field.full { grid-column: 1 / -1; }
    input, textarea { width: 100%; min-height: 44px; box-sizing: border-box; padding: 10px; color: var(--ide-text-primary); border: 1px solid var(--ide-border-strong); background: var(--ide-surface); }
    textarea { min-height: 110px; }
    .minister-list, .actions, .preview-tabs { display: flex; gap: 10px; }
    .actions { margin-top: 20px; }
    button { min-height: 44px; }
    .status { display: none; }
    .status.show { display: block; margin-bottom: 12px; }
    .preview { white-space: pre-wrap; }
    @media (max-width: 600px) { .form-grid { grid-template-columns: 1fr; } .field.full { grid-column: auto; } }
  </style>
</head>
<body>
  <main class="song-page">
    <h1 id="page-title">Nova música</h1>
    <div id="status" class="status" role="status" aria-live="polite"></div>
    <form id="song-form" novalidate>
      <section class="panel">
        <div class="form-grid">
          <div class="field full"><label for="titulo">Nome</label><input id="titulo"></div>
          <div class="field"><label for="artista">Artista</label><input id="artista"></div>
          <div class="field"><label for="tom">Tom original</label><input id="tom"></div>
          <div class="field"><label for="tema">Tema</label><input id="tema"></div>
          <div class="field"><label for="link">Link de referência</label><input id="link"></div>
          <div class="field full"><label for="cifra">Cifra</label><textarea id="cifra"></textarea></div>
          <div class="field full"><label class="required" for="letra">Letra</label><textarea id="letra"></textarea></div>
          <div class="field full"><label for="observacoes">Observações</label><textarea id="observacoes"></textarea></div>
          <div class="field full"><label>Ministros</label><div id="minister-list" class="minister-list"></div></div>
        </div>
        <div class="actions">
          <button type="button" id="cancel-btn">Cancelar</button>
          <button type="submit" id="save-btn">Salvar música</button>
        </div>
      </section>
      <aside class="panel">
        <div class="preview-tabs">
          <button type="button" class="active" data-preview="cifra">Cifra</button>
          <button type="button" data-preview="letra">Letra</button>
        </div>
        <div id="preview" class="preview"></div>
      </aside>
    </form>
  </main>
  <script>
    (() => {
      const state = window.__E2E_DB_STATE__ = { songs: [], audits: [], ministerKeys: [] };
      let sequence = 0;
      const snapshot = docs => ({ docs });
      const emptyCollection = () => ({ get: async () => snapshot([]) });
      const collection = name => {
        if (name === 'ministryFunctions' || name === 'users' || name === 'userFunctions') return emptyCollection();
        if (name === 'songs') {
          return {
            add: async data => {
              const id = 'song-' + (++sequence);
              state.songs.push({ id, data: structuredClone(data) });
              return { id };
            },
            doc: id => ({
              get: async () => {
                const found = state.songs.find(item => item.id === id);
                return { id, exists: Boolean(found), data: () => found?.data || null };
              },
              update: async data => {
                const found = state.songs.find(item => item.id === id);
                if (found) found.data = { ...found.data, ...structuredClone(data) };
              },
              delete: async () => { state.songs = state.songs.filter(item => item.id !== id); }
            }),
            get: async () => snapshot(state.songs.map(item => ({ id: item.id, data: () => item.data })))
          };
        }
        if (name === 'songMinisterKeys') {
          return {
            where: () => ({ get: async () => snapshot([]) }),
            doc: id => ({ id })
          };
        }
        if (name === 'auditLogs') {
          return {
            add: async data => {
              const id = 'audit-' + (++sequence);
              state.audits.push({ id, data: structuredClone(data) });
              return { id };
            }
          };
        }
        throw new Error('Coleção E2E não suportada: ' + name);
      };

      window.db = {
        collection,
        batch: () => ({
          delete() {},
          set(ref, data) { state.ministerKeys.push({ id: ref.id, data: structuredClone(data) }); },
          async commit() {}
        })
      };
      window.firebase = { auth: () => ({ currentUser: { uid: 'e2e-user' } }) };
      window.currentMusicIdeProfile = { active: true, role: 'SUPER_ADMIN', permissions: { songs: 'EDIT' } };
      window.MusicIdeNavigationState = { resolveReturnUrl: () => '#saved' };
      window.__MUSIC_AI_PROVIDER__ = {
        getInfo() { return { provider: 'mock', model: 'mock-music-ai-e2e' }; },
        async analyze(input) {
          if (!input?.pastedText) throw new Error('mock exige texto');
          return {
            schemaVersion: '1.0.0',
            title: ${JSON.stringify(songTitle)},
            artist: 'Artista E2E',
            originalKey: 'G',
            chordSheet: 'Intro:  G  C\\n\\nEstrofe:\\nG  C  Em  D',
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
    })();
  </script>
  <script type="module" src="/js/pages/song-form.js"></script>
</body>
</html>`;
}

(async () => {
  fs.writeFileSync(harnessPath, harnessHtml(), 'utf8');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('console', msg => console.log(`BROWSER ${msg.type()}: ${msg.text()}`));
  page.on('pageerror', error => console.log(`BROWSER pageerror: ${error.message}`));

  try {
    await page.goto(`${baseUrl}/music-ai-e2e-harness.html`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('tab', { name: 'Importar com IA' }).waitFor({ state: 'visible', timeout: 10000 });
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

    const beforeSave = await page.evaluate(() => ({
      songCount: window.__E2E_DB_STATE__.songs.length,
      auditActions: window.__E2E_DB_STATE__.audits.map(item => item.data.action)
    }));
    assert.equal(beforeSave.songCount, 0, 'análise da IA não pode persistir música automaticamente');
    assert.ok(beforeSave.auditActions.includes('SONG_AI_IMPORT_SUCCEEDED'), 'análise assistida deve ser auditada');

    await page.getByRole('button', { name: 'Salvar música' }).click();
    await page.locator('#status').filter({ hasText: 'Música criada com sucesso' }).waitFor({ state: 'visible', timeout: 10000 });

    const afterSave = await page.evaluate(() => ({
      songs: window.__E2E_DB_STATE__.songs,
      auditActions: window.__E2E_DB_STATE__.audits.map(item => item.data.action),
      width: { viewport: innerWidth, document: document.documentElement.scrollWidth },
      theme: document.documentElement.dataset.theme
    }));
    assert.equal(afterSave.songs.length, 1, 'salvamento explícito deve persistir a música sugerida');
    const created = afterSave.songs[0].data;
    assert.equal(created.creationMode, 'ai_assisted');
    assert.equal(created.originalKey, 'G');
    assert.equal(created.bpm, 84);
    assert.equal(created.timeSignature, '4/4');
    assert.equal(created.aiImport?.provider, 'mock');
    assert.equal(created.aiImport?.model, 'mock-music-ai-e2e');
    assert.equal(created.sourceType, 'pasted_text');
    assert.ok(afterSave.auditActions.includes('SONG_CREATED'), 'criação final deve ser auditada');
    assert.equal(afterSave.theme, 'dark');
    assert.ok(afterSave.width.document <= afterSave.width.viewport, 'fluxo assistido não deve causar overflow horizontal no mobile');

    console.log('✅ E2E mock isolado validou IA → revisão → ausência de auto-save → persistência explícita em mobile/dark.');
  } finally {
    await browser.close();
    fs.rmSync(harnessPath, { force: true });
  }
})().catch(error => {
  fs.rmSync(harnessPath, { force: true });
  console.error(error);
  process.exitCode = 1;
});
