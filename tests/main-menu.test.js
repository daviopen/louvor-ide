const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const shell = fs.readFileSync(path.join(root, 'src/js/modules/app-shell.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/styles/main-menu.css'), 'utf8');
const modulePage = fs.readFileSync(path.join(root, 'src/pages/module.html'), 'utf8');

const expectedLabels = [
  'Dashboard', 'Usuários', 'Permissões', 'Indisponibilidade', 'Eventos', 'Escalas',
  'Próximos', 'Histórico', 'Consultar', 'Nova Música', 'Auditoria', 'Configurações'
];

test('menu principal contém toda a árvore prevista no ROADMAP 11', () => {
  for (const label of expectedLabels) {
    assert.match(shell, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('menu principal aplica rota ativa, permissão e recolhimento persistido', () => {
  assert.match(shell, /aria-current/);
  assert.match(shell, /resolveAccessLevel/);
  assert.match(shell, /canViewItem/);
  assert.match(shell, /musicIdeSidebarCollapsed/);
  assert.match(shell, /ide-sidebar-collapsed/);
  assert.match(shell, /musicIdeAuthReady/);
});

test('navegação móvel e sidebar responsiva possuem contrato visual', () => {
  assert.match(shell, /ide-mobile-navigation/);
  assert.match(css, /@media \(max-width:900px\)/);
  assert.match(css, /ide-mobile-nav-item/);
  assert.match(css, /ide-sidebar-collapsed/);
});

test('controles de conta, tema e saída são montados dentro da sidebar', () => {
  assert.match(shell, /ide-sidebar-account/);
  assert.match(shell, /mountAccountControls/);
  assert.match(shell, /mount\.appendChild\(controls\)/);
  assert.match(css, /ide-sidebar-account \.music-ide-user/);
  assert.match(css, /position:static!important/);
  assert.match(css, /ide-sidebar-nav[^}]*overflow-y:auto/);
});

test('destinos ainda não implementados têm página segura e explícita de preparação', () => {
  for (const section of ['users', 'permissions', 'unavailability', 'events', 'schedules', 'audit', 'settings']) {
    assert.match(modulePage, new RegExp(`${section}:`));
  }
  assert.match(modulePage, /app-shell\.js\?v=20260825-menu-main/);
});