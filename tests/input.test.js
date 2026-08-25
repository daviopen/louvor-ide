const test = require('node:test');
const assert = require('node:assert/strict');
const { createInput, createTextarea } = require('../src/components/input.js');

function createFakeDocument() {
  return {
    createElement(tagName) {
      const attributes = new Map();
      const listeners = new Map();
      const classes = new Set();
      const element = {
        tagName: tagName.toUpperCase(),
        children: [],
        dataset: {},
        disabled: false,
        required: false,
        readOnly: false,
        type: '',
        id: '',
        name: '',
        value: '',
        rows: 0,
        placeholder: '',
        autocomplete: '',
        inputMode: '',
        maxLength: -1,
        minLength: -1,
        textContent: '',
        htmlFor: '',
        appendChild(child) { this.children.push(child); return child; },
        setAttribute(name, value) { attributes.set(name, String(value)); },
        getAttribute(name) { return attributes.get(name) ?? null; },
        addEventListener(name, callback) { listeners.set(name, callback); },
        _listeners: listeners,
        classList: {
          add(...names) { names.forEach((name) => classes.add(name)); },
          contains(name) { return classes.has(name); }
        }
      };

      Object.defineProperty(element, 'className', {
        get() { return [...classes].join(' '); },
        set(value) {
          classes.clear();
          String(value).split(/\s+/).filter(Boolean).forEach((name) => classes.add(name));
        }
      });

      return element;
    }
  };
}

test('createInput associates label, control and hint accessibly', () => {
  const field = createInput({
    id: 'email',
    label: 'E-mail',
    name: 'email',
    type: 'email',
    hint: 'Use seu e-mail principal.'
  }, createFakeDocument());

  const label = field.children[0];
  const input = field.children[1];
  const hint = field.children[2];

  assert.equal(label.htmlFor, 'email');
  assert.equal(input.id, 'email');
  assert.equal(input.type, 'email');
  assert.equal(input.getAttribute('aria-invalid'), 'false');
  assert.equal(hint.id, 'email-hint');
  assert.equal(input.getAttribute('aria-describedby'), 'email-hint');
});

test('createInput exposes required and validation error states', () => {
  const field = createInput({
    id: 'name',
    label: 'Nome',
    required: true,
    error: 'Informe o nome.'
  }, createFakeDocument());

  const input = field.children[1];
  const error = field.children[2];

  assert.equal(field.classList.contains('ide-field--error'), true);
  assert.equal(input.required, true);
  assert.equal(input.getAttribute('aria-invalid'), 'true');
  assert.equal(error.getAttribute('role'), 'alert');
  assert.equal(input.getAttribute('aria-describedby'), 'name-error');
});

test('createInput requires a visible label or ariaLabel', () => {
  assert.throws(
    () => createInput({ id: 'search' }, createFakeDocument()),
    /label or ariaLabel/
  );

  const field = createInput({ id: 'search', ariaLabel: 'Buscar músicas' }, createFakeDocument());
  assert.equal(field.children[0].getAttribute('aria-label'), 'Buscar músicas');
});

test('createTextarea supports rows, value and disabled state', () => {
  const field = createTextarea({
    name: 'notes',
    label: 'Observações',
    rows: 6,
    value: 'Somente violão',
    disabled: true
  }, createFakeDocument());

  const textarea = field.children[1];
  assert.equal(textarea.tagName, 'TEXTAREA');
  assert.equal(textarea.id, 'ide-textarea-notes');
  assert.equal(textarea.rows, 6);
  assert.equal(textarea.value, 'Somente violão');
  assert.equal(textarea.disabled, true);
  assert.equal(field.classList.contains('ide-field--disabled'), true);
});

test('createTextarea can disable resize and normalizes invalid size', () => {
  const field = createTextarea({
    id: 'lyrics',
    label: 'Letra',
    resize: false,
    size: 'xl'
  }, createFakeDocument());

  const textarea = field.children[1];
  assert.equal(field.classList.contains('ide-field--md'), true);
  assert.equal(textarea.dataset.resize, 'false');
});
