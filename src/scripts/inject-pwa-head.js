#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const PWA_HEAD_MARKER = 'data-ide-pwa-head';
const PWA_HEAD = `  <link rel="manifest" href="/manifest.webmanifest" ${PWA_HEAD_MARKER}>
  <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png">
  <link rel="icon" type="image/png" sizes="48x48" href="/icons/favicon-48.png">
  <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32.png">
  <meta name="theme-color" content="#090b0c">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="IDE Music">
  <link rel="stylesheet" href="/styles/app-header-controls.css?v=20260902-header-actions">
  <script src="/pwa-runtime.js" defer></script>
  <script src="/repositories/notification-outbox-repository.js?v=20260902-notifications" defer></script>
  <script src="/js/modules/notification-domain-hooks.js?v=20260902-notifications" defer></script>
  <script src="/js/modules/notification-center.js?v=20260902-notifications" defer></script>
  <script src="/js/modules/notification-push.js?v=20260902-notifications" defer></script>
  <script src="/js/modules/app-header-controls.js?v=20260902-header-actions" defer></script>`;

function injectPwaHead(html) {
  if (html.includes(PWA_HEAD_MARKER)) return html;
  if (!/<\/head>/i.test(html)) throw new Error('Documento HTML sem </head>.');
  return html.replace(/\s*<\/head>/i, `\n${PWA_HEAD}\n</head>`);
}

function injectDirectory(targetDirectory) {
  return fs.readdirSync(targetDirectory)
    .filter(fileName => fileName.endsWith('.html'))
    .map(fileName => {
      const filePath = path.join(targetDirectory, fileName);
      const original = fs.readFileSync(filePath, 'utf8');
      const updated = injectPwaHead(original);
      if (updated !== original) fs.writeFileSync(filePath, updated);
      return filePath;
    });
}

if (require.main === module) {
  injectDirectory(path.resolve(process.argv[2] || '.'));
}

module.exports = { PWA_HEAD_MARKER, injectPwaHead, injectDirectory };
