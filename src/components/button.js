(function initButtonComponent(globalScope) {
  const VARIANTS = new Set(['primary', 'secondary', 'ghost', 'danger']);
  const SIZES = new Set(['sm', 'md', 'lg']);

  function assertDocument(doc) {
    if (!doc || typeof doc.createElement !== 'function') {
      throw new TypeError('Button component requires a DOM document.');
    }
  }

  function normalizeOption(value, allowed, fallback) {
    return allowed.has(value) ? value : fallback;
  }

  function appendIcon(button, doc, iconClass, position) {
    if (!iconClass) return;
    const icon = doc.createElement('i');
    icon.className = iconClass;
    icon.setAttribute('aria-hidden', 'true');
    icon.dataset.buttonIcon = position;
    button.appendChild(icon);
  }

  function createLabel(doc, label) {
    const span = doc.createElement('span');
    span.className = 'ide-button__label';
    span.textContent = label;
    return span;
  }

  function applyCommonState(button, options) {
    const disabled = Boolean(options.disabled || options.loading);
    button.disabled = disabled;
    button.setAttribute('aria-disabled', disabled ? 'true' : 'false');

    if (options.loading) {
      button.setAttribute('aria-busy', 'true');
      button.dataset.loading = 'true';
    }

    if (options.className) {
      options.className.split(/\s+/).filter(Boolean).forEach((name) => button.classList.add(name));
    }

    if (typeof options.onClick === 'function') {
      button.addEventListener('click', options.onClick);
    }
  }

  function createButton(options = {}, doc = globalScope.document) {
    assertDocument(doc);

    const label = String(options.label || '').trim();
    if (!label) throw new TypeError('Button requires a non-empty label.');

    const variant = normalizeOption(options.variant, VARIANTS, 'primary');
    const size = normalizeOption(options.size, SIZES, 'md');
    const iconPosition = options.iconPosition === 'end' ? 'end' : 'start';
    const button = doc.createElement('button');

    button.type = options.type || 'button';
    button.className = `ide-button ide-button--${variant} ide-button--${size}`;

    if (options.ariaLabel) button.setAttribute('aria-label', options.ariaLabel);
    applyCommonState(button, options);

    if (options.loading) {
      const spinner = doc.createElement('span');
      spinner.className = 'ide-button__spinner';
      spinner.setAttribute('aria-hidden', 'true');
      button.appendChild(spinner);
    } else if (iconPosition === 'start') {
      appendIcon(button, doc, options.iconClass, 'start');
    }

    button.appendChild(createLabel(doc, options.loading && options.loadingLabel ? options.loadingLabel : label));

    if (!options.loading && iconPosition === 'end') {
      appendIcon(button, doc, options.iconClass, 'end');
    }

    return button;
  }

  function createIconButton(options = {}, doc = globalScope.document) {
    assertDocument(doc);

    const ariaLabel = String(options.ariaLabel || '').trim();
    if (!ariaLabel) throw new TypeError('IconButton requires ariaLabel for accessibility.');
    if (!options.iconClass && !options.loading) throw new TypeError('IconButton requires iconClass.');

    const variant = normalizeOption(options.variant, VARIANTS, 'ghost');
    const size = normalizeOption(options.size, SIZES, 'md');
    const button = doc.createElement('button');

    button.type = options.type || 'button';
    button.className = `ide-button ide-button--icon ide-button--${variant} ide-button--${size}`;
    button.setAttribute('aria-label', ariaLabel);
    button.title = options.title || ariaLabel;
    applyCommonState(button, options);

    if (options.loading) {
      const spinner = doc.createElement('span');
      spinner.className = 'ide-button__spinner';
      spinner.setAttribute('aria-hidden', 'true');
      button.appendChild(spinner);
    } else {
      appendIcon(button, doc, options.iconClass, 'only');
    }

    return button;
  }

  const api = { createButton, createIconButton };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (globalScope) {
    globalScope.IDEMusic = globalScope.IDEMusic || {};
    globalScope.IDEMusic.Button = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
