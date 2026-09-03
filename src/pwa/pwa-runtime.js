(function initPwaRuntime(scope) {
  if (!scope) return;

  const PWA_BOOT_TIMEOUT_MS = 9000;

  function isStandalone() {
    try {
      return scope.navigator?.standalone === true
        || scope.matchMedia?.('(display-mode: standalone)')?.matches === true;
    } catch (_) {
      return false;
    }
  }

  function setAuthMessage(message) {
    const element = scope.document?.getElementById('auth-message');
    if (!element) return false;
    element.textContent = message;
    element.dataset.type = 'info';
    element.hidden = false;
    return true;
  }

  function installStandaloneBootRecovery() {
    if (!scope.document || !isStandalone()) return false;

    // iOS uses the manifest background before the first document paint. Keep the
    // document root dark as well so a delayed WebKit paint never exposes white.
    scope.document.documentElement.style.backgroundColor = '#090b0c';

    scope.setTimeout(() => {
      const root = scope.document?.documentElement;
      if (!root?.classList.contains('auth-pending')) return;

      const pathname = String(scope.location?.pathname || '');
      if (/\/login\.html$/i.test(pathname)) {
        // Never leave the installed app with every login control hidden if
        // Firebase/WebKit takes too long to restore IndexedDB/local persistence.
        root.classList.remove('auth-pending');
        setAuthMessage('Não foi possível restaurar a sessão automaticamente. Entre novamente para continuar.');
        return;
      }

      // Protected pages should fail closed to the login instead of remaining on
      // an unpainted auth gate forever inside the Home Screen web app.
      scope.location.replace('/login.html?source=pwa-recovery');
    }, PWA_BOOT_TIMEOUT_MS);

    return true;
  }

  function removeLegacyInstallNotice() {
    if (!scope.document || !/\/login\.html$/i.test(scope.location?.pathname || '')) return false;

    const title = 'Use o IDE Music como aplicativo';
    const description = 'Depois de entrar, abra Ajuda';
    const candidates = Array.from(scope.document.querySelectorAll('div, aside, section, article'))
      .filter(element => {
        const text = String(element.textContent || '').replace(/\s+/g, ' ').trim();
        return text.includes(title) && text.includes(description);
      })
      .sort((left, right) => String(left.textContent || '').length - String(right.textContent || '').length);

    if (!candidates.length) return false;
    candidates[0].remove();
    return true;
  }

  installStandaloneBootRecovery();

  if (scope.document) {
    if (scope.document.readyState === 'loading') {
      scope.document.addEventListener('DOMContentLoaded', removeLegacyInstallNotice, { once: true });
    } else {
      removeLegacyInstallNotice();
    }

    if (/\/login\.html$/i.test(scope.location?.pathname || '') && scope.MutationObserver) {
      const observer = new scope.MutationObserver(() => removeLegacyInstallNotice());
      const startObserver = () => {
        if (!scope.document.body) return;
        observer.observe(scope.document.body, { childList: true, subtree: true });
        scope.setTimeout(() => observer.disconnect(), 10000);
      };
      if (scope.document.readyState === 'loading') {
        scope.document.addEventListener('DOMContentLoaded', startObserver, { once: true });
      } else {
        startObserver();
      }
    }
  }

  if (!scope.navigator || !('serviceWorker' in scope.navigator)) return;
  if (!scope.isSecureContext && scope.location.hostname !== 'localhost') return;

  scope.addEventListener('load', () => {
    scope.navigator.serviceWorker.register('/service-worker.js', { scope: '/' })
      .catch(error => {
        if (scope.MusicIdeObservability?.warn) {
          scope.MusicIdeObservability.warn(
            'pwa.serviceWorkerRegistrationFailed',
            'Não foi possível registrar o suporte de instalação.',
            { page: scope.location.pathname },
            { error }
          );
        }
      });
  }, { once: true });
})(window);
