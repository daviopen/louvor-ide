const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

test('Escalas não inicializa o CRUD em views especializadas e protege o root', () => {
  const source = read('src/js/modules/schedules-page.js');
  assert.match(source, /const view = params\.get\('view'\) \|\| '';/);
  assert.match(source, /params\.get\('section'\) !== 'schedules' \|\| view/);
  assert.match(source, /if \(!placeholder\) return false;/);
  assert.match(source, /const root = el\('schedules-root'\);\s*if \(!root\) return;/);
  assert.match(source, /aria-label="Função para adicionar à escala"/);
});

test('Design system mantém targets touch essenciais em pelo menos 44px', () => {
  const css = read('src/styles/main-menu.css');
  [
    /\.ide-sidebar-collapse\{width:44px;height:44px/,
    /\.ide-sidebar-link\{min-height:44px\}/,
    /\.ide-button\.ide-button--sm\{min-height:44px\}/,
    /\.ide-pagination__button\{min-width:44px\}/,
    /\.ide-chip__remove\{width:44px;height:44px\}/
  ].forEach(pattern => assert.match(css, pattern));
});

test('Indisponibilidade mantém navegação do calendário acessível e cabeçalho legível', () => {
  const css = read('src/styles/unavailability.css');
  assert.match(css, /\.unavailability-calendar-nav \.ide-button\{width:44px;min-width:44px;height:44px;min-height:44px;padding:0\}/);
  assert.match(css, /\.unavailability-header h1\{color:var\(--ide-text-on-dark\)\}/);
  assert.match(css, /\.unavailability-header p\{[^}]*color:var\(--ide-text-on-dark-secondary\)/);
  assert.match(css, /\.unavailability-header \.ide-module-kicker\{color:var\(--ide-primary\)\}/);
});

test('Termos e Privacidade usam links com contraste e target mínimo adequados', () => {
  for (const file of ['src/pages/termos.html', 'src/pages/privacidade.html']) {
    const html = read(file);
    assert.match(html, /a\{display:inline-flex;align-items:center;min-height:44px;/);
    assert.match(html, /color:var\(--music-accent-text\)/);
    assert.match(html, /a:focus-visible\{outline:3px solid var\(--ide-focus-ring\)/);
    assert.match(html, /\.back\{[^}]*color:var\(--ide-text-primary\)/);
    assert.doesNotMatch(html, /a\{color:var\(--ide-primary-active\)/);
  }
});

test('Tema claro usa texto secundário com contraste mais forte', () => {
  const tokens = read('src/styles/tokens.css');
  assert.match(tokens, /--ide-text-secondary: var\(--ide-color-neutral-700\);/);
  const menu = read('src/styles/main-menu.css');
  assert.match(menu, /\.ide-module-kicker\{color:var\(--music-accent-text\)\}/);
});

test('Runtime de qualidade cobre ARIA dinâmico, scroll por teclado e login touch', () => {
  const source = read('src/js/modules/ui-quality-runtime.js');
  assert.match(source, /row\.setAttribute\('role', 'row'\)/);
  assert.match(source, /node\.tabIndex = 0/);
  assert.match(source, /aria-label', 'Função para adicionar à escala'/);
  assert.match(source, /forgot\.style\.minHeight = '44px'/);
});

test('Build injeta runtime de qualidade e limita normalização de cor a contextos CSS', () => {
  const source = read('src/scripts/normalize-built-html-colors.js');
  assert.match(source, /data-ide-ui-quality-runtime/);
  assert.match(source, /styleBlockPattern/);
  assert.match(source, /inlineStylePattern/);
  assert.match(source, /normalizedBlocks = validThemeColor\.replace\(styleBlockPattern/);
  assert.match(source, /return normalizedBlocks\.replace\(inlineStylePattern/);
});

test('AGENTS transforma achados da auditoria em critérios bloqueantes', () => {
  const agents = read('AGENTS.md');
  assert.match(agents, /1440 × 900/);
  assert.match(agents, /820–834 px/);
  assert.match(agents, /390 × 844/);
  assert.match(agents, /44 × 44 px/);
  assert.match(agents, />= 4\.5:1/);
  assert.match(agents, /zero overflow horizontal acidental/);
  assert.match(agents, /console\.error/);
  assert.match(agents, /Ownership de rota\/view/);
  assert.match(agents, /Paridade UI x Rules/);
  assert.match(agents, /sanitizar\/redigir dados sensíveis/);
});
