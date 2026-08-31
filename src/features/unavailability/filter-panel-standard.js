(function initUnavailabilityFilterPanel(scope) {
  'use strict';
  if (!scope || !scope.document) return;
  if (new URLSearchParams(scope.location.search).get('section') !== 'unavailability') return;

  function el(id) {
    return scope.document.getElementById(id);
  }

  function dispatchChange(control) {
    if (!control) return;
    control.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function refreshFilterPanel() {
    const panel = el('unavailability-filter-panel');
    if (!panel) return;
    if (scope.MusicIdeFilterPanels && typeof scope.MusicIdeFilterPanels.updatePanel === 'function') {
      scope.MusicIdeFilterPanels.updatePanel(panel);
      return;
    }
    panel.dispatchEvent(new Event('ideFiltersChanged', { bubbles: true }));
  }

  function normalizeDateFilterGroup() {
    const month = el('unavailability-month-filter');
    const grid = el('unavailability-filter-grid');
    const clearButton = el('unavailability-clear-filters');
    if (!month || !grid) return false;

    const group = month.closest('.unavailability-filter, .unavailability-date-filter-group');
    if (!group) return false;

    group.className = 'unavailability-date-filter-group';
    group.removeAttribute('style');

    if (group.parentElement !== grid) {
      grid.insertBefore(group, clearButton || null);
    }

    const from = el('unavailability-filter-from');
    const to = el('unavailability-filter-to');
    if (month) month.setAttribute('aria-label', 'Filtrar indisponibilidades por mês');
    if (from) from.setAttribute('aria-label', 'Filtrar indisponibilidades a partir da data');
    if (to) to.setAttribute('aria-label', 'Filtrar indisponibilidades até a data');

    refreshFilterPanel();
    return true;
  }

  function clearFilters() {
    const person = el('admin-user-filter');
    const month = el('unavailability-month-filter');
    const from = el('unavailability-filter-from');
    const to = el('unavailability-filter-to');

    if (person) person.value = 'ALL';
    if (month) month.value = '';
    if (from) from.value = '';
    if (to) to.value = '';

    // O filtro de pessoa pertence à página principal; os filtros de período são
    // conectados pelo módulo mensal. Disparamos os eventos existentes em vez de
    // duplicar regras de filtragem neste adaptador visual.
    dispatchChange(person);
    dispatchChange(from);
    dispatchChange(to);
    refreshFilterPanel();
  }

  function observeMonthlyFilters() {
    const card = scope.document.querySelector('.unavailability-list-card');
    if (!card || typeof MutationObserver !== 'function') return;

    const observer = new MutationObserver(() => {
      if (normalizeDateFilterGroup()) observer.disconnect();
    });
    observer.observe(card, { childList: true, subtree: true });

    // Em navegação rápida o módulo mensal pode ter terminado antes deste script.
    if (normalizeDateFilterGroup()) observer.disconnect();
  }

  function bootstrap() {
    const panel = el('unavailability-filter-panel');
    if (!panel || panel.dataset.unavailabilityFilterReady === 'true') return;
    panel.dataset.unavailabilityFilterReady = 'true';

    const person = el('admin-user-filter');
    if (person) person.dataset.filterNeutral = 'ALL';

    const clearButton = el('unavailability-clear-filters');
    if (clearButton) clearButton.addEventListener('click', clearFilters);

    observeMonthlyFilters();

    if (scope.MusicIdeFilterPanels && typeof scope.MusicIdeFilterPanels.bootstrap === 'function') {
      scope.MusicIdeFilterPanels.bootstrap();
      refreshFilterPanel();
    }
  }

  if (scope.document.readyState === 'loading') {
    scope.document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
  } else {
    bootstrap();
  }
})(typeof window !== 'undefined' ? window : null);
