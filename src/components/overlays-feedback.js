(function initOverlayFeedback(globalScope) {
  const text = (v) => v == null ? '' : String(v);
  function assertDocument(doc) { if (!doc || typeof doc.createElement !== 'function') throw new TypeError('Overlay components require a DOM document.'); }
  function appendContent(node, content) { if (!content) return; if (typeof content === 'string') node.textContent = content; else node.appendChild(content); }

  function createModal(options = {}, doc = globalScope.document) {
    assertDocument(doc);
    const backdrop = doc.createElement('div');
    backdrop.className = 'ide-overlay';
    backdrop.hidden = options.open === false;
    const dialog = doc.createElement('section');
    dialog.className = 'ide-modal';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    if (options.title) {
      const title = doc.createElement('h2');
      title.className = 'ide-modal__title';
      title.textContent = text(options.title);
      const titleId = options.titleId || 'ide-modal-title';
      title.id = titleId;
      dialog.setAttribute('aria-labelledby', titleId);
      dialog.appendChild(title);
    } else if (options.ariaLabel) dialog.setAttribute('aria-label', text(options.ariaLabel));
    else throw new TypeError('Modal requires title or ariaLabel.');
    const body = doc.createElement('div'); body.className = 'ide-modal__body'; appendContent(body, options.content); dialog.appendChild(body);
    if (options.actions) { const actions = doc.createElement('div'); actions.className = 'ide-modal__actions'; options.actions.forEach((a) => actions.appendChild(a)); dialog.appendChild(actions); }
    backdrop.appendChild(dialog);
    backdrop.close = () => { backdrop.hidden = true; if (typeof options.onClose === 'function') options.onClose(); };
    backdrop.open = () => { backdrop.hidden = false; };
    if (options.closeOnBackdrop !== false) backdrop.addEventListener('click', (e) => { if (e.target === backdrop) backdrop.close(); });
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
    const modal = createModal({ title: options.title || 'Confirmar ação', content: options.message || '', actions: [cancel, confirm], closeOnBackdrop: false }, doc);
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
