const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const styles = fs.readFileSync(path.join(__dirname, '..', 'src', 'css', 'styles.css'), 'utf8');
const page = fs.readFileSync(path.join(__dirname, '..', 'src', 'pages', 'setlist.html'), 'utf8');

test('aliases usados pelo Setlist apontam para tokens semânticos do tema', () => {
  const expected = [
    ['--surface', '--ide-surface'],
    ['--surface-secondary', '--ide-surface-secondary'],
    ['--text-primary', '--ide-text-primary'],
    ['--text-secondary', '--ide-text-secondary'],
    ['--border', '--ide-border'],
    ['--primary', '--ide-primary'],
    ['--error', '--ide-error']
  ];
  for (const [alias, token] of expected) {
    assert.match(styles, new RegExp(`${alias}:\\s*var\\(${token.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\)`));
  }
});

test('tema escuro possui tratamento explícito para aviso do Setlist', () => {
  assert.match(styles, /:root\[data-theme="dark"\][\s\S]*--warning-bg:\s*var\(--ide-surface-secondary\)/);
  assert.match(styles, /:root\[data-theme="dark"\][\s\S]*--warning:\s*var\(--ide-primary\)/);
});

test('Setlist usa aliases de superfície e texto em seus elementos críticos', () => {
  assert.match(page, /\.panel\{background:var\(--surface/);
  assert.match(page, /\.field input,[\s\S]*color:var\(--text-primary/);
  assert.match(page, /\.muted\{color:var\(--text-secondary/);
  assert.match(page, /\.status\{[\s\S]*background:var\(--surface-secondary/);
});