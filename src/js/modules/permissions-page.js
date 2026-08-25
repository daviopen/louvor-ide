/**
 * Matriz administrativa de permissões do IDE Music.
 * Persiste níveis NONE/READ/EDIT por usuário e módulo, registra auditoria e
 * atualiza o snapshot de permissões no perfil para navegação/guards de UX.
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

  const normalizeLevel = value => {
    const level = String(value || '').toUpperCase();
    return LEVELS.some(([candidate]) => candidate === level) ? level : 'NONE';
  };

  function isSuperAdmin(profile) {
    return Boolean(profile && (profile.role === 'SUPER_ADMIN' || profile.isSuperAdmin === true));
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function initials(name, email) {
    const source = String(name || email || 'U').trim();
    const parts = source.split(/\s+/).filter(Boolean);
    return (parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : source.slice(0, 2)).toUpperCase();
  }

  function currentSection() {
    return new URLSearchParams(scope.location.search).get('section');
  }

  function ensureStylesheet() {
    if (scope.document.querySelector('link[data-permissions-styles]')) return;
    const link = scope.document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '../styles/permissions.css?v=20260825-responsive';
    link.dataset.permissionsStyles = 'true';
    scope.document.head.appendChild(link);
  }

  async function loadMatrix(db) {
    const [usersSnapshot, permissionsSnapshot] = await Promise.all([
      db.collection('users').orderBy('name').get(),
      db.collection('permissions').get()
    ]);
    const permissionsByUser = new Map();
    permissionsSnapshot.forEach(doc => {
      const item = doc.data() || {};
      if (!item.userId || !item.module) return;
      if (!permissionsByUser.has(item.userId)) permissionsByUser.set(item.userId, {});
      permissionsByUser.get(item.userId)[item.module] = normalizeLevel(item.level);
    });
    return usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), permissions: permissionsByUser.get(doc.id) || {} }));
  }

  function renderPermissionField(user, module, label, editable) {
    const current = normalizeLevel(user.permissions[module]);
    return `
      <div class="ide-permission-field">
        <label for="permission-${escapeHtml(user.id)}-${module}">${escapeHtml(label)}</label>
        <select
          id="permission-${escapeHtml(user.id)}-${module}"
          data-permission-module="${module}"
          data-original="${current}"
          data-level="${current}"
          ${editable ? '' : 'disabled'}
          aria-label="${escapeHtml(label)} de ${escapeHtml(user.name || user.email || 'usuário')}">
          ${LEVELS.map(([level, levelLabel]) => `<option value="${level}" ${current === level ? 'selected' : ''}>${levelLabel}</option>`).join('')}
        </select>
      </div>`;
  }

  function renderUserCard(user, editable) {
    const displayName = user.name || user.email || 'Usuário';
    return `
      <article class="ide-permissions-user" data-user-id="${escapeHtml(user.id)}" data-user-name="${escapeHtml(displayName)}">
        <header class="ide-permissions-user__header">
          <div class="ide-permissions-user__identity">
            <span class="ide-permissions-user__avatar" aria-hidden="true">${escapeHtml(initials(user.name, user.email))}</span>
            <div class="ide-permissions-user__text">
              <strong>${escapeHtml(user.name || 'Sem nome')}</strong>
              <small>${escapeHtml(user.email || '')}</small>
            </div>
          </div>
          ${user.active === false ? '<span class="ide-permission-inactive">Inativo</span>' : ''}
        </header>
        <div class="ide-permissions-grid">
          ${MODULES.map(([module, label]) => renderPermissionField(user, module, label, editable)).join('')}
        </div>
      </article>`;
  }

  function render(root, users, editable) {
    root.innerHTML = `
      <div class="ide-permissions-toolbar">
        <div>
          <h2>Permissões de acesso</h2>
          <p>Configure o acesso de cada pessoa por módulo. Edição inclui leitura; “Sem acesso” remove o módulo do menu e bloqueia a rota.</p>
        </div>
        <div class="ide-permissions-toolbar__actions">
          <button id="permissions-save" class="ide-button ide-button--primary" type="button" ${editable ? '' : 'disabled'}>
            <i class="fa-solid fa-floppy-disk" aria-hidden="true"></i> Revisar alterações
          </button>
        </div>
      </div>
      ${editable ? '' : '<div class="ide-permissions-note"><i class="fa-solid fa-lock" aria-hidden="true"></i><span>Somente SUPER_ADMIN pode alterar permissões. Você está em modo somente leitura.</span></div>'}
      <div class="ide-permissions-legend" aria-label="Legenda dos níveis de permissão">
        <strong>Níveis</strong>
        <span class="ide-permissions-level ide-permissions-level--none"><i class="fa-solid fa-circle" aria-hidden="true"></i> Sem acesso</span>
        <span class="ide-permissions-level ide-permissions-level--read"><i class="fa-solid fa-circle" aria-hidden="true"></i> Leitura</span>
        <span class="ide-permissions-level ide-permissions-level--edit"><i class="fa-solid fa-circle" aria-hidden="true"></i> Edição</span>
      </div>
      <div class="ide-permissions-users">
        ${users.length ? users.map(user => renderUserCard(user, editable)).join('') : '<div class="ide-empty-state"><strong>Nenhum usuário encontrado</strong><span>Cadastre usuários antes de configurar permissões.</span></div>'}
      </div>
      <div id="permissions-status" class="ide-permissions-status" role="status" aria-live="polite"></div>
      <dialog id="permissions-review" class="ide-permissions-dialog">
        <form method="dialog">
          <h3>Confirmar alterações administrativas</h3>
          <p>Revise as mudanças antes de persistir. Elas terão efeito no menu, nas rotas e nas Firestore Rules.</p>
          <div id="permissions-diff"></div>
          <div class="ide-permissions-dialog-actions">
            <button value="cancel" class="ide-button ide-button--secondary">Cancelar</button>
            <button id="permissions-confirm" value="default" class="ide-button ide-button--primary">Confirmar e salvar</button>
          </div>
        </form>
      </dialog>`;

    root.querySelectorAll('select[data-permission-module]').forEach(select => {
      select.addEventListener('change', () => { select.dataset.level = normalizeLevel(select.value); });
    });
  }

  function collectChanges(root) {
    const changes = [];
    root.querySelectorAll('[data-user-id]').forEach(userCard => {
      userCard.querySelectorAll('select[data-permission-module]').forEach(select => {
        const before = normalizeLevel(select.dataset.original);
        const after = normalizeLevel(select.value);
        if (before !== after) changes.push({ userId: userCard.dataset.userId, userName: userCard.dataset.userName, module: select.dataset.permissionModule, before, after });
      });
    });
    return changes;
  }

  function renderDiff(changes) {
    if (!changes.length) return '<p>Nenhuma alteração pendente.</p>';
    const labels = Object.fromEntries(MODULES);
    const levelLabels = Object.fromEntries(LEVELS);
    return `<ul class="ide-permissions-diff">${changes.map(change => `<li><strong>${escapeHtml(change.userName)}</strong> · ${escapeHtml(labels[change.module] || change.module)}: <span>${escapeHtml(levelLabels[change.before])}</span> → <strong>${escapeHtml(levelLabels[change.after])}</strong></li>`).join('')}</ul>`;
  }

  async function persistChanges(db, changes, actor) {
    const batch = db.batch();
    const timestamp = scope.firebase.firestore.FieldValue.serverTimestamp();
    const affectedUsers = new Set();

    for (const change of changes) {
      const ref = db.collection('permissions').doc(`${change.userId}__${change.module}`);
      affectedUsers.add(change.userId);
      if (change.after === 'NONE') batch.delete(ref);
      else batch.set(ref, { userId: change.userId, module: change.module, level: change.after, updatedAt: timestamp, updatedBy: actor.uid }, { merge: true });
    }

    for (const userId of affectedUsers) {
      const userChanges = changes.filter(change => change.userId === userId);
      const userRef = db.collection('users').doc(userId);
      const userSnapshot = await userRef.get();
      const profile = userSnapshot.data() || {};
      const snapshotPermissions = { ...(profile.permissions || {}) };
      userChanges.forEach(change => {
        if (change.after === 'NONE') delete snapshotPermissions[change.module];
        else snapshotPermissions[change.module] = change.after;
      });
      batch.update(userRef, { permissions: snapshotPermissions, updatedAt: timestamp });
    }

    const auditRef = db.collection('auditLogs').doc();
    batch.set(auditRef, {
      actorUserId: actor.uid,
      action: 'PERMISSIONS_UPDATED',
      entityType: 'permissions',
      entityId: 'matrix',
      details: { changes: changes.map(({ userId, module, before, after }) => ({ userId, module, before, after })) },
      createdAt: timestamp
    });
    await batch.commit();
  }

  async function bootstrap() {
    if (currentSection() !== 'permissions') return;
    const card = scope.document.querySelector('.ide-module-card');
    if (!card) return;

    try {
      ensureStylesheet();
      await scope.musicIdeAuthReady;
      const profile = scope.currentMusicIdeProfile;
      const user = scope.currentMusicIdeUser;
      if (!profile || !user) return;
      if (!scope.firebase || typeof scope.firebase.firestore !== 'function') throw new Error('Firestore indisponível.');

      card.classList.add('ide-module-card--wide');
      const root = scope.document.createElement('div');
      root.className = 'ide-permissions-root';
      card.replaceChildren(root);
      root.innerHTML = '<div class="ide-loading" role="status">Carregando permissões…</div>';
      const db = scope.firebase.firestore();
      const users = await loadMatrix(db);
      const editable = isSuperAdmin(profile);
      render(root, users, editable);
      if (!editable) return;

      const saveButton = root.querySelector('#permissions-save');
      const dialog = root.querySelector('#permissions-review');
      const diff = root.querySelector('#permissions-diff');
      const status = root.querySelector('#permissions-status');
      const confirm = root.querySelector('#permissions-confirm');

      saveButton.addEventListener('click', () => {
        const changes = collectChanges(root);
        diff.innerHTML = renderDiff(changes);
        confirm.disabled = !changes.length;
        if (typeof dialog.showModal === 'function') dialog.showModal();
      });

      dialog.addEventListener('close', async () => {
        if (dialog.returnValue !== 'default') return;
        const changes = collectChanges(root);
        if (!changes.length) return;
        saveButton.disabled = true;
        status.textContent = 'Salvando alterações…';
        try {
          await persistChanges(db, changes, user);
          root.querySelectorAll('select[data-permission-module]').forEach(select => { select.dataset.original = normalizeLevel(select.value); });
          status.textContent = 'Permissões atualizadas com sucesso. As alterações foram registradas na auditoria.';
        } catch (error) {
          console.error('Falha ao salvar permissões:', error);
          status.textContent = error && error.code && String(error.code).includes('permission-denied')
            ? 'A operação foi bloqueada pelas regras de segurança. Somente SUPER_ADMIN pode alterar permissões.'
            : 'Não foi possível salvar as permissões.';
        } finally {
          saveButton.disabled = false;
        }
      });
    } catch (error) {
      console.error('Falha ao carregar matriz de permissões:', error);
      card.innerHTML = '<h1>Permissões</h1><p>Não foi possível carregar a matriz de permissões.</p>';
    }
  }

  if (scope.document.readyState === 'loading') scope.document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
  else bootstrap();
})(typeof window !== 'undefined' ? window : null);
