const test = require('node:test');
const assert = require('node:assert/strict');
const { createButton, createIconButton } = require('../src/components/button.js');

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
        type: '',
        title: '',
        textContent: '',
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

test('createButton builds an accessible primary button by default', () => {
  const button = createButton({ label: 'Salvar' }, createFakeDocument());
  assert.equal(button.tagName, 'BUTTON');
  assert.equal(button.type, 'button');
  assert.equal(button.classList.contains('ide-button--primary'), true);
  assert.equal(button.classList.contains('ide-button--md'), true);
  assert.equal(button.getAttribute('aria-disabled'), 'false');
  assert.equal(button.children[0].textContent, 'Salvar');
});

test('createButton loading state disables interaction and exposes busy state', () => {
  const button = createButton({ label: 'Salvar', loading: true, loadingLabel: 'Salvando' }, createFakeDocument());
  assert.equal(button.disabled, true);
  assert.equal(button.getAttribute('aria-busy'), 'true');
  assert.equal(button.dataset.loading, 'true');
  assert.equal(button.children[0].classList.contains('ide-button__spinner'), true);
  assert.equal(button.children[1].textContent, 'Salvando');
});

test('createButton sanitizes unsupported visual options to defaults', () => {
  const button = createButton({ label: 'Continuar', variant: 'neon', size: 'xl' }, createFakeDocument());
  assert.equal(button.classList.contains('ide-button--primary'), true);
  assert.equal(button.classList.contains('ide-button--md'), true);
});

test('createIconButton requires an accessible label', () => {
  assert.throws(() => createIconButton({ iconClass: 'fa fa-trash' }, createFakeDocument()), /ariaLabel/);
});

test('createIconButton creates an icon-only button with title fallback', () => {
  const button = createIconButton({
    ariaLabel: 'Excluir música',
    iconClass: 'fa fa-trash',
    variant: 'danger'
  }, createFakeDocument());

  assert.equal(button.classList.contains('ide-button--icon'), true);
  assert.equal(button.classList.contains('ide-button--danger'), true);
  assert.equal(button.getAttribute('aria-label'), 'Excluir música');
  assert.equal(button.title, 'Excluir música');
  assert.equal(button.children[0].getAttribute('aria-hidden'), 'true');
});
