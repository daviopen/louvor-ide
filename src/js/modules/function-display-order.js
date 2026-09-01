(function initFunctionDisplayOrder(scope) {
  if (!scope || !scope.document) return;

  const params = new URLSearchParams(scope.location && scope.location.search || '');
  const section = params.get('section');
  const tab = params.get('tab') || '';
  const isOrderSettingsRoute = section === 'settings' && tab === 'display-order';
  const isScheduleExportRoute = section === 'schedules-export' || (section === 'schedules' && params.get('view') === 'export');
  if (!isOrderSettingsRoute && !isScheduleExportRoute && section !== 'settings') return;

  const DEFAULT_SLUG_ORDER = Object.freeze([
    'ministro',
    'back-vocal',
    'violao',
    'teclado',
    'guitarra',
    'baixo',
    'bateria',
    'percussao',
    'sax',
    'dm'
  ]);
  const FALLBACK_RANK = new Map(DEFAULT_SLUG_ORDER.map((slug, index) => [slug, (index + 1) * 10]));
  const LABEL_ALIASES = Object.freeze({
    ministra: 'ministro', vocal: 'ministro', back: 'back-vocal', backing: 'back-vocal',
    baterista: 'bateria', baixista: 'baixo', guitarrista: 'guitarra', violonista: 'violao',
    tecladista: 'teclado', saxofone: 'sax', saxofonista: 'sax',
    'diretor-musical': 'dm', 'direcao-musical': 'dm'
  });

  const state = { functions: [], dirty: false, rendering: false };
  const esc = value => String(value == null ? '' : value).replace(/[&<>'\"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '\"': '&quot;'
  }[char]));

  function normalizeSlug(value) {
    const slug = String(value || '').trim().toLowerCase().normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return LABEL_ALIASES[slug] || slug;
  }

  function isAdmin(profile) {
    const role = String(profile?.role || '').toUpperCase();
    return profile?.isSuperAdmin === true || profile?.isAdmin === true || role === 'SUPER_ADMIN' || role === 'ADMIN';
  }

  function sortFunctions(functions) {
    return [...(functions || [])].sort((a, b) => {
      const orderA = Number.isFinite(Number(a.order)) ? Number(a.order) : 9990;
      const orderB = Number.isFinite(Number(b.order)) ? Number(b.order) : 9990;
      return orderA - orderB || String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR');
    });
  }

  async function loadFunctions() {
    if (!scope.firebase?.firestore) throw new Error('Banco de dados indisponível.');
    const snapshot = await scope.firebase.firestore().collection('ministryFunctions').get();
    return sortFunctions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  }

  function fallbackSort(functions) {
    return [...functions].sort((a, b) => {
      const slugA = normalizeSlug(a.slug || a.name);
      const slugB = normalizeSlug(b.slug || b.name);
      const rankA = FALLBACK_RANK.has(slugA) ? FALLBACK_RANK.get(slugA) : 500;
      const rankB = FALLBACK_RANK.has(slugB) ? FALLBACK_RANK.get(slugB) : 500;
      if (slugA === 'dm' && slugB !== 'dm') return 1;
      if (slugB === 'dm' && slugA !== 'dm') return -1;
      return rankA - rankB || String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR');
    });
  }

  function injectStyles() {
    if (scope.document.getElementById('function-display-order-style')) return;
    const style = scope.document.createElement('style');
    style.id = 'function-display-order-style';
    style.textContent = `
      .function-order-page{padding:clamp(1rem,3vw,2rem);max-width:980px;margin:0 auto}
      .function-order-header{margin-bottom:1.25rem}.function-order-header h1{margin:.25rem 0}.function-order-header p{margin:0;color:var(--text-secondary);max-width:760px}
      .function-order-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:clamp(1rem,2vw,1.5rem);box-shadow:var(--shadow-sm)}
      .function-order-toolbar{display:flex;justify-content:space-between;gap:.75rem;align-items:center;flex-wrap:wrap;margin-bottom:1rem}
      .function-order-toolbar p{margin:0;color:var(--text-secondary)}.function-order-actions{display:flex;gap:.6rem;flex-wrap:wrap}
      .function-order-list{display:grid;gap:.55rem}.function-order-row{display:grid;grid-template-columns:42px 1fr auto;gap:.75rem;align-items:center;padding:.8rem .9rem;border:1px solid var(--border);border-radius:var(--radius-md);background:var(--surface-secondary)}
      .function-order-position{width:2rem;height:2rem;display:grid;place-items:center;border-radius:999px;background:var(--surface);font-weight:800}
      .function-order-main strong,.function-order-main small{display:block}.function-order-main small{margin-top:.15rem;color:var(--text-secondary)}
      .function-order-controls{display:flex;gap:.4rem;align-items:center}.function-order-note{margin-top:1rem;padding:.85rem 1rem;border-radius:var(--radius-md);background:var(--surface-secondary);color:var(--text-secondary)}
      .function-order-savebar{display:flex;justify-content:flex-end;gap:.6rem;margin-top:1rem;flex-wrap:wrap}
      @media(max-width:640px){.function-order-row{grid-template-columns:36px 1fr}.function-order-controls{grid-column:2;justify-content:flex-start}.function-order-actions,.function-order-savebar{width:100%}.function-order-actions button,.function-order-savebar button{flex:1}}
    `;
    scope.document.head.appendChild(style);
  }

  function injectNavigation(profile) {
    if (!isAdmin(profile)) return;
    const nav = scope.document.getElementById('ide-sidebar-nav');
    if (!nav || nav.querySelector('[data-nav-id="settings-display-order"]')) return;
    const functionsLink = nav.querySelector('[data-nav-id="settings-functions"]');
    if (!functionsLink) return;
    const link = scope.document.createElement('a');
    link.className = 'ide-sidebar-link';
    link.href = 'module.html?section=settings&tab=display-order';
    link.dataset.navId = 'settings-display-order';
    link.dataset.tooltip = 'Ordem de Exibição';
    link.innerHTML = '<i class="fa-solid fa-arrow-down-wide-short" aria-hidden="true"></i><span class="ide-sidebar-label">Ordem de Exibição</span>';
    functionsLink.insertAdjacentElement('afterend', link);
    if (isOrderSettingsRoute) {
      nav.querySelectorAll('.ide-sidebar-link.active').forEach(node => { node.classList.remove('active'); node.removeAttribute('aria-current'); });
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
  }

  function renderOrderScreen() {
    if (!isOrderSettingsRoute || state.rendering) return;
    const root = scope.document.getElementById('module-placeholder');
    if (!root) return;
    state.rendering = true;
    injectStyles();
    root.hidden = false;
    root.className = '';
    root.innerHTML = `<div class="function-order-page" data-function-order-owner="true">
      <header class="function-order-header"><div class="ide-module-kicker">Administração · Configurações</div><h1>Ordem de Exibição</h1><p>Defina a sequência padrão das funções ministeriais. Esta ordem é usada na exportação de escalas e pode ser reutilizada por outras visualizações do sistema.</p></header>
      <section class="function-order-card" aria-labelledby="function-order-title">
        <div class="function-order-toolbar"><div><h2 id="function-order-title" style="margin:0 0 .25rem">Funções Ministeriais</h2><p>Use as setas para posicionar as funções na ordem desejada.</p></div><div class="function-order-actions"><button id="function-order-default" class="ide-button ide-button--secondary" type="button"><i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i> Aplicar ordem sugerida</button></div></div>
        <div id="function-order-list" class="function-order-list"></div>
        <div class="function-order-note"><strong>Regra de segurança:</strong> a configuração só pode ser alterada por ADMIN/SUPER_ADMIN e cada salvamento gera registro de auditoria. Funções inativas permanecem na lista para preservar uma ordem estável caso sejam reativadas.</div>
        <div class="function-order-savebar"><button id="function-order-reload" class="ide-button ide-button--ghost" type="button">Descartar alterações</button><button id="function-order-save" class="ide-button ide-button--primary" type="button" disabled><i class="fa-solid fa-floppy-disk" aria-hidden="true"></i> Salvar ordem</button></div>
      </section>
    </div>`;
    renderRows();
    root.querySelector('#function-order-default')?.addEventListener('click', () => { state.functions = fallbackSort(state.functions); state.dirty = true; renderRows(); });
    root.querySelector('#function-order-reload')?.addEventListener('click', reloadScreen);
    root.querySelector('#function-order-save')?.addEventListener('click', saveOrder);
    scope.document.title = 'IDE Music — Ordem de Exibição';
    state.rendering = false;
  }

  function renderRows() {
    const list = scope.document.getElementById('function-order-list');
    if (!list) return;
    list.innerHTML = state.functions.map((fn, index) => `<div class="function-order-row" data-function-id="${esc(fn.id)}">
      <div class="function-order-position">${index + 1}</div>
      <div class="function-order-main"><strong>${esc(fn.name || fn.slug || 'Função')}</strong><small>${esc(fn.slug || '')}${fn.active === false ? ' · Inativa' : ''}</small></div>
      <div class="function-order-controls"><button class="ide-button ide-button--secondary ide-button--sm" type="button" data-order-action="up" data-index="${index}" ${index === 0 ? 'disabled' : ''} aria-label="Mover ${esc(fn.name || 'função')} para cima"><i class="fa-solid fa-arrow-up" aria-hidden="true"></i></button><button class="ide-button ide-button--secondary ide-button--sm" type="button" data-order-action="down" data-index="${index}" ${index === state.functions.length - 1 ? 'disabled' : ''} aria-label="Mover ${esc(fn.name || 'função')} para baixo"><i class="fa-solid fa-arrow-down" aria-hidden="true"></i></button></div>
    </div>`).join('') || '<div class="ide-empty-state"><strong>Nenhuma função ministerial cadastrada</strong></div>';
    list.querySelectorAll('[data-order-action]').forEach(button => button.addEventListener('click', moveFunction));
    const save = scope.document.getElementById('function-order-save');
    if (save) save.disabled = !state.dirty;
  }

  function moveFunction(event) {
    const button = event.currentTarget;
    const index = Number(button.dataset.index);
    const target = button.dataset.orderAction === 'up' ? index - 1 : index + 1;
    if (!Number.isInteger(index) || target < 0 || target >= state.functions.length) return;
    [state.functions[index], state.functions[target]] = [state.functions[target], state.functions[index]];
    state.dirty = true;
    renderRows();
  }

  async function reloadScreen() {
    state.functions = await loadFunctions();
    state.dirty = false;
    renderOrderScreen();
    renderRows();
  }

  async function saveOrder() {
    const button = scope.document.getElementById('function-order-save');
    if (!button || !state.dirty) return;
    const actorUserId = scope.currentMusicIdeUser?.uid || scope.currentMusicIdeUser?.id;
    if (!actorUserId || !isAdmin(scope.currentMusicIdeProfile)) return;
    button.disabled = true;
    const original = button.innerHTML;
    button.innerHTML = '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Salvando…';
    try {
      const db = scope.firebase.firestore();
      const now = scope.firebase.firestore.FieldValue.serverTimestamp();
      const batch = db.batch();
      state.functions.forEach((fn, index) => batch.set(db.collection('ministryFunctions').doc(fn.id), {
        order: (index + 1) * 10,
        updatedBy: actorUserId,
        updatedAt: now
      }, { merge: true }));
      await batch.commit();
      await db.collection('auditLogs').add({
        actorUserId,
        action: 'MINISTRY_FUNCTIONS_REORDERED',
        entityType: 'ministryFunction',
        entityId: 'catalog',
        details: { order: state.functions.map(fn => fn.id), source: 'display-order-settings' },
        createdAt: scope.firebase.firestore.FieldValue.serverTimestamp()
      });
      state.functions = state.functions.map((fn, index) => ({ ...fn, order: (index + 1) * 10 }));
      state.dirty = false;
      renderRows();
      button.innerHTML = '<i class="fa-solid fa-check" aria-hidden="true"></i> Ordem salva';
      scope.setTimeout(() => { if (button.isConnected) button.innerHTML = original; }, 1800);
      orderExportTeams(state.functions);
    } catch (error) {
      console.error('Falha ao salvar ordem das funções.', error);
      button.disabled = false;
      button.innerHTML = original;
      if (typeof scope.alert === 'function') scope.alert(error.message || 'Não foi possível salvar a ordem das funções.');
    }
  }

  function buildRank(functions) {
    const rank = new Map();
    sortFunctions(functions).forEach((fn, index) => {
      const value = Number.isFinite(Number(fn.order)) ? Number(fn.order) : (index + 1) * 10;
      [fn.name, fn.slug].filter(Boolean).forEach(label => rank.set(normalizeSlug(label), value));
    });
    return rank;
  }

  function orderExportTeams(functions) {
    if (!isScheduleExportRoute) return;
    const rank = buildRank(functions);
    scope.document.querySelectorAll('.weekly-export-team').forEach(team => {
      const rows = Array.from(team.querySelectorAll(':scope > p'));
      if (rows.length < 2) return;
      rows.sort((a, b) => {
        const labelA = normalizeSlug(a.querySelector('strong')?.textContent.replace(/:\s*$/, '') || '');
        const labelB = normalizeSlug(b.querySelector('strong')?.textContent.replace(/:\s*$/, '') || '');
        let rankA = rank.get(labelA);
        let rankB = rank.get(labelB);
        if (!Number.isFinite(rankA)) rankA = labelA === 'dm' ? 9999 : (FALLBACK_RANK.get(labelA) || 9000);
        if (!Number.isFinite(rankB)) rankB = labelB === 'dm' ? 9999 : (FALLBACK_RANK.get(labelB) || 9000);
        return rankA - rankB || labelA.localeCompare(labelB, 'pt-BR');
      });
      rows.forEach(row => team.appendChild(row));
    });
  }

  async function bootstrapExportOrder() {
    if (!isScheduleExportRoute) return;
    try {
      const functions = await loadFunctions();
      orderExportTeams(functions);
      if (typeof scope.MutationObserver === 'function' && scope.document.body) {
        let queued = false;
        const observer = new scope.MutationObserver(() => {
          if (queued) return;
          queued = true;
          const run = () => { queued = false; orderExportTeams(functions); };
          if (typeof scope.requestAnimationFrame === 'function') scope.requestAnimationFrame(run); else scope.setTimeout(run, 0);
        });
        observer.observe(scope.document.body, { childList: true, subtree: true });
        scope.__musicIdeFunctionDisplayOrderObserver = observer;
      }
    } catch (error) {
      console.error('Ordem parametrizada das funções indisponível na exportação.', error);
    }
  }

  async function bootstrapSettings() {
    if (section !== 'settings') return;
    let authUser = null;
    try { authUser = await scope.musicIdeAuthReady; } catch (_) {}
    if (!authUser) return;
    const profile = scope.currentMusicIdeProfile;
    injectNavigation(profile);
    scope.setTimeout(() => injectNavigation(profile), 250);
    scope.setTimeout(() => injectNavigation(profile), 900);
    if (!isOrderSettingsRoute) return;
    if (!isAdmin(profile)) { scope.location.replace('index.html'); return; }
    try {
      state.functions = await loadFunctions();
      state.dirty = false;
      renderOrderScreen();
      if (typeof scope.MutationObserver === 'function') {
        const root = scope.document.getElementById('module-placeholder');
        if (root) {
          const observer = new scope.MutationObserver(() => {
            if (!root.querySelector('[data-function-order-owner="true"]') && !state.rendering) renderOrderScreen();
          });
          observer.observe(root, { childList: true, subtree: false });
          scope.__musicIdeFunctionOrderSettingsObserver = observer;
        }
      }
    } catch (error) {
      console.error('Falha ao carregar ordem das funções.', error);
      const root = scope.document.getElementById('module-placeholder');
      if (root) root.innerHTML = `<div class="function-order-page"><div class="ide-empty-state"><strong>Não foi possível carregar a ordem das funções</strong><span>${esc(error.message || 'Tente novamente.')}</span></div></div>`;
    }
  }

  scope.MusicIdeFunctionDisplayOrder = Object.freeze({
    DEFAULT_SLUG_ORDER,
    normalizeSlug,
    sortFunctions,
    fallbackSort,
    orderExportTeams
  });

  const start = () => { bootstrapSettings(); bootstrapExportOrder(); };
  if (scope.document.readyState === 'loading') scope.document.addEventListener('DOMContentLoaded', start, { once: true }); else start();
})(typeof window !== 'undefined' ? window : null);
