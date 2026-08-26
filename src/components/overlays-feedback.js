(function initOverlayFeedback(globalScope) {
  const text = (v) => v == null ? '' : String(v);
  let modalSequence = 0;
  function assertDocument(doc) { if (!doc || typeof doc.createElement !== 'function') throw new TypeError('Overlay components require a DOM document.'); }
  function appendContent(node, content) { if (!content) return; if (typeof content === 'string') node.textContent = content; else node.appendChild(content); }
  function focusableElements(root) {
    return Array.from(root.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'))
      .filter((element) => !element.hidden && element.getAttribute('aria-hidden') !== 'true');
  }

  function createModal(options = {}, doc = globalScope.document) {
    assertDocument(doc);
    const backdrop = doc.createElement('div');
    backdrop.className = 'ide-overlay';
    backdrop.hidden = options.open === false;
    const dialog = doc.createElement('section');
    dialog.className = 'ide-modal';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('tabindex', '-1');
    const modalId = `ide-modal-${++modalSequence}`;
    dialog.id = modalId;
    if (options.title) {
      const title = doc.createElement('h2');
      title.className = 'ide-modal__title';
      title.textContent = text(options.title);
      const titleId = options.titleId || `${modalId}-title`;
      title.id = titleId;
      dialog.setAttribute('aria-labelledby', titleId);
      dialog.appendChild(title);
    } else if (options.ariaLabel) dialog.setAttribute('aria-label', text(options.ariaLabel));
    else throw new TypeError('Modal requires title or ariaLabel.');
    const body = doc.createElement('div'); body.className = 'ide-modal__body'; appendContent(body, options.content); dialog.appendChild(body);
    if (options.actions) { const actions = doc.createElement('div'); actions.className = 'ide-modal__actions'; options.actions.forEach((a) => actions.appendChild(a)); dialog.appendChild(actions); }
    backdrop.appendChild(dialog);

    let previouslyFocused = null;
    const moveFocusInside = () => {
      const focusables = focusableElements(dialog);
      const target = options.initialFocus && dialog.querySelector(options.initialFocus)
        ? dialog.querySelector(options.initialFocus)
        : focusables[0] || dialog;
      if (target && typeof target.focus === 'function') target.focus();
    };
    const handleKeydown = (event) => {
      if (event.key === 'Escape' && options.closeOnEscape !== false) {
        event.preventDefault();
        backdrop.close();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusables = focusableElements(dialog);
      if (!focusables.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = doc.activeElement;
      if (event.shiftKey && (active === first || active === dialog)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    dialog.addEventListener('keydown', handleKeydown);

    backdrop.close = () => {
      if (backdrop.hidden) return;
      backdrop.hidden = true;
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') previouslyFocused.focus();
      if (typeof options.onClose === 'function') options.onClose();
    };
    backdrop.open = () => {
      previouslyFocused = doc.activeElement;
      backdrop.hidden = false;
      if (typeof globalScope.requestAnimationFrame === 'function') globalScope.requestAnimationFrame(moveFocusInside);
      else moveFocusInside();
    };
    if (options.closeOnBackdrop !== false) backdrop.addEventListener('click', (e) => { if (e.target === backdrop) backdrop.close(); });
    if (!backdrop.hidden) {
      previouslyFocused = doc.activeElement;
      if (typeof globalScope.requestAnimationFrame === 'function') globalScope.requestAnimationFrame(moveFocusInside);
    }
    return backdrop;
  }

  function createDrawer(options = {}, doc = globalScope.document) {
    assertDocument(doc);
    const shell = createModal({ ...options, ariaLabel: options.ariaLabel || options.title || 'Painel lateral' }, doc);
    shell.classList.add('ide-overlay--drawer');
    shell.children[0].classList.add('ide-drawer', `ide-drawer--${options.side === 'left' ? 'left' : 'right'}`);
    return shell;
  }

  function createConfirmDialog(options = {}, doc = globalScope.document) {
    assertDocument(doc);
    const confirm = doc.createElement('button'); confirm.type = 'button'; confirm.className = 'ide-button ide-button--danger'; confirm.textContent = text(options.confirmLabel || 'Confirmar');
    const cancel = doc.createElement('button'); cancel.type = 'button'; cancel.className = 'ide-button ide-button--ghost'; cancel.textContent = text(options.cancelLabel || 'Cancelar');
    const modal = createModal({ title: options.title || 'Confirmar ação', content: options.message || '', actions: [cancel, confirm], closeOnBackdrop: false, initialFocus: '.ide-button--ghost' }, doc);
    confirm.addEventListener('click', () => { if (typeof options.onConfirm === 'function') options.onConfirm(); modal.close(); });
    cancel.addEventListener('click', () => { if (typeof options.onCancel === 'function') options.onCancel(); modal.close(); });
    return modal;
  }

  function createToast(options = {}, doc = globalScope.document) {
    assertDocument(doc);
    const toast = doc.createElement('div');
    const tone = ['success','warning','error','info'].includes(options.tone) ? options.tone : 'info';
    toast.className = `ide-toast ide-toast--${tone}`;
    toast.setAttribute('role', tone === 'error' ? 'alert' : 'status');
    toast.setAttribute('aria-live', tone === 'error' ? 'assertive' : 'polite');
    toast.setAttribute('aria-atomic', 'true');
    toast.textContent = text(options.message);
    toast.dismiss = () => { if (toast.parentNode) toast.parentNode.removeChild(toast); };
    if (options.duration && globalScope.setTimeout) globalScope.setTimeout(toast.dismiss, Number(options.duration));
    return toast;
  }

  function createBadge(options = {}, doc = globalScope.document) {
    assertDocument(doc);
    const badge = doc.createElement('span');
    const tone = ['neutral','success','warning','error','info','primary'].includes(options.tone) ? options.tone : 'neutral';
    badge.className = `ide-badge ide-badge--${tone}`;
    badge.textContent = text(options.label);
    return badge;
  }

  function createStatusBadge(options = {}, doc = globalScope.document) {
    const statusMap = { active: ['Ativo','success'], inactive: ['Inativo','neutral'], planned: ['Planejado','info'], confirmed: ['Confirmado','success'], cancelled: ['Cancelado','error'], completed: ['Concluído','neutral'], pending: ['Pendente','warning'] };
    const entry = statusMap[options.status] || [options.label || options.status || 'Status','neutral'];
    return createBadge({ label: options.label || entry[0], tone: options.tone || entry[1] }, doc);
  }

  const api = { createModal, createDrawer, createConfirmDialog, createToast, createBadge, createStatusBadge };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (globalScope) { globalScope.IDEMusic = globalScope.IDEMusic || {}; globalScope.IDEMusic.OverlayFeedback = api; }
})(typeof window !== 'undefined' ? window : globalThis);
