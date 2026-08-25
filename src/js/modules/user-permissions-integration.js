/**
 * Integra as permissões ao fluxo de Usuários sem duplicar regras de persistência.
 * SUPER_ADMIN pode editar acessos no mesmo formulário do usuário e abrir a
 * ficha dedicada de permissões a partir da lista.
 */
(function initUserPermissionsIntegration(scope) {
  if (!scope || !scope.document) return;

  const MODULES = Object.freeze({
    dashboard: 'Dashboard', users: 'Usuários', permissions: 'Permissões',
    unavailability: 'Indisponibilidades', events: 'Eventos', schedules: 'Escalas',
    setlists: 'Setlists', songs: 'Músicas', audit: 'Auditoria'
  });
  const LEVELS = Object.freeze([['NONE', 'Sem acesso'], ['READ', 'Leitura'], ['EDIT', 'Edição']]);
  let editingUserId = null;
  let renderedUserId = null;

  function isSuperAdmin() {
    const profile = scope.currentMusicIdeProfile;
    return Boolean(profile && (profile.role === 'SUPER_ADMIN' || profile.isSuperAdmin === true));
  }
  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, char => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[char]));
  }
  function normalizeLevel(value) {
    const level = String(value || '').toUpperCase();
    return LEVELS.some(([candidate]) => candidate === level) ? level : 'NONE';
  }

  async function fetchPermissions(userId) {
    const db = scope.firebase.firestore();
    const snapshot = await db.collection('permissions').where('userId', '==', userId).get();
    const permissions = {};
    snapshot.forEach(doc => {
      const data = doc.data() || {};
      if (data.module) permissions[data.module] = normalizeLevel(data.level);
    });
    return permissions;
  }

  function renderPermissions(permissions) {
    const container = scope.document.getElementById('user-permissions');
    const fieldset = scope.document.getElementById('user-permissions-row');
    if (!container || !fieldset) return;
    const legend = fieldset.querySelector('legend');
    const help = fieldset.querySelector('.users-muted');
    if (legend) legend.textContent = 'Permissões de acesso';
    if (help) help.textContent = 'Defina o acesso deste usuário aos módulos. Edição inclui leitura; Sem acesso remove o módulo do menu e bloqueia a rota.';
    container.innerHTML = Object.entries(MODULES).map(([moduleName, label]) => {
      const current = normalizeLevel(permissions[moduleName]);
      return `<label class="users-permission-option"><span>${escapeHtml(label)}</span><select class="ide-field__control ide-select" data-permission-module="${escapeHtml(moduleName)}" aria-label="Permissão para ${escapeHtml(label)}">${LEVELS.map(([level, text]) => `<option value="${level}" ${current === level ? 'selected' : ''}>${text}</option>`).join('')}</select></label>`;
    }).join('');
    fieldset.hidden = !isSuperAdmin();
  }

  function readPermissions() {
    const result = {};
    const container = scope.document.getElementById('user-permissions');
    if (!container) return result;
    container.querySelectorAll('[data-permission-module]').forEach(select => {
      result[select.dataset.permissionModule] = normalizeLevel(select.value);
    });
    return result;
  }

  async function hydrateEditingPermissions() {
    const dialog = scope.document.getElementById('user-dialog');
    if (!dialog || !dialog.open || !editingUserId || !isSuperAdmin() || renderedUserId === editingUserId) return;
    renderedUserId = editingUserId;
    const fieldset = scope.document.getElementById('user-permissions-row');
    if (fieldset) fieldset.hidden = false;
    try {
      renderPermissions(await fetchPermissions(editingUserId));
    } catch (error) {
      renderedUserId = null;
      console.error('Falha ao carregar permissões do usuário:', error);
    }
  }

  function enhanceRows() {
    if (!isSuperAdmin()) return;
    scope.document.querySelectorAll('#users-body tr').forEach(row => {
      const edit = row.querySelector('button[data-action="edit"][data-id]');
      if (!edit || row.querySelector('[data-action="permissions"]')) return;
      const button = scope.document.createElement('button');
      button.type = 'button';
      button.className = 'ide-button ide-button--secondary ide-button--sm';
      button.dataset.action = 'permissions';
      button.dataset.id = edit.dataset.id;
      button.innerHTML = '<i class="fa-solid fa-shield-halved" aria-hidden="true"></i> Permissões';
      edit.insertAdjacentElement('afterend', button);
    });
  }

  function patchUserService() {
    const Service = scope.MusicIdeUserService && scope.MusicIdeUserService.UserService;
    if (!Service || Service.prototype.__permissionsIntegrated) return;
    const originalUpdate = Service.prototype.update;
    Service.prototype.update = async function updateWithPermissions(id, input) {
      const result = await originalUpdate.call(this, id, input);
      if (isSuperAdmin() && editingUserId === id && this.repository && typeof this.repository.replaceInitialPermissions === 'function') {
        const permissions = readPermissions();
        await this.repository.replaceInitialPermissions(id, permissions);
        await this.audit('USER_PERMISSIONS_UPDATED', id, { permissions });
      }
      return result;
    };
    Service.prototype.__permissionsIntegrated = true;
  }

  function bootstrap() {
    patchUserService();
    const body = scope.document.getElementById('users-body');
    if (body) new MutationObserver(enhanceRows).observe(body, { childList: true, subtree: true });
    enhanceRows();

    scope.document.addEventListener('click', event => {
      const button = event.target.closest('button[data-action]');
      if (button && button.dataset.action === 'permissions') {
        event.preventDefault();
        event.stopImmediatePropagation();
        scope.location.href = `module.html?section=permissions&userId=${encodeURIComponent(button.dataset.id)}`;
        return;
      }
      if (button && button.dataset.action === 'edit') {
        editingUserId = button.dataset.id || null;
        renderedUserId = null;
        setTimeout(hydrateEditingPermissions, 0);
      }
      if (event.target.closest('#new-user')) {
        editingUserId = null;
        renderedUserId = null;
      }
    }, true);

    const dialog = scope.document.getElementById('user-dialog');
    if (dialog) {
      new MutationObserver(() => { if (dialog.open) hydrateEditingPermissions(); }).observe(dialog, { attributes: true, attributeFilter: ['open'] });
      dialog.addEventListener('close', () => { editingUserId = null; renderedUserId = null; });
    }
  }

  if (scope.document.readyState === 'loading') scope.document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
  else bootstrap();
})(typeof window !== 'undefined' ? window : null);
