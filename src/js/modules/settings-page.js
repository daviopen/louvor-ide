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
  const esc = value => String(value == null ? '' : value).replace(/[&<>'\"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '\"': '&quot;' }[c]));

  function isAdmin(profile) {
    const role = String(profile?.role || '').toUpperCase();
    return profile?.isSuperAdmin === true || profile?.isAdmin === true || role === 'SUPER_ADMIN' || role === 'ADMIN';
  }

  function defaultQuantity(fn) {
    const item = DEFAULT_TEMPLATE.find(entry => entry.slug === fn.slug);
    return item ? item.quantity : 0;
  }

  function templateMap(template) {
    return new Map((Array.isArray(template?.slots) ? template.slots : []).map(item => [String(item.functionId), Number(item.quantity) || 0]));
  }

  function toast(message, type = 'success') {
    let node = scope.document.getElementById('settings-toast');
    if (!node) {
      node = scope.document.createElement('div');
      node.id = 'settings-toast';
      node.className = 'settings-toast';
      node.setAttribute('role', 'status');
      node.setAttribute('aria-live', 'polite');
      scope.document.body.appendChild(node);
    }
    node.textContent = message;
    node.dataset.type = type;
    node.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { node.hidden = true; }, 4200);
  }

  function injectStyles() {
    if (scope.document.getElementById('settings-template-styles')) return;
    const style = scope.document.createElement('style');
    style.id = 'settings-template-styles';
    style.textContent = `
      .settings-page{padding:clamp(1rem,3vw,2rem);max-width:1180px;margin:0 auto}.settings-header{display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;margin-bottom:1.25rem}.settings-header h1{margin:.25rem 0}.settings-header p{margin:0;color:var(--text-secondary);max-width:760px}.settings-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:clamp(1rem,2vw,1.5rem);box-shadow:var(--shadow-sm)}.settings-card__heading{display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;margin-bottom:1rem}.settings-card__heading h2{margin:.2rem 0}.settings-card__heading p{margin:0;color:var(--text-secondary)}.settings-template-list{display:grid;gap:.65rem}.settings-template-row{display:grid;grid-template-columns:minmax(0,1fr) 150px;gap:1rem;align-items:center;padding:.85rem 0;border-bottom:1px solid var(--border)}.settings-template-row:last-child{border-bottom:0}.settings-template-role{display:flex;gap:.8rem;align-items:center}.settings-template-role i{width:2rem;height:2rem;border-radius:999px;display:grid;place-items:center;background:var(--surface-secondary);color:var(--text-secondary)}.settings-template-role strong,.settings-template-role small{display:block}.settings-template-role small{color:var(--text-secondary);margin-top:.15rem}.settings-quantity label{display:block;font-size:.78rem;color:var(--text-secondary);margin-bottom:.3rem}.settings-quantity input{text-align:center}.settings-summary{display:flex;gap:.5rem;align-items:center;flex-wrap:wrap;margin:1rem 0 0;color:var(--text-secondary)}.settings-actions{display:flex;justify-content:flex-end;gap:.75rem;margin-top:1.25rem}.settings-note{margin-top:1rem;padding:.85rem 1rem;border-radius:var(--radius-md);background:var(--surface-secondary);color:var(--text-secondary)}.settings-toast{position:fixed;right:1rem;bottom:1rem;z-index:10020;padding:.8rem 1rem;border-radius:var(--radius-md);background:var(--surface);border:1px solid var(--border);box-shadow:var(--shadow-lg)}.settings-toast[data-type="error"]{border-color:var(--danger)}@media(max-width:640px){.settings-header,.settings-card__heading{display:block}.settings-template-row{grid-template-columns:1fr}.settings-quantity{max-width:160px}.settings-actions{flex-direction:column}.settings-actions button{width:100%}}
    `;
    scope.document.head.appendChild(style);
  }

  async function loadData() {
    const db = scope.firebase.firestore();
    const [functionsSnapshot, settingsSnapshot] = await Promise.all([
      db.collection('ministryFunctions').get(),
      db.collection('settings').doc('scheduleTemplate').get()
    ]);
    const functions = functionsSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(item => item.active !== false)
      .sort((a, b) => Number(a.order ?? 999) - Number(b.order ?? 999) || String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR'));
    const template = settingsSnapshot.exists ? { id: settingsSnapshot.id, ...settingsSnapshot.data() } : null;
    return { functions, template };
  }

  function render(root, data) {
    const configured = templateMap(data.template);
    const rows = data.functions.map(fn => {
      const quantity = configured.has(String(fn.id)) ? configured.get(String(fn.id)) : defaultQuantity(fn);
      return `<div class="settings-template-row" data-function-id="${esc(fn.id)}"><div class="settings-template-role"><i class="fa-solid fa-user-group" aria-hidden="true"></i><div><strong>${esc(fn.name || fn.slug || 'Função')}</strong><small>${quantity > 0 ? 'Incluída no template' : 'Fora do template'}</small></div></div><div class="settings-quantity"><label for="template-${esc(fn.id)}">Quantidade</label><input id="template-${esc(fn.id)}" class="ide-field__control ide-field__input" data-template-quantity type="number" min="0" max="${MAX_QUANTITY}" step="1" value="${quantity}"></div></div>`;
    }).join('');
    root.innerHTML = `<div class="settings-page"><header class="settings-header"><div><div class="ide-module-kicker">Administração · Configurações</div><h1>Configurações</h1><p>Defina quais funções compõem o template padrão das novas escalas e quantas posições cada função terá.</p></div></header><section class="settings-card" aria-labelledby="schedule-template-title"><div class="settings-card__heading"><div><span class="ide-module-kicker">Escalas</span><h2 id="schedule-template-title">Template padrão de escala</h2><p>Quantidade 0 remove a função do template. O limite por função é ${MAX_QUANTITY} posições.</p></div></div><div class="settings-template-list">${rows || '<div class="ide-empty-state"><strong>Nenhuma função ativa</strong><span>Cadastre funções ministeriais antes de configurar o template.</span></div>'}</div><div class="settings-summary"><i class="fa-solid fa-circle-info" aria-hidden="true"></i><span id="settings-template-summary"></span></div><div class="settings-note"><strong>Importante:</strong> esta configuração é aplicada somente às novas escalas. Escalas já existentes permanecem como estão.</div><div class="settings-actions"><button id="settings-template-reset" class="ide-button ide-button--secondary" type="button">Restaurar padrão</button><button id="settings-template-save" class="ide-button ide-button--primary" type="button"><i class="fa-solid fa-floppy-disk" aria-hidden="true"></i> Salvar template</button></div></section></div>`;
    updateSummary(root);
    root.querySelectorAll('[data-template-quantity]').forEach(input => input.addEventListener('input', () => updateSummary(root)));
    root.querySelector('#settings-template-reset')?.addEventListener('click', () => {
      data.functions.forEach(fn => {
        const input = root.querySelector(`#template-${CSS.escape(fn.id)}`);
        if (input) input.value = String(defaultQuantity(fn));
      });
      updateSummary(root);
    });
    root.querySelector('#settings-template-save')?.addEventListener('click', () => save(root, data));
  }

  function readSlots(root, functions) {
    return functions.map(fn => {
      const input = root.querySelector(`#template-${CSS.escape(fn.id)}`);
      const quantity = Number(input?.value || 0);
      if (!Number.isInteger(quantity) || quantity < 0 || quantity > MAX_QUANTITY) throw new Error(`Quantidade inválida para ${fn.name || 'função'}.`);
      return { functionId: fn.id, quantity };
    }).filter(item => item.quantity > 0);
  }

  function updateSummary(root) {
    try {
      const active = [...root.querySelectorAll('[data-template-quantity]')].map(input => Number(input.value || 0)).filter(value => value > 0);
      const total = active.reduce((sum, value) => sum + value, 0);
      const summary = root.querySelector('#settings-template-summary');
      if (summary) summary.textContent = `${active.length} função(ões) · ${total} posição(ões) no template.`;
    } catch (_) {}
  }

  async function save(root, data) {
    const button = root.querySelector('#settings-template-save');
    try {
      const slots = readSlots(root, data.functions);
      if (!slots.length) throw new Error('O template precisa ter ao menos uma posição.');
      button.disabled = true;
      const actor = scope.currentMusicIdeUser;
      const actorUserId = actor?.uid || actor?.id;
      if (!actorUserId) throw new Error('Usuário autenticado não identificado.');
      const db = scope.firebase.firestore();
      const currentVersion = Number(data.template?.version || 0);
      const version = currentVersion + 1;
      const now = scope.firebase.firestore.FieldValue.serverTimestamp();
      await db.collection('settings').doc('scheduleTemplate').set({
        slots,
        version,
        updatedBy: actorUserId,
        updatedAt: now
      }, { merge: true });
      await db.collection('auditLogs').add({
        actorUserId,
        action: 'SCHEDULE_TEMPLATE_UPDATED',
        entityType: 'setting',
        entityId: 'scheduleTemplate',
        details: { version, slots },
        createdAt: now
      });
      data.template = { ...(data.template || {}), slots, version };
      toast('Template de escala salvo. As próximas escalas usarão esta configuração.');
    } catch (error) {
      console.error(error);
      toast(error.message || 'Não foi possível salvar o template.', 'error');
    } finally {
      if (button) button.disabled = false;
    }
  }

  async function bootstrap() {
    injectStyles();
    const root = scope.document.getElementById('module-placeholder');
    if (!root) return;
    try {
      const authUser = await scope.musicIdeAuthReady;
      if (!authUser) return;
      const profile = scope.currentMusicIdeProfile;
      if (!isAdmin(profile)) {
        scope.location.replace('index.html');
        return;
      }
      if (!scope.firebase?.firestore) throw new Error('Banco de dados indisponível.');
      root.className = '';
      root.innerHTML = '<div class="settings-page"><div class="ide-loading" role="status">Carregando configurações...</div></div>';
      const data = await loadData();
      render(root, data);
    } catch (error) {
      console.error(error);
      root.innerHTML = `<div class="settings-page"><div class="ide-empty-state"><strong>Não foi possível carregar as configurações</strong><span>${esc(error.message || 'Tente novamente.')}</span></div></div>`;
    }
  }

  if (scope.document.readyState === 'loading') scope.document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
  else bootstrap();
})(window);
