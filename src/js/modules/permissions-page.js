/**
 * Administração de permissões por usuário.
 * O SUPER_ADMIN seleciona uma pessoa e edita a ficha de acesso dela.
 */
(function initPermissionsPage(scope) {
  if (!scope || !scope.document) return;

  const MODULES = Object.freeze([
    ['dashboard', 'Dashboard'],
    ['users', 'Usuários'],
    ['permissions', 'Permissões'],
    ['unavailability', 'Indisponibilidades'],
    ['events', 'Eventos'],
    ['schedules', 'Escalas'],
    ['setlists', 'Setlists'],
    ['songs', 'Músicas'],
    ['audit', 'Auditoria']
  ]);
  const LEVELS = Object.freeze([
    ['NONE', 'Sem acesso'],
    ['READ', 'Leitura'],
    ['EDIT', 'Edição']
  ]);
  const ROLES = Object.freeze([
    ['MEMBER', 'Membro'],
    ['ADMIN', 'Administrador']
  ]);

  const normalizeLevel = value => {
    const level = String(value || '').toUpperCase();
    return LEVELS.some(([candidate]) => candidate === level) ? level : 'NONE';
  };
  const normalizeRole = value => {
    const role = String(value || 'MEMBER').toUpperCase();
    return ['MEMBER', 'ADMIN', 'SUPER_ADMIN'].includes(role) ? role : 'MEMBER';
  };
  const escapeHtml = value => String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  const isSuperAdmin = profile => Boolean(profile && (profile.role === 'SUPER_ADMIN' || profile.isSuperAdmin === true));
  const currentSection = () => new URLSearchParams(scope.location.search).get('section');

  function ensureStyles() {
    if (scope.document.querySelector('link[data-ide-permissions-styles]')) return;
    const link = scope.document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '../styles/permissions.css?v=20260826-role-hierarchy';
    link.dataset.idePermissionsStyles = 'true';
    scope.document.head.appendChild(link);
  }

  async function loadUsers(db) {
    const snapshot = await db.collection('users').orderBy('name').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async function loadPermissions(db, userId) {
    const snapshot = await db.collection('permissions').where('userId', '==', userId).get();
    const result = {};
    snapshot.forEach(doc => {
      const data = doc.data() || {};
      if (data.module) result[data.module] = normalizeLevel(data.level);
    });
    return result;
  }

  function userOption(user) {
    const suffix = user.active === false ? ' · Inativo' : '';
    const role = normalizeRole(user.role);
    const roleLabel = role === 'SUPER_ADMIN' ? 'Super Admin' : role === 'ADMIN' ? 'Admin' : 'Membro';
    return `<option value="${escapeHtml(user.id)}">${escapeHtml(user.name || user.email || 'Sem nome')} · ${escapeHtml(user.email || '')} · ${roleLabel}${suffix}</option>`;
  }

  function renderShell(root, users, selectedId, editable) {
    root.innerHTML = `
      <div class="ide-permissions-toolbar">
        <div>
          <h2>Permissões de acesso</h2>
          <p>Defina o perfil administrativo e o nível de acesso da pessoa em cada módulo do IDE Music.</p>
        </div>
      </div>
      ${editable ? '' : '<div class="ide-permissions-note"><i class="fa-solid fa-lock" aria-hidden="true"></i><span>Você está em modo somente leitura. Apenas SUPER_ADMIN pode alterar perfis e permissões.</span></div>'}
      <section class="ide-permissions-user-picker">
        <label class="ide-field">
          <span class="ide-field__label">Usuário</span>
          <select id="permissions-user" class="ide-field__control ide-select">
            <option value="">Selecione um usuário</option>
            ${users.map(userOption).join('')}
          </select>
        </label>
      </section>
      <div id="permissions-editor" class="ide-permissions-editor"></div>
      <div id="permissions-status" class="ide-permissions-status" role="status" aria-live="polite"></div>
      <dialog id="permissions-review" class="ide-permissions-dialog">
        <form method="dialog">
          <h3>Confirmar alterações administrativas</h3>
          <p>Revise as mudanças antes de salvar. Perfil e permissões possuem responsabilidades diferentes.</p>
          <div id="permissions-diff"></div>
          <div class="ide-permissions-dialog-actions">
            <button value="cancel" class="ide-button ide-button--secondary">Cancelar</button>
            <button id="permissions-confirm" value="default" class="ide-button ide-button--primary">Confirmar e salvar</button>
          </div>
        </form>
      </dialog>`;
    const select = root.querySelector('#permissions-user');
    if (selectedId && users.some(user => user.id === selectedId)) select.value = selectedId;
  }

  function renderEditor(root, user, permissions, editable) {
    const editor = root.querySelector('#permissions-editor');
    if (!user) {
      editor.innerHTML = '<div class="ide-empty-state"><i class="fa-solid fa-user-shield" aria-hidden="true"></i><h3>Selecione um usuário</h3><p>O perfil e as permissões da pessoa escolhida aparecerão aqui.</p></div>';
      return;
    }
    const initials = escapeHtml((user.name || user.email || '?').trim().slice(0, 2).toUpperCase());
    const role = normalizeRole(user.role);
    const lockedSuperAdmin = role === 'SUPER_ADMIN';
    const roleControl = lockedSuperAdmin
      ? '<select id="permission-role" data-original-role="SUPER_ADMIN" disabled><option value="SUPER_ADMIN" selected>Super Admin</option></select>'
      : `<select id="permission-role" data-original-role="${role}" ${editable ? '' : 'disabled'}>${ROLES.map(([value, label]) => `<option value="${value}" ${role === value ? 'selected' : ''}>${label}</option>`).join('')}</select>`;

    editor.innerHTML = `
      <article class="ide-permissions-user" data-user-id="${escapeHtml(user.id)}" data-user-name="${escapeHtml(user.name || user.email || 'Usuário')}">
        <header class="ide-permissions-user__header">
          <div class="ide-permissions-user__identity">
            <div class="ide-permissions-user__avatar">${initials}</div>
            <div class="ide-permissions-user__text"><strong>${escapeHtml(user.name || 'Sem nome')}</strong><small>${escapeHtml(user.email || '')}</small></div>
          </div>
          ${user.active === false ? '<span class="ide-permission-inactive">Inativo</span>' : ''}
        </header>
        <div class="ide-permissions-section-heading"><strong>Perfil administrativo</strong><span>O perfil define o alcance da ação; as permissões abaixo definem em quais módulos ela pode acontecer.</span></div>
        <div class="ide-permissions-grid">
          <div class="ide-permission-field">
            <label for="permission-role">Perfil</label>
            ${roleControl}
            <small>${lockedSuperAdmin ? 'O perfil Super Admin é protegido.' : 'Administrador pode atuar sobre dados de outras pessoas somente nos módulos em que também possuir Edição.'}</small>
          </div>
        </div>
        <div class="ide-permissions-section-heading"><strong>Acessos aos módulos</strong><span>Edição inclui leitura, mas não transforma um Membro em Administrador.</span></div>
        <div class="ide-permissions-grid">
          ${MODULES.map(([moduleName, label]) => {
            const current = normalizeLevel(permissions[moduleName]);
            return `<div class="ide-permission-field"><label for="permission-${escapeHtml(moduleName)}">${escapeHtml(label)}</label><select id="permission-${escapeHtml(moduleName)}" data-permission-module="${escapeHtml(moduleName)}" data-original="${current}" data-level="${current}" ${editable ? '' : 'disabled'}>${LEVELS.map(([level, text]) => `<option value="${level}" ${current === level ? 'selected' : ''}>${text}</option>`).join('')}</select></div>`;
          }).join('')}
        </div>
        ${editable ? '<footer class="ide-permissions-user__footer"><span>As alterações só serão aplicadas depois da revisão.</span><button id="permissions-save" class="ide-button ide-button--primary" type="button"><i class="fa-solid fa-floppy-disk" aria-hidden="true"></i> Revisar alterações</button></footer>' : ''}
      </article>`;
  }

  function collectChanges(root) {
    const card = root.querySelector('[data-user-id]');
    if (!card) return [];
    const changes = [];
    const roleSelect = card.querySelector('#permission-role');
    if (roleSelect && !roleSelect.disabled) {
      const before = normalizeRole(roleSelect.dataset.originalRole);
      const after = normalizeRole(roleSelect.value);
      if (before !== after) changes.push({ type: 'ROLE', userId: card.dataset.userId, userName: card.dataset.userName, before, after });
    }
    card.querySelectorAll('select[data-permission-module]').forEach(select => {
      const before = normalizeLevel(select.dataset.original);
      const after = normalizeLevel(select.value);
      if (before !== after) changes.push({ type: 'PERMISSION', userId: card.dataset.userId, userName: card.dataset.userName, module: select.dataset.permissionModule, before, after });
    });
    return changes;
  }

  function renderDiff(changes) {
    if (!changes.length) return '<p>Nenhuma alteração pendente.</p>';
    const labels = Object.fromEntries(MODULES);
    const levelLabels = Object.fromEntries(LEVELS);
    const roleLabels = { MEMBER: 'Membro', ADMIN: 'Administrador', SUPER_ADMIN: 'Super Admin' };
    return `<ul class="ide-permissions-diff">${changes.map(change => {
      if (change.type === 'ROLE') return `<li><strong>Perfil</strong>: ${escapeHtml(roleLabels[change.before])} → <strong>${escapeHtml(roleLabels[change.after])}</strong></li>`;
      return `<li><strong>${escapeHtml(labels[change.module])}</strong>: ${escapeHtml(levelLabels[change.before])} → <strong>${escapeHtml(levelLabels[change.after])}</strong></li>`;
    }).join('')}</ul>`;
  }

  async function persistChanges(db, changes, actor) {
    const batch = db.batch();
    const timestamp = scope.firebase.firestore.FieldValue.serverTimestamp();
    const userId = changes[0].userId;
    const userRef = db.collection('users').doc(userId);
    const userSnapshot = await userRef.get();
    const profile = userSnapshot.data() || {};
    const snapshotPermissions = { ...(profile.permissions || {}) };
    let nextRole = normalizeRole(profile.role);

    changes.forEach(change => {
      if (change.type === 'ROLE') {
        nextRole = change.after;
        return;
      }
      const ref = db.collection('permissions').doc(`${change.userId}__${change.module}`);
      if (change.after === 'NONE') {
        batch.delete(ref);
        delete snapshotPermissions[change.module];
      } else {
        batch.set(ref, { userId: change.userId, module: change.module, level: change.after, updatedAt: timestamp, updatedBy: actor.uid }, { merge: true });
        snapshotPermissions[change.module] = change.after;
      }
    });

    batch.update(userRef, { role: nextRole, permissions: snapshotPermissions, updatedAt: timestamp });
    batch.set(db.collection('auditLogs').doc(), {
      actorUserId: actor.uid,
      action: 'ACCESS_PROFILE_UPDATED',
      entityType: 'permissions',
      entityId: userId,
      details: { changes: changes.map(change => ({ type: change.type, module: change.module || null, before: change.before, after: change.after })) },
      createdAt: timestamp
    });
    await batch.commit();
  }

  async function bootstrap() {
    if (currentSection() !== 'permissions') return;
    ensureStyles();
    const card = scope.document.querySelector('.ide-module-card');
    if (!card) return;
    try {
      await scope.musicIdeAuthReady;
      const profile = scope.currentMusicIdeProfile;
      const actor = scope.currentMusicIdeUser;
      if (!profile || !actor) return;
      const db = scope.firebase.firestore();
      const users = await loadUsers(db);
      const editable = isSuperAdmin(profile);
      const requestedId = new URLSearchParams(scope.location.search).get('userId') || '';
      card.classList.add('ide-module-card--wide');
      const root = scope.document.createElement('div');
      root.className = 'ide-permissions-root';
      card.replaceChildren(root);
      renderShell(root, users, requestedId, editable);

      const showUser = async userId => {
        const user = users.find(item => item.id === userId) || null;
        if (!user) return renderEditor(root, null, {}, editable);
        root.querySelector('#permissions-status').textContent = 'Carregando permissões…';
        const permissions = await loadPermissions(db, userId);
        root.querySelector('#permissions-status').textContent = '';
        renderEditor(root, user, permissions, editable);
        const saveButton = root.querySelector('#permissions-save');
        if (saveButton) saveButton.addEventListener('click', () => {
          const changes = collectChanges(root);
          root.querySelector('#permissions-diff').innerHTML = renderDiff(changes);
          root.querySelector('#permissions-confirm').disabled = !changes.length;
          root.querySelector('#permissions-review').showModal();
        });
      };

      root.querySelector('#permissions-user').addEventListener('change', event => {
        const url = new URL(scope.location.href);
        if (event.target.value) url.searchParams.set('userId', event.target.value); else url.searchParams.delete('userId');
        scope.history.replaceState({}, '', url);
        showUser(event.target.value).catch(error => console.error(error));
      });

      root.querySelector('#permissions-review').addEventListener('close', async event => {
        const dialog = event.currentTarget;
        if (dialog.returnValue !== 'default') return;
        const changes = collectChanges(root);
        if (!changes.length) return;
        const status = root.querySelector('#permissions-status');
        status.textContent = 'Salvando alterações…';
        try {
          await persistChanges(db, changes, actor);
          const roleSelect = root.querySelector('#permission-role');
          if (roleSelect && !roleSelect.disabled) roleSelect.dataset.originalRole = normalizeRole(roleSelect.value);
          root.querySelectorAll('select[data-permission-module]').forEach(select => { select.dataset.original = normalizeLevel(select.value); });
          const user = users.find(item => item.id === changes[0].userId);
          const roleChange = changes.find(change => change.type === 'ROLE');
          if (user && roleChange) user.role = roleChange.after;
          status.textContent = 'Perfil e permissões atualizados com sucesso.';
        } catch (error) {
          console.error(error);
          status.textContent = 'Não foi possível salvar o perfil e as permissões.';
        }
      });

      await showUser(root.querySelector('#permissions-user').value);
    } catch (error) {
      console.error('Falha ao carregar permissões:', error);
      card.innerHTML = '<h1>Permissões</h1><p>Não foi possível carregar as permissões.</p>';
    }
  }

  if (scope.document.readyState === 'loading') scope.document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
  else bootstrap();
})(typeof window !== 'undefined' ? window : null);
