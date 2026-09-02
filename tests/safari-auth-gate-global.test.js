const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const theme = fs.readFileSync(path.join(__dirname, '..', 'src', 'css', 'music-ide-theme.css'), 'utf8');

test('shared auth gate never hides the whole body on Safari/WebKit', () => {
  assert.doesNotMatch(theme, /html\.auth-pending body\{[^}]*opacity\s*:\s*0/i);
  assert.match(theme, /html\.auth-pending body\{[^}]*opacity\s*:\s*1!important/i);
  assert.match(theme, /html\.auth-pending body::before/);
  assert.match(theme, /Verificando seu acesso/);
});

test('shared auth gate hides protected children instead of relying on html pseudo paint', () => {
  assert.match(theme, /html\.auth-pending body>\*\{visibility:hidden!important\}/);
  assert.doesNotMatch(theme, /html\.auth-pending::before/);
});
