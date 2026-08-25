const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const protectedPages = [
  'index.html',
  'consultar.html',
  'nova-musica.html',
  'ver.html',
  'setlist.html',
  'setlists.html',
  'setlist-view.html'
];

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

function relativeLuminance(hex) {
  const channels = hex.match(/[0-9a-f]{2}/gi).map(channel => parseInt(channel, 16) / 255);
  const linear = channels.map(value => (
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  ));
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(foreground, background) {
  const values = [relativeLuminance(foreground), relativeLuminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test('usa a marca IDE Music em todas as páginas do produto', () => {
  [...protectedPages, 'login.html'].forEach(page => {
    const html = read(`src/pages/${page}`);
    assert.match(html, /IDE Music/, `${page} sem a marca IDE Music`);
    assert.doesNotMatch(html, /MUSIC\.IDE|Music IDE|Louvor IDE/, `${page} contém a marca antiga`);
  });
});

test('carrega a navegação lateral em todas as páginas autenticadas', () => {
  protectedPages.forEach(page => {
    const html = read(`src/pages/${page}`);
    assert.match(html, /app-shell\.js/, `${page} sem navegação lateral`);
  });

  assert.doesNotMatch(read('src/pages/login.html'), /app-shell\.js/);
});

test('menu lateral possui navegação acessível e comportamento móvel', () => {
  const shell = read('src/js/modules/app-shell.js');
  const theme = read('src/css/music-ide-theme.css');

  assert.match(shell, /aria-label.*Navegação principal/);
  assert.match(shell, /aria-current/);
  assert.match(shell, /aria-expanded/);
  assert.match(shell, /event\.key === 'Escape'/);
  assert.match(theme, /@media \(max-width: 900px\)/);
  assert.match(theme, /ide-sidebar-open/);
});

test('verde usado como texto sobre cartões claros atende contraste AA', () => {
  const theme = read('src/css/music-ide-theme.css');
  const match = theme.match(/--music-accent-dark:\s*(#[0-9a-f]{6})/i);

  assert.ok(match, 'cor de texto verde não encontrada');
  assert.ok(
    contrastRatio(match[1], '#fffef9') >= 4.5,
    'texto verde não possui contraste suficiente sobre os cartões'
  );
});
