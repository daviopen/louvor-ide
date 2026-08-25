(function initNavigationLayout(globalScope) {
  const text = (v) => v == null ? '' : String(v);
  function assertDocument(doc) { if (!doc || typeof doc.createElement !== 'function') throw new TypeError('Navigation components require a DOM document.'); }

  function createSearchBox(options = {}, doc = globalScope.document) {
    assertDocument(doc); const wrap = doc.createElement('div'); wrap.className = 'ide-search-box'; const input = doc.createElement('input'); input.type = 'search'; input.className = 'ide-search-box__input'; input.placeholder = text(options.placeholder || 'Buscar...'); input.setAttribute('aria-label', text(options.ariaLabel || 'Buscar')); if (typeof options.onInput === 'function') input.addEventListener('input', options.onInput); const icon = doc.createElement('span'); icon.className = 'ide-search-box__icon'; icon.setAttribute('aria-hidden','true'); icon.textContent = '⌕'; wrap.append(icon, input); return wrap;
  }

  function createFilterBar(options = {}, doc = globalScope.document) {
    assertDocument(doc); const bar = doc.createElement('div'); bar.className = 'ide-filter-bar'; bar.setAttribute('role','group'); bar.setAttribute('aria-label', text(options.ariaLabel || 'Filtros')); (options.children || []).forEach((child) => child && bar.appendChild(child)); if (options.clearAction) bar.appendChild(options.clearAction); return bar;
  }

  function createPageHeader(options = {}, doc = globalScope.document) {
    assertDocument(doc); const header = doc.createElement('header'); header.className = 'ide-page-header'; const main = doc.createElement('div'); main.className = 'ide-page-header__main'; const title = doc.createElement('h1'); title.className = 'ide-page-header__title'; title.textContent = text(options.title); main.appendChild(title); if (options.subtitle) { const sub = doc.createElement('p'); sub.className = 'ide-page-header__subtitle'; sub.textContent = text(options.subtitle); main.appendChild(sub); } header.appendChild(main); if (options.actions && options.actions.length) { const actions = doc.createElement('div'); actions.className = 'ide-page-header__actions'; options.actions.forEach((a) => actions.appendChild(a)); header.appendChild(actions); } return header;
  }

  function createBreadcrumb(options = {}, doc = globalScope.document) {
    assertDocument(doc); const nav = doc.createElement('nav'); nav.className = 'ide-breadcrumb'; nav.setAttribute('aria-label', options.ariaLabel || 'Breadcrumb'); const ol = doc.createElement('ol'); (options.items || []).forEach((item, index, arr) => { const li = doc.createElement('li'); if (item.href && index < arr.length - 1) { const a = doc.createElement('a'); a.href = item.href; a.textContent = text(item.label); li.appendChild(a); } else { li.textContent = text(item.label); if (index === arr.length - 1) li.setAttribute('aria-current','page'); } ol.appendChild(li); }); nav.appendChild(ol); return nav;
  }

  function createSidebar(options = {}, doc = globalScope.document) {
    assertDocument(doc); const aside = doc.createElement('aside'); aside.className = 'ide-ds-sidebar'; aside.setAttribute('aria-label', text(options.ariaLabel || 'Navegação principal')); const nav = doc.createElement('nav'); (options.items || []).filter((i) => i.visible !== false).forEach((item) => { const a = doc.createElement('a'); a.className = 'ide-ds-sidebar__link'; a.href = text(item.href || '#'); a.textContent = text(item.label); if (item.active) { a.classList.add('is-active'); a.setAttribute('aria-current','page'); } nav.appendChild(a); }); aside.appendChild(nav); return aside;
  }

  function createMobileNavigation(options = {}, doc = globalScope.document) {
    assertDocument(doc); const nav = doc.createElement('nav'); nav.className = 'ide-mobile-nav'; nav.setAttribute('aria-label', text(options.ariaLabel || 'Navegação móvel')); (options.items || []).filter((i) => i.visible !== false).slice(0,5).forEach((item) => { const a = doc.createElement('a'); a.href = text(item.href || '#'); a.className = 'ide-mobile-nav__item'; if (item.active) { a.classList.add('is-active'); a.setAttribute('aria-current','page'); } if (item.icon) { const icon = doc.createElement('span'); icon.className = 'ide-mobile-nav__icon'; icon.setAttribute('aria-hidden','true'); icon.textContent = text(item.icon); a.appendChild(icon); } const label = doc.createElement('span'); label.textContent = text(item.label); a.appendChild(label); nav.appendChild(a); }); return nav;
  }

  function createPermissionGuard(options = {}, doc = globalScope.document) {
    assertDocument(doc); const allowed = typeof options.allowed === 'function' ? Boolean(options.allowed()) : Boolean(options.allowed); if (allowed) return options.content || doc.createDocumentFragment(); const fallback = doc.createElement('div'); fallback.className = 'ide-permission-guard'; fallback.setAttribute('role','status'); fallback.textContent = text(options.fallback || 'Você não tem permissão para acessar este conteúdo.'); return fallback;
  }

  function createFormField(options = {}, doc = globalScope.document) {
    assertDocument(doc); if (!options.control) throw new TypeError('FormField requires control.'); const field = doc.createElement('div'); field.className = `ide-field ${options.error ? 'ide-field--error' : ''}`.trim(); const id = options.id || options.control.id || `ide-form-field-${Math.random().toString(36).slice(2,8)}`; options.control.id = id; if (options.label) { const label = doc.createElement('label'); label.className = 'ide-field__label'; label.htmlFor = id; label.textContent = text(options.label); field.appendChild(label); } else if (!options.control.getAttribute || !options.control.getAttribute('aria-label')) throw new TypeError('FormField requires label or an aria-labeled control.'); field.appendChild(options.control); const ids = []; if (options.hint) { const hint = doc.createElement('div'); hint.id = `${id}-hint`; hint.className = 'ide-field__hint'; hint.textContent = text(options.hint); field.appendChild(hint); ids.push(hint.id); } if (options.error) { const error = doc.createElement('div'); error.id = `${id}-error`; error.className = 'ide-field__error'; error.setAttribute('role','alert'); error.textContent = text(options.error); field.appendChild(error); ids.push(error.id); options.control.setAttribute('aria-invalid','true'); } if (ids.length) options.control.setAttribute('aria-describedby', ids.join(' ')); return field;
  }

  function createCrudPage(options = {}, doc = globalScope.document) {
    assertDocument(doc); const page = doc.createElement('main'); page.className = 'ide-crud-page'; if (options.breadcrumb) page.appendChild(createBreadcrumb({ items: options.breadcrumb }, doc)); page.appendChild(createPageHeader({ title: options.title, subtitle: options.subtitle, actions: options.actions || [] }, doc)); if (options.filters) page.appendChild(createFilterBar({ children: options.filters, clearAction: options.clearAction }, doc)); const content = doc.createElement('section'); content.className = 'ide-crud-page__content'; if (options.content) content.appendChild(options.content); page.appendChild(content); return page;
  }

  function createFormLayout(options = {}, doc = globalScope.document) {
    assertDocument(doc); const form = doc.createElement('form'); form.className = 'ide-form-layout'; if (options.noValidate) form.noValidate = true; if (typeof options.onSubmit === 'function') form.addEventListener('submit', options.onSubmit); const body = doc.createElement('div'); body.className = 'ide-form-layout__body'; (options.fields || []).forEach((f) => f && body.appendChild(f)); form.appendChild(body); if (options.actions && options.actions.length) { const actions = doc.createElement('div'); actions.className = 'ide-form-layout__actions'; options.actions.forEach((a) => actions.appendChild(a)); form.appendChild(actions); } return form;
  }

  const api = { createSearchBox, createFilterBar, createPageHeader, createBreadcrumb, createSidebar, createMobileNavigation, createPermissionGuard, createFormField, createCrudPage, createFormLayout };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (globalScope) { globalScope.IDEMusic = globalScope.IDEMusic || {}; globalScope.IDEMusic.NavigationLayout = api; }
})(typeof window !== 'undefined' ? window : globalThis);
