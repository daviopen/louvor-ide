(function initUsersPage(scope) {
  if (!scope || !scope.document) return;

  const PERMISSION_LABELS = Object.freeze({
    dashboard: 'Dashboard',
    users: 'Usuários',
    permissions: 'Permissões',
    unavailability: 'Indisponibilidade',
    events: 'Eventos',
    schedules: 'Escalas',
    setlists: 'Setlists',
    songs: 'Músicas',
    audit: 'Auditoria'
  });
  const state = { page: 1, pageSize: 10, filters: { search: '', status: 'ALL', functionId: 'ALL' }, editingId: null, functions: [] };
  let service;

  function el(id) { return scope.document.getElementById(id); }
  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, char => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[char]));
  }
  function dateText(value) {
    if (!value) return '—';
    const date = typeof value.toDate === 'function' ? value.toDate() : new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
  }
  function canEdit(profile) {
    return Boolean(scope.MusicIdeUserService && scope.MusicIdeUserService.canManageUsers(profile));
  }
  function toast(message, type = 'success') {
    const node = el('users-toast');
    node.textContent = message;
    node.dataset.type = type;
    node.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { node.hidden = true; }, 4500);
  }
  function setBusy(busy) {
    el('users-loading').hidden = !busy;
    el('users-content').setAttribute('aria-busy', String(busy));
  }

  async function load() {
    setBusy(true);
    try {
      const result = await service.list(state.filters, state.page, state.pageSize);
      state.page = result.page;
      state.functions = result.functions;
      renderFilters(result.functions);
      renderRows(result.items);
      renderPagination(result);
      el('users-count').textContent = `${result.total} usuário${result.total === 1 ? '' : 's'}`;
      el('users-empty').hidden = result.total !== 0;
      el('users-table-wrap').hidden = result.total === 0;
    } catch (error) {
      console.error(error);
      toast(error.message || 'Não foi possível carregar os usuários.', 'error');
    } finally {
      setBusy(false);
    }
  }

  function renderFilters(functions) {
    const select = el('filter-function');
    const current = select.value || state.filters.functionId;
    select.innerHTML = '<option value="ALL">Todas as funções</option>' + functions.map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`).join('');
    select.value = functions.some(item => item.id === current) ? current : 'ALL';
  }

  function renderRows(users) {
    const editable = canEdit(scope.currentMusicIdeProfile);
    el('users-body').innerHTML = users.map(user => {
      const initials = escapeHtml((user.name || user.email || '?').trim().slice(0, 1).toUpperCase());
      const functions = (user.functions || []).map(fn => `<span class="ide-badge">${escapeHtml(fn.name)}</span>`).join('') || '<span class="users-muted">Sem função</span>';
      const avatar = user.photoURL ? `<img src="${escapeHtml(user.photoURL)}" alt="" referrerpolicy="no-referrer">` : `<span>${initials}</span>`;
      return `<tr>
        <td><div class="users-person"><div class="users-avatar">${avatar}</div><div><strong>${escapeHtml(user.name)}</strong><small>${escapeHtml(user.email)}</small></div></div></td>
        <td><div class="users-chips">${functions}</div></td>
        <td><span class="ide-badge ${user.active === false ? 'ide-badge--neutral' : 'ide-badge--success'}">${user.active === false ? 'Inativo' : 'Ativo'}</span></td>
        <td>${dateText(user.lastAccessAt)}</td>
        <td class="users-actions">${editable ? `<button class="ide-button ide-button--secondary ide-button--sm" data-action="edit" data-id="${escapeHtml(user.id)}">Editar</button><button class="ide-button ide-button--secondary ide-button--sm" data-action="password" data-email="${escapeHtml(user.email)}">Redefinir senha</button><button class="ide-button ${user.active === false ? 'ide-button--primary' : 'ide-button--danger'} ide-button--sm" data-action="status" data-id="${escapeHtml(user.id)}" data-active="${user.active === false ? 'true' : 'false'}">${user.active === false ? 'Reativar' : 'Inativar'}</button>` : '<span class="users-muted">Somente leitura</span>'}</td>
      </tr>`;
    }).join('');
  }

  function renderPagination(result) {
    el('page-label').textContent = `Página ${result.page} de ${result.pages}`;
    el('page-prev').disabled = result.page <= 1;
    el('page-next').disabled = result.page >= result.pages;
  }

  function renderInitialPermissions() {
    el('user-permissions').innerHTML = Object.entries(PERMISSION_LABELS).map(([moduleName, label]) => `
      <label class="users-permission-option">
        <span>${escapeHtml(label)}</span>
        <select class="ide-field__control ide-select" data-permission-module="${escapeHtml(moduleName)}" aria-label="Permissão inicial para ${escapeHtml(label)}">
          <option value="NONE">Sem acesso</option>
          <option value="READ">Leitura</option>
          <option value="EDIT">Edição</option>
        </select>
      </label>`).join('');
  }

  function openForm(user = null) {
    state.editingId = user && user.id || null;
    el('user-form-title').textContent = user ? 'Editar usuário' : 'Novo usuário';
    el('user-name').value = user?.name || '';
    el('user-email').value = user?.email || '';
    el('user-photo').value = user?.photoURL || '';
    el('user-uid').value = user?.uid || user?.id || '';
    el('user-uid-row').hidden = Boolean(user);
    el('user-permissions-row').hidden = Boolean(user);
    el('user-functions').innerHTML = state.functions.filter(item => item.active !== false).map(fn => `<label class="users-function-option"><input type="checkbox" value="${escapeHtml(fn.id)}" ${user?.functionIds?.includes(fn.id) ? 'checked' : ''}><span>${escapeHtml(fn.name)}</span></label>`).join('');
    if (!user) renderInitialPermissions();
    el('user-dialog').showModal();
    el('user-name').focus();
  }

  async function findUser(id) {
    const result = await service.list({}, 1, 1000);
    return result.items.find(item => item.id === id) || null;
  }

  function readInitialPermissions() {
    const permissions = {};
    el('user-permissions').querySelectorAll('[data-permission-module]').forEach(select => {
      permissions[select.dataset.permissionModule] = select.value;
    });
    return permissions;
  }

  async function submitForm(event) {
    event.preventDefault();
    const functionIds = Array.from(el('user-functions').querySelectorAll('input:checked')).map(input => input.value);
    const payload = {
      uid: el('user-uid').value.trim(),
      name: el('user-name').value.trim(),
      email: el('user-email').value.trim(),
      photoURL: el('user-photo').value.trim() || null,
      functionIds,
      permissions: state.editingId ? undefined : readInitialPermissions()
    };
    el('user-submit').disabled = true;
    try {
      if (state.editingId) {
        await service.update(state.editingId, payload);
        toast('Usuário atualizado com sucesso.');
      } else {
        await service.create(payload);
        toast('Usuário criado. O Firebase enviou o fluxo de definição de senha quando a conta foi provisionada automaticamente.');
      }
      el('user-dialog').close();
      state.page = 1;
      await load();
    } catch (error) {
      console.error(error);
      toast(error.message || 'Não foi possível salvar o usuário.', 'error');
    } finally {
      el('user-submit').disabled = false;
    }
  }

  async function handleTableClick(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    try {
      if (button.dataset.action === 'edit') {
        const user = await findUser(button.dataset.id);
        if (user) openForm(user);
      } else if (button.dataset.action === 'password') {
        if (!scope.confirm(`Enviar um e-mail de redefinição de senha para ${button.dataset.email}?`)) return;
        await service.sendPasswordReset(button.dataset.email);
        toast('E-mail de redefinição de senha enviado pelo Firebase.');
      } else if (button.dataset.action === 'status') {
        const active = button.dataset.active === 'true';
        if (!scope.confirm(`${active ? 'Reativar' : 'Inativar'} este usuário? O histórico será preservado.`)) return;
        await service.setActive(button.dataset.id, active);
        toast(active ? 'Usuário reativado.' : 'Usuário inativado sem exclusão de histórico.');
        await load();
      }
    } catch (error) {
      console.error(error);
      toast(error.message || 'A operação não pôde ser concluída.', 'error');
    }
  }

  function alignUsersNavigation() {
    const link = scope.document.querySelector('[data-nav-id="users"]');
    if (!link) return false;
    scope.document.querySelectorAll('.ide-sidebar-link.active').forEach(item => {
      item.classList.remove('active');
      item.removeAttribute('aria-current');
    });
    link.href = 'users.html';
    link.classList.add('active');
    link.setAttribute('aria-current', 'page');
    return true;
  }

  async function bootstrap() {
    const authUser = await scope.musicIdeAuthReady;
    if (!authUser) return;
    if (!scope.firebase || typeof scope.firebase.firestore !== 'function') return toast('Firestore indisponível.', 'error');
    const repository = new scope.MusicIdeUserRepository.UserRepository(scope.firebase.firestore());
    service = new scope.MusicIdeUserService.UserService(repository, {
      auth: scope.firebase.auth(),
      firebase: scope.firebase,
      actorProvider: () => scope.currentMusicIdeUser
    });

    const editable = canEdit(scope.currentMusicIdeProfile);
    el('new-user').hidden = !editable;
    el('users-readonly').hidden = editable;

    el('new-user').addEventListener('click', () => openForm());
    el('user-form').addEventListener('submit', submitForm);
    el('user-cancel').addEventListener('click', () => el('user-dialog').close());
    el('users-body').addEventListener('click', handleTableClick);
    el('filter-search').addEventListener('input', event => { state.filters.search = event.target.value; state.page = 1; load(); });
    el('filter-status').addEventListener('change', event => { state.filters.status = event.target.value; state.page = 1; load(); });
    el('filter-function').addEventListener('change', event => { state.filters.functionId = event.target.value; state.page = 1; load(); });
    el('clear-filters').addEventListener('click', () => { state.filters = { search: '', status: 'ALL', functionId: 'ALL' }; el('filter-search').value = ''; el('filter-status').value = 'ALL'; el('filter-function').value = 'ALL'; state.page = 1; load(); });
    el('page-prev').addEventListener('click', () => { state.page -= 1; load(); });
    el('page-next').addEventListener('click', () => { state.page += 1; load(); });
    alignUsersNavigation();
    setTimeout(alignUsersNavigation, 100);
    await load();
  }

  if (scope.document.readyState === 'loading') scope.document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
  else bootstrap();
})(window);
