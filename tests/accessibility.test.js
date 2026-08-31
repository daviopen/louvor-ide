const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const agents = read('AGENTS.md');
const tokens = read('src/styles/tokens.css');
const overlays = read('src/styles/overlays.css');

test('tokens semânticos de acessibilidade existem no design system', () => {
  assert.match(tokens, /--ide-text-secondary:/);
  assert.match(tokens, /--ide-primary-ink:/);
  assert.match(overlays, /active: \['Ativo','success'\]/);
  assert.match(overlays, /cancelled: \['Cancelado','error'\]/);
  assert.match(overlays, /pending: \['Pendente','warning'\]/);
});

test('project guidance requires WCAG contrast, keyboard operation and non-color-only communication', () => {
  assert.match(agents, /WCAG/);
  assert.match(agents, /foco visível/);
  assert.match(agents, /navegação por teclado/);
  assert.match(agents, /accessible name|label/i);
  assert.match(agents, /somente por cor/);
});
