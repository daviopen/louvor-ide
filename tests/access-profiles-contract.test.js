const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const profiles = require('../src/js/modules/access-profiles.js');

function read(relativePath) {
  return fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf8');
}

const expectedProfiles = ['PARTICIPANT', 'MINISTER', 'DM', 'LEADER', 'ADMINISTRATOR'];
const expectedModules = ['dashboard', 'users', 'permissions', 'unavailability', 'events', 'schedules', 'setlists', 'songs', 'audit'];

test('catálogo expõe exatamente os cinco perfis canônicos', () => {
  assert.deepEqual(profiles.PROFILES.map(profile => profile.id), expectedProfiles);
  assert.deepEqual(profiles.MODULES, expectedModules);
});

test('todo perfil define NONE, READ ou EDIT para todos os módulos', () => {
  for (const profileId of expectedProfiles) {
    assert.ok(profiles.MATRIX[profileId], `matriz ausente para ${profileId}`);
    assert.deepEqual(Object.keys(profiles.MATRIX[profileId]), expectedModules);
    for (const level of Object.values(profiles.MATRIX[profileId])) {
      assert.ok(['NONE', 'READ', 'EDIT'].includes(level), `nível inválido ${level} em ${profileId}`);
    }
  }
});

test('hierarquia operacional não perde acesso ao subir de perfil', () => {
  const rank = { NONE: 0, READ: 1, EDIT: 2 };
  for (let index = 1; index < expectedProfiles.length; index += 1) {
    const previous = profiles.MATRIX[expectedProfiles[index - 1]];
    const current = profiles.MATRIX[expectedProfiles[index]];
    for (const moduleName of expectedModules) {
      assert.ok(
        rank[current[moduleName]] >= rank[previous[moduleName]],
        `${expectedProfiles[index]} perdeu acesso a ${moduleName} em relação a ${expectedProfiles[index - 1]}`
      );
    }
  }
});

test('perfil Ministro preserva exatamente os acessos de leitura e edição esperados', () => {
  assert.deepEqual(profiles.MATRIX.MINISTER, {
    dashboard: 'READ',
    users: 'NONE',
    permissions: 'NONE',
    unavailability: 'EDIT',
    events: 'READ',
    schedules: 'READ',
    setlists: 'EDIT',
    songs: 'EDIT',
    audit: 'NONE'
  });
});

test('somente Líder e Administrador editam escalas', () => {
  assert.equal(profiles.MATRIX.PARTICIPANT.schedules, 'READ');
  assert.equal(profiles.MATRIX.MINISTER.schedules, 'READ');
  assert.equal(profiles.MATRIX.DM.schedules, 'READ');
  assert.equal(profiles.MATRIX.LEADER.schedules, 'EDIT');
  assert.equal(profiles.MATRIX.ADMINISTRATOR.schedules, 'EDIT');
});

test('migração materializa a matriz do perfil nos documentos técnicos de permissão', () => {
  const migration = read('src/scripts/migrate-access-profiles.cjs');
  assert.match(migration, /profiles\.permissionsFor\(profileId\)/);
  assert.match(migration, /doc\(`\$\{userDoc\.id\}__\$\{moduleName\}`\)/);
  assert.match(migration, /batch\.set\(permissionRef/);
  assert.match(migration, /batch\.delete\(permissionRef\)/);
  assert.match(migration, /permissions: materializedPermissionSnapshot\(profileId\)/);
});

test('tela usa perfil único e repositório materializa permissões atomicamente', () => {
  const integration = read('src/js/modules/user-permissions-integration.js');
  const repository = read('src/repositories/user-repository.js');
  assert.match(integration, /user-access-profile/);
  assert.match(integration, /permissionsFor\(profileId\)/);
  assert.match(repository, /assignAccessProfile/);
  assert.match(repository, /const batch = this\.db\.batch\(\)/);
  assert.match(repository, /accessProfile: profileId/);
});

test('AGENTS exige classificação por perfil e pergunta quando houver dúvida', () => {
  const agents = read('src/AGENTS.md');
  for (const label of ['Participante', 'Ministro', 'DM', 'Líder', 'Administrador']) {
    assert.match(agents, new RegExp(label));
  }
  assert.match(agents, /perguntar ao usuário antes de inventar a política de acesso/i);
  assert.match(agents, /preservar o acesso atual de todos os perfis/i);
});
