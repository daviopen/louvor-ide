const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const protectedPages = ['index.html','consultar.html','nova-musica.html','ver.html','setlist.html','setlists.html','setlist-view.html'];
function read(relativePath) { return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8'); }
function relativeLuminance(hex) { const channels = hex.match(/[0-9a-f]{2}/gi).map(channel => parseInt(channel, 16) / 255); const linear = channels.map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4); return .2126 * linear[0] + .7152 * linear[1] + .0722 * linear[2]; }
function contrastRatio(foreground, background) { const values = [relativeLuminance(foreground), relativeLuminance(background)].sort((a,b) => b-a); return (values[0]+.05)/(values[1]+.05); }

test('usa a marca IDE Music em todas as páginas do produto', () => {
  [...protectedPages, 'login.html'].forEach(page => { const html = read(`src/pages/${page}`); assert.match(html, /IDE Music/, `${page} sem a marca IDE Music`); assert.doesNotMatch(html, /MUSIC\.IDE|Music IDE|Louvor IDE/, `${page} contém a marca antiga`); });
});

test('carrega a navegação lateral em todas as páginas autenticadas', () => {
  protectedPages.forEach(page => assert.match(read(`src/pages/${page}`), /app-shell\.js/, `${page} sem navegação lateral`));
  assert.doesNotMatch(read('src/pages/login.html'), /app-shell\.js/);
});

test('menu lateral possui navegação acessível e comportamento móvel', () => {
  const shell = read('src/js/modules/app-shell.js'); const theme = read('src/css/music-ide-theme.css');
  assert.match(shell, /aria-label.*Navegação principal/); assert.match(shell, /aria-current/); assert.match(shell, /aria-expanded/); assert.match(shell, /event\.key === 'Escape'/); assert.match(theme, /@media\(max-width:900px\)/); assert.match(theme, /ide-sidebar-open/);
});

test('tokens de texto usados em superfícies claras atendem contraste AA', () => {
  const tokens = read('src/styles/tokens.css');
  const value = name => { const match = tokens.match(new RegExp(`${name}:\\s*(#[0-9a-f]{6})`, 'i')); assert.ok(match, `${name} não encontrado`); return match[1]; };
  const surface = value('--ide-color-neutral-50');
  assert.ok(contrastRatio(value('--ide-color-neutral-900'), surface) >= 4.5);
  assert.ok(contrastRatio(value('--ide-color-neutral-600'), surface) >= 4.5);
});
