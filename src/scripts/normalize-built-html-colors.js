const fs = require('node:fs');
const path = require('node:path');

const replacements = new Map([
  ['#fff', 'var(--ide-color-white)'],
  ['#ffffff', 'var(--ide-color-white)'],
  ['#333', 'var(--ide-text-primary)'],
  ['#333333', 'var(--ide-text-primary)'],
  ['#666', 'var(--ide-text-secondary)'],
  ['#666666', 'var(--ide-text-secondary)'],
  ['#4caf50', 'var(--ide-primary-active)'],
  ['#45a049', 'var(--ide-primary-hover)'],
  ['#388e3c', 'var(--ide-success)'],
  ['#2196f3', 'var(--ide-info)'],
  ['#1976d2', 'var(--ide-info)'],
  ['#f44336', 'var(--ide-error)'],
  ['#d32f2f', 'var(--ide-error)'],
  ['#ff9800', 'var(--ide-warning)'],
  ['#f57c00', 'var(--ide-warning)'],
  ['#9c27b0', 'var(--ide-secondary)'],
  ['#7b1fa2', 'var(--ide-secondary)'],
  ['#607d8b', 'var(--ide-surface-dark)'],
  ['#455a64', 'var(--ide-surface-dark)'],
  ['#e0e0e0', 'var(--ide-border)'],
  ['#f3f3f3', 'var(--ide-surface-secondary)'],
  ['#f8f9fa', 'var(--ide-surface-secondary)'],
  ['#e9ecef', 'var(--ide-border)'],
  ['#1e1e1e', 'var(--ide-surface-dark)'],
  ['#f8f8f2', 'var(--ide-text-on-dark)'],
  ['#9e9e9e', 'var(--ide-text-secondary)'],
  ['#495057', 'var(--ide-text-secondary)'],
  ['#212529', 'var(--ide-text-primary)'],
  ['#090b0c', 'var(--ide-color-neutral-950)']
]);

const hexPattern = /#[0-9a-fA-F]{3,8}\b/g;
const themeColorPattern = /(<meta\s+name=["']theme-color["']\s+content=["'])#[0-9a-fA-F]{3,8}(["'][^>]*>)/gi;
const auditRuntimeTag = '<script src="js/modules/audit-auth-runtime.js" data-ide-audit-runtime></script>';

function injectAuditRuntime(content) {
  if (content.includes('data-ide-audit-runtime')) return content;
  if (/<\/body>/i.test(content)) return content.replace(/<\/body>/i, `  ${auditRuntimeTag}\n</body>`);
  return `${content}\n${auditRuntimeTag}\n`;
}

function normalizeHtml(content) {
  const validThemeColor = content.replace(themeColorPattern, '$1black$2');
  const normalizedColors = validThemeColor.replace(hexPattern, value => replacements.get(value.toLowerCase()) || 'var(--ide-text-primary)');
  return injectAuditRuntime(normalizedColors);
}

function normalizeDirectory(directory = '.') {
  const root = path.resolve(directory);
  const files = fs.readdirSync(root).filter(name => name.endsWith('.html'));
  let changed = 0;
  for (const name of files) {
    const file = path.join(root, name);
    const before = fs.readFileSync(file, 'utf8');
    const after = normalizeHtml(before);
    if (after !== before) {
      fs.writeFileSync(file, after);
      changed += 1;
    }
  }
  return changed;
}

if (require.main === module) {
  const changed = normalizeDirectory(process.argv[2] || '.');
  console.log(`Normalized legacy colors and audit runtime in ${changed} built HTML files.`);
}

module.exports = { replacements, hexPattern, auditRuntimeTag, injectAuditRuntime, normalizeHtml, normalizeDirectory };
