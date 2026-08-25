(function initInputComponent(globalScope) {
  const SIZES = new Set(['sm', 'md', 'lg']);

  function assertDocument(doc) {
    if (!doc || typeof doc.createElement !== 'function') {
      throw new TypeError('Input component requires a DOM document.');
    }
  }

  function normalizeSize(size) {
    return SIZES.has(size) ? size : 'md';
  }

  function normalizeId(options, prefix) {
    const explicitId = String(options.id || '').trim();
    if (explicitId) return explicitId;

    const name = String(options.name || '').trim();
    if (name) return `${prefix}-${name.replace(/[^a-zA-Z0-9_-]/g, '-')}`;

    throw new TypeError(`${prefix === 'ide-input' ? 'Input' : 'Textarea'} requires id or name.`);
  }

  function appendDescription(field, doc, options, inputId) {
    const ids = [];

    if (options.hint) {
      const hint = doc.createElement('div');
      hint.className = 'ide-field__hint';
      hint.id = `${inputId}-hint`;
      hint.textContent = String(options.hint);
      field.appendChild(hint);
      ids.push(hint.id);
    }

    if (options.error) {
      const error = doc.createElement('div');
      error.className = 'ide-field__error';
      error.id = `${inputId}-error`;
      error.setAttribute('role', 'alert');
      error.textContent = String(options.error);
      field.appendChild(error);
      ids.push(error.id);
    }

    return ids;
  }

  function applyControlAttributes(control, options) {
    if (options.name) control.name = String(options.name);
    if (options.placeholder) control.placeholder = String(options.placeholder);
    if (options.value !== undefined && options.value !== null) control.value = String(options.value);
    if (options.autocomplete) control.autocomplete = String(options.autocomplete);
    if (options.inputMode) control.inputMode = String(options.inputMode);
    if (options.maxLength !== undefined) control.maxLength = Number(options.maxLength);
    if (options.minLength !== undefined) control.minLength = Number(options.minLength);

    control.disabled = Boolean(options.disabled);
    control.required = Boolean(options.required);
    control.readOnly = Boolean(options.readOnly);
    control.setAttribute('aria-invalid', options.error ? 'true' : 'false');

    if (typeof options.onInput === 'function') control.addEventListener('input', options.onInput);
    if (typeof options.onChange === 'function') control.addEventListener('change', options.onChange);
    if (typeof options.onBlur === 'function') control.addEventListener('blur', options.onBlur);
  }

  function createFieldShell(doc, options, control, inputId, size) {
    const field = doc.createElement('div');
    field.className = `ide-field ide-field--${size}`;
    if (options.error) field.classList.add('ide-field--error');
    if (options.disabled) field.classList.add('ide-field--disabled');

    if (options.className) {
      String(options.className).split(/\s+/).filter(Boolean).forEach((name) => field.classList.add(name));
    }

    const labelText = String(options.label || '').trim();
    if (labelText) {
      const label = doc.createElement('label');
      label.className = 'ide-field__label';
      label.htmlFor = inputId;
      label.textContent = labelText;

      if (options.required) {
        const required = doc.createElement('span');
        required.className = 'ide-field__required';
        required.setAttribute('aria-hidden', 'true');
        required.textContent = ' *';
        label.appendChild(required);
      }

      field.appendChild(label);
    } else if (!options.ariaLabel) {
      throw new TypeError('Input and Textarea require label or ariaLabel for accessibility.');
    }

    if (options.ariaLabel) control.setAttribute('aria-label', String(options.ariaLabel));
    field.appendChild(control);

    const descriptionIds = appendDescription(field, doc, options, inputId);
    if (descriptionIds.length) control.setAttribute('aria-describedby', descriptionIds.join(' '));

    return field;
  }

  function createInput(options = {}, doc = globalScope.document) {
    assertDocument(doc);
    const size = normalizeSize(options.size);
    const inputId = normalizeId(options, 'ide-input');
    const input = doc.createElement('input');

    input.id = inputId;
    input.type = options.type || 'text';
    input.className = 'ide-field__control ide-field__input';
    applyControlAttributes(input, options);

    return createFieldShell(doc, options, input, inputId, size);
  }

  function createTextarea(options = {}, doc = globalScope.document) {
    assertDocument(doc);
    const size = normalizeSize(options.size);
    const inputId = normalizeId(options, 'ide-textarea');
    const textarea = doc.createElement('textarea');

    textarea.id = inputId;
    textarea.className = 'ide-field__control ide-field__textarea';
    textarea.rows = Number(options.rows || 4);
    if (options.resize === false) textarea.dataset.resize = 'false';
    applyControlAttributes(textarea, options);

    return createFieldShell(doc, options, textarea, inputId, size);
  }

  const api = { createInput, createTextarea };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (globalScope) {
    globalScope.IDEMusic = globalScope.IDEMusic || {};
    globalScope.IDEMusic.Input = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
