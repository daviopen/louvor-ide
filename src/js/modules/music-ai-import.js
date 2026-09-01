import MusicAIService from '../../services/music-ai-service.js';

let importMetadata = null;

export function getMusicAIImportMetadata() {
  return importMetadata ? { ...importMetadata } : null;
}

function injectStyles() {
  if (document.getElementById('music-ai-import-styles')) return;
  const style = document.createElement('style');
  style.id = 'music-ai-import-styles';
  style.textContent = `
    .ai-import { margin-bottom: var(--ide-space-5); padding: var(--ide-space-5); border: 1px solid var(--ide-border); border-radius: var(--ide-radius-xl); background: var(--ide-surface-secondary); }
    .ai-import__top { display:flex; align-items:flex-start; justify-content:space-between; gap:var(--ide-space-4); }
    .ai-import__top h2 { margin:0; color:var(--ide-text-primary); font-size:var(--ide-font-size-lg); }
    .ai-import__top p { margin:6px 0 0; color:var(--ide-text-secondary); font-size:var(--ide-font-size-sm); line-height:1.5; }
    .ai-import__toggle { flex:none; min-height:44px; padding:10px 16px; border:1px solid var(--ide-border-strong); border-radius:999px; background:var(--ide-surface); color:var(--ide-text-primary); font:inherit; font-weight:700; cursor:pointer; }
    .ai-import__body { display:none; margin-top:var(--ide-space-5); }
    .ai-import__body.open { display:block; }
    .ai-import__grid { display:grid; grid-template-columns:1fr 1fr; gap:var(--ide-space-4); }
    .ai-import__field { display:flex; flex-direction:column; gap:7px; }
    .ai-import__field.full { grid-column:1/-1; }
    .ai-import__field label { color:var(--ide-text-primary); font-size:var(--ide-font-size-sm); font-weight:700; }
    .ai-import__field input,.ai-import__field textarea { width:100%; min-height:46px; padding:12px 13px; border:1px solid var(--ide-border-strong); border-radius:var(--ide-radius-md); background:var(--ide-surface); color:var(--ide-text-primary); font:inherit; }
    .ai-import__field textarea { min-height:150px; resize:vertical; font-family:var(--ide-font-family-mono); }
    .ai-import__hint,.ai-import__state { color:var(--ide-text-secondary); font-size:var(--ide-font-size-xs); line-height:1.5; }
    .ai-import__actions { display:flex; align-items:center; gap:var(--ide-space-3); margin-top:var(--ide-space-4); flex-wrap:wrap; }
    .ai-import__analyze { min-height:44px; padding:10px 18px; border:1px solid var(--ide-primary); border-radius:999px; background:var(--ide-primary); color:var(--ide-primary-ink); font:inherit; font-weight:800; cursor:pointer; }
    .ai-import__analyze:disabled { opacity:.6; cursor:wait; }
    .ai-import__review { margin-top:var(--ide-space-4); padding:12px 14px; border-left:4px solid var(--ide-primary); border-radius:var(--ide-radius-md); background:var(--ide-surface); color:var(--ide-text-primary); font-size:var(--ide-font-size-sm); line-height:1.5; }
    @media (max-width:700px){.ai-import__top{flex-direction:column}.ai-import__toggle{width:100%}.ai-import__grid{grid-template-columns:1fr}.ai-import__field.full{grid-column:auto}.ai-import__analyze{width:100%}}
  `;
  document.head.appendChild(style);
}

