/**
 * App shell global do IDE Music.
 * Navegação desktop/mobile, rota ativa e autorização de UX por módulo.
 */
(function initializeIdeMusicShell(scope) {
  if (!scope || !scope.document) return;

  const COLLAPSED_KEY = 'musicIdeSidebarCollapsed';
  const shellExcludedPages = new Set(['login.html', 'consentimento.html', 'termos.html', 'privacidade.html']);
  const ROUTE_CATALOG = Object.freeze([
    Object.freeze({ id: 'dashboard', label: 'Dashboard', href: 'index.html', icon: 'fa-house', groupId: 'dashboard', groupLabel: '', permission: 'dashboard', menu: true }),
    Object.freeze({ id: 'users', label: 'Usuários', href: 'users.html', icon: 'fa-users', groupId: 'users', groupLabel: 'Usuários', permission: 'users', menu: true }),
    Object.freeze({ id: 'permissions', label: 'Permissões', href: 'module.html?section=permissions', icon: 'fa-lock', groupId: 'users', groupLabel: 'Usuários', permission: 'permissions', menu: true }),
    Object.freeze({ id: 'unavailability', label: 'Indisponibilidade', href: 'module.html?section=unavailability', icon: 'fa-calendar-xmark', groupId: 'schedules', groupLabel: 'Escalas', permission: 'unavailability', menu: true }),
    Object.freeze({ id: 'events', label: 'Eventos', href: 'module.html?section=events', icon: 'fa-calendar-days', groupId: 'schedules', groupLabel: 'Escalas', permission: 'events', menu: true }),
    Object.freeze({ id: 'schedules', label: 'Escalas', href: 'module.html?section=schedules', icon: 'fa-calendar-check', groupId: 'schedules', groupLabel: 'Escalas', permission: 'schedules', menu: true }),
    Object.freeze({ id: 'schedules-export', label: 'Exportar escalas', href: 'module.html?section=schedules&view=export', icon: 'fa-file-pdf', groupId: 'schedules', groupLabel: 'Escalas', permission: 'schedules', menu: true }),
    Object.freeze({ id: 'schedules-participation', label: 'Participações', href: 'module.html?section=schedules&view=participation', icon: 'fa-chart-column', groupId: 'schedules', groupLabel: 'Escalas', permission: 'schedules', menu: true }),
    Object.freeze({ id: 'setlists-upcoming', label: 'Próximos Setlists', href: 'setlists.html?view=upcoming', icon: 'fa-list-check', groupId: 'setlists', groupLabel: 'Setlists', permission: 'setlists', menu: true }),
    Object.freeze({ id: 'setlists-history', label: 'Histórico de Setlists', href: 'setlists.html?view=history', icon: 'fa-clock-rotate-left', groupId: 'setlists', groupLabel: 'Setlists', permission: 'setlists', menu: true }),
    Object.freeze({ id: 'setlist-view', label: 'Visualizar Setlist', href: 'setlist-view.html?id=:id', icon: 'fa-eye', groupId: 'setlists', groupLabel: 'Setlists', permission: 'setlists', menu: false }),
    Object.freeze({ id: 'setlist-edit', label: 'Editar Setlist', href: 'setlist.html?id=:id', icon: 'fa-pen', groupId: 'setlists', groupLabel: 'Setlists', permission: 'setlists', minLevel: 'edit', menu: false }),
    Object.freeze({ id: 'songs', label: 'Consultar músicas', href: 'consultar.html', icon: 'fa-music', groupId: 'songs', groupLabel: 'Músicas', permission: 'songs', menu: true }),
    Object.freeze({ id: 'song-view', label: 'Visualizar música', href: 'ver.html?id=:id', icon: 'fa-eye', groupId: 'songs', groupLabel: 'Músicas', permission: 'songs', menu: false }),
    Object.freeze({ id: 'new-song', label: 'Nova Música', href: 'nova-musica.html', icon: 'fa-circle-plus', groupId: 'songs', groupLabel: 'Músicas', permission: 'songs', minLevel: 'edit', menu: true }),
    Object.freeze({ id: 'audit', label: 'Auditoria', href: 'module.html?section=audit', icon: 'fa-clipboard-list', groupId: 'administration', groupLabel: 'Administração', permission: 'audit', menu: true }),
    Object.freeze({ id: 'settings-template', label: 'Template de Escala', href: 'module.html?section=settings', icon: 'fa-calendar-check', groupId: 'settings', groupLabel: 'Configurações', adminOnly: true, menu: true }),
    Object.freeze({ id: 'settings-functions', label: 'Funções Ministeriais', href: 'module.html?section=settings&tab=functions', icon: 'fa-layer-group', groupId: 'settings', groupLabel: 'Configurações', adminOnly: true, menu: true }),
    Object.freeze({ id: 'settings-routes', label: 'Rotas e Acessos', href: 'module.html?section=settings&tab=routes', icon: 'fa-route', groupId: 'settings', groupLabel: 'Configurações', adminOnly: true, menu: true }),
    Object.freeze({ id: 'help', label: 'Ajuda', href: 'help.html', icon: 'fa-circle-question', groupId: 'help', groupLabel: '', public: true, menu: true }),
    Object.freeze({ id: 'login', label: 'Login', href: 'login.html', icon: 'fa-right-to-bracket', groupId: 'public', groupLabel: 'Públicas', public: true, menu: false }),
    Object.freeze({ id: 'terms', label: 'Termos de Uso', href: 'termos.html', icon: 'fa-file-contract', groupId: 'public', groupLabel: 'Públicas', public: true, menu: false }),
    Object.freeze({ id: 'privacy', label: 'Privacidade', href: 'privacidade.html', icon: 'fa-shield-halved', groupId: 'public', groupLabel: 'Públicas', public: true, menu: false }),
    Object.freeze({ id: 'consent', label: 'Consentimento', href: 'consentimento.html', icon: 'fa-check-double', groupId: 'public', groupLabel: 'Públicas', public: true, menu: false })
  ]);
  const navigationGroups = Object.freeze([...new Map(ROUTE_CATALOG.filter(route => route.menu === true).map(route => [route.groupId, route.groupLabel])).entries()].map(([id, label]) => Object.freeze({ id, label, items: ROUTE_CATALOG.filter(route => route.menu === true && route.groupId === id) })));
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

  function initializeSettingsPage() {
    const page = currentPage(scope.location && scope.location.pathname);
    const params = new URLSearchParams(scope.location && scope.location.search || '');
    const section = params.get('section');
    if (page !== 'module.html' || section !== 'settings') return;
    if (scope.document.querySelector('script[data-ide-settings-page]')) return;
    const script = scope.document.createElement('script');
    script.src = params.get('tab') === 'routes'
      ? '../js/modules/route-access-page.js?v=20260901-route-catalog'
      : '../js/modules/settings-page.js?v=20260827-settings-submenus';
    script.defer = true;
    script.setAttribute('data-ide-settings-page', 'true');
    scope.document.head.appendChild(script);
  }

  initializeObservability();
  initializeSettingsPage();

  function currentPage(pathname) {
    return String(pathname || '').split('/').filter(Boolean).pop() || 'index.html';
  }

  function currentNavigationId() {
    const page = currentPage(scope.location && scope.location.pathname);
    const params = new URLSearchParams(scope.location && scope.location.search || '');
    if (page === 'users.html') return 'users';
    if (page === 'help.html') return 'help';
    if (page === 'login.html') return 'login';
    if (page === 'termos.html') return 'terms';
    if (page === 'privacidade.html') return 'privacy';
    if (page === 'consentimento.html') return 'consent';
    if (page === 'setlist-view.html') return 'setlist-view';
    if (page === 'setlist.html') return 'setlist-edit';
    if (page === 'ver.html') return 'song-view';
    if (page === 'consultar.html') return 'songs';
    if (page === 'nova-musica.html') return 'new-song';
    if (page === 'module.html') {
      const section = params.get('section');
      if (section === 'settings') {
        if (params.get('tab') === 'functions') return 'settings-functions';
        if (params.get('tab') === 'routes') return 'settings-routes';
        return 'settings-template';
      }
      if (section === 'schedules') {
        const scheduleView = params.get('view');
        if (scheduleView === 'export') return 'schedules-export';
        if (scheduleView === 'participation') return 'schedules-participation';
      }
      return moduleSections.has(section) ? section : 'dashboard';
    }
    if (page === 'setlists.html') return params.get('view') === 'history' ? 'setlists-history' : 'setlists-upcoming';
    return 'dashboard';
  }

  function normalizeLevel(value) {
    const normalized = String(value || '').toLowerCase();
    if (['edit', 'write', 'edicao', 'edição'].includes(normalized)) return 'edit';
    if (['read', 'view', 'leitura'].includes(normalized)) return 'read';
    return 'none';
  }

  function isAdminProfile(profile) {
    const role = String(profile?.role || '').toUpperCase();
    const accessProfile = String(profile?.accessProfile || '').toUpperCase();
    return profile?.isSuperAdmin === true || profile?.isAdmin === true || role === 'SUPER_ADMIN' || role === 'ADMIN' || accessProfile === 'ADMINISTRATOR';
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
    if (item && item.public === true) return true;
    if (item && item.adminOnly === true) return isAdminProfile(profile);
    const level = resolveAccessLevel(profile, item.permission);
    return item.minLevel === 'edit' ? level === 'edit' : level === 'read' || level === 'edit';
  }

  function navigationItems() {
    return navigationGroups.flatMap(group => group.items);
  }

  function currentItem() {
    const id = currentNavigationId();
    return ROUTE_CATALOG.find(item => item.id === id) || null;
  }

  function firstAllowedHref(profile) {
    const item = navigationItems().find(candidate => canViewItem(candidate, profile));
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
    ensureStylesheet('../styles/main-menu.css?v=20260827-settings-menu-standard', 'data-ide-main-menu');
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
    const mobileIds = ['dashboard', 'schedules', 'setlists-upcoming', 'songs'];
    const candidates = mobileIds.map(id => ROUTE_CATALOG.find(route => route.id === id)).filter(item => item && canViewItem(item, profile));
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

  scope.MusicIdeNavigation = { routeCatalog: ROUTE_CATALOG, navigationGroups, resolveAccessLevel, canViewItem, currentNavigationId, enforceCurrentRoute, mountAccountControls, isAdminProfile };
  if (scope.document.readyState === 'loading') scope.document.addEventListener('DOMContentLoaded', buildShell, { once: true });
  else buildShell();
})(typeof window !== 'undefined' ? window : null);
