(function initPwaRuntime(scope) {
  if (!scope) return;

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
