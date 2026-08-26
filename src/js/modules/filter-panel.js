(function initFilterPanels(scope) {
  'use strict';
  if (!scope || !scope.document) return;

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
  }

  if (scope.document.readyState === 'loading') scope.document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
  else bootstrap();

  scope.MusicIdeFilterPanels = { bootstrap, updatePanel };
})(typeof window !== 'undefined' ? window : null);
