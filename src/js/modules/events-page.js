(function loadSystemSection(scope) {
  if (!scope || !scope.document) return;
  const section = new URLSearchParams(scope.location.search).get('section');

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = scope.document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      scope.document.head.appendChild(script);
    });
  }

  function loadStyle(href) {
    const link = scope.document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    scope.document.head.appendChild(link);
  }

  if (section === 'events') {
    loadScript('../js/modules/events-controller.js?v=20260825-schedules').catch(error => console.error('Falha ao carregar Eventos.', error));
    return;
  }

  if (section === 'schedules') {
    loadStyle('../styles/schedules.css?v=20260825-schedules');
    loadScript('../repositories/schedule-repository.js?v=20260825-schedules')
      .then(() => loadScript('../services/schedule-service.js?v=20260825-schedules'))
      .then(() => loadScript('../js/modules/schedules-page.js?v=20260825-schedules'))
      .catch(error => console.error('Falha ao carregar Escalas.', error));
  }
})(window);
