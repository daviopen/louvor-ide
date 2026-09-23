'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const workflowsDir = path.join(root, '.github', 'workflows');
const read = file => fs.readFileSync(path.join(workflowsDir, file), 'utf8');

test('GitHub Actions mantém somente os workflows operacionais permanentes', () => {
  const files = fs.readdirSync(workflowsDir)
    .filter(file => /\.ya?ml$/i.test(file))
    .sort();

  assert.deepEqual(files, ['deploy.yml', 'notifications.yml', 'tests.yml']);
});

test('workflows usam nomes profissionais e sem ícones', () => {
  const expected = new Map([
    ['tests.yml', 'Tests'],
    ['deploy.yml', 'Deploy'],
    ['notifications.yml', 'Notifications']
  ]);

  for (const [file, name] of expected) {
    const source = read(file);
    assert.match(source, new RegExp(`^name: ${name}$`, 'm'));
    assert.doesNotMatch(source, /\p{Extended_Pictographic}/u);
  }
});

test('Deploy depende do workflow Tests', () => {
  const source = read('deploy.yml');
  assert.match(source, /workflows:\s*\n\s*- ["']Tests["']/);
  assert.match(source, /github\.event\.workflow_run\.conclusion == 'success'/);
  assert.match(source, /github\.event\.workflow_run\.head_branch == 'main'/);
});

test('Build permanece dentro de Tests sem workflow duplicado', () => {
  const source = read('tests.yml');
  assert.match(source, /- name: Build/);
  assert.match(source, /run: npm run build/);
});
