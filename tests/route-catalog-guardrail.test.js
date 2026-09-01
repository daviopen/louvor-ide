const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const appShellSource = fs.readFileSync(path.join(root, 'src/js/modules/app-shell.js'), 'utf8');
const accessProfiles = require(path.join(root, 'src/js/modules/access-profiles.js'));

function routeObjectsFromSource(source) {
  const block = source.match(/const ROUTE_CATALOG = Object\.freeze\(\[([\s\S]*?)\n  \]\);/);
  assert.ok(block, 'ROUTE_CATALOG deve existir no app-shell.js');
  const objects = [...block[1].matchAll(/Object\.freeze\(\{([^}]*)\}\)/g)].map(match => match[1]);
  return objects.map(raw => {
    const read = key => raw.match(new RegExp(`${key}:\\s*'([^']+)'`))?.[1] || null;
    return {
      id: read('id'),
      label: read('label'),
      href: read('href'),
      permission: read('permission'),
      minLevel: read('minLevel'),
      public: /public:\s*true/.test(raw),
      adminOnly: /adminOnly:\s*true/.test(raw),
      menu: /menu:\s*true/.test(raw)
    };
  });
}

const routes = routeObjectsFromSource(appShellSource);

test('todas as páginas navegáveis estão representadas no catálogo de rotas', () => {
  const pagesDir = path.join(root, 'src/pages');
  const pages = fs.readdirSync(pagesDir).filter(name => name.endsWith('.html'));
  const represented = new Set(routes.map(route => String(route.href || '').split('?')[0]));
  for (const page of pages) {
    assert.ok(represented.has(page), `${page} não está registrado no ROUTE_CATALOG`);
  }
});

test('toda rota protegida declara uma política determinística', () => {
  const modules = new Set(accessProfiles.MODULES);
  for (const route of routes) {
    assert.ok(route.id, 'rota sem id');
    assert.ok(route.label, `${route.id} sem label`);
    assert.ok(route.href, `${route.id} sem href`);
    const policyKinds = Number(route.public) + Number(route.adminOnly) + Number(Boolean(route.permission));
    assert.equal(policyKinds, 1, `${route.id} deve declarar exatamente uma política: public, adminOnly ou permission`);
    if (route.permission) assert.ok(modules.has(route.permission), `${route.id} usa módulo de permissão desconhecido: ${route.permission}`);
    if (route.minLevel) assert.equal(route.minLevel, 'edit', `${route.id} usa minLevel não suportado`);
  }
});

test('cada rota protegida resolve NONE/READ/EDIT para os cinco perfis', () => {
  const profileIds = accessProfiles.PROFILES.map(profile => profile.id);
  assert.deepEqual(profileIds, ['PARTICIPANT', 'MINISTER', 'DM', 'LEADER', 'ADMINISTRATOR']);
  for (const route of routes.filter(item => !item.public)) {
    for (const profileId of profileIds) {
      let level;
      if (route.adminOnly) level = profileId === 'ADMINISTRATOR' ? 'EDIT' : 'NONE';
      else {
        const moduleLevel = accessProfiles.MATRIX[profileId][route.permission];
        level = route.minLevel === 'edit' ? (moduleLevel === 'EDIT' ? 'EDIT' : 'NONE') : moduleLevel;
      }
      assert.ok(['NONE', 'READ', 'EDIT'].includes(level), `${route.id}/${profileId} não resolve para NONE/READ/EDIT`);
    }
  }
});

test('menu, guard e tela administrativa consomem o mesmo catálogo', () => {
  assert.match(appShellSource, /navigationGroups = Object\.freeze\(/);
  assert.match(appShellSource, /ROUTE_CATALOG\.filter\(route => route\.menu === true\)/);
  assert.match(appShellSource, /return ROUTE_CATALOG\.find\(item => item\.id === id\)/);
  assert.match(appShellSource, /routeCatalog: ROUTE_CATALOG/);
  assert.match(appShellSource, /settings-routes/);
  assert.match(appShellSource, /route-access-page\.js/);
});
