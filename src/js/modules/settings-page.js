(function initSettingsPage(scope) {
  if (!scope || !scope.document) return;
  const params = new URLSearchParams(scope.location.search || '');
  if (params.get('section') !== 'settings') return;

  const DEFAULT_TEMPLATE = Object.freeze([
    { slug: 'back-vocal', quantity: 4 },
    { slug: 'ministro', quantity: 2 },
    { slug: 'guitarra', quantity: 1 },
    { slug: 'violao', quantity: 1 },
    { slug: 'baixo', quantity: 1 },
    { slug: 'bateria', quantity: 1 },
    { slug: 'teclado', quantity: 1 }
  ]);
  const MAX_QUANTITY = 12;
  const state = { data: null, tab: params.get('tab') === 'functions' ? 'functions' : 'schedule-template', editingFunctionId: null };
  const esc = value => String(value == null ? '' : value).replace(/[&<>'\"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '\"': '&quot;' }[c]));

  function isAdmin(profile) {
    const role = String(profile?.role || '').toUpperCase();
    return profile?.isSuperAdmin === true || profile?.isAdmin === true || role === 'SUPER_ADMIN' || role === 'ADMIN';
  }

  function normalizeSlug(value) {
    return String(value || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
  }

  function defaultQuantity(fn) {
    const item = DEFAULT_TEMPLATE.find(entry => entry.slug === fn.slug);
    return item ? item.quantity : 0;
  }

  function templateMap(template) {
    return new Map((Array.isArray(template?.slots) ? template.slots : []).map(item => [String(item.functionId), Number(item.quantity) || 0]));
  }

  function orderedFunctions(functions, activeOnly = false) {
    return (functions || []).filter(item => !activeOnly || item.active !== false).sort((a, b) => Number(a.order ?? 999) - Number(b.order ?? 999) || String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR'));
  }

  function toast(message, type = 'success') {
    let node = scope.document.getElementById('settings-toast');
    if (!node) {
      node = scope.document.createElement('div');
      node.id = 'settings-toast'; node.className = 'settings-toast'; node.setAttribute('role', 'status'); node.setAttribute('aria-live', 'polite');
      scope.document.body.appendChild(node);
    }
    node.textContent = message; node.dataset.type = type; node.hidden = false;
    clearTimeout(toast.timer); toast.timer = setTimeout(() => { node.hidden = true; }, 4200);
  }

  function injectStyles() {
    if (scope.document.getElementById('settings-template-styles')) return;
    const style = scope.document.createElement('style');
    style.id = 'settings-template-styles';
    style.textContent = `
      .settings-page{padding:clamp(1rem,3vw,2rem);max-width:1180px;margin:0 auto}.settings-header{margin-bottom:1.25rem}.settings-header h1{margin:.25rem 0}.settings-header p{margin:0;color:var(--text-secondary);max-width:760px}.settings-layout{display:grid;grid-template-columns:230px minmax(0,1fr);gap:1rem;align-items:start}.settings-submenu{display:grid;gap:.4rem;position:sticky;top:1rem}.settings-submenu button{justify-content:flex-start;width:100%}.settings-submenu button.is-active{background:var(--surface-secondary);border-color:var(--border-strong,var(--border))}.settings-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:clamp(1rem,2vw,1.5rem);box-shadow:var(--shadow-sm)}.settings-card__heading{display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;margin-bottom:1rem}.settings-card__heading h2{margin:.2rem 0}.settings-card__heading p{margin:0;color:var(--text-secondary)}.settings-template-list,.settings-functions-list{display:grid;gap:.65rem}.settings-template-row,.settings-function-row{display:grid;grid-template-columns:minmax(0,1fr) 150px;gap:1rem;align-items:center;padding:.85rem 0;border-bottom:1px solid var(--border)}.settings-function-row{grid-template-columns:42px minmax(0,1fr) auto minmax(250px,auto)}.settings-template-row:last-child,.settings-function-row:last-child{border-bottom:0}.settings-template-role{display:flex;gap:.8rem;align-items:center}.settings-template-role i{width:2rem;height:2rem;border-radius:999px;display:grid;place-items:center;background:var(--surface-secondary);color:var(--text-secondary)}.settings-template-role strong,.settings-template-role small,.settings-function-main strong,.settings-function-main small{display:block}.settings-template-role small,.settings-function-main small{color:var(--text-secondary);margin-top:.15rem}.settings-quantity label{display:block;font-size:.78rem;color:var(--text-secondary);margin-bottom:.3rem}.settings-quantity input{text-align:center}.settings-summary{display:flex;gap:.5rem;align-items:center;flex-wrap:wrap;margin:1rem 0 0;color:var(--text-secondary)}.settings-actions,.settings-function-actions,.settings-function-form-actions{display:flex;justify-content:flex-end;gap:.6rem;flex-wrap:wrap}.settings-actions{margin-top:1.25rem}.settings-note{margin-top:1rem;padding:.85rem 1rem;border-radius:var(--radius-md);background:var(--surface-secondary);color:var(--text-secondary)}.settings-function-form{display:grid;grid-template-columns:1fr 1fr auto;gap:.75rem;align-items:end;margin-bottom:1rem;padding-bottom:1rem;border-bottom:1px solid var(--border)}.settings-function-order{width:2rem;height:2rem;border-radius:999px;display:grid;place-items:center;background:var(--surface-secondary);font-weight:700}.settings-toast{position:fixed;right:1rem;bottom:1rem;z-index:10020;padding:.8rem 1rem;border-radius:var(--radius-md);background:var(--surface);border:1px solid var(--border);box-shadow:var(--shadow-lg)}.settings-toast[data-type="error"]{border-color:var(--danger)}@media(max-width:800px){.settings-layout{grid-template-columns:1fr}.settings-submenu{position:static;grid-template-columns:1fr 1fr}.settings-function-form{grid-template-columns:1fr}.settings-function-row{grid-template-columns:38px minmax(0,1fr);}.settings-function-row>.ide-badge,.settings-function-actions{grid-column:2}.settings-function-actions{justify-content:flex-start}}@media(max-width:640px){.settings-card__heading{display:block}.settings-template-row{grid-template-columns:1fr}.settings-quantity{max-width:160px}.settings-actions{flex-direction:column}.settings-actions button{width:100%}.settings-submenu{grid-template-columns:1fr}}
    `;
    scope.document.head.appendChild(style);
  }

  async function loadData() {
    const db = scope.firebase.firestore();
    const [functionsSnapshot, settingsSnapshot] = await Promise.all([
      db.collection('ministryFunctions').get(), db.collection('settings').doc('scheduleTemplate').get()
    ]);
    return {
      functions: orderedFunctions(functionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))),
      template: settingsSnapshot.exists ? { id: settingsSnapshot.id, ...settingsSnapshot.data() } : null
    };
  }

  function renderShell(root) {
    root.innerHTML = `<div class="settings-page"><header class="settings-header"><div class="ide-module-kicker">Administração · Configurações</div><h1>Configurações</h1><p>Parametrize estruturas administrativas utilizadas pelo IDE Music.</p></header><div class="settings-layout"><nav class="settings-submenu" aria-label="Submenu de configurações"><button class="ide-button ide-button--secondary" data-settings-tab="schedule-template" type="button"><i class="fa-solid fa-calendar-check" aria-hidden="true"></i> Template de escala</button><button class="ide-button ide-button--secondary" data-settings-tab="functions" type="button"><i class="fa-solid fa-layer-group" aria-hidden="true"></i> Funções ministeriais</button></nav><div id="settings-content"></div></div></div>`;
    root.querySelectorAll('[data-settings-tab]').forEach(button => button.addEventListener('click', () => setTab(button.dataset.settingsTab)));
    renderCurrentTab();
  }

  function setTab(tab) {
    state.tab = tab === 'functions' ? 'functions' : 'schedule-template';
    const url = new URL(scope.location.href); url.searchParams.set('section', 'settings');
    if (state.tab === 'functions') url.searchParams.set('tab', 'functions'); else url.searchParams.delete('tab');
    scope.history.replaceState({}, '', url);
    state.editingFunctionId = null;
    renderCurrentTab();
  }

  function renderCurrentTab() {
    const root = scope.document.getElementById('module-placeholder');
    root.querySelectorAll('[data-settings-tab]').forEach(button => button.classList.toggle('is-active', button.dataset.settingsTab === state.tab));
    if (state.tab === 'functions') renderFunctionsTab(); else renderTemplateTab();
  }

  function renderTemplateTab() {
    const content = scope.document.getElementById('settings-content');
    const functions = orderedFunctions(state.data.functions, true);
    const configured = templateMap(state.data.template);
    const rows = functions.map(fn => {
      const quantity = configured.has(String(fn.id)) ? configured.get(String(fn.id)) : defaultQuantity(fn);
      return `<div class="settings-template-row"><div class="settings-template-role"><i class="fa-solid fa-user-group" aria-hidden="true"></i><div><strong>${esc(fn.name || fn.slug || 'Função')}</strong><small>${quantity > 0 ? 'Incluída no template' : 'Fora do template'}</small></div></div><div class="settings-quantity"><label for="template-${esc(fn.id)}">Quantidade</label><input id="template-${esc(fn.id)}" class="ide-field__control ide-field__input" data-template-quantity data-function-id="${esc(fn.id)}" type="number" min="0" max="${MAX_QUANTITY}" step="1" value="${quantity}"></div></div>`;
    }).join('');
    content.innerHTML = `<section class="settings-card" aria-labelledby="schedule-template-title"><div class="settings-card__heading"><div><span class="ide-module-kicker">Escalas</span><h2 id="schedule-template-title">Template padrão de escala</h2><p>Defina as funções e o número de posições criadas automaticamente em cada nova escala. Quantidade 0 exclui a função do template.</p></div></div><div class="settings-template-list">${rows || '<div class="ide-empty-state"><strong>Nenhuma função ativa</strong><span>Ative ou cadastre uma função ministerial no submenu correspondente.</span></div>'}</div><div class="settings-summary"><i class="fa-solid fa-circle-info" aria-hidden="true"></i><span id="settings-template-summary"></span></div><div class="settings-note"><strong>Importante:</strong> alterações são aplicadas somente às novas escalas. Escalas já existentes permanecem como estão.</div><div class="settings-actions"><button id="settings-template-reset" class="ide-button ide-button--secondary" type="button">Restaurar padrão</button><button id="settings-template-save" class="ide-button ide-button--primary" type="button"><i class="fa-solid fa-floppy-disk" aria-hidden="true"></i> Salvar template</button></div></section>`;
    updateSummary();
    content.querySelectorAll('[data-template-quantity]').forEach(input => input.addEventListener('input', updateSummary));
    content.querySelector('#settings-template-reset')?.addEventListener('click', () => {
      functions.forEach(fn => { const input = content.querySelector(`[data-function-id="${CSS.escape(fn.id)}"]`); if (input) input.value = String(defaultQuantity(fn)); }); updateSummary();
    });
    content.querySelector('#settings-template-save')?.addEventListener('click', saveTemplate);
  }

  function updateSummary() {
    const inputs = [...scope.document.querySelectorAll('[data-template-quantity]')];
    const active = inputs.map(input => Number(input.value || 0)).filter(value => value > 0);
    const summary = scope.document.getElementById('settings-template-summary');
    if (summary) summary.textContent = `${active.length} função(ões) · ${active.reduce((sum, value) => sum + value, 0)} posição(ões) no template.`;
  }

  async function saveTemplate() {
    const button = scope.document.getElementById('settings-template-save');
    try {
      const slots = [...scope.document.querySelectorAll('[data-template-quantity]')].map(input => {
        const quantity = Number(input.value || 0);
        if (!Number.isInteger(quantity) || quantity < 0 || quantity > MAX_QUANTITY) throw new Error('Informe quantidades inteiras entre 0 e 12.');
        return { functionId: input.dataset.functionId, quantity };
      }).filter(item => item.quantity > 0);
      if (!slots.length) throw new Error('O template precisa ter ao menos uma posição.');
      button.disabled = true;
      const actorUserId = scope.currentMusicIdeUser?.uid || scope.currentMusicIdeUser?.id;
      const db = scope.firebase.firestore(); const version = Number(state.data.template?.version || 0) + 1; const now = scope.firebase.firestore.FieldValue.serverTimestamp();
      await db.collection('settings').doc('scheduleTemplate').set({ slots, version, updatedBy: actorUserId, updatedAt: now }, { merge: true });
      await db.collection('auditLogs').add({ actorUserId, action: 'SCHEDULE_TEMPLATE_UPDATED', entityType: 'setting', entityId: 'scheduleTemplate', details: { version, slots }, createdAt: now });
      state.data.template = { ...(state.data.template || {}), slots, version };
      toast('Template de escala salvo. As próximas escalas usarão esta configuração.');
    } catch (error) { console.error(error); toast(error.message || 'Não foi possível salvar o template.', 'error'); }
    finally { if (button) button.disabled = false; }
  }

  function renderFunctionsTab() {
    const content = scope.document.getElementById('settings-content');
    const functions = orderedFunctions(state.data.functions);
    const editing = functions.find(item => item.id === state.editingFunctionId) || null;
    const rows = functions.map((fn, index) => `<div class="settings-function-row"><div class="settings-function-order">${index + 1}</div><div class="settings-function-main"><strong>${esc(fn.name)}</strong><small>${esc(fn.slug)}</small></div><span class="ide-badge ${fn.active === false ? 'ide-badge--neutral' : 'ide-badge--success'}">${fn.active === false ? 'Inativa' : 'Ativa'}</span><div class="settings-function-actions"><button class="ide-button ide-button--secondary ide-button--sm" data-function-action="up" data-id="${esc(fn.id)}" type="button" ${index === 0 ? 'disabled' : ''} aria-label="Mover para cima"><i class="fa-solid fa-arrow-up"></i></button><button class="ide-button ide-button--secondary ide-button--sm" data-function-action="down" data-id="${esc(fn.id)}" type="button" ${index === functions.length - 1 ? 'disabled' : ''} aria-label="Mover para baixo"><i class="fa-solid fa-arrow-down"></i></button><button class="ide-button ide-button--secondary ide-button--sm" data-function-action="edit" data-id="${esc(fn.id)}" type="button">Editar</button><button class="ide-button ${fn.active === false ? 'ide-button--primary' : 'ide-button--danger'} ide-button--sm" data-function-action="status" data-id="${esc(fn.id)}" data-active="${fn.active === false ? 'true' : 'false'}" type="button">${fn.active === false ? 'Reativar' : 'Inativar'}</button></div></div>`).join('');
    content.innerHTML = `<section class="settings-card" aria-labelledby="functions-title"><div class="settings-card__heading"><div><span class="ide-module-kicker">Cadastros administrativos</span><h2 id="functions-title">Funções ministeriais</h2><p>Gerencie o catálogo de funções usado no cadastro de pessoas, filtros e templates de escala.</p></div></div><form id="settings-function-form" class="settings-function-form"><label><span class="ide-field__label">Nome da função</span><input id="settings-function-name" class="ide-field__control ide-field__input" maxlength="80" required value="${esc(editing?.name || '')}" placeholder="Ex.: Percussão"></label><label><span class="ide-field__label">Identificador</span><input id="settings-function-slug" class="ide-field__control ide-field__input" maxlength="80" value="${esc(editing?.slug || '')}" placeholder="Gerado a partir do nome"></label><div class="settings-function-form-actions">${editing ? '<button id="settings-function-cancel" class="ide-button ide-button--ghost" type="button">Cancelar</button>' : ''}<button class="ide-button ide-button--primary" type="submit">${editing ? 'Salvar alterações' : 'Adicionar função'}</button></div></form>${rows ? `<div class="settings-functions-list">${rows}</div>` : '<div class="ide-empty-state"><strong>Nenhuma função ministerial</strong><span>Cadastre a primeira função acima.</span></div>'}<div class="settings-note"><i class="fa-solid fa-circle-info" aria-hidden="true"></i> A ordem definida aqui também é usada nas escalas e seletores. Inativar preserva os vínculos históricos.</div></section>`;
    content.querySelector('#settings-function-form').addEventListener('submit', submitFunction);
    content.querySelector('#settings-function-cancel')?.addEventListener('click', () => { state.editingFunctionId = null; renderFunctionsTab(); });
    content.querySelectorAll('[data-function-action]').forEach(button => button.addEventListener('click', handleFunctionAction));
  }

  async function auditFunction(action, entityId, details) {
    const actorUserId = scope.currentMusicIdeUser?.uid || scope.currentMusicIdeUser?.id;
    return scope.firebase.firestore().collection('auditLogs').add({ actorUserId, action, entityType: 'ministryFunction', entityId, details, createdAt: scope.firebase.firestore.FieldValue.serverTimestamp() });
  }

  async function submitFunction(event) {
    event.preventDefault();
    const name = scope.document.getElementById('settings-function-name').value.trim();
    const requestedSlug = scope.document.getElementById('settings-function-slug').value.trim();
    const slug = normalizeSlug(requestedSlug || name);
    if (!name) return toast('Informe o nome da função.', 'error');
    if (!slug) return toast('Não foi possível gerar um identificador válido.', 'error');
    const duplicate = state.data.functions.find(fn => fn.slug === slug && fn.id !== state.editingFunctionId);
    if (duplicate) return toast(`Já existe uma função com o identificador ${slug}.`, 'error');
    try {
      const db = scope.firebase.firestore(); const actorUserId = scope.currentMusicIdeUser?.uid || scope.currentMusicIdeUser?.id; const now = scope.firebase.firestore.FieldValue.serverTimestamp();
      if (state.editingFunctionId) {
        const current = state.data.functions.find(fn => fn.id === state.editingFunctionId);
        await db.collection('ministryFunctions').doc(state.editingFunctionId).set({ name, slug, order: Number(current?.order || 10), active: current?.active !== false, updatedBy: actorUserId, updatedAt: now }, { merge: true });
        await auditFunction('MINISTRY_FUNCTION_UPDATED', state.editingFunctionId, { name, slug });
        toast('Função ministerial atualizada.');
      } else {
        const maxOrder = state.data.functions.reduce((max, item) => Math.max(max, Number(item.order) || 0), 0);
        const ref = db.collection('ministryFunctions').doc();
        await ref.set({ name, slug, order: maxOrder + 10, active: true, createdBy: actorUserId, updatedBy: actorUserId, createdAt: now, updatedAt: now });
        await auditFunction('MINISTRY_FUNCTION_CREATED', ref.id, { name, slug, order: maxOrder + 10 });
        toast('Função ministerial adicionada.');
      }
      state.editingFunctionId = null; state.data = await loadData(); renderFunctionsTab();
    } catch (error) { console.error(error); toast(error.message || 'Não foi possível salvar a função ministerial.', 'error'); }
  }

  async function handleFunctionAction(event) {
    const button = event.currentTarget; const id = button.dataset.id; const action = button.dataset.functionAction;
    const functions = orderedFunctions(state.data.functions); const index = functions.findIndex(fn => fn.id === id); if (index < 0) return;
    if (action === 'edit') { state.editingFunctionId = id; renderFunctionsTab(); scope.document.getElementById('settings-function-name')?.focus(); return; }
    try {
      const db = scope.firebase.firestore(); const actorUserId = scope.currentMusicIdeUser?.uid || scope.currentMusicIdeUser?.id; const now = scope.firebase.firestore.FieldValue.serverTimestamp();
      if (action === 'status') {
        const active = button.dataset.active === 'true'; const fn = functions[index];
        if (!scope.confirm(`${active ? 'Reativar' : 'Inativar'} a função ${fn.name}? Os vínculos históricos serão preservados.`)) return;
        await db.collection('ministryFunctions').doc(id).set({ active, updatedBy: actorUserId, updatedAt: now }, { merge: true });
        await auditFunction(active ? 'MINISTRY_FUNCTION_REACTIVATED' : 'MINISTRY_FUNCTION_DEACTIVATED', id, { name: fn.name, active });
        toast(active ? 'Função reativada.' : 'Função inativada sem apagar o histórico.');
      } else if (action === 'up' || action === 'down') {
        const targetIndex = action === 'up' ? index - 1 : index + 1; if (targetIndex < 0 || targetIndex >= functions.length) return;
        [functions[index], functions[targetIndex]] = [functions[targetIndex], functions[index]];
        const batch = db.batch(); functions.forEach((fn, position) => batch.set(db.collection('ministryFunctions').doc(fn.id), { order: position * 10 + 10, updatedBy: actorUserId, updatedAt: now }, { merge: true })); await batch.commit();
        await auditFunction('MINISTRY_FUNCTIONS_REORDERED', 'catalog', { order: functions.map(fn => fn.id) }); toast('Ordem das funções atualizada.');
      }
      state.data = await loadData(); renderFunctionsTab();
    } catch (error) { console.error(error); toast(error.message || 'Não foi possível alterar a função ministerial.', 'error'); }
  }

  async function bootstrap() {
    injectStyles(); const root = scope.document.getElementById('module-placeholder'); if (!root) return;
    try {
      const authUser = await scope.musicIdeAuthReady; if (!authUser) return;
      if (!isAdmin(scope.currentMusicIdeProfile)) { scope.location.replace('index.html'); return; }
      if (!scope.firebase?.firestore) throw new Error('Banco de dados indisponível.');
      root.className = ''; root.innerHTML = '<div class="settings-page"><div class="ide-loading" role="status">Carregando configurações...</div></div>';
      state.data = await loadData(); renderShell(root);
    } catch (error) {
      console.error(error); root.innerHTML = `<div class="settings-page"><div class="ide-empty-state"><strong>Não foi possível carregar as configurações</strong><span>${esc(error.message || 'Tente novamente.')}</span></div></div>`;
    }
  }

  if (scope.document.readyState === 'loading') scope.document.addEventListener('DOMContentLoaded', bootstrap, { once: true }); else bootstrap();
})(window);
