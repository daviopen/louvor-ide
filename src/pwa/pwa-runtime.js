(function initPwaRuntime(scope) {
  if (!scope || !scope.navigator || !('serviceWorker' in scope.navigator)) return;
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
