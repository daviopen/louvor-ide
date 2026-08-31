const fs = require('node:fs');

function normalizeAuthDomainSource(source, authDomain) {
  if (typeof source !== 'string' || !source.trim()) throw new Error('Conteúdo do env-config.js não informado.');
  const normalizedDomain = String(authDomain || '').trim().replace(/^https?:\/\//i, '').replace(/\/$/, '');
  if (!normalizedDomain || !/^[a-z0-9.-]+$/i.test(normalizedDomain)) throw new Error('authDomain inválido.');

  const pattern = /(VITE_FIREBASE_AUTH_DOMAIN\s*:\s*)['"][^'"]*['"]/;
  if (!pattern.test(source)) throw new Error('VITE_FIREBASE_AUTH_DOMAIN não encontrado no env-config.js.');
  return source.replace(pattern, `$1'${normalizedDomain}'`);
}

function normalizeAuthDomainFile(filePath, authDomain) {
  const source = fs.readFileSync(filePath, 'utf8');
  const output = normalizeAuthDomainSource(source, authDomain);
  fs.writeFileSync(filePath, output, 'utf8');
  return output;
}

if (require.main === module) {
  const filePath = process.argv[2] || 'js/env-config.js';
  const authDomain = process.argv[3] || process.env.FIREBASE_HOSTING_AUTH_DOMAIN || 'louvor-ide.web.app';
  normalizeAuthDomainFile(filePath, authDomain);
  console.log(`✅ Firebase authDomain normalizado para ${authDomain}`);
}

module.exports = {
  normalizeAuthDomainFile,
  normalizeAuthDomainSource
};
