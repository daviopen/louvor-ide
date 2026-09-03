const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');
const push = read('src/js/modules/notification-push.js');
const center = read('src/js/modules/notification-center.js');

test('push detecta iPhone/iPad fora do modo instalado antes de pedir permissão', () => {
  assert.match(push, /function isIosDevice\(\)/);
  assert.match(push, /function isStandalone\(\)/);
  assert.match(push, /function requiresInstalledIosPwa\(\)/);
  assert.match(push, /IOS_INSTALL_REQUIRED/);
  assert.match(push, /if \(requiresInstalledIosPwa\(\)\) return STATUS\.IOS_INSTALL_REQUIRED/);
});

test('Central orienta instalação no iOS em vez de deixar Ativar sem resposta', () => {
  assert.match(center, /status === 'IOS_INSTALL_REQUIRED'/);
  assert.match(center, /instale o IDE Music na Tela de Início/);
  assert.match(center, /dataset\.notificationAction = 'install'/);
  assert.match(center, /help\.html#help-install-title/);
});

test('falha de ativação vira feedback visível e permite nova tentativa', () => {
  assert.match(push, /syncButton\(STATUS\.FAILED\)/);
  assert.match(center, /status === 'FAILED'/);
  assert.match(center, /Não foi possível ativar as notificações/);
  assert.match(center, /Tentar novamente/);
});
