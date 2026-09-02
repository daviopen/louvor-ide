#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const FALLBACK_MARKER = '    match /{document=**} { allow read, write: if false; }';

function composeRules(baseRules, notificationRules) {
  if (!baseRules.includes(FALLBACK_MARKER)) throw new Error('Fallback final do firestore.rules não encontrado.');
  if (baseRules.includes('match /notificationOutbox/{documentId}')) return baseRules;
  const fragment = String(notificationRules || '').trimEnd();
  if (!fragment.includes('match /notificationOutbox/{documentId}')) throw new Error('Fragmento de notificações inválido.');
  return baseRules.replace(FALLBACK_MARKER, `${fragment}\n${FALLBACK_MARKER}`);
}

function main() {
  const basePath = path.resolve(process.argv[2] || 'firestore.rules');
  const fragmentPath = path.resolve(process.argv[3] || 'firestore.notifications.rules');
  const outputPath = path.resolve(process.argv[4] || basePath);
  const result = composeRules(fs.readFileSync(basePath, 'utf8'), fs.readFileSync(fragmentPath, 'utf8'));
  fs.writeFileSync(outputPath, result);
  console.log(`Firestore rules compostas em ${outputPath}`);
}

if (require.main === module) main();
module.exports = { composeRules, FALLBACK_MARKER };
