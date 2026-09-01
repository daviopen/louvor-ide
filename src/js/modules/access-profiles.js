/**
 * Perfis de acesso canônicos do IDE Music.
 *
 * O usuário recebe um único accessProfile. A matriz abaixo é a fonte de verdade
 * para materializar as permissões técnicas usadas pelas Firestore Rules.
 */
(function initAccessProfiles(globalScope, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (globalScope) globalScope.MusicIdeAccessProfiles = api;
})(typeof window !== 'undefined' ? window : null, function createAccessProfiles() {
  const MODULES = Object.freeze([
    'dashboard', 'users', 'permissions', 'unavailability', 'events',
    'schedules', 'setlists', 'songs', 'audit'
  ]);

  const PROFILES = Object.freeze([
    Object.freeze({ id: 'PARTICIPANT', label: 'Participante', description: 'Acesso básico para acompanhar o ministério e registrar a própria indisponibilidade.' }),
    Object.freeze({ id: 'MINISTER', label: 'Ministro', description: 'Participante com edição de setlists e músicas.' }),
    Object.freeze({ id: 'DM', label: 'DM', description: 'Direção musical com edição de escalas, setlists e músicas.' }),
    Object.freeze({ id: 'LEADER', label: 'Líder', description: 'Gestão operacional de eventos, escalas, setlists e músicas, com consulta de usuários e auditoria.' }),
    Object.freeze({ id: 'ADMINISTRATOR', label: 'Administrador', description: 'Administração completa dos módulos da aplicação.' })
  ]);

  const MATRIX = Object.freeze({
    PARTICIPANT: Object.freeze({
      dashboard: 'READ', users: 'NONE', permissions: 'NONE', unavailability: 'EDIT',
      events: 'READ', schedules: 'READ', setlists: 'READ', songs: 'READ', audit: 'NONE'
    }),
    MINISTER: Object.freeze({
      dashboard: 'READ', users: 'NONE', permissions: 'NONE', unavailability: 'EDIT',
      events: 'READ', schedules: 'READ', setlists: 'EDIT', songs: 'EDIT', audit: 'NONE'
    }),
    DM: Object.freeze({
      dashboard: 'READ', users: 'NONE', permissions: 'NONE', unavailability: 'EDIT',
      events: 'READ', schedules: 'EDIT', setlists: 'EDIT', songs: 'EDIT', audit: 'NONE'
    }),
    LEADER: Object.freeze({
      dashboard: 'READ', users: 'READ', permissions: 'READ', unavailability: 'EDIT',
      events: 'EDIT', schedules: 'EDIT', setlists: 'EDIT', songs: 'EDIT', audit: 'READ'
    }),
    ADMINISTRATOR: Object.freeze({
      dashboard: 'EDIT', users: 'EDIT', permissions: 'EDIT', unavailability: 'EDIT',
      events: 'EDIT', schedules: 'EDIT', setlists: 'EDIT', songs: 'EDIT', audit: 'EDIT'
    })
  });

  function normalizeProfile(value) {
    const candidate = String(value || '').trim().toUpperCase();
    return PROFILES.some(profile => profile.id === candidate) ? candidate : null;
  }

  function permissionsFor(profileId) {
    const normalized = normalizeProfile(profileId);
    if (!normalized) throw new TypeError(`Perfil de acesso inválido: ${profileId}.`);
    return { ...MATRIX[normalized] };
  }

  function profileDefinition(profileId) {
    const normalized = normalizeProfile(profileId);
    return normalized ? PROFILES.find(profile => profile.id === normalized) || null : null;
  }

  function inferProfile(permissionMap = {}) {
    for (const profile of PROFILES) {
      const expected = MATRIX[profile.id];
      const matches = MODULES.every(moduleName => String(permissionMap[moduleName] || 'NONE').toUpperCase() === expected[moduleName]);
      if (matches) return profile.id;
    }
    return null;
  }

  return Object.freeze({ MODULES, PROFILES, MATRIX, normalizeProfile, permissionsFor, profileDefinition, inferProfile });
});
