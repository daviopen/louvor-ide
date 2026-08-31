/**
 * Safety net for accessibility invariants that depend on dynamically rendered DOM.
 * Source components must still implement the correct semantics; this module prevents
 * regressions while legacy views are migrated.
 */
(function initializeUiQualityRuntime(scope) {
  if (!scope || !scope.document || scope.__musicIdeUiQualityRuntimeInstalled) return;
  scope.__musicIdeUiQualityRuntimeInstalled = true;

  const params = new URLSearchParams(scope.location?.search || '');
  const section = params.get('section') || '';
  const page = String(scope.location?.pathname || '').split('/').pop();
  const relevant = ['consultar.html', 'module.html', 'login.html'].includes(page);
  if (!relevant) return;

  function wrapUnavailabilityRows() {
    if (section !== 'unavailability') return;
    const grid = scope.document.getElementById('unavailability-calendar');
    if (!grid || grid.querySelector(':scope > [role="row"]')) return;
    const cells = Array.from(grid.children).filter(node => node.getAttribute('role') === 'gridcell');
    if (!cells.length) return;

    const fragment = scope.document.createDocumentFragment();
    for (let index = 0; index < cells.length; index += 7) {
      const row = scope.document.createElement('div');
      row.className = 'unavailability-calendar-row';
      row.setAttribute('role', 'row');
      cells.slice(index, index + 7).forEach(cell => row.appendChild(cell));
      fragment.appendChild(row);
    }
    grid.replaceChildren(fragment);
  }

  function ensureScrollableKeyboardAccess() {
    const selectors = [
      '.song-cifra',
      '.ide-table-wrap',
      '.monthly-absence-table-wrap',
      '.weekly-export-absence-content',
      '.schedule-monthly-summary > div[style*="overflow"]'
    ];
    scope.document.querySelectorAll(selectors.join(',')).forEach(node => {
      if (!node.hasAttribute('tabindex')) node.tabIndex = 0;
    });
  }

  function ensureFormNames() {
    scope.document.querySelectorAll('select[data-new-function]:not([aria-label]):not([aria-labelledby])').forEach(node => {
      node.setAttribute('aria-label', 'Função para adicionar à escala');
    });
  }

  function ensurePrimaryHeading() {
    if (scope.document.querySelector('main h1, #module-placeholder h1')) return;
    const heading = scope.document.querySelector('.ide-permissions-toolbar h2');
    if (!heading) return;
    const replacement = scope.document.createElement('h1');
    Array.from(heading.attributes).forEach(attribute => replacement.setAttribute(attribute.name, attribute.value));
    replacement.innerHTML = heading.innerHTML;
    heading.replaceWith(replacement);
  }

  function ensureLoginTouchTargets() {
    if (page !== 'login.html') return;
    const forgot = scope.document.querySelector('.forgot-button');
    if (forgot) forgot.style.minHeight = '44px';
  }

  let frame = 0;
  function apply() {
    frame = 0;
    wrapUnavailabilityRows();
    ensureScrollableKeyboardAccess();
    ensureFormNames();
    ensureLoginTouchTargets();
    if (section === 'permissions') ensurePrimaryHeading();
  }

  function scheduleApply() {
    if (frame) return;
    frame = scope.requestAnimationFrame ? scope.requestAnimationFrame(apply) : scope.setTimeout(apply, 0);
  }

  function start() {
    apply();
    if (!scope.MutationObserver || !scope.document.body) return;
    const observer = new scope.MutationObserver(scheduleApply);
    observer.observe(scope.document.body, { childList: true, subtree: true });
    scope.__musicIdeUiQualityObserver = observer;
  }

  if (scope.document.readyState === 'loading') scope.document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})(typeof window !== 'undefined' ? window : null);
