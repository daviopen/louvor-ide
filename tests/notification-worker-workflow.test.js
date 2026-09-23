'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

const workflow = read('.github/workflows/notification-outbox.yml');
const processor = read('src/scripts/process-notification-outbox.cjs');

test('worker de notificações roda a cada 10 minutos e permite disparo manual', () => {
  assert.match(workflow, /cron:\s*["']\*\/10 \* \* \* \*["']/);
  assert.match(workflow, /workflow_dispatch:/);
});

test('worker impede sobreposição e limita o processamento', () => {
  assert.match(workflow, /group:\s*notification-outbox-production/);
  assert.match(workflow, /cancel-in-progress:\s*false/);
  assert.match(workflow, /timeout-minutes:\s*5/);
  assert.match(workflow, /NOTIFICATION_BATCH_SIZE:\s*["']25["']/);
  assert.match(workflow, /NOTIFICATION_MAX_ATTEMPTS:\s*["']5["']/);
});

test('worker autentica no Firebase e executa apenas o processador da outbox', () => {
  assert.match(workflow, /FIREBASE_SERVICE_ACCOUNT_LOUVOR_IDE/);
  assert.match(workflow, /node src\/scripts\/process-notification-outbox\.cjs/);
  assert.match(workflow, /firebase-admin@14\.4\.0/);
  assert.match(workflow, /web-push@3\.6\.7/);
});

test('configuração VAPID pública só é regravada quando a chave muda', () => {
  assert.match(processor, /configuredPublicKey !== String\(keys\.publicKey\)/);
  const configSection = processor.slice(
    processor.indexOf('async function ensureWebPushKeys'),
    processor.indexOf('async function getDoc')
  );
  assert.equal((configSection.match(/configRef\.set\(/g) || []).length, 1);
});

test('processador usa a API modular do firebase-admin v14', () => {
  assert.match(processor, /require\('firebase-admin\/app'\)/);
  assert.match(processor, /require\('firebase-admin\/firestore'\)/);
  assert.match(processor, /getApps\(\)\.length/);
  assert.match(processor, /initializeApp\(\{ projectId: PROJECT_ID \}\)/);
  assert.match(processor, /const db = getFirestore\(\)/);
  assert.doesNotMatch(processor, /admin\.apps/);
  assert.doesNotMatch(processor, /admin\.firestore/);
});
