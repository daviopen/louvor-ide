(function initAppHeaderControls(scope) {
  'use strict';
  if (!scope?.document) return;

  const HEADER_ID = 'ide-app-header-actions';
  const ACCOUNT_ID = 'ide-header-account';
  const DESKTOP_QUERY = '(min-width: 901px)';
  let scheduled = false;

  function isDesktop() {
    return Boolean(scope.matchMedia?.(DESKTOP_QUERY).matches);
  }

  function ensureHeader() {
    let header = scope.document.getElementById(HEADER_ID);
    if (header) return header;
    header = scope.document.createElement('div');
    header.id = HEADER_ID;
    header.className = 'ide-app-header-actions';
    header.setAttribute('aria-label', 'Ações da conta');
    scope.document.body.appendChild(header);
    return header;
  }

  function notificationCenter() {
    return scope.document.getElementById('ide-notification-center');
  }

  function accountControls() {
    return scope.document.getElementById('music-ide-user');
  }

  function sidebarAccount() {
    return scope.document.getElementById('ide-sidebar-account');
  }

  function copyAccountIdentity(menu, controls) {
    const summary = menu.querySelector('.ide-header-account-summary');
    if (!summary || !controls) return;

    const visual = controls.querySelector('img, .music-ide-user-placeholder');
    const visualSlot = summary.querySelector('.ide-header-account-avatar');

    if (visualSlot && visual) {
      visualSlot.replaceChildren(visual.cloneNode(true));
      const clonedImage = visualSlot.querySelector('img');
      if (clonedImage) clonedImage.alt = '';
    }
  }

  function createAccountMenu(controls) {
    const menu = scope.document.createElement('details');
    menu.id = ACCOUNT_ID;
    menu.className = 'ide-header-account';
    menu.innerHTML = `
      <summary class="ide-header-account-summary" aria-label="Abrir opções da conta">
        <span class="ide-header-account-avatar" aria-hidden="true"></span>
      </summary>
      <div class="ide-header-account-panel">
        <a class="ide-header-account-profile" href="profile.html">
          <i class="fa-solid fa-user-circle" aria-hidden="true"></i>
          <span>Meu perfil</span>
        </a>
        <div class="ide-header-account-controls"></div>
      </div>`;
    menu.querySelector('.ide-header-account-controls').appendChild(controls);
    copyAccountIdentity(menu, controls);
    return menu;
  }

  function mountDesktopAccount(header, controls) {
    let menu = scope.document.getElementById(ACCOUNT_ID);
    if (!menu) {
      menu = createAccountMenu(controls);
      header.appendChild(menu);
    } else {
      const holder = menu.querySelector('.ide-header-account-controls');
      if (holder && controls.parentElement !== holder) holder.appendChild(controls);
      copyAccountIdentity(menu, controls);
      if (menu.parentElement !== header) header.appendChild(menu);
    }
  }

  function mountMobileAccount(controls) {
    const account = sidebarAccount();
    if (account && controls.parentElement !== account) account.appendChild(controls);
    const menu = scope.document.getElementById(ACCOUNT_ID);
    if (menu) {
      menu.open = false;
      menu.remove();
    }
  }

  function mountNotification(header) {
    const center = notificationCenter();
    if (!center) return;
    if (center.parentElement !== header) header.prepend(center);
  }

  function sync() {
    scheduled = false;
    if (!scope.document.body) return;
    const header = ensureHeader();
    const controls = accountControls();

    mountNotification(header);
    if (controls) {
      if (isDesktop()) mountDesktopAccount(header, controls);
      else mountMobileAccount(controls);
    }

    header.hidden = !header.children.length;
  }

  function scheduleSync() {
    if (scheduled) return;
    scheduled = true;
    (scope.requestAnimationFrame || scope.setTimeout)(sync);
  }

  function closeAccountMenu(event) {
    const menu = scope.document.getElementById(ACCOUNT_ID);
    if (!menu?.open) return;
    if (event?.type === 'keydown' && event.key === 'Escape') {
      menu.open = false;
      menu.querySelector('summary')?.focus();
      return;
    }
    if (event?.type === 'click' && !menu.contains(event.target)) menu.open = false;
  }

  function boot() {
    sync();

    const media = scope.matchMedia?.(DESKTOP_QUERY);
    if (typeof media?.addEventListener === 'function') media.addEventListener('change', scheduleSync);
    else if (typeof media?.addListener === 'function') media.addListener(scheduleSync);

    if (typeof scope.MutationObserver === 'function') {
      const observer = new scope.MutationObserver(scheduleSync);
      observer.observe(scope.document.body, { childList: true, subtree: true });
      scope.__ideHeaderControlsObserver = observer;
    }

    scope.addEventListener('musicIdeAuthReady', scheduleSync);
    scope.document.addEventListener('click', closeAccountMenu);
    scope.document.addEventListener('keydown', closeAccountMenu);
  }

  scope.MusicIdeAppHeaderControls = Object.freeze({ sync });
  if (scope.document.readyState === 'loading') scope.document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})(typeof window !== 'undefined' ? window : null);
