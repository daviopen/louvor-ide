(function initFilterPanels(scope) {
  'use strict';
  if (!scope || !scope.document) return;

  const NAV_STORAGE_PREFIX = 'musicIdeNavigationState:';

  function currentPage(pathname = scope.location?.pathname) {
    return String(pathname || '').split('/').filter(Boolean).pop() || 'index.html';
  }

  function appDirectory(locationLike = scope.location) {
    const pathname = String(locationLike?.pathname || '/');
    return pathname.slice(0, pathname.lastIndexOf('/') + 1) || '/';
  }

  function safeRelativeUrl(value, locationLike = scope.location) {
    const raw = String(value || '').trim();
    if (!raw || /[\u0000-\u001F\u007F]/.test(raw)) return '';
    try {
      const base = new URL(locationLike.href);
      const target = new URL(raw, base);
      const directory = appDirectory(locationLike);
      if (target.origin !== base.origin || !target.pathname.startsWith(directory)) return '';
      const relativePath = target.pathname.slice(directory.length);
      if (!relativePath || relativePath.split('/').includes('..')) return '';
      return `${relativePath}${target.search}${target.hash}`;
    } catch (_) {
      return '';
    }
  }

  function currentRelativeUrl() {
    return `${currentPage()}${scope.location.search || ''}${scope.location.hash || ''}`;
  }

  function withReturnTo(targetHref, sourceHref = currentRelativeUrl()) {
    const safeTarget = safeRelativeUrl(targetHref);
    const safeSource = safeRelativeUrl(sourceHref);
    if (!safeTarget || !safeSource) return targetHref;
    try {
      const target = new URL(safeTarget, scope.location.href);
      target.searchParams.set('returnTo', safeSource);
      return safeRelativeUrl(target.href) || targetHref;
    } catch (_) {
      return targetHref;
    }
  }

  function remember(key, href = currentRelativeUrl()) {
    const safeHref = safeRelativeUrl(href);
    if (!key || !safeHref || safeHref.length > 2048) return safeHref;
    try { scope.sessionStorage?.setItem(`${NAV_STORAGE_PREFIX}${key}`, safeHref); } catch (_) {}
    return safeHref;
  }

  function remembered(key) {
    if (!key) return '';
    try { return safeRelativeUrl(scope.sessionStorage?.getItem(`${NAV_STORAGE_PREFIX}${key}`) || ''); }
    catch (_) { return ''; }
  }

  function resolveReturnUrl(fallback, key) {
    const fromQuery = safeRelativeUrl(new URLSearchParams(scope.location.search || '').get('returnTo'));
    return fromQuery || remembered(key) || safeRelativeUrl(fallback) || fallback;
  }

  function replaceQuery(values, defaults = {}) {
    if (!scope.history?.replaceState || !scope.location?.href) return currentRelativeUrl();
    const url = new URL(scope.location.href);
    Object.entries(values || {}).forEach(([key, value]) => {
      const normalized = value == null ? '' : String(value);
      const defaultValue = defaults[key] == null ? '' : String(defaults[key]);
      if (!normalized || normalized === defaultValue) url.searchParams.delete(key);
      else url.searchParams.set(key, normalized);
    });
    const next = `${url.pathname}${url.search}${url.hash}`;
    const current = `${scope.location.pathname}${scope.location.search}${scope.location.hash}`;
    if (next !== current) scope.history.replaceState(scope.history.state, '', next);
    return currentRelativeUrl();
  }

  function queryValue(name, fallback = '') {
    const value = new URLSearchParams(scope.location.search || '').get(name);
    return value == null ? fallback : value;
  }

  function queryPositiveInt(name, fallback = 1) {
    const value = Number.parseInt(queryValue(name, ''), 10);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }

  function applyReturnNavigation() {
    const page = currentPage();
    let key = '';
    let fallback = '';
    let selectors = '';
    if (page === 'setlist.html' || page === 'setlist-view.html') {
      key = 'setlists';
      fallback = 'setlists.html?view=upcoming';
      selectors = '#performance-back-link, a[href^="setlists.html"]';
    } else if (page === 'nova-musica.html' || page === 'ver.html') {
      key = 'songs';
      fallback = 'consultar.html';
      selectors = 'a[href^="consultar.html"]';
    }
    if (!selectors) return;
    const destination = resolveReturnUrl(fallback, key);
    scope.document.querySelectorAll(selectors).forEach(link => {
      if (link instanceof HTMLAnchorElement) link.setAttribute('href', destination);
    });
  }

  function isControlActive(control) {
    if (!control || control.disabled) return false;
    if (control.matches('[type="checkbox"], [type="radio"]')) return control.checked;
    const value = String(control.value ?? '').trim();
    const neutral = String(control.dataset.filterNeutral ?? '').trim();
    return value !== neutral;
  }

  function activeCount(panel) {
    return [...panel.querySelectorAll('input, select, textarea')].filter(isControlActive).length;
  }

  function updatePanel(panel) {
    const count = activeCount(panel);
    panel.dataset.activeCount = String(count);
    const badge = panel.querySelector('.ide-filter-panel__badge');
    const state = panel.querySelector('.ide-filter-panel__state');
    if (badge) {
      badge.textContent = String(count);
      badge.setAttribute('aria-label', `${count} filtro${count === 1 ? '' : 's'} ativo${count === 1 ? '' : 's'}`);
    }
    if (state) state.textContent = panel.open ? 'Ocultar' : 'Mostrar';
  }

  function initPanel(panel) {
    if (panel.dataset.filterPanelReady === 'true') return;
    panel.dataset.filterPanelReady = 'true';

    // Filtros sempre iniciam recolhidos. A abertura é uma ação explícita do usuário
    // e não é restaurada entre navegações/recarregamentos.
    panel.open = false;
    updatePanel(panel);

    panel.addEventListener('toggle', () => updatePanel(panel));
    panel.addEventListener('input', () => updatePanel(panel));
    panel.addEventListener('change', () => updatePanel(panel));
    panel.addEventListener('ideFiltersChanged', () => updatePanel(panel));
  }

  function bootstrap() {
    scope.document.querySelectorAll('details[data-filter-panel]').forEach(initPanel);
    applyReturnNavigation();
  }

  if (scope.document.readyState === 'loading') scope.document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
  else bootstrap();

  scope.MusicIdeFilterPanels = { bootstrap, updatePanel };
  scope.MusicIdeNavigationState = {
    safeRelativeUrl,
    currentRelativeUrl,
    withReturnTo,
    remember,
    remembered,
    resolveReturnUrl,
    replaceQuery,
    queryValue,
    queryPositiveInt,
    applyReturnNavigation
  };
})(typeof window !== 'undefined' ? window : null);