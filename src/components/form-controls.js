(function initFormControls(globalScope) {
  const uid = (() => { let i = 0; return (prefix) => `${prefix}-${++i}`; })();

  function assertDocument(doc) {
    if (!doc || typeof doc.createElement !== 'function') throw new TypeError('Form controls require a DOM document.');
  }

  function text(value) { return value === undefined || value === null ? '' : String(value); }
  function optionValue(option) { return typeof option === 'object' ? text(option.value) : text(option); }
  function optionLabel(option) { return typeof option === 'object' ? text(option.label ?? option.value) : text(option); }

  function makeField(doc, options, control) {
    const field = doc.createElement('div');
    field.className = 'ide-field';
    const id = options.id || control.id || uid('ide-control');
    control.id = id;

    if (options.label) {
      const label = doc.createElement('label');
      label.className = 'ide-field__label';
      label.htmlFor = id;
      label.textContent = text(options.label);
      field.appendChild(label);
    } else if (options.ariaLabel) {
      control.setAttribute('aria-label', text(options.ariaLabel));
    } else {
      throw new TypeError('Control requires label or ariaLabel.');
    }

    field.appendChild(control);
    const described = [];
    if (options.hint) {
      const hint = doc.createElement('div');
      hint.id = `${id}-hint`;
      hint.className = 'ide-field__hint';
      hint.textContent = text(options.hint);
      field.appendChild(hint);
      described.push(hint.id);
    }
    if (options.error) {
      const error = doc.createElement('div');
      error.id = `${id}-error`;
      error.className = 'ide-field__error';
      error.setAttribute('role', 'alert');
      error.textContent = text(options.error);
      field.classList.add('ide-field--error');
      control.setAttribute('aria-invalid', 'true');
      field.appendChild(error);
      described.push(error.id);
    }
    if (described.length) control.setAttribute('aria-describedby', described.join(' '));
    return field;
  }

  function createSelect(options = {}, doc = globalScope.document) {
    assertDocument(doc);
    const select = doc.createElement('select');
    select.className = 'ide-field__control ide-select';
    select.name = text(options.name);
    select.disabled = Boolean(options.disabled);
    select.required = Boolean(options.required);
    if (options.multiple) select.multiple = true;
    if (options.placeholder && !options.multiple) {
      const placeholder = doc.createElement('option');
      placeholder.value = '';
      placeholder.textContent = text(options.placeholder);
      placeholder.disabled = Boolean(options.required);
      placeholder.selected = !options.value;
      select.appendChild(placeholder);
    }
    (options.options || []).forEach((item) => {
      const option = doc.createElement('option');
      option.value = optionValue(item);
      option.textContent = optionLabel(item);
      if (typeof item === 'object' && item.disabled) option.disabled = true;
      const values = Array.isArray(options.value) ? options.value.map(text) : [text(options.value)];
      if (values.includes(option.value)) option.selected = true;
      select.appendChild(option);
    });
    if (typeof options.onChange === 'function') select.addEventListener('change', options.onChange);
    return makeField(doc, options, select);
  }

  function createMultiSelect(options = {}, doc = globalScope.document) {
    return createSelect({ ...options, multiple: true }, doc);
  }

  function createSearchSelect(options = {}, doc = globalScope.document) {
    assertDocument(doc);
    const wrapper = doc.createElement('div');
    wrapper.className = 'ide-search-select';
    const input = doc.createElement('input');
    const listId = options.listId || uid('ide-search-options');
    input.type = 'search';
    input.className = 'ide-field__control ide-search-select__input';
    input.id = options.id || uid('ide-search-select');
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-controls', listId);
    input.setAttribute('aria-expanded', 'false');
    input.placeholder = text(options.placeholder || 'Buscar...');
    if (options.ariaLabel) input.setAttribute('aria-label', text(options.ariaLabel));

    const list = doc.createElement('div');
    list.id = listId;
    list.className = 'ide-search-select__list';
    list.setAttribute('role', 'listbox');
    list.hidden = true;

    const all = options.options || [];
    function render(query) {
      list.textContent = '';
      const normalized = text(query).toLocaleLowerCase('pt-BR');
      const matches = all.filter((item) => optionLabel(item).toLocaleLowerCase('pt-BR').includes(normalized));
      matches.forEach((item) => {
        const button = doc.createElement('button');
        button.type = 'button';
        button.className = 'ide-search-select__option';
        button.setAttribute('role', 'option');
        button.dataset.value = optionValue(item);
        button.textContent = optionLabel(item);
        button.addEventListener('click', () => {
          input.value = optionLabel(item);
          input.dataset.value = optionValue(item);
          list.hidden = true;
          input.setAttribute('aria-expanded', 'false');
          if (typeof options.onSelect === 'function') options.onSelect(optionValue(item), item);
        });
        list.appendChild(button);
      });
      list.hidden = matches.length === 0;
      input.setAttribute('aria-expanded', String(matches.length > 0));
    }
    input.addEventListener('input', (event) => render(event.target.value));
    input.addEventListener('focus', () => render(input.value));
    wrapper.append(input, list);
    return wrapper;
  }

  function createCheckbox(options = {}, doc = globalScope.document) {
    assertDocument(doc);
    if (!options.label) throw new TypeError('Checkbox requires label.');
    const label = doc.createElement('label');
    label.className = 'ide-choice';
    const input = doc.createElement('input');
    input.type = 'checkbox';
    input.className = 'ide-choice__input';
    input.checked = Boolean(options.checked);
    input.disabled = Boolean(options.disabled);
    input.name = text(options.name);
    input.value = text(options.value || 'true');
    const caption = doc.createElement('span');
    caption.className = 'ide-choice__label';
    caption.textContent = text(options.label);
    label.append(input, caption);
    if (typeof options.onChange === 'function') input.addEventListener('change', options.onChange);
    return label;
  }

  function createRadioGroup(options = {}, doc = globalScope.document) {
    assertDocument(doc);
    if (!options.label) throw new TypeError('RadioGroup requires label.');
    const group = doc.createElement('fieldset');
    group.className = 'ide-radio-group';
    const legend = doc.createElement('legend');
    legend.className = 'ide-field__label';
    legend.textContent = text(options.label);
    group.appendChild(legend);
    (options.options || []).forEach((item) => {
      const label = doc.createElement('label');
      label.className = 'ide-choice';
      const input = doc.createElement('input');
      input.type = 'radio';
      input.name = text(options.name || uid('ide-radio'));
      input.value = optionValue(item);
      input.checked = text(options.value) === input.value;
      const caption = doc.createElement('span');
      caption.textContent = optionLabel(item);
      label.append(input, caption);
      if (typeof options.onChange === 'function') input.addEventListener('change', options.onChange);
      group.appendChild(label);
    });
    return group;
  }

  function createSwitch(options = {}, doc = globalScope.document) {
    assertDocument(doc);
    if (!options.label) throw new TypeError('Switch requires label.');
    const label = doc.createElement('label');
    label.className = 'ide-switch';
    const input = doc.createElement('input');
    input.type = 'checkbox';
    input.setAttribute('role', 'switch');
    input.checked = Boolean(options.checked);
    input.setAttribute('aria-checked', String(input.checked));
    const track = doc.createElement('span');
    track.className = 'ide-switch__track';
    const caption = doc.createElement('span');
    caption.className = 'ide-switch__label';
    caption.textContent = text(options.label);
    input.addEventListener('change', (event) => {
      input.setAttribute('aria-checked', String(input.checked));
      if (typeof options.onChange === 'function') options.onChange(event);
    });
    label.append(input, track, caption);
    return label;
  }

  function createPicker(type, options, doc) {
    const input = doc.createElement('input');
    input.type = type;
    input.className = 'ide-field__control ide-picker';
    input.value = text(options.value);
    input.name = text(options.name);
    input.disabled = Boolean(options.disabled);
    input.required = Boolean(options.required);
    if (typeof options.onChange === 'function') input.addEventListener('change', options.onChange);
    return makeField(doc, options, input);
  }

  function createDatePicker(options = {}, doc = globalScope.document) { assertDocument(doc); return createPicker('date', options, doc); }
  function createTimePicker(options = {}, doc = globalScope.document) { assertDocument(doc); return createPicker('time', options, doc); }
  function createColorPicker(options = {}, doc = globalScope.document) {
    assertDocument(doc);
    const normalized = /^#[0-9a-f]{6}$/i.test(text(options.value)) ? text(options.value) : '#d8ff45';
    return createPicker('color', { ...options, value: normalized }, doc);
  }

  const api = { createSelect, createMultiSelect, createSearchSelect, createCheckbox, createRadioGroup, createSwitch, createDatePicker, createTimePicker, createColorPicker };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (globalScope) { globalScope.IDEMusic = globalScope.IDEMusic || {}; globalScope.IDEMusic.FormControls = api; }
})(typeof window !== 'undefined' ? window : globalThis);
