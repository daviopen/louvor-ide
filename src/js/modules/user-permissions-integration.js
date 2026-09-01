/**
 * Integra os perfis de acesso reutilizáveis ao CRUD de usuários.
 * A UI escolhe um único perfil; o Repository materializa a matriz técnica
 * de permissions exigida pelas Firestore Rules.
 */
(function initUserAccessProfileIntegration(scope) {
  if (!scope || !scope.document) return;

  let editingUserId = null;
  let renderedUserId = undefined;

  function ensureAccessProfiles() {
    if (scope.MusicIdeAccessProfiles) return Promise.resolve(scope.MusicIdeAccessProfiles);
    if (scope.__musicIdeAccessProfilesPromise) return scope.__musicIdeAccessProfilesPromise;
    scope.__musicIdeAccessProfilesPromise = new Promise((resolve, reject) => {
      const script = scope.document.createElement('script');
      script.src = '../js/modules/access-profiles.js?v=20260901-access-profiles';
      script.defer = true;
      script.onload = () => scope.MusicIdeAccessProfiles ? resolve(scope.MusicIdeAccessProfiles) : reject(new Error('Catálogo de perfis não foi inicializado.'));
      script.onerror = () => reject(new Error('Não foi possível carregar o catálogo de perfis de acesso.'));
      scope.document.head.appendChild(script);
    });
    return scope.__musicIdeAccessProfilesPromise;
  }

  function accessProfiles() {
    const api = scope.MusicIdeAccessProfiles;
    if (!api) throw new Error('MusicIdeAccessProfiles não foi carregado.');
    return api;
  }

  function isSuperAdmin() {
    const profile = scope.currentMusicIdeProfile;
    return Boolean(profile && (profile.role === 'SUPER_ADMIN' || profile.isSuperAdmin === true));
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, char => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[char]));
  }

  async function readUserProfile(userId) {
    if (!userId) return null;
    const snapshot = await scope.firebase.firestore().collection('users').doc(userId).get();
    return snapshot.exists ? { id: snapshot.id, ...snapshot.data() } : null;
  }

  function effectiveProfileId(user) {
    const api = accessProfiles();
    const explicit = api.normalizeProfile(user && user.accessProfile);
    if (explicit) return explicit;
    const inferred = api.inferProfile(user && user.permissions || {});
    return inferred || 'PARTICIPANT';
  }

  function renderProfileSelector(user = null) {
    const api = accessProfiles();
    const fieldset = scope.document.getElementById('user-permissions-row');
    const container = scope.document.getElementById('user-permissions');
    if (!fieldset || !container) return;

    const legend = fieldset.querySelector('legend');
    const help = fieldset.querySelector('.users-fieldset-help, .users-muted');
    if (legend) legend.textContent = 'Perfil de acesso';
    if (help) help.textContent = 'Associe um único perfil. As permissões dos módulos são aplicadas automaticamente conforme o padrão do IDE Music.';

    const selected = effectiveProfileId(user);
    const options = api.PROFILES.map(profile => `<option value="${escapeHtml(profile.id)}" ${selected === profile.id ? 'selected' : ''}>${escapeHtml(profile.label)}</option>`).join('');
    container.innerHTML = `<label class="ide-field"><span class="ide-field__label">Perfil</span><select id="user-access-profile" class="ide-field__control ide-select" aria-label="Perfil de acesso">${options}</select></label><p id="user-access-profile-help" class="users-muted"></p>`;

    const select = scope.document.getElementById('user-access-profile');
    const description = scope.document.getElementById('user-access-profile-help');
    const syncDescription = () => {
      const definition = api.profileDefinition(select.value);
      description.textContent = definition ? definition.description : '';
    };
    select.addEventListener('change', syncDescription);
    syncDescription();
    fieldset.hidden = !isSuperAdmin();
  }

  function selectedProfileId() {
    const select = scope.document.getElementById('user-access-profile');
    return accessProfiles().normalizeProfile(select && select.value) || 'PARTICIPANT';
  }

  async function hydrateEditingProfile() {
    const dialog = scope.document.getElementById('user-dialog');
    if (!dialog || !dialog.open || !isSuperAdmin()) return;
    if (renderedUserId === editingUserId) return;
    renderedUserId = editingUserId;
    try {
      await ensureAccessProfiles();
      renderProfileSelector(editingUserId ? await readUserProfile(editingUserId) : null);
    } catch (error) {
      renderedUserId = undefined;
      console.error('Falha ao carregar perfil de acesso do usuário:', error);
    }
  }

  function patchUserService() {
    const Service = scope.MusicIdeUserService && scope.MusicIdeUserService.UserService;
    if (!Service || Service.prototype.__accessProfilesIntegrated) return;

    const originalCreate = Service.prototype.create;
    Service.prototype.create = async function createWithAccessProfile(input) {
      if (!isSuperAdmin()) return originalCreate.call(this, input);
      await ensureAccessProfiles();
      const profileId = selectedProfileId();
      const permissions = accessProfiles().permissionsFor(profileId);
      const result = await originalCreate.call(this, { ...input, accessProfile: profileId, permissions });
      if (this.repository && typeof this.repository.assignAccessProfile === 'function') {
        await this.repository.assignAccessProfile(result.id, profileId, permissions);
        await this.audit('USER_ACCESS_PROFILE_ASSIGNED', result.id, { accessProfile: profileId });
        this.invalidateDirectoryCache();
      }
      return { ...result, accessProfile: profileId };
    };

    const originalUpdate = Service.prototype.update;
    Service.prototype.update = async function updateWithAccessProfile(id, input) {
      const result = await originalUpdate.call(this, id, input);
      if (isSuperAdmin() && editingUserId === id && this.repository && typeof this.repository.assignAccessProfile === 'function') {
        await ensureAccessProfiles();
        const profileId = selectedProfileId();
        const permissions = accessProfiles().permissionsFor(profileId);
        await this.repository.assignAccessProfile(id, profileId, permissions);
        await this.audit('USER_ACCESS_PROFILE_ASSIGNED', id, { accessProfile: profileId });
        this.invalidateDirectoryCache();
        return { ...result, accessProfile: profileId };
      }
      return result;
    };

    Service.prototype.__accessProfilesIntegrated = true;
  }

  function bootstrap() {
    ensureAccessProfiles().catch(error => console.error(error));
    patchUserService();

    scope.document.addEventListener('click', event => {
      const button = event.target.closest('button[data-action]');
      if (button && button.dataset.action === 'edit') {
        editingUserId = button.dataset.id || null;
        renderedUserId = undefined;
        setTimeout(hydrateEditingProfile, 0);
      }
      if (event.target.closest('#new-user')) {
        editingUserId = null;
        renderedUserId = undefined;
        setTimeout(hydrateEditingProfile, 0);
      }
    }, true);

    const dialog = scope.document.getElementById('user-dialog');
    if (dialog) {
      new MutationObserver(() => {
        if (dialog.open) hydrateEditingProfile();
      }).observe(dialog, { attributes: true, attributeFilter: ['open'] });
      dialog.addEventListener('close', () => {
        editingUserId = null;
        renderedUserId = undefined;
      });
    }
  }

  if (scope.document.readyState === 'loading') scope.document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
  else bootstrap();
})(typeof window !== 'undefined' ? window : null);
