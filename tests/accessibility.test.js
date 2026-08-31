const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const input = read('src/components/input.js');
const overlays = read('src/components/overlays-feedback.js');
const designSystem = read('src/styles/design-system.css');
const tokens = read('src/styles/tokens.css');
const agents = read('AGENTS.md');

test('inputs require accessible labels and expose validation state', () => {
  assert.match(input, /require label or ariaLabel for accessibility/);
  assert.match(input, /aria-invalid/);
  assert.match(input, /aria-describedby/);
  assert.match(input, /setAttribute\('role', 'alert'\)/);
});

test('dialogs support keyboard navigation, focus trap and focus restoration', () => {
  assert.match(overlays, /aria-modal/);
  assert.match(overlays, /event\.key === 'Escape'/);
  assert.match(overlays, /event\.key !== 'Tab'/);
  assert.match(overlays, /previouslyFocused/);
  assert.match(overlays, /focusableElements/);
  assert.match(overlays, /tabindex', '-1'/);
});

test('live feedback is announced by assistive technologies', () => {
  assert.match(overlays, /role', tone === 'error' \? 'alert' : 'status'/);
  assert.match(overlays, /aria-live/);
  assert.match(overlays, /aria-atomic/);
});

test('design system keeps visible focus and reduced-motion support', () => {
  assert.match(designSystem, /:focus-visible/);
  assert.match(designSystem, /outline:3px solid var\(--ide-focus-ring\)/);
  assert.match(designSystem, /prefers-reduced-motion:reduce/);
});

test('semantic colors provide explicit text contrast tokens and textual status labels', () => {
  assert.match(tokens, /--ide-text-primary:/);
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