function setValue(id, value) {
  if (value === null || value === undefined || value === '') return false;
  const element = document.getElementById(id);
  if (!element) return false;
  element.value = String(value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
}

function composeChordSheet(data) {
  if (data.chordSheet) return data.chordSheet;
  if (!data.sections?.length) return '';
  return data.sections.map(section => `${section.label || section.type}:\n${section.content || ''}`.trim()).filter(Boolean).join('\n\n');
}

function applySuggestion(result) {
  const { data, provider, input } = result;
  const applied = [];
  if (setValue('titulo', data.title)) applied.push('nome');
  if (setValue('artista', data.artist)) applied.push('artista');
  if (setValue('tom', data.originalKey)) applied.push('tom original');
  if (setValue('cifra', composeChordSheet(data))) applied.push('cifra');
  if (setValue('letra', data.lyrics)) applied.push('letra');
  if (setValue('link', data.video?.url || input.sourceUrl || input.youtubeUrl)) applied.push('link');

  importMetadata = {
    importMethod: 'ai-assisted',
    originalKey: data.originalKey || null,
    bpm: data.bpm || input.manualBpm || null,
    bpmSource: input.manualBpm ? 'manual' : (data.bpmSource || null),
    timeSignature: data.timeSignature || null,
    sourceUrl: input.sourceUrl || null,
    sourceProvider: provider.provider,
    sourceType: input.sourceUrl ? 'url' : 'pasted-text',
    importedAt: new Date().toISOString(),
    aiProvider: provider.provider,
    aiModel: provider.model,
    aiSchemaVersion: data.schemaVersion,
    video: data.video || (input.youtubeUrl ? { provider: 'youtube', url: input.youtubeUrl, videoId: null } : null),
    fieldProvenance: data.provenance || {}
  };
  return applied;
}

function createPanel() {
  const panel = document.createElement('section');
  panel.className = 'ai-import';
  panel.setAttribute('aria-labelledby', 'ai-import-title');
  panel.innerHTML = `
    <div class="ai-import__top">
      <div><h2 id="ai-import-title">Importar com IA</h2><p>Cole uma cifra/texto ou tente uma URL. A IA apenas sugere o preenchimento: nada é salvo sem sua revisão e confirmação.</p></div>
      <button type="button" class="ai-import__toggle" aria-expanded="false" aria-controls="ai-import-body"><i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i> Importar com IA</button>
    </div>
    <div class="ai-import__body" id="ai-import-body">
      <div class="ai-import__grid">
        <div class="ai-import__field full"><label for="ai-pasted-text">Cifra ou texto para análise</label><textarea id="ai-pasted-text" placeholder="Cole aqui a cifra, letra ou informações da música..."></textarea><span class="ai-import__hint">É o fallback recomendado quando uma URL não puder ser processada.</span></div>
        <div class="ai-import__field"><label for="ai-source-url">URL de cifra/referência</label><input id="ai-source-url" type="url" placeholder="https://..."><span class="ai-import__hint">A tentativa depende de a página ser pública e permitir acesso. Não há scraping para contornar bloqueios.</span></div>
        <div class="ai-import__field"><label for="ai-youtube-url">YouTube de referência</label><input id="ai-youtube-url" type="url" placeholder="https://youtube.com/watch?v=..."></div>
        <div class="ai-import__field"><label for="ai-manual-bpm">BPM (opcional)</label><input id="ai-manual-bpm" type="number" min="30" max="260" step="1" inputmode="numeric" placeholder="Ex.: 72"></div>
      </div>
      <div class="ai-import__actions"><button type="button" class="ai-import__analyze"><i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i> Analisar e preencher</button><span class="ai-import__state" role="status" aria-live="polite">Você poderá editar todos os campos antes de salvar.</span></div>
      <div class="ai-import__review" hidden></div>
    </div>`;
  return panel;
}

export function mountMusicAIImport({ service = new MusicAIService() } = {}) {
  const form = document.getElementById('song-form');
  const firstPanel = form?.querySelector('.panel');
  if (!form || !firstPanel || document.querySelector('.ai-import')) return;
  injectStyles();
  const panel = createPanel();
  firstPanel.insertBefore(panel, firstPanel.firstChild);

  const toggle = panel.querySelector('.ai-import__toggle');
  const body = panel.querySelector('.ai-import__body');
  const analyze = panel.querySelector('.ai-import__analyze');
  const state = panel.querySelector('.ai-import__state');
  const review = panel.querySelector('.ai-import__review');

  toggle.addEventListener('click', () => {
    const open = !body.classList.contains('open');
    body.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    if (open) panel.querySelector('#ai-pasted-text')?.focus();
  });

  analyze.addEventListener('click', async () => {
    const user = window.firebase?.auth?.().currentUser;
    if (!user?.uid) {
      state.textContent = 'Sua sessão expirou. Entre novamente para usar a importação com IA.';
      return;
    }

    analyze.disabled = true;
    state.textContent = 'Analisando...';
    review.hidden = true;
    try {
      const result = await service.analyze({
        pastedText: panel.querySelector('#ai-pasted-text').value,
        sourceUrl: panel.querySelector('#ai-source-url').value,
        youtubeUrl: panel.querySelector('#ai-youtube-url').value,
        manualBpm: panel.querySelector('#ai-manual-bpm').value
      });
      const applied = applySuggestion(result);
      state.textContent = 'Sugestão aplicada ao formulário. Revise os dados antes de salvar.';
      review.hidden = false;
      review.textContent = applied.length
        ? `Campos sugeridos: ${applied.join(', ')}. Campos sem evidência permaneceram vazios.`
        : 'A IA não encontrou dados suficientes para preencher o formulário. Continue manualmente.';
    } catch (error) {
      console.warn('Importação assistida indisponível:', error?.code || error?.message || error);
      state.textContent = `${error?.message || 'A IA está indisponível no momento.'} Você pode continuar normalmente pelo cadastro manual.`;
      review.hidden = false;
      review.textContent = 'Nenhum conteúdo foi salvo. O formulário manual continua disponível.';
    } finally {
      analyze.disabled = false;
    }
  });
}
