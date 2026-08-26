/**
 * App shell global do IDE Music.
 * Navegação desktop/mobile, rota ativa e autorização de UX por módulo.
 */
(function initializeIdeMusicShell(scope) {
  if (!scope || !scope.document) return;

  const COLLAPSED_KEY = 'musicIdeSidebarCollapsed';
  const shellExcludedPages = new Set(['login.html', 'consentimento.html', 'termos.html', 'privacidade.html']);
  const navigationGroups = [
    { id: 'dashboard', label: '', items: [{ id: 'dashboard', label: 'Dashboard', href: 'index.html', icon: 'fa-house', permission: 'dashboard' }] },
    { id: 'users', label: 'Usuários', items: [
      { id: 'users', label: 'Usuários', href: 'users.html', icon: 'fa-users', permission: 'users' },
      { id: 'permissions', label: 'Permissões', href: 'module.html?section=permissions', icon: 'fa-lock', permission: 'permissions' }
    ] },
    { id: 'schedules', label: 'Escalas', items: [
      { id: 'unavailability', label: 'Indisponibilidade', href: 'module.html?section=unavailability', icon: 'fa-calendar-xmark', permission: 'unavailability' },
      { id: 'events', label: 'Eventos', href: 'module.html?section=events', icon: 'fa-calendar-days', permission: 'events' },
      { id: 'schedules', label: 'Escalas', href: 'module.html?section=schedules', icon: 'fa-calendar-check', permission: 'schedules' }
    ] },
    { id: 'setlists', label: 'Setlist', items: [
      { id: 'setlists-upcoming', label: 'Próximos', href: 'setlists.html?view=upcoming', icon: 'fa-list-check', permission: 'setlists' },
      { id: 'setlists-history', label: 'Histórico', href: 'setlists.html?view=history', icon: 'fa-clock-rotate-left', permission: 'setlists' }
    ] },
    { id: 'songs', label: 'Músicas', items: [
      { id: 'songs', label: 'Consultar', href: 'consultar.html', icon: 'fa-music', permission: 'songs' },
      { id: 'new-song', label: 'Nova Música', href: 'nova-musica.html', icon: 'fa-circle-plus', permission: 'songs', minLevel: 'edit' }
    ] },
    { id: 'administration', label: 'Administração', items: [
      { id: 'audit', label: 'Auditoria', href: 'module.html?section=audit', icon: 'fa-clipboard-list', permission: 'audit' },
      { id: 'settings', label: 'Configurações', href: 'module.html?section=settings', icon: 'fa-gear', permission: 'settings' }
    ] }
  ];
  const moduleSections = new Set(['permissions', 'unavailability', 'events', 'schedules', 'audit', 'settings']);

  function initializeObservability() {
    if (scope.MusicIdeObservability) return;
    if (scope.document.querySelector('script[data-ide-observability]')) return;
    const script = scope.document.createElement('script');
    script.src = '../js/modules/observability.js?v=20260825-observability';
    script.defer = true;
    script.setAttribute('data-ide-observability', 'true');
    scope.document.head.appendChild(script);
  }

  initializeObservability();

  function currentPage(pathname) {
    return String(pathname || '').split('/').filter(Boolean).pop() || 'index.html';
  }

  function currentNavigationId() {
    const page = currentPage(scope.location && scope.location.pathname);
    const params = new URLSearchParams(scope.location && scope.location.search || '');
    if (page === 'users.html') return 'users';
    if (page === 'module.html') {
      const section = params.get('section');
      return moduleSections.has(section) ? section : 'dashboard';
    }
    if (page === 'setlists.html') return params.get('view') === 'history' ? 'setlists-history' : 'setlists-upcoming';
    if (page === 'setlist-view.html' || page === 'setlist.html') return 'setlists-upcoming';
    if (page === 'consultar.html' || page === 'ver.html') return 'songs';
    if (page === 'nova-musica.html') return 'new-song';
    return 'dashboard';
  }

  function normalizeLevel(value) {
    const normalized = String(value || '').toLowerCase();
    if (['edit', 'write', 'edicao', 'edição'].includes(normalized)) return 'edit';
    if (['read', 'view', 'leitura'].includes(normalized)) return 'read';
    return 'none';
  }

  function resolveAccessLevel(profile, permission) {
    if (!profile) return 'none';
    if (profile.role === 'SUPER_ADMIN' || profile.isSuperAdmin === true) return 'edit';
    const permissions = profile.permissions && typeof profile.permissions === 'object' ? profile.permissions : {};
    const explicit = permissions[permission];
    if (explicit && typeof explicit === 'object') return normalizeLevel(explicit.level || explicit.access);
    if (explicit != null) return normalizeLevel(explicit);
    return 'none';
  }

  function canViewItem(item, profile) {
    const level = resolveAccessLevel(profile, item.permission);
    return item.minLevel === 'edit' ? level === 'edit' : level === 'read' || level === 'edit';
  }

  function currentItem() {
    const id = currentNavigationId();
    return navigationGroups.flatMap(group => group.items).find(item => item.id === id) || null;
  }

  function firstAllowedHref(profile) {
    const item = navigationGroups.flatMap(group => group.items).find(candidate => canViewItem(candidate, profile));
    return item && item.href;
  }

  function enforceCurrentRoute(profile) {
    const item = currentItem();
    if (!item || canViewItem(item, profile)) return true;
    const destination = firstAllowedHref(profile);
    if (destination) {
      const current = `${currentPage(scope.location.pathname)}${scope.location.search || ''}`;
      if (destination !== current) scope.location.replace(destination);
      return false;
    }
    scope.document.body.innerHTML = '<main class="ide-module-page"><div class="ide-module-page__inner"><section class="ide-module-card"><h1>Sem acesso</h1><p>Seu usuário não possui acesso a nenhum módulo do IDE Music. Procure um administrador.</p></section></div></main>';
    return false;
  }

  function element(tag, className, text) {
    const node = scope.document.createElement(tag);
    if (className) node.className = className;
    if (typeof text === 'string') node.textContent = text;
    return node;
  }

  function ensureStylesheet(href, marker) {
    if (scope.document.querySelector(`link[${marker}]`)) return;
    const link = scope.document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.setAttribute(marker, 'true');
    scope.document.head.appendChild(link);
  }

  function ensureDesignSystemStyles() {
    ensureStylesheet('../styles/tokens.css', 'data-ide-tokens');
    ensureStylesheet('../styles/design-system.css', 'data-ide-design-system');
    ensureStylesheet('../styles/button.css', 'data-ide-buttons');
    ensureStylesheet('../styles/input.css', 'data-ide-inputs');
    ensureStylesheet('../styles/filter-panel.css', 'data-ide-filter-panel');
    ensureStylesheet('../styles/legacy-migration.css', 'data-ide-legacy-migration');
    ensureStylesheet('../styles/main-menu.css?v=20260825-account-menu', 'data-ide-main-menu');
    ensureStylesheet('../styles/ui-consistency.css?v=20260826-ui-consistency', 'data-ide-ui-consistency');
  }

  function initializeFilterPanels() {
    if (scope.MusicIdeFilterPanels) return scope.MusicIdeFilterPanels.bootstrap();
    if (scope.document.querySelector('script[data-ide-filter-panel]')) return;
    const script = scope.document.createElement('script');
    script.src = '../js/modules/filter-panel.js?v=20260826-filter-panel';
    script.defer = true;
    script.setAttribute('data-ide-filter-panel', 'true');
    scope.document.head.appendChild(script);
  }

  function initializeLgpdGate() {
    const start = () => {
      if (scope.MusicIdeLgpd && typeof scope.MusicIdeLgpd.bootstrapGate === 'function') scope.MusicIdeLgpd.bootstrapGate(scope);
    };
    if (scope.MusicIdeLgpd) return start();
    if (scope.document.querySelector('script[data-ide-lgpd]')) return;
    const script = scope.document.createElement('script');
    script.src = '../js/modules/lgpd-service.js?v=20260825-lgpd';
    script.defer = true;
    script.setAttribute('data-ide-lgpd', 'true');
    script.addEventListener('load', start, { once: true });
    scope.document.head.appendChild(script);
  }

  function addClasses(selector, ...classes) {
    scope.document.querySelectorAll(selector).forEach(node => node.classList.add(...classes));
  }

  function migrateLegacyControls() {
    const body = scope.document.body;
    if (!body) return;
    body.classList.add('ide-ds-migrated');
    scope.document.querySelectorAll('button, .btn, .action-btn, .add-button, .clear-filters, .back-btn, .nav-btn, .nav-button, .transpose-btn, .music-action-btn, .song-link-btn, .create-setlist-btn').forEach(node => {
      if (node.matches('.performance-button, .segment-button, .icon-control, .key-control, .navigation-button, .song-strip-button, .exit-stage-button, .view-tab')) return;
      node.classList.add('ide-button', 'ide-button--md');
      const hasVariant = ['primary', 'secondary', 'ghost', 'danger'].some(variant => node.classList.contains(`ide-button--${variant}`));
      if (hasVariant) return;
      if (['btn-delete', 'delete-btn', 'delete', 'btn-danger'].some(name => node.classList.contains(name))) node.classList.add('ide-button--danger');
      else if (['btn-primary', 'primary', 'add-button', 'save-btn', 'create-setlist-btn'].some(name => node.classList.contains(name))) node.classList.add('ide-button--primary');
      else if (['btn-reset', 'clear-filters', 'forgot-button'].some(name => node.classList.contains(name))) node.classList.add('ide-button--ghost');
      else node.classList.add('ide-button--secondary');
    });
    addClasses('input:not([type="checkbox"]):not([type="radio"]), .form-input, .filter-input, .search-box', 'ide-field__control', 'ide-field__input');
    addClasses('textarea, .form-textarea', 'ide-field__control', 'ide-field__textarea');
    addClasses('select', 'ide-field__control', 'ide-select');
    addClasses('.form-container, .filters, .left-panel, .right-panel, .setlist-info, .music-info-display, .search-section, .transpose-controls, .ministers-summary, .info-section, .controls', 'ide-section-card');
    addClasses('.music-card, .stat-card, .song-card, .setlist-card, .music-item, .song-item, .meta-item, .info-item', 'ide-card');
    addClasses('.empty-state', 'ide-empty-state');
    addClasses('table', 'ide-table');
    scope.document.querySelectorAll('.loading').forEach(node => {
      node.classList.add('ide-loading');
      if (!node.getAttribute('role')) node.setAttribute('role', 'status');
      if (!node.getAttribute('aria-live')) node.setAttribute('aria-live', 'polite');
    });
  }

  function readCollapsedPreference() {
    try { return scope.localStorage && scope.localStorage.getItem(COLLAPSED_KEY) === 'true'; }
    catch (_) { return false; }
  }

  function setCollapsed(collapsed) {
    scope.document.body.classList.toggle('ide-sidebar-collapsed', collapsed);
    const button = scope.document.getElementById('ide-sidebar-collapse');
    if (button) {
      button.setAttribute('aria-pressed', String(collapsed));
      button.setAttribute('aria-label', collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral');
    }
    try { if (scope.localStorage) scope.localStorage.setItem(COLLAPSED_KEY, String(collapsed)); } catch (_) {}
  }

  function setMenuOpen(open) {
    scope.document.body.classList.toggle('ide-sidebar-open', open);
    const toggle = scope.document.getElementById('ide-sidebar-toggle');
    if (toggle) toggle.setAttribute('aria-expanded', String(open));
  }

  function createNavLink(item, activeId, compact = false) {
    const link = element('a', compact ? 'ide-mobile-nav-item' : 'ide-sidebar-link');
    link.href = item.href;
    link.dataset.navId = item.id;
    link.dataset.tooltip = item.label;
    const icon = element('i', `fa-solid ${item.icon}`);
    icon.setAttribute('aria-hidden', 'true');
    link.append(icon, element('span', compact ? 'ide-mobile-nav-label' : 'ide-sidebar-label', item.label));
    if (item.id === activeId) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
    link.addEventListener('click', () => setMenuOpen(false));
    return link;
  }

  function renderNavigation(profile) {
    const nav = scope.document.getElementById('ide-sidebar-nav');
    if (!nav) return;
    const activeId = currentNavigationId();
    nav.textContent = '';
    navigationGroups.forEach(group => {
      const visible = group.items.filter(item => canViewItem(item, profile));
      if (!visible.length) return;
      const section = element('section', 'ide-sidebar-section');
      if (group.label) section.appendChild(element('div', 'ide-sidebar-section-title', group.label));
      visible.forEach(item => section.appendChild(createNavLink(item, activeId)));
      nav.appendChild(section);
    });
    const mobile = scope.document.getElementById('ide-mobile-navigation');
    if (!mobile) return;
    mobile.textContent = '';
    const candidates = [navigationGroups[0].items[0], navigationGroups[2].items[2], navigationGroups[3].items[0], navigationGroups[4].items[0]].filter(item => canViewItem(item, profile));
    candidates.slice(0, 4).forEach(item => mobile.appendChild(createNavLink(item, activeId, true)));
    const more = element('button', 'ide-mobile-nav-item ide-mobile-nav-more');
    more.type = 'button';
    more.innerHTML = '<i class="fa-solid fa-bars" aria-hidden="true"></i><span class="ide-mobile-nav-label">Mais</span>';
    more.addEventListener('click', () => setMenuOpen(true));
    mobile.appendChild(more);
  }

  function mountAccountControls() {
    const mount = scope.document.getElementById('ide-sidebar-account');
    const controls = scope.document.getElementById('music-ide-user');
    if (mount && controls && controls.parentElement !== mount) mount.appendChild(controls);
  }

  function watchAccountControls() {
    mountAccountControls();
    if (typeof scope.MutationObserver !== 'function' || !scope.document.body) return;
    const observer = new scope.MutationObserver(() => mountAccountControls());
    observer.observe(scope.document.body, { childList: true });
    scope.__musicIdeAccountMountObserver = observer;
  }

  function buildShell() {
    if (!scope.document.body || scope.document.getElementById('ide-sidebar')) return;
    const page = currentPage(scope.location && scope.location.pathname);
    if (shellExcludedPages.has(page)) return;
    initializeLgpdGate();
    ensureDesignSystemStyles();
    initializeFilterPanels();
    migrateLegacyControls();
    scope.document.body.classList.add('ide-shell-enabled');

    const sidebar = element('aside', 'ide-sidebar');
    sidebar.id = 'ide-sidebar';
    sidebar.setAttribute('aria-label', 'Navegação principal');
    const header = element('div', 'ide-sidebar-header');
    const brand = element('a', 'ide-sidebar-brand');
    brand.href = 'index.html';
    brand.setAttribute('aria-label', 'IDE Music — Dashboard');
    brand.append(element('span', 'ide-sidebar-brand-main', 'IDE'), element('span', 'ide-sidebar-brand-detail', 'Music'));
    const collapse = element('button', 'ide-sidebar-collapse');
    collapse.id = 'ide-sidebar-collapse';
    collapse.type = 'button';
    collapse.innerHTML = '<i class="fa-solid fa-angles-left" aria-hidden="true"></i>';
    collapse.addEventListener('click', () => setCollapsed(!scope.document.body.classList.contains('ide-sidebar-collapsed')));
    header.append(brand, collapse);

    const context = element('div', 'ide-sidebar-context');
    context.append(element('span', 'ide-sidebar-context-label', 'Ministério de louvor'), element('strong', '', 'Comunidade IDE'));
    const nav = element('nav', 'ide-sidebar-nav');
    nav.id = 'ide-sidebar-nav';
    nav.setAttribute('aria-label', 'Seções do sistema');
    const account = element('div', 'ide-sidebar-account');
    account.id = 'ide-sidebar-account';
    account.setAttribute('aria-label', 'Conta e preferências');
    const footer = element('div', 'ide-sidebar-footer');
    footer.innerHTML = '<div>IDE Music</div><div class="ide-sidebar-legal"><a href="termos.html">Termos</a><a href="privacidade.html">Privacidade</a></div>';
    sidebar.append(header, context, nav, account, footer);

    const toggle = element('button', 'ide-sidebar-toggle');
    toggle.id = 'ide-sidebar-toggle';
    toggle.type = 'button';
    toggle.setAttribute('aria-controls', 'ide-sidebar');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Abrir menu');
    toggle.innerHTML = '<i class="fa-solid fa-bars" aria-hidden="true"></i>';
    toggle.addEventListener('click', () => setMenuOpen(!scope.document.body.classList.contains('ide-sidebar-open')));

    const overlay = element('button', 'ide-sidebar-overlay');
    overlay.type = 'button';
    overlay.tabIndex = -1;
    overlay.setAttribute('aria-label', 'Fechar menu');
    overlay.addEventListener('click', () => setMenuOpen(false));

    const mobile = element('nav', 'ide-mobile-navigation');
    mobile.id = 'ide-mobile-navigation';
    mobile.setAttribute('aria-label', 'Navegação móvel');

    scope.document.body.prepend(sidebar, toggle, overlay);
    scope.document.body.appendChild(mobile);
    watchAccountControls();
    setCollapsed(readCollapsedPreference());
    renderNavigation(scope.currentMusicIdeProfile || null);
    scope.addEventListener('musicIdeAuthReady', event => {
      const profile = event && event.detail && event.detail.profile || null;
      if (enforceCurrentRoute(profile)) renderNavigation(profile);
      mountAccountControls();
    });
    scope.document.addEventListener('keydown', event => { if (event.key === 'Escape') setMenuOpen(false); });
  }

  scope.MusicIdeNavigation = { navigationGroups, resolveAccessLevel, canViewItem, currentNavigationId, enforceCurrentRoute, mountAccountControls };
  if (scope.document.readyState === 'loading') scope.document.addEventListener('DOMContentLoaded', buildShell, { once: true });
  else buildShell();
})(typeof window !== 'undefined' ? window : null);
