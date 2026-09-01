(function initRouteAccessPage(scope) {
  if (!scope || !scope.document) return;
  const params = new URLSearchParams(scope.location.search || '');
  if (params.get('section') !== 'settings' || params.get('tab') !== 'routes') return;

  const PROFILE_ORDER = ['PARTICIPANT', 'MINISTER', 'DM', 'LEADER', 'ADMINISTRATOR'];
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

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

  function routeLevel(route, profileId, matrix) {
    if (route.public === true) return 'PUBLIC';
    if (route.adminOnly === true) return profileId === 'ADMINISTRATOR' ? 'EDIT' : 'NONE';
    const moduleLevel = String(matrix?.[profileId]?.[route.permission] || 'NONE').toUpperCase();
    if (route.minLevel === 'edit') return moduleLevel === 'EDIT' ? 'EDIT' : 'NONE';
    return moduleLevel;
  }

  function badge(level) {
    const normalized = String(level || 'NONE').toUpperCase();
    const label = normalized === 'EDIT' ? 'Edição' : normalized === 'READ' ? 'Leitura' : normalized === 'PUBLIC' ? 'Pública' : 'Sem acesso';
    return `<span class="route-access-badge" data-level="${esc(normalized)}">${label}</span>`;
  }

  function injectStyles() {
    if (scope.document.getElementById('route-access-styles')) return;
    const style = scope.document.createElement('style');
    style.id = 'route-access-styles';
    style.textContent = `
      .route-access-page{padding:clamp(1rem,3vw,2rem);max-width:1440px;margin:0 auto}.route-access-page h1{margin:.25rem 0}.route-access-page>header p{margin:0;color:var(--text-secondary);max-width:880px}.route-access-toolbar{display:grid;grid-template-columns:minmax(220px,1fr) 220px 200px;gap:.75rem;margin:1.25rem 0}.route-access-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden;box-shadow:var(--shadow-sm)}.route-access-scroll{overflow:auto}.route-access-table{width:100%;min-width:1100px;border-collapse:collapse}.route-access-table th,.route-access-table td{padding:.8rem .9rem;border-bottom:1px solid var(--border);text-align:left;vertical-align:middle}.route-access-table th{font-size:.78rem;color:var(--text-secondary);background:var(--surface-secondary);position:sticky;top:0;z-index:1}.route-access-table tbody tr:last-child td{border-bottom:0}.route-access-route strong,.route-access-route small{display:block}.route-access-route small{color:var(--text-secondary);margin-top:.2rem;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}.route-access-badge{display:inline-flex;align-items:center;justify-content:center;min-width:92px;padding:.28rem .55rem;border-radius:999px;font-size:.76rem;font-weight:700;border:1px solid var(--border);background:var(--surface-secondary)}.route-access-badge[data-level="EDIT"]{border-color:var(--success);color:var(--success)}.route-access-badge[data-level="READ"]{border-color:var(--info,var(--primary));color:var(--info,var(--primary))}.route-access-badge[data-level="NONE"]{color:var(--text-secondary)}.route-access-badge[data-level="PUBLIC"]{border-color:var(--warning);color:var(--warning)}.route-access-summary{display:flex;gap:.5rem;align-items:center;flex-wrap:wrap;margin-top:.8rem;color:var(--text-secondary)}.route-access-note{margin:1rem 0;padding:.9rem 1rem;border-radius:var(--radius-md);background:var(--surface-secondary);color:var(--text-secondary)}@media(max-width:760px){.route-access-toolbar{grid-template-columns:1fr}.route-access-page{padding:1rem}.route-access-table{min-width:980px}}
    `;
    scope.document.head.appendChild(style);
  }

  function render() {
    const navigation = scope.MusicIdeNavigation;
    const profiles = scope.MusicIdeAccessProfiles;
    const root = scope.document.getElementById('module-placeholder');
    if (!root || !navigation || !Array.isArray(navigation.routeCatalog) || !profiles) return;
    injectStyles();

    const profileMap = new Map(profiles.PROFILES.map(profile => [profile.id, profile]));
    const routes = navigation.routeCatalog.slice();
    const groups = [...new Set(routes.map(route => route.groupLabel || 'Outros'))];
    root.innerHTML = `<main class="route-access-page"><header><div class="ide-module-kicker">Administração · Configurações</div><h1>Rotas e Acessos</h1><p>Catálogo central das rotas do IDE Music. A matriz é derivada dos perfis de acesso e é somente leitura; alterações de autorização devem ser versionadas no código, revisadas e validadas antes do deploy.</p></header><div class="route-access-toolbar"><label class="ide-field"><span class="ide-field__label">Buscar rota</span><input id="route-access-search" class="ide-field__control ide-field__input" type="search" placeholder="Nome, URL ou módulo"></label><label class="ide-field"><span class="ide-field__label">Grupo</span><select id="route-access-group" class="ide-field__control ide-select"><option value="ALL">Todos</option>${groups.map(group => `<option value="${esc(group)}">${esc(group)}</option>`).join('')}</select></label><label class="ide-field"><span class="ide-field__label">Tipo</span><select id="route-access-type" class="ide-field__control ide-select"><option value="ALL">Todos</option><option value="PROTECTED">Protegidas</option><option value="PUBLIC">Públicas</option></select></label></div><div class="route-access-note"><strong>Guardrail:</strong> nenhuma rota protegida pode existir sem política explícita. Rotas novas precisam estar neste catálogo e ter acesso determinístico para Participante, Ministro, DM, Líder e Administrador.</div><section class="route-access-card"><div class="route-access-scroll"><table class="route-access-table"><thead><tr><th>Rota / funcionalidade</th><th>Grupo</th>${PROFILE_ORDER.map(id => `<th>${esc(profileMap.get(id)?.label || id)}</th>`).join('')}</tr></thead><tbody id="route-access-body"></tbody></table></div></section><div class="route-access-summary"><i class="fa-solid fa-shield-halved" aria-hidden="true"></i><span id="route-access-summary"></span></div></main>`;

    const search = scope.document.getElementById('route-access-search');
    const group = scope.document.getElementById('route-access-group');
    const type = scope.document.getElementById('route-access-type');

    function draw() {
      const term = String(search.value || '').trim().toLocaleLowerCase('pt-BR');
      const selectedGroup = group.value;
      const selectedType = type.value;
      const filtered = routes.filter(route => {
        const haystack = `${route.label} ${route.href} ${route.permission || ''} ${route.groupLabel || ''}`.toLocaleLowerCase('pt-BR');
        const matchesSearch = !term || haystack.includes(term);
        const matchesGroup = selectedGroup === 'ALL' || route.groupLabel === selectedGroup;
        const matchesType = selectedType === 'ALL' || (selectedType === 'PUBLIC' ? route.public === true : route.public !== true);
        return matchesSearch && matchesGroup && matchesType;
      });
      const body = scope.document.getElementById('route-access-body');
      body.innerHTML = filtered.map(route => `<tr><td class="route-access-route"><strong>${esc(route.label)}</strong><small>${esc(route.href)}</small></td><td>${esc(route.groupLabel || 'Outros')}</td>${PROFILE_ORDER.map(profileId => `<td>${badge(routeLevel(route, profileId, profiles.MATRIX))}</td>`).join('')}</tr>`).join('') || '<tr><td colspan="7">Nenhuma rota encontrada para os filtros informados.</td></tr>';
      scope.document.getElementById('route-access-summary').textContent = `${filtered.length} rota(s) exibida(s) de ${routes.length} registradas.`;
    }

    search.addEventListener('input', draw);
    group.addEventListener('change', draw);
    type.addEventListener('change', draw);
    draw();
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
