/**
 * Tela somente leitura de auditoria.
 * Requer permissão de leitura no módulo `audit`; a regra do Firestore é a
 * autoridade final. Nenhuma operação de create/update/delete é exposta aqui.
 */
(function initAuditPage(scope) {
  if (!scope || !scope.document) return;
  const params = new URLSearchParams(scope.location && scope.location.search || '');
  if (params.get('section') !== 'audit') return;

  const RENDER_CHUNK_SIZE = 75;
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  const toDate = value => value && typeof value.toDate === 'function' ? value.toDate() : (value ? new Date(value) : null);
  const formatDate = value => {
    const date = toDate(value);
    return date && !Number.isNaN(date.getTime()) ? date.toLocaleString('pt-BR') : '—';
  };
  const pretty = value => JSON.stringify(value ?? null, null, 2);
  const now = () => scope.performance && typeof scope.performance.now === 'function' ? scope.performance.now() : Date.now();
  const reportDuration = (event, startedAt, context = {}) => {
    const durationMs = Math.round((now() - startedAt) * 10) / 10;
    if (scope.MusicIdeObservability?.info) scope.MusicIdeObservability.info(event, 'Métrica de performance da tela de auditoria.', { ...context, durationMs });
    return durationMs;
  };

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
          <details id="audit-filter-panel" class="ide-filter-panel" data-filter-panel="audit">
            <summary class="ide-filter-panel__summary"><span class="ide-filter-panel__summary-main"><i class="fa-solid fa-sliders" aria-hidden="true"></i> Filtros <span class="ide-filter-panel__badge">0</span></span><span class="ide-filter-panel__summary-meta"><span class="ide-filter-panel__state">Mostrar</span></span></summary>
            <div class="ide-filter-panel__body">
              <form id="audit-filters" class="ide-audit-filters" aria-label="Filtros de auditoria">
                <label><span>Usuário (UID)</span><input id="audit-user-filter" class="ide-field__control ide-field__input" type="search" autocomplete="off" placeholder="UID ou parte do UID"></label>
                <label><span>De</span><input id="audit-from-filter" class="ide-field__control ide-field__input" type="date"></label>
                <label><span>Até</span><input id="audit-to-filter" class="ide-field__control ide-field__input" type="date"></label>
                <label><span>Ação</span><select id="audit-action-filter" class="ide-field__control ide-select"><option value="">Todas</option></select></label>
                <label><span>Entidade</span><select id="audit-entity-filter" class="ide-field__control ide-select"><option value="">Todas</option></select></label>
                <div class="ide-audit-filter-actions"><button class="ide-button ide-button--primary" type="submit">Aplicar filtros</button><button id="audit-clear" class="ide-button ide-button--ghost" type="button"><i class="fa-solid fa-filter-circle-xmark" aria-hidden="true"></i> Limpar filtros</button></div>
              </form>
            </div>
          </details>
          <div id="audit-status" class="ide-audit-status" role="status" aria-live="polite">Carregando registros…</div>
          <div class="ide-table-wrap"><table class="ide-table ide-audit-table"><thead><tr><th>Data/hora</th><th>Usuário</th><th>Ação</th><th>Entidade</th><th>ID</th><th>Detalhes</th></tr></thead><tbody id="audit-rows"></tbody></table></div>
          <div class="ide-audit-more"><button id="audit-load-more" class="ide-button ide-button--secondary" type="button" hidden>Carregar mais registros</button></div>
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
    if (scope.MusicIdeFilterPanels) scope.MusicIdeFilterPanels.bootstrap();
    return root;
  }

  function installStyles() {
    if (scope.document.getElementById('audit-page-style')) return;
    const style = scope.document.createElement('style');
    style.id = 'audit-page-style';
    style.textContent = `.ide-audit-root{display:grid;gap:1rem}.ide-audit-root h1{margin:.25rem 0}.ide-audit-root>p{margin:0;color:var(--text-secondary)}.ide-audit-filters{display:grid;grid-template-columns:2fr repeat(4,minmax(150px,1fr));gap:.75rem;align-items:end}.ide-audit-filters label{display:grid;gap:.35rem;font-weight:600}.ide-audit-filter-actions{display:flex;gap:.5rem;grid-column:1/-1}.ide-audit-status{color:var(--text-secondary)}.ide-table-wrap{overflow:auto}.ide-audit-table{min-width:980px}.ide-audit-table td{vertical-align:top}.ide-audit-user{display:grid;gap:.15rem}.ide-audit-user strong{font-weight:700}.ide-audit-user code{color:var(--text-secondary)}.ide-audit-table code{font-size:.82rem}.ide-audit-more{display:flex;justify-content:center}.ide-audit-dialog{width:min(900px,calc(100vw - 2rem));max-height:90vh;overflow:auto;border:1px solid var(--border);border-radius:var(--radius-lg);background:var(--surface);color:var(--text-primary);padding:1.25rem}.ide-audit-dialog::backdrop{background:rgba(0,0,0,.5)}.ide-audit-dialog-heading{display:flex;justify-content:space-between;align-items:center;gap:1rem}.ide-audit-detail-meta{display:grid;grid-template-columns:max-content 1fr;gap:.35rem .75rem}.ide-audit-detail-meta dt{font-weight:700}.ide-audit-diff{display:grid;grid-template-columns:1fr 1fr;gap:1rem}.ide-audit-dialog pre{white-space:pre-wrap;overflow-wrap:anywhere;background:var(--surface-secondary);padding:.75rem;border-radius:var(--radius-md);border:1px solid var(--border)}@media(max-width:900px){.ide-audit-filters{grid-template-columns:1fr 1fr}.ide-audit-diff{grid-template-columns:1fr}}@media(max-width:560px){.ide-audit-filters{grid-template-columns:1fr}.ide-audit-filter-actions{grid-column:auto;flex-direction:column}}`;
    scope.document.head.appendChild(style);
  }

  let repository;
  let database;
  let allLogs = [];
  let visibleLogs = [];
  let renderedCount = 0;
  const actorNames = new Map();

  function actorName(log) {
    const uid = String(log && log.actorUserId || '').trim();
    return uid ? actorNames.get(uid) || '' : '';
  }

  function actorMarkup(log) {
    const uid = String(log && log.actorUserId || '').trim();
    const name = actorName(log);
    if (!uid) return '—';
    return `<span class="ide-audit-user">${name ? `<strong>${escapeHtml(name)}</strong>` : ''}<code>${escapeHtml(uid)}</code></span>`;
  }

  async function resolveActorNames(logs) {
    if (!database) return;
    const ids = new Set(logs.map(log => String(log.actorUserId || '').trim()).filter(Boolean));
    if (!ids.size) return;
    const unresolved = [...ids].filter(id => !actorNames.has(id));
    if (!unresolved.length) return;
    const wanted = new Set(unresolved);
    try {
      const snapshot = await database.collection('users').get();
      snapshot.forEach(doc => {
        if (!wanted.has(doc.id)) return;
        const data = doc.data() || {};
        actorNames.set(doc.id, data.name ? String(data.name).trim() : '');
      });
      unresolved.forEach(id => { if (!actorNames.has(id)) actorNames.set(id, ''); });
    } catch (error) {
      console.warn('Não foi possível resolver nomes dos usuários da auditoria em lote.', error);
      unresolved.forEach(id => actorNames.set(id, ''));
    }
  }

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
    const name = actorName(log);
    const uid = log.actorUserId || '—';
    const userDisplay = name ? `${escapeHtml(name)} <code>${escapeHtml(uid)}</code>` : `<code>${escapeHtml(uid)}</code>`;
    scope.document.getElementById('audit-detail-meta').innerHTML = `<dt>Data/hora</dt><dd>${escapeHtml(formatDate(log.createdAt))}</dd><dt>Usuário</dt><dd>${userDisplay}</dd><dt>Ação</dt><dd>${escapeHtml(log.action || '—')}</dd><dt>Entidade</dt><dd>${escapeHtml(log.entityType || '—')}</dd><dt>ID</dt><dd><code>${escapeHtml(log.entityId || '—')}</code></dd>`;
    scope.document.getElementById('audit-before').textContent = pretty(details.before);
    scope.document.getElementById('audit-after').textContent = pretty(details.after);
    const context = { ...details }; delete context.before; delete context.after;
    scope.document.getElementById('audit-context').textContent = pretty(context);
    scope.document.getElementById('audit-detail').showModal();
  }

  function createRow(log) {
    const tr = scope.document.createElement('tr');
    tr.innerHTML = `<td>${escapeHtml(formatDate(log.createdAt))}</td><td>${actorMarkup(log)}</td><td>${escapeHtml(log.action || '—')}</td><td>${escapeHtml(log.entityType || '—')}</td><td><code>${escapeHtml(log.entityId || '—')}</code></td><td><button class="ide-button ide-button--secondary ide-button--sm" type="button">Ver alteração</button></td>`;
    tr.querySelector('button').addEventListener('click', () => openDetail(log));
    return tr;
  }

  function updateRenderStatus() {
    const total = visibleLogs.length;
    const shown = Math.min(renderedCount, total);
    scope.document.getElementById('audit-status').textContent = total === shown
      ? `${total} registro(s) exibido(s). Consulta somente leitura.`
      : `${shown} de ${total} registro(s) renderizado(s). Consulta somente leitura.`;
    scope.document.getElementById('audit-load-more').hidden = shown >= total;
  }

  function appendNextChunk() {
    if (renderedCount >= visibleLogs.length) return updateRenderStatus();
    const startedAt = now();
    const rows = scope.document.getElementById('audit-rows');
    const fragment = scope.document.createDocumentFragment();
    const end = Math.min(renderedCount + RENDER_CHUNK_SIZE, visibleLogs.length);
    for (let index = renderedCount; index < end; index += 1) fragment.appendChild(createRow(visibleLogs[index]));
    rows.appendChild(fragment);
    renderedCount = end;
    updateRenderStatus();
    reportDuration('performance.audit.render', startedAt, { rendered: end, total: visibleLogs.length });
  }

  function render(logs) {
    const rows = scope.document.getElementById('audit-rows');
    const empty = scope.document.getElementById('audit-empty');
    rows.textContent = '';
    visibleLogs = Array.isArray(logs) ? logs : [];
    renderedCount = 0;
    empty.hidden = visibleLogs.length > 0;
    appendNextChunk();
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
    const startedAt = now();
    try {
      scope.document.getElementById('audit-status').textContent = 'Carregando registros…';
      allLogs = await repository.listRecent(500);
      await resolveActorNames(allLogs);
      populateOptions(allLogs);
      const filtered = await repository.listFiltered(filters(), allLogs);
      render(filtered);
      reportDuration('performance.audit.load', startedAt, { fetched: allLogs.length, filtered: filtered.length });
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
    database = scope.firebase.firestore();
    repository = new scope.MusicIdeAuditRepository.AuditRepository(database);
    scope.document.getElementById('audit-filters').addEventListener('submit', async event => { event.preventDefault(); await load(); });
    scope.document.getElementById('audit-clear').addEventListener('click', () => {
      ['audit-user-filter','audit-from-filter','audit-to-filter','audit-action-filter','audit-entity-filter'].forEach(id => { scope.document.getElementById(id).value = ''; });
      scope.document.getElementById('audit-filter-panel').dispatchEvent(new CustomEvent('ideFiltersChanged'));
      render(allLogs);
    });
    scope.document.getElementById('audit-load-more').addEventListener('click', appendNextChunk);
    scope.document.getElementById('audit-detail-close').addEventListener('click', () => scope.document.getElementById('audit-detail').close());
    await load();
  }

  if (scope.musicIdeAuthReady && typeof scope.musicIdeAuthReady.then === 'function') scope.musicIdeAuthReady.then(user => user && bootstrap()).catch(() => bootstrap());
  else scope.addEventListener('musicIdeAuthReady', event => { if (event.detail && event.detail.user) bootstrap(); }, { once: true });
})(typeof window !== 'undefined' ? window : null);
