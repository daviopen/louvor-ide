(function initDataDisplay(globalScope) {
  const text = (v) => v == null ? '' : String(v);
  function assertDocument(doc) { if (!doc || typeof doc.createElement !== 'function') throw new TypeError('Data display components require a DOM document.'); }

  function createAvatar(options = {}, doc = globalScope.document) {
    assertDocument(doc);
    const node = options.src ? doc.createElement('img') : doc.createElement('span');
    node.className = `ide-avatar ide-avatar--${['sm','md','lg'].includes(options.size) ? options.size : 'md'}`;
    if (options.src) { node.src = text(options.src); node.alt = text(options.alt || options.name || 'Avatar'); }
    else { node.textContent = text(options.initials || options.name || '?').trim().split(/\s+/).slice(0,2).map((p) => p[0]).join('').toUpperCase(); node.setAttribute('aria-hidden', options.ariaLabel ? 'true' : 'false'); if (options.ariaLabel) node.setAttribute('aria-label', text(options.ariaLabel)); }
    return node;
  }

  function createChip(options = {}, doc = globalScope.document) {
    assertDocument(doc);
    const chip = doc.createElement('span'); chip.className = `ide-chip ${options.className || ''}`.trim();
    if (options.avatar) chip.appendChild(createAvatar({ ...options.avatar, size: 'sm' }, doc));
    const label = doc.createElement('span'); label.textContent = text(options.label); chip.appendChild(label);
    if (options.removable) { const remove = doc.createElement('button'); remove.type = 'button'; remove.className = 'ide-chip__remove'; remove.setAttribute('aria-label', `Remover ${text(options.label)}`); remove.textContent = '×'; remove.addEventListener('click', options.onRemove || (() => {})); chip.appendChild(remove); }
    return chip;
  }
  function createUserChip(options = {}, doc = globalScope.document) { return createChip({ ...options, className: `ide-chip--user ${options.className || ''}`, avatar: options.avatar || { name: options.label } }, doc); }
  function createRoleChip(options = {}, doc = globalScope.document) { return createChip({ ...options, className: `ide-chip--role ${options.className || ''}` }, doc); }

  function createCard(options = {}, doc = globalScope.document) {
    assertDocument(doc); const card = doc.createElement(options.as || 'section'); card.className = `ide-card ${options.className || ''}`.trim();
    if (options.title) { const h = doc.createElement('h3'); h.className = 'ide-card__title'; h.textContent = text(options.title); card.appendChild(h); }
    if (options.content) { const body = doc.createElement('div'); body.className = 'ide-card__body'; if (typeof options.content === 'string') body.textContent = options.content; else body.appendChild(options.content); card.appendChild(body); }
    if (options.actions) { const actions = doc.createElement('div'); actions.className = 'ide-card__actions'; options.actions.forEach((a) => actions.appendChild(a)); card.appendChild(actions); }
    return card;
  }
  function createSectionCard(options = {}, doc = globalScope.document) { const card = createCard(options, doc); card.classList.add('ide-section-card'); return card; }

  function createTable(options = {}, doc = globalScope.document) {
    assertDocument(doc); const wrap = doc.createElement('div'); wrap.className = 'ide-table-wrap'; const table = doc.createElement('table'); table.className = 'ide-table';
    if (options.caption) { const caption = doc.createElement('caption'); caption.textContent = text(options.caption); table.appendChild(caption); }
    const thead = doc.createElement('thead'); const hr = doc.createElement('tr'); (options.columns || []).forEach((c) => { const th = doc.createElement('th'); th.scope = 'col'; th.textContent = text(c.label || c.key); hr.appendChild(th); }); thead.appendChild(hr); table.appendChild(thead);
    const tbody = doc.createElement('tbody'); (options.rows || []).forEach((row) => { const tr = doc.createElement('tr'); (options.columns || []).forEach((c) => { const td = doc.createElement('td'); const value = typeof c.render === 'function' ? c.render(row[c.key], row) : row[c.key]; if (value && typeof value !== 'string' && typeof value !== 'number') td.appendChild(value); else td.textContent = text(value); tr.appendChild(td); }); tbody.appendChild(tr); }); table.appendChild(tbody); wrap.appendChild(table); return wrap;
  }

  function createPagination(options = {}, doc = globalScope.document) {
    assertDocument(doc); const current = Math.max(1, Number(options.page || 1)); const pages = Math.max(1, Number(options.totalPages || 1)); const nav = doc.createElement('nav'); nav.className = 'ide-pagination'; nav.setAttribute('aria-label', options.ariaLabel || 'Paginação');
    const add = (label, page, disabled, currentPage) => { const b = doc.createElement('button'); b.type = 'button'; b.className = 'ide-pagination__button'; b.textContent = label; b.disabled = disabled; if (currentPage) b.setAttribute('aria-current','page'); b.addEventListener('click', () => { if (!disabled && typeof options.onPageChange === 'function') options.onPageChange(page); }); nav.appendChild(b); };
    add('‹', current - 1, current <= 1, false); const start = Math.max(1, current - 2); const end = Math.min(pages, start + 4); for (let p = start; p <= end; p++) add(String(p), p, false, p === current); add('›', current + 1, current >= pages, false); return nav;
  }

  function createEmptyState(options = {}, doc = globalScope.document) { assertDocument(doc); const box = doc.createElement('section'); box.className = 'ide-empty-state'; const title = doc.createElement('h3'); title.textContent = text(options.title || 'Nada por aqui'); const desc = doc.createElement('p'); desc.textContent = text(options.description || 'Não há itens para exibir.'); box.append(title, desc); if (options.action) box.appendChild(options.action); return box; }
  function createSkeleton(options = {}, doc = globalScope.document) { assertDocument(doc); const box = doc.createElement('div'); box.className = `ide-skeleton ide-skeleton--${options.shape === 'circle' ? 'circle' : 'line'}`; box.setAttribute('aria-hidden','true'); if (options.width) box.style.width = text(options.width); if (options.height) box.style.height = text(options.height); return box; }
  function createLoading(options = {}, doc = globalScope.document) { assertDocument(doc); const box = doc.createElement('div'); box.className = 'ide-loading'; box.setAttribute('role','status'); box.setAttribute('aria-live','polite'); const spinner = doc.createElement('span'); spinner.className = 'ide-loading__spinner'; spinner.setAttribute('aria-hidden','true'); const label = doc.createElement('span'); label.textContent = text(options.label || 'Carregando...'); box.append(spinner, label); return box; }

  const api = { createAvatar, createUserChip, createRoleChip, createCard, createSectionCard, createTable, createPagination, createEmptyState, createSkeleton, createLoading };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (globalScope) { globalScope.IDEMusic = globalScope.IDEMusic || {}; globalScope.IDEMusic.DataDisplay = api; }
})(typeof window !== 'undefined' ? window : globalThis);
