(function initRouteAccessPage(scope) {
  if (!scope || !scope.document) return;
  const params = new URLSearchParams(scope.location.search || '');
  if (params.get('section') !== 'settings' || params.get('tab') !== 'routes') return;

  const LEVELS = ['NONE', 'READ', 'EDIT'];
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const normalizeLevel = value => {
    const level = String(value || '').toUpperCase();
    return LEVELS.includes(level) ? level : 'NONE';
  };

  function loadScript(src, marker) {
    if (scope[marker]) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const existing = scope.document.querySelector(`script[data-${marker}]`);
      if (existing) {
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }
      const script = scope.document.createElement('script');
      script.src = src;
      script.defer = true;
      script.setAttribute(`data-${marker}`, 'true');
      script.addEventListener('load', resolve, { once: true });
      script.addEventListener('error', reject, { once: true });
      scope.document.head.appendChild(script);
    });
  }

  function routeLevel(route, permissionMap, administrator = false) {
    if (route.public === true) return 'PUBLIC';
    if (route.adminOnly === true) return administrator ? 'EDIT' : 'NONE';
    const moduleLevel = normalizeLevel(permissionMap?.[route.permission]);
    if (route.minLevel === 'edit') return moduleLevel === 'EDIT' ? 'EDIT' : 'NONE';
    return moduleLevel;
  }

  function strongestLevel(...levels) {
    return levels.map(normalizeLevel).sort((a, b) => LEVELS.indexOf(b) - LEVELS.indexOf(a))[0] || 'NONE';
  }

  function badge(level, title = '') {
    const normalized = String(level || 'NONE').toUpperCase();
    const label = normalized === 'EDIT' ? 'Edição' : normalized === 'READ' ? 'Leitura' : normalized === 'PUBLIC' ? 'Pública' : 'Sem acesso';
    return `<span class="route-access-badge" data-level="${esc(normalized)}"${title ? ` title="${esc(title)}"` : ''}>${label}</span>`;
  }

  function userLabel(user) {
    const status = user.active === false ? ' · inativo' : '';
    return `${user.name || user.email || 'Sem nome'} · ${user.email || user.id}${status}`;
  }

  function expectedProfile(user, profiles) {
    const declared = profiles.normalizeProfile(user.accessProfile);
    if (declared) return declared;
    return profiles.inferProfile(user.permissions || {});
  }

  function isAdministrator(user, profileId) {
    const role = String(user.role || '').toUpperCase();
    return role === 'SUPER_ADMIN' || role === 'ADMIN' || profileId === 'ADMINISTRATOR' || user.isSuperAdmin === true || user.isAdmin === true;
  }

  async function readFirestoreState() {
    await scope.musicIdeAuthReady;
    const db = scope.firebase.firestore();
    const [usersSnapshot, permissionsSnapshot] = await Promise.all([
      db.collection('users').orderBy('name').get(),
      db.collection('permissions').get()
    ]);
    const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const technicalByUser = new Map();
    permissionsSnapshot.forEach(doc => {
      const data = doc.data() || {};
      if (!data.userId || !data.module) return;
      if (!technicalByUser.has(data.userId)) technicalByUser.set(data.userId, {});
      technicalByUser.get(data.userId)[data.module] = normalizeLevel(data.level);
    });
    return { users, technicalByUser };
  }

  function injectStyles() {
    if (scope.document.getElementById('route-access-styles')) return;
    const style = scope.document.createElement('style');
    style.id = 'route-access-styles';
    style.textContent = `
      .route-access-page{padding:clamp(1rem,3vw,2rem);max-width:1500px;margin:0 auto}.route-access-page h1{margin:.25rem 0}.route-access-page>header p{margin:0;color:var(--text-secondary);max-width:950px}.route-access-toolbar{display:grid;grid-template-columns:minmax(300px,1.4fr) minmax(220px,1fr) 200px 180px;gap:.75rem;margin:1.25rem 0}.route-access-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden;box-shadow:var(--shadow-sm)}.route-access-scroll{overflow:auto}.route-access-table{width:100%;min-width:1260px;border-collapse:collapse}.route-access-table th,.route-access-table td{padding:.75rem .8rem;border-bottom:1px solid var(--border);text-align:left;vertical-align:middle}.route-access-table th{font-size:.76rem;color:var(--text-secondary);background:var(--surface-secondary);position:sticky;top:0;z-index:1}.route-access-table tbody tr:last-child td{border-bottom:0}.route-access-table tr[data-status="DIVERGENT"]{background:color-mix(in srgb,var(--error) 7%,transparent)}.route-access-route strong,.route-access-route small{display:block}.route-access-route small{color:var(--text-secondary);margin-top:.2rem;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}.route-access-badge{display:inline-flex;align-items:center;justify-content:center;min-width:92px;padding:.28rem .55rem;border-radius:999px;font-size:.76rem;font-weight:700;border:1px solid var(--border);background:var(--surface-secondary)}.route-access-badge[data-level="EDIT"]{border-color:var(--success);color:var(--success)}.route-access-badge[data-level="READ"]{border-color:var(--info,var(--primary));color:var(--info,var(--primary))}.route-access-badge[data-level="NONE"]{color:var(--text-secondary)}.route-access-badge[data-level="PUBLIC"]{border-color:var(--warning);color:var(--warning)}.route-access-state{display:inline-flex;align-items:center;gap:.35rem;font-size:.78rem;font-weight:700}.route-access-state[data-state="OK"]{color:var(--success)}.route-access-state[data-state="DIVERGENT"]{color:var(--error)}.route-access-summary{display:flex;gap:.5rem;align-items:center;flex-wrap:wrap;margin-top:.8rem;color:var(--text-secondary)}.route-access-note,.route-access-user-summary,.route-access-error{margin:1rem 0;padding:.9rem 1rem;border-radius:var(--radius-md);background:var(--surface-secondary);color:var(--text-secondary)}.route-access-user-summary{display:flex;align-items:center;gap:.6rem;flex-wrap:wrap}.route-access-user-summary strong{color:var(--text-primary)}.route-access-error{border:1px solid var(--error);color:var(--error)}@media(max-width:900px){.route-access-toolbar{grid-template-columns:1fr 1fr}}@media(max-width:600px){.route-access-toolbar{grid-template-columns:1fr}.route-access-page{padding:1rem}.route-access-table{min-width:1120px}}
    `;
    scope.document.head.appendChild(style);
  }

  async function render() {
    const navigation = scope.MusicIdeNavigation;
    const profiles = scope.MusicIdeAccessProfiles;
    const root = scope.document.getElementById('module-placeholder');
    if (!root || !navigation || !Array.isArray(navigation.routeCatalog) || !profiles) return;
    injectStyles();

    const routes = navigation.routeCatalog.slice();
    const groups = [...new Set(routes.map(route => route.groupLabel || 'Outros'))];
    root.innerHTML = `<main class="route-access-page"><header><div class="ide-module-kicker">Administração · Configurações</div><h1>Rotas e Acessos</h1><p>Compare o perfil esperado com as permissões realmente persistidas no Firestore. A coluna efetiva reproduz a combinação usada pelas Rules; diferenças entre o perfil, o espelho do usuário e os documentos técnicos ficam destacadas.</p></header><div id="route-access-error"></div><div class="route-access-toolbar"><label class="ide-field"><span class="ide-field__label">Usuário no Firestore</span><select id="route-access-user" class="ide-field__control ide-select"><option value="">Carregando usuários…</option></select></label><label class="ide-field"><span class="ide-field__label">Buscar rota</span><input id="route-access-search" class="ide-field__control ide-field__input" type="search" placeholder="Nome, URL ou módulo"></label><label class="ide-field"><span class="ide-field__label">Grupo</span><select id="route-access-group" class="ide-field__control ide-select"><option value="ALL">Todos</option>${groups.map(group => `<option value="${esc(group)}">${esc(group)}</option>`).join('')}</select></label><label class="ide-field"><span class="ide-field__label">Situação</span><select id="route-access-status" class="ide-field__control ide-select"><option value="ALL">Todas</option><option value="DIVERGENT">Divergentes</option><option value="OK">Conferidas</option></select></label></div><div id="route-access-user-summary" class="route-access-user-summary"><i class="fa-solid fa-database" aria-hidden="true"></i><span>Carregando estado do Firestore…</span></div><section class="route-access-card"><div class="route-access-scroll"><table class="route-access-table"><thead><tr><th>Rota / funcionalidade</th><th>Módulo</th><th>Esperado pelo perfil</th><th>users.permissions</th><th>Documento permissions</th><th>Acesso efetivo</th><th>Situação</th></tr></thead><tbody id="route-access-body"><tr><td colspan="7">Carregando…</td></tr></tbody></table></div></section><div class="route-access-summary"><i class="fa-solid fa-shield-halved" aria-hidden="true"></i><span id="route-access-summary"></span></div><div class="route-access-note"><strong>Leitura das colunas:</strong> <code>users.permissions</code> é o espelho protegido no cadastro; <code>permissions</code> é o documento técnico. Enquanto houver dados legados, as Rules aceitam o maior acesso válido entre as duas fontes.</div></main>`;

    const userSelect = scope.document.getElementById('route-access-user');
    const search = scope.document.getElementById('route-access-search');
    const group = scope.document.getElementById('route-access-group');
    const status = scope.document.getElementById('route-access-status');
    const errorBox = scope.document.getElementById('route-access-error');

    try {
      const { users, technicalByUser } = await readFirestoreState();
      if (!users.length) throw new Error('Nenhum usuário foi encontrado no Firestore.');
      const requestedId = new URLSearchParams(scope.location.search).get('userId');
      const currentId = scope.currentMusicIdeUser?.uid;
      userSelect.innerHTML = users.map(user => `<option value="${esc(user.id)}">${esc(userLabel(user))}</option>`).join('');
      userSelect.value = users.some(user => user.id === requestedId) ? requestedId : users.some(user => user.id === currentId) ? currentId : users[0].id;

      function draw() {
        const user = users.find(candidate => candidate.id === userSelect.value) || users[0];
        const profileId = expectedProfile(user, profiles);
        const expected = profileId ? profiles.permissionsFor(profileId) : {};
        const mirror = user.permissions && typeof user.permissions === 'object' ? user.permissions : {};
        const technical = technicalByUser.get(user.id) || {};
        const effective = Object.fromEntries(profiles.MODULES.map(moduleName => [moduleName, strongestLevel(mirror[moduleName], technical[moduleName])]));
        const expectedAdmin = profileId === 'ADMINISTRATOR';
        const effectiveAdmin = isAdministrator(user, profileId);
        const term = String(search.value || '').trim().toLocaleLowerCase('pt-BR');
        const selectedGroup = group.value;

        const evaluated = routes.map(route => {
          const expectedRoute = routeLevel(route, expected, expectedAdmin);
          const mirrorRoute = routeLevel(route, mirror, effectiveAdmin);
          const technicalRoute = routeLevel(route, technical, effectiveAdmin);
          const effectiveRoute = routeLevel(route, effective, effectiveAdmin);
          const moduleDivergent = route.public !== true && route.adminOnly !== true && (normalizeLevel(mirror[route.permission]) !== normalizeLevel(expected[route.permission]) || normalizeLevel(technical[route.permission]) !== normalizeLevel(expected[route.permission]));
          const roleDivergent = route.adminOnly === true && expectedAdmin !== effectiveAdmin;
          const state = expectedRoute === effectiveRoute && !moduleDivergent && !roleDivergent ? 'OK' : 'DIVERGENT';
          return { route, expectedRoute, mirrorRoute, technicalRoute, effectiveRoute, state };
        });
        const filtered = evaluated.filter(item => {
          const route = item.route;
          const haystack = `${route.label} ${route.href} ${route.permission || ''} ${route.groupLabel || ''}`.toLocaleLowerCase('pt-BR');
          return (!term || haystack.includes(term)) && (selectedGroup === 'ALL' || route.groupLabel === selectedGroup) && (status.value === 'ALL' || item.state === status.value);
        });
        const divergentCount = evaluated.filter(item => item.state === 'DIVERGENT').length;
        scope.document.getElementById('route-access-user-summary').innerHTML = `<i class="fa-solid ${divergentCount ? 'fa-triangle-exclamation' : 'fa-circle-check'}" aria-hidden="true"></i><strong>${esc(user.name || user.email || user.id)}</strong><span>Perfil: ${esc(profileId ? profiles.profileDefinition(profileId)?.label || profileId : 'não reconhecido')} · Papel: ${esc(user.role || 'MEMBER')} · ${divergentCount ? `${divergentCount} rota(s) divergente(s)` : 'Firestore alinhado ao perfil'}</span>`;
        const body = scope.document.getElementById('route-access-body');
        body.innerHTML = filtered.map(item => {
          const moduleName = item.route.permission || (item.route.adminOnly ? 'perfil administrativo' : 'pública');
          const stateLabel = item.state === 'OK' ? '<i class="fa-solid fa-circle-check"></i> Conferida' : '<i class="fa-solid fa-triangle-exclamation"></i> Divergente';
          return `<tr data-status="${item.state}"><td class="route-access-route"><strong>${esc(item.route.label)}</strong><small>${esc(item.route.href)}</small></td><td>${esc(moduleName)}</td><td>${badge(item.expectedRoute)}</td><td>${badge(item.mirrorRoute)}</td><td>${badge(item.technicalRoute)}</td><td>${badge(item.effectiveRoute, 'Resultado usado pela navegação e pelas Rules')}</td><td><span class="route-access-state" data-state="${item.state}">${stateLabel}</span></td></tr>`;
        }).join('') || '<tr><td colspan="7">Nenhuma rota encontrada para os filtros informados.</td></tr>';
        scope.document.getElementById('route-access-summary').textContent = `${filtered.length} rota(s) exibida(s) de ${routes.length}; ${divergentCount} divergência(s) no usuário selecionado.`;
        const url = new URL(scope.location.href);
        url.searchParams.set('userId', user.id);
        scope.history.replaceState({}, '', url);
      }

      [userSelect, group, status].forEach(control => control.addEventListener('change', draw));
      search.addEventListener('input', draw);
      draw();
    } catch (error) {
      console.error('Não foi possível comparar rotas com o Firestore:', error);
      errorBox.innerHTML = `<div class="route-access-error"><strong>Falha ao ler o Firestore:</strong> ${esc(error.message || 'acesso negado')}</div>`;
      scope.document.getElementById('route-access-body').innerHTML = '<tr><td colspan="7">Não foi possível carregar os dados efetivos.</td></tr>';
    }
  }

  Promise.resolve()
    .then(() => scope.MusicIdeAccessProfiles ? null : loadScript('../js/modules/access-profiles.js?v=20260901-access-profiles', 'MusicIdeAccessProfiles'))
    .then(render)
    .catch(error => {
      console.error(error);
      const root = scope.document.getElementById('module-placeholder');
      if (root) root.innerHTML = '<main class="ide-module-page"><div class="ide-module-page__inner"><section class="ide-module-card"><h1>Rotas e Acessos</h1><p>Não foi possível carregar o catálogo de autorização.</p></section></div></main>';
    });
})(typeof window !== 'undefined' ? window : null);
