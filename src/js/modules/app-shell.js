/**
 * Navegação global responsiva do IDE Music.
 * Injeta a barra lateral e aplica o Design System nas páginas autenticadas
 * sem depender da marcação específica de cada tela legada.
 */
(function initializeIdeMusicShell(scope) {
  if (!scope || !scope.document) return;

  const items = [
    { id: 'home', label: 'Visão geral', href: 'index.html', icon: '⌂' },
    { id: 'songs', label: 'Músicas', href: 'consultar.html', icon: '♪' },
    { id: 'new-song', label: 'Nova música', href: 'nova-musica.html', icon: '+' },
    { id: 'setlists', label: 'Setlists', href: 'setlists.html', icon: '≡' },
    { id: 'new-setlist', label: 'Criar setlist', href: 'setlist.html', icon: '✦' }
  ];

  const pageMap = {
    'index.html': 'home',
    'consultar.html': 'songs',
    'ver.html': 'songs',
    'nova-musica.html': 'new-song',
    'setlists.html': 'setlists',
    'setlist-view.html': 'setlists',
    'setlist.html': 'new-setlist'
  };

  function currentPage(pathname) {
    return String(pathname || '').split('/').filter(Boolean).pop() || 'index.html';
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
    ensureStylesheet('../styles/legacy-migration.css', 'data-ide-legacy-migration');
  }

  function addClasses(selector, ...classes) {
    scope.document.querySelectorAll(selector).forEach(node => node.classList.add(...classes));
  }

  function migrateLegacyControls() {
    const body = scope.document.body;
    if (!body) return;
    body.classList.add('ide-ds-migrated');

    scope.document.querySelectorAll('button, .btn, .action-btn, .add-button, .clear-filters, .back-btn, .nav-btn, .nav-button, .transpose-btn, .music-action-btn, .song-link-btn, .create-setlist-btn').forEach(node => {
      node.classList.add('ide-button', 'ide-button--md');
      if (node.classList.contains('btn-delete') || node.classList.contains('delete-btn') || node.classList.contains('btn-down') || node.classList.contains('delete')) {
        node.classList.add('ide-button--danger');
      } else if (node.classList.contains('btn-secondary') || node.classList.contains('secondary') || node.classList.contains('back-btn') || node.classList.contains('btn-back')) {
        node.classList.add('ide-button--secondary');
      } else {
        node.classList.add('ide-button--primary');
      }
    });

    addClasses('input:not([type="checkbox"]):not([type="radio"]), .form-input, .filter-input, .search-box', 'ide-field__control', 'ide-field__input');
    addClasses('textarea, .form-textarea', 'ide-field__control', 'ide-field__textarea');
    addClasses('select', 'ide-field__control', 'ide-select');
    addClasses('input[type="checkbox"], input[type="radio"]', 'ide-choice__input');

    addClasses('.form-container, .filters, .left-panel, .right-panel, .setlist-info, .music-info-display, .search-section, .transpose-controls, .ministers-summary, .info-section, .controls', 'ide-section-card');
    addClasses('.music-card, .stat-card, .song-card, .setlist-card, .music-item, .song-item, .meta-item, .info-item', 'ide-card');
    addClasses('.empty-state', 'ide-empty-state');
    addClasses('table', 'ide-table');

    scope.document.querySelectorAll('.loading').forEach(node => {
      node.classList.add('ide-loading');
      if (!node.getAttribute('role')) node.setAttribute('role', 'status');
      if (!node.getAttribute('aria-live')) node.setAttribute('aria-live', 'polite');
    });

    scope.document.querySelectorAll('label').forEach(label => {
      if (!label.classList.contains('ide-field__label')) label.classList.add('ide-field__label');
    });

    scope.document.querySelectorAll('table').forEach(table => {
      const parent = table.parentElement;
      if (parent && !parent.classList.contains('ide-table-wrap')) {
        const wrapper = scope.document.createElement('div');
        wrapper.className = 'ide-table-wrap';
        parent.insertBefore(wrapper, table);
        wrapper.appendChild(table);
      }
    });
  }

  function setMenuOpen(isOpen) {
    scope.document.body.classList.toggle('ide-sidebar-open', isOpen);
    const toggle = scope.document.getElementById('ide-sidebar-toggle');
    if (toggle) toggle.setAttribute('aria-expanded', String(isOpen));
  }

  function buildShell() {
    if (!scope.document.body || scope.document.getElementById('ide-sidebar')) return;

    const page = currentPage(scope.location && scope.location.pathname);
    if (page === 'login.html') return;

    ensureDesignSystemStyles();
    migrateLegacyControls();

    const activeId = pageMap[page] || 'home';
    scope.document.body.classList.add('ide-shell-enabled');

    const sidebar = element('aside', 'ide-sidebar');
    sidebar.id = 'ide-sidebar';
    sidebar.setAttribute('aria-label', 'Navegação principal');

    const brand = element('a', 'ide-sidebar-brand');
    brand.href = 'index.html';
    brand.setAttribute('aria-label', 'IDE Music — início');
    brand.append(
      element('span', 'ide-sidebar-brand-main', 'IDE'),
      element('span', 'ide-sidebar-brand-detail', 'Music')
    );

    const context = element('div', 'ide-sidebar-context');
    context.append(
      element('span', 'ide-sidebar-context-label', 'Ministério de louvor'),
      element('strong', '', 'Comunidade IDE')
    );

    const nav = element('nav', 'ide-sidebar-nav');
    nav.setAttribute('aria-label', 'Seções do sistema');

    items.forEach(item => {
      const link = element('a', 'ide-sidebar-link');
      link.href = item.href;
      link.dataset.navId = item.id;
      link.append(
        element('span', 'ide-sidebar-icon', item.icon),
        element('span', 'ide-sidebar-label', item.label)
      );

      if (item.id === activeId) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      }

      link.addEventListener('click', () => setMenuOpen(false));
      nav.appendChild(link);
    });

    const footer = element('div', 'ide-sidebar-footer', 'Repertório · Setlists · Escalas');
    sidebar.append(brand, context, nav, footer);

    const toggle = element('button', 'ide-sidebar-toggle');
    toggle.id = 'ide-sidebar-toggle';
    toggle.type = 'button';
    toggle.setAttribute('aria-controls', 'ide-sidebar');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Abrir menu');
    toggle.append(
      element('span', 'ide-sidebar-toggle-line'),
      element('span', 'ide-sidebar-toggle-line'),
      element('span', 'ide-sidebar-toggle-line')
    );
    toggle.addEventListener('click', () => {
      setMenuOpen(!scope.document.body.classList.contains('ide-sidebar-open'));
    });

    const overlay = element('button', 'ide-sidebar-overlay');
    overlay.type = 'button';
    overlay.tabIndex = -1;
    overlay.setAttribute('aria-label', 'Fechar menu');
    overlay.addEventListener('click', () => setMenuOpen(false));

    scope.document.body.prepend(sidebar, toggle, overlay);
    scope.document.addEventListener('keydown', event => {
      if (event.key === 'Escape') setMenuOpen(false);
    });
  }

  if (scope.document.readyState === 'loading') {
    scope.document.addEventListener('DOMContentLoaded', buildShell, { once: true });
  } else {
    buildShell();
  }
})(typeof window !== 'undefined' ? window : null);
