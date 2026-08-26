/**
 * Tela somente leitura de auditoria.
 * Requer permissão de leitura no módulo `audit`; a regra do Firestore é a
 * autoridade final. Nenhuma operação de create/update/delete é exposta aqui.
 */
(function initAuditPage(scope) {
  if (!scope || !scope.document) return;
  const params = new URLSearchParams(scope.location && scope.location.search || '');
  if (params.get('section') !== 'audit') return;

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  const toDate = value => value && typeof value.toDate === 'function' ? value.toDate() : (value ? new Date(value) : null);
  const formatDate = value => {
    const date = toDate(value);
    return date && !Number.isNaN(date.getTime()) ? date.toLocaleString('pt-BR') : '—';
  };
  const pretty = value => JSON.stringify(value ?? null, null, 2);

  function ensureLayout() {
    const placeholder = scope.document.getElementById('module-placeholder');
    if (placeholder) placeholder.hidden = true;
    let root = scope.document.getElementById('audit-content');
    if (root) return root;
    root = scope.document.createElement('main');
    root.id = 'audit-content';
    root.className = 'ide-module-page';
    root.innerHTML = `
      <div class="ide-module-page__inner ide-module-card--wide">
        <section class="ide-module-card ide-audit-root" aria-labelledby="audit-title">
          <div class="ide-module-kicker">Administração · Segurança</div>
          <h1 id="audit-title">Auditoria</h1>
          <p>Histórico somente leitura das ações relevantes realizadas no IDE Music.</p>
          <form id="audit-filters" class="ide-audit-filters" aria-label="Filtros de auditoria">
            <label><span>Usuário (UID)</span><input id="audit-user-filter" class="ide-field__control ide-field__input" type="search" autocomplete="off" placeholder="UID ou parte do UID"></label>
            <label><span>De</span><input id="audit-from-filter" class="ide-field__control ide-field__input" type="date"></label>
            <label><span>Até</span><input id="audit-to-filter" class="ide-field__control ide-field__input" type="date"></label>
            <label><span>Ação</span><select id="audit-action-filter" class="ide-field__control ide-select"><option value="">Todas</option></select></label>
            <label><span>Entidade</span><select id="audit-entity-filter" class="ide-field__control ide-select"><option value="">Todas</option></select></label>
            <div class="ide-audit-filter-actions"><button class="ide-button ide-button--primary" type="submit">Aplicar filtros</button><button id="audit-clear" class="ide-button ide-button--secondary" type="button">Limpar</button></div>
          </form>
          <div id="audit-status" class="ide-audit-status" role="status" aria-live="polite">Carregando registros…</div>
          <div class="ide-table-wrap"><table class="ide-table ide-audit-table"><thead><tr><th>Data/hora</th><th>Usuário</th><th>Ação</th><th>Entidade</th><th>ID</th><th>Detalhes</th></tr></thead><tbody id="audit-rows"></tbody></table></div>
          <div id="audit-empty" class="ide-empty-state" hidden><strong>Nenhum registro encontrado</strong><span>Ajuste os filtros para ampliar a consulta.</span></div>
        </section>
      </div>
      <dialog id="audit-detail" class="ide-audit-dialog" aria-labelledby="audit-detail-title">
        <div class="ide-audit-dialog-heading"><h2 id="audit-detail-title">Detalhes da alteração</h2><button id="audit-detail-close" class="ide-button ide-button--secondary ide-button--sm" type="button">Fechar</button></div>
        <dl id="audit-detail-meta" class="ide-audit-detail-meta"></dl>
        <div class="ide-audit-diff"><section><h3>Antes</h3><pre id="audit-before"></pre></section><section><h3>Depois</h3><pre id="audit-after"></pre></section></div>
        <section><h3>Contexto</h3><pre id="audit-context"></pre></section>
      </dialog>`;
    scope.document.body.appendChild(root);
    return root;
  }

  function installStyles() {
    if (scope.document.getElementById('audit-page-style')) return;
    const style = scope.document.createElement('style');
    style.id = 'audit-page-style';
    style.textContent = `.ide-audit-root{display:grid;gap:1rem}.ide-audit-root h1{margin:.25rem 0}.ide-audit-root>p{margin:0;color:var(--text-secondary)}.ide-audit-filters{display:grid;grid-template-columns:2fr repeat(4,minmax(150px,1fr));gap:.75rem;align-items:end}.ide-audit-filters label{display:grid;gap:.35rem;font-weight:600}.ide-audit-filter-actions{display:flex;gap:.5rem;grid-column:1/-1}.ide-audit-status{color:var(--text-secondary)}.ide-table-wrap{overflow:auto}.ide-audit-table{min-width:980px}.ide-audit-table td{vertical-align:top}.ide-audit-table code{font-size:.82rem}.ide-audit-dialog{width:min(900px,calc(100vw - 2rem));max-height:90vh;overflow:auto;border:1px solid var(--border);border-radius:var(--radius-lg);background:var(--surface);color:var(--text-primary);padding:1.25rem}.ide-audit-dialog::backdrop{background:rgba(0,0,0,.5)}.ide-audit-dialog-heading{display:flex;justify-content:space-between;align-items:center;gap:1rem}.ide-audit-detail-meta{display:grid;grid-template-columns:max-content 1fr;gap:.35rem .75rem}.ide-audit-detail-meta dt{font-weight:700}.ide-audit-diff{display:grid;grid-template-columns:1fr 1fr;gap:1rem}.ide-audit-dialog pre{white-space:pre-wrap;overflow-wrap:anywhere;background:var(--surface-secondary);padding:.75rem;border-radius:var(--radius-md);border:1px solid var(--border)}@media(max-width:900px){.ide-audit-filters{grid-template-columns:1fr 1fr}.ide-audit-diff{grid-template-columns:1fr}}@media(max-width:560px){.ide-audit-filters{grid-template-columns:1fr}.ide-audit-filter-actions{grid-column:auto;flex-direction:column}}`;
    scope.document.head.appendChild(style);
  }

  let repository;
  let allLogs = [];

  function populateOptions(logs) {
    const fill = (id, values) => {
      const select = scope.document.getElementById(id);
      const current = select.value;
      select.innerHTML = '<option value="">Todas</option>' + [...new Set(values.filter(Boolean))].sort((a,b) => String(a).localeCompare(String(b), 'pt-BR')).map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('');
      select.value = current;
    };
    fill('audit-action-filter', logs.map(log => log.action));
    fill('audit-entity-filter', logs.map(log => log.entityType));
  }

  function openDetail(log) {
    const details = log.details && typeof log.details === 'object' ? log.details : {};
    scope.document.getElementById('audit-detail-meta').innerHTML = `<dt>Data/hora</dt><dd>${escapeHtml(formatDate(log.createdAt))}</dd><dt>Usuário</dt><dd><code>${escapeHtml(log.actorUserId || '—')}</code></dd><dt>Ação</dt><dd>${escapeHtml(log.action || '—')}</dd><dt>Entidade</dt><dd>${escapeHtml(log.entityType || '—')}</dd><dt>ID</dt><dd><code>${escapeHtml(log.entityId || '—')}</code></dd>`;
    scope.document.getElementById('audit-before').textContent = pretty(details.before);
    scope.document.getElementById('audit-after').textContent = pretty(details.after);
    const context = { ...details }; delete context.before; delete context.after;
    scope.document.getElementById('audit-context').textContent = pretty(context);
    scope.document.getElementById('audit-detail').showModal();
  }

  function render(logs) {
    const rows = scope.document.getElementById('audit-rows');
    const empty = scope.document.getElementById('audit-empty');
    rows.textContent = '';
    empty.hidden = logs.length > 0;
    logs.forEach(log => {
      const tr = scope.document.createElement('tr');
      tr.innerHTML = `<td>${escapeHtml(formatDate(log.createdAt))}</td><td><code>${escapeHtml(log.actorUserId || '—')}</code></td><td>${escapeHtml(log.action || '—')}</td><td>${escapeHtml(log.entityType || '—')}</td><td><code>${escapeHtml(log.entityId || '—')}</code></td><td><button class="ide-button ide-button--secondary ide-button--sm" type="button">Ver alteração</button></td>`;
      tr.querySelector('button').addEventListener('click', () => openDetail(log));
      rows.appendChild(tr);
    });
    scope.document.getElementById('audit-status').textContent = `${logs.length} registro(s) exibido(s). Consulta somente leitura.`;
  }

  function filters() {
    return {
      actorUserId: scope.document.getElementById('audit-user-filter').value,
      from: scope.document.getElementById('audit-from-filter').value,
      to: scope.document.getElementById('audit-to-filter').value,
      action: scope.document.getElementById('audit-action-filter').value,
      entityType: scope.document.getElementById('audit-entity-filter').value
    };
  }

  async function load() {
    try {
      scope.document.getElementById('audit-status').textContent = 'Carregando registros…';
      allLogs = await repository.listRecent(500);
      populateOptions(allLogs);
      render(await repository.listFiltered(filters()));
    } catch (error) {
      console.error('Erro ao consultar auditoria:', error);
      scope.document.getElementById('audit-status').textContent = 'Não foi possível consultar a auditoria. Verifique sua permissão de leitura.';
    }
  }

  async function bootstrap() {
    ensureLayout(); installStyles();
    if (!scope.firebase || typeof scope.firebase.firestore !== 'function' || !scope.MusicIdeAuditRepository) {
      scope.document.getElementById('audit-status').textContent = 'Auditoria indisponível nesta sessão.';
      return;
    }
    repository = new scope.MusicIdeAuditRepository.AuditRepository(scope.firebase.firestore());
    scope.document.getElementById('audit-filters').addEventListener('submit', async event => { event.preventDefault(); render(await repository.listFiltered(filters())); });
    scope.document.getElementById('audit-clear').addEventListener('click', () => {
      ['audit-user-filter','audit-from-filter','audit-to-filter','audit-action-filter','audit-entity-filter'].forEach(id => { scope.document.getElementById(id).value = ''; });
      render(allLogs);
    });
    scope.document.getElementById('audit-detail-close').addEventListener('click', () => scope.document.getElementById('audit-detail').close());
    await load();
  }

  if (scope.musicIdeAuthReady && typeof scope.musicIdeAuthReady.then === 'function') scope.musicIdeAuthReady.then(user => user && bootstrap()).catch(() => bootstrap());
  else scope.addEventListener('musicIdeAuthReady', event => { if (event.detail && event.detail.user) bootstrap(); }, { once: true });
})(typeof window !== 'undefined' ? window : null);
