const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const controls = require('../src/components/form-controls.js');
const overlays = require('../src/components/overlays-feedback.js');
const display = require('../src/components/data-display.js');
const navigation = require('../src/components/navigation-layout.js');
const root = path.resolve(__dirname, '..');

function fakeDocument() {
  function element(tagName) {
    const attrs = new Map(); const classes = new Set();
    const el = {
      tagName: tagName.toUpperCase(), children: [], dataset: {}, style: {}, hidden: false, disabled: false,
      checked: false, selected: false, multiple: false, required: false, value: '', type: '', id: '', name: '',
      textContent: '', htmlFor: '', parentNode: null,
      appendChild(child) { child.parentNode = this; this.children.push(child); return child; },
      append(...children) { children.forEach((c) => this.appendChild(c)); },
      setAttribute(k,v) { attrs.set(k,String(v)); }, getAttribute(k) { return attrs.get(k) ?? null; },
      addEventListener() {}, removeChild(child) { this.children = this.children.filter((c) => c !== child); },
      classList: { add(...names) { names.forEach((n) => classes.add(n)); }, contains(n) { return classes.has(n); } }
    };
    Object.defineProperty(el,'className',{ get(){ return [...classes].join(' '); }, set(v){ classes.clear(); String(v).split(/\s+/).filter(Boolean).forEach((n)=>classes.add(n)); } });
    return el;
  }
  return { createElement: element, createDocumentFragment: () => element('fragment') };
}

test('Design System exports every roadmap component family', () => {
  for (const name of ['createSelect','createMultiSelect','createSearchSelect','createCheckbox','createRadioGroup','createSwitch','createDatePicker','createTimePicker','createColorPicker']) assert.equal(typeof controls[name], 'function', name);
  for (const name of ['createModal','createDrawer','createConfirmDialog','createToast','createBadge','createStatusBadge']) assert.equal(typeof overlays[name], 'function', name);
  for (const name of ['createAvatar','createUserChip','createRoleChip','createCard','createSectionCard','createTable','createPagination','createEmptyState','createSkeleton','createLoading']) assert.equal(typeof display[name], 'function', name);
  for (const name of ['createSearchBox','createFilterBar','createPageHeader','createBreadcrumb','createSidebar','createMobileNavigation','createPermissionGuard','createFormField','createCrudPage','createFormLayout']) assert.equal(typeof navigation[name], 'function', name);
});

test('Select and pickers enforce accessible labels', () => {
  const doc = fakeDocument();
  assert.throws(() => controls.createSelect({ options: [] }, doc), /label or ariaLabel/);
  const field = controls.createSelect({ id: 'role', label: 'Função', options: [{ value: 'dm', label: 'DM' }] }, doc);
  assert.equal(field.children[0].htmlFor, 'role');
  assert.equal(field.children[1].tagName, 'SELECT');
  assert.equal(controls.createDatePicker({ id: 'date', label: 'Data' }, doc).children[1].type, 'date');
});

test('SearchSelect is an accessible combobox', () => {
  const doc = fakeDocument();
  const component = controls.createSearchSelect({ ariaLabel: 'Buscar pessoa', options: ['Davi','Maria'] }, doc);
  assert.equal(component.children[0].getAttribute('role'), 'combobox');
  assert.equal(component.children[1].getAttribute('role'), 'listbox');
});

test('Checkbox, radio and switch expose native semantics', () => {
  const doc = fakeDocument();
  assert.equal(controls.createCheckbox({ label: 'Ativo' }, doc).children[0].type, 'checkbox');
  assert.equal(controls.createRadioGroup({ label: 'Nível', name: 'level', options: ['Leitura','Edição'] }, doc).tagName, 'FIELDSET');
  assert.equal(controls.createSwitch({ label: 'Receber avisos' }, doc).children[0].getAttribute('role'), 'switch');
});

test('Modal and toast expose ARIA semantics', () => {
  const doc = fakeDocument();
  const modal = overlays.createModal({ title: 'Editar usuário', content: 'Conteúdo' }, doc);
  assert.equal(modal.children[0].getAttribute('role'), 'dialog');
  assert.equal(modal.children[0].getAttribute('aria-modal'), 'true');
  assert.equal(overlays.createToast({ tone: 'error', message: 'Falhou' }, doc).getAttribute('role'), 'alert');
});

test('Status badge, table, pagination and empty/loading states render contracts', () => {
  const doc = fakeDocument();
  assert.match(overlays.createStatusBadge({ status: 'confirmed' }, doc).className, /success/);
  assert.equal(display.createTable({ columns: [{key:'name',label:'Nome'}], rows: [{name:'Davi'}] }, doc).children[0].tagName, 'TABLE');
  assert.equal(display.createPagination({ page: 1, totalPages: 3 }, doc).getAttribute('aria-label'), 'Paginação');
  assert.equal(display.createEmptyState({}, doc).tagName, 'SECTION');
  assert.equal(display.createLoading({}, doc).getAttribute('role'), 'status');
});

test('PermissionGuard defaults to denial and FormField validates contract', () => {
  const doc = fakeDocument();
  assert.match(navigation.createPermissionGuard({ allowed: false }, doc).className, /permission-guard/);
  assert.throws(() => navigation.createFormField({}, doc), /requires control/);
});

test('CRUD and form layout patterns are implemented and documented by CSS', () => {
  const doc = fakeDocument();
  const crud = navigation.createCrudPage({ title: 'Usuários' }, doc);
  assert.match(crud.className, /ide-crud-page/);
  const form = navigation.createFormLayout({ fields: [] }, doc);
  assert.match(form.className, /ide-form-layout/);
  const css = fs.readFileSync(path.join(root,'src/styles/design-system.css'),'utf8');
  for (const selector of ['.ide-modal','.ide-table','.ide-mobile-nav','.ide-filter-bar','.ide-crud-page','.ide-form-layout']) assert.match(css, new RegExp(selector.replace('.', '\\.')));
});
