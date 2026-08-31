const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function cssFiles(dir) {
  const result = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...cssFiles(full));
    else if (entry.isFile() && entry.name.endsWith('.css')) result.push(full);
  }
  return result;
}

function normalized(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

test('primary lime surfaces never declare white/on-dark text in the same CSS rule', () => {
  const primaryBackground = /background(?:-color)?\s*:\s*(?:var\(--ide-primary\)|var\(--ide-color-lime-500\)|#d8ff45)\b/i;
  const forbiddenText = /color\s*:\s*(?:white|#fff(?:fff)?|var\(--ide-color-white\)|var\(--ide-text-on-dark\))\b/i;
  const violations = [];

  for (const file of cssFiles(path.join(root, 'src'))) {
    const css = fs.readFileSync(file, 'utf8');
    const blocks = css.matchAll(/([^{}]+)\{([^{}]*)\}/g);
    for (const match of blocks) {
      const selector = normalized(match[1]);
      const body = normalized(match[2]);
      if (primaryBackground.test(body) && forbiddenText.test(body)) {
        violations.push(`${path.relative(root, file)} :: ${selector}`);
      }
    }
  }

  assert.deepEqual(violations, [], `Texto branco sobre verde-lima encontrado em:\n${violations.join('\n')}`);
});

test('canonical primary components are forced to primary ink by the visual contract', () => {
  const css = fs.readFileSync(path.join(root, 'src/styles/ui-consistency.css'), 'utf8');
  for (const selector of [
    '.ide-button--primary',
    '.ide-badge--primary',
    ".ide-pagination__button[aria-current='page']",
    '.ide-sidebar-link.active',
    '.music-ide-signout',
    '.music-ide-user-placeholder'
  ]) {
    assert.match(css, new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(css, /color:\s*var\(--ide-primary-ink\)\s*!important/);
});
