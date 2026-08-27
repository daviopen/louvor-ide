(function initUsersPage(scope) {
  if (!scope || !scope.document) return;

  const PERMISSION_LABELS = Object.freeze({
    dashboard: 'Dashboard', users: 'Usuários', permissions: 'Permissões', unavailability: 'Indisponibilidade', events: 'Eventos', schedules: 'Escalas', setlists: 'Setlists', songs: 'Músicas', audit: 'Auditoria'
  });
  const FALLBACK_DEFAULT_PERMISSIONS = Object.freeze({
    dashboard: 'READ', users: 'NONE', permissions: 'NONE', unavailability: 'EDIT', events: 'NONE', schedules: 'READ', setlists: 'EDIT', songs: 'EDIT', audit: 'NONE'
  });
  const state = {
    pageSize: 1000,
    filters: { search: '', status: 'ALL', functionId: 'ALL' },
    editingId: null,
    editingFunctionId: null,
    functions: [],
    users: [],
    searchTimer: null
  };
  let service;
  let ministryService;

  function el(id) { return scope.document.getElementById(id); }
  function escapeHtml(value) { return String(value == null ? '' : value).replace(/[&<>'"]/g, char => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[char])); }
  function dateText(value) { if (!value) return '—'; const date = typeof value.toDate === 'function' ? value.toDate() : new Date(value); return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date); }
  function canEdit(profile) { return Boolean(scope.MusicIdeUserService && scope.MusicIdeUserService.canManageUsers(profile)); }
  function canEditFunctions(profile) { return Boolean(scope.MusicIdeMinistryFunctions && scope.MusicIdeMinistryFunctions.canManageMinistryFunctions(profile)); }
  function toast(message, type = 'success') { const node = el('users-toast'); node.textContent = message; node.dataset.type = type; node.hidden = false; clearTimeout(toast.timer); toast.timer = setTimeout(() => { node.hidden = true; }, 6000); }
  function setBusy(busy) { el('users-loading').hidden = !busy; el('users-content').setAttribute('aria-busy', String(busy)); }
  function defaultPermissions() { return scope.MusicIdeUserService?.DEFAULT_MEMBER_PERMISSIONS || FALLBACK_DEFAULT_PERMISSIONS; }
  function clearUserFormFeedback() { const node = el('user-form-feedback'); if (node) node.remove(); }
  function showUserFormFeedback(message, type = 'error') {
    clearUserFormFeedback();
    const node = scope.document.createElement('div');
    node.id = 'user-form-feedback';
    node.className = 'users-account-note full';
    node.dataset.type = type;
    node.setAttribute('role', type === 'error' ? 'alert' : 'status');
    const icon = scope.document.createElement('i');
    icon.className = type === 'error' ? 'fa-solid fa-circle-exclamation' : 'fa-solid fa-circle-info';
    icon.setAttribute('aria-hidden', 'true');
    const text = scope.document.createElement('span');
    text.textContent = message;
    node.append(icon, text);
    el('user-dialog').querySelector('.users-form-grid').appendChild(node);
    node.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  async function load({ busy = true, force = false } = {}) {
    if (busy) setBusy(true);
    try {
      const result = await service.list(state.filters, 1, state.pageSize, { force });
      state.functions = result.functions;
      state.users = result.items;
      renderFilters(result.functions);
      renderRows(result.items);
      el('users-count').textContent = `${result.total} usuário${result.total === 1 ? '' : 's'}`;
      el('users-empty').hidden = result.total !== 0;
      el('users-table-wrap').hidden = result.total === 0;
    } catch (error) {
      console.error(error);
      toast(error.message || 'Não foi possível carregar os usuários.', 'error');
    } finally {
      if (busy) setBusy(false);
    }
  }

  function renderFilters(functions) {
    const select = el('filter-function'); const current = select.value || state.filters.functionId;
    select.innerHTML = '<option value="ALL">Todas as funções</option>' + functions.map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`).join('');
    select.value = functions.some(item => item.id === current) ? current : 'ALL';
  }

  function renderRows(users) {
    const editable = canEdit(scope.currentMusicIdeProfile);
    el('users-body').innerHTML = users.map(user => {
      const initials = escapeHtml((user.name || user.email || '?').trim().slice(0, 1).toUpperCase());
      const functions = (user.functions || []).map(fn => `<span class="ide-badge">${escapeHtml(fn.name)}</span>`).join('') || '<span class="users-muted">Sem função</span>';
      const avatar = user.photoURL ? `<img src="${escapeHtml(user.photoURL)}" alt="" referrerpolicy="no-referrer" loading="lazy">` : `<span>${initials}</span>`;
      return `<tr><td><div class="users-person"><div class="users-avatar">${avatar}</div><div><strong>${escapeHtml(user.name)}</strong><small>${escapeHtml(user.email)}</small></div></div></td><td><div class="users-chips">${functions}</div></td><td><span class="ide-badge ${user.active === false ? 'ide-badge--neutral' : 'ide-badge--success'}">${user.active === false ? 'Inativo' : 'Ativo'}</span></td><td>${dateText(user.lastAccessAt)}</td><td class="users-actions">${editable ? `<button class="ide-button ide-button--secondary ide-button--sm" data-action="edit" data-id="${escapeHtml(user.id)}">Editar</button><button class="ide-button ide-button--secondary ide-button--sm" data-action="password" data-id="${escapeHtml(user.id)}" data-email="${escapeHtml(user.email)}">Redefinir senha</button><button class="ide-button ${user.active === false ? 'ide-button--primary' : 'ide-button--danger'} ide-button--sm" data-action="status" data-id="${escapeHtml(user.id)}" data-active="${user.active === false ? 'true' : 'false'}">${user.active === false ? 'Reativar' : 'Inativar'}</button>` : '<span class="users-muted">Somente leitura</span>'}</td></tr>`;
    }).join('');
  }

  function renderInitialPermissions() {
    const defaults = defaultPermissions();
    el('user-permissions').innerHTML = Object.entries(PERMISSION_LABELS).map(([moduleName, label]) => {
      const selected = defaults[moduleName] || 'NONE';
      return `<label class="users-permission-option"><span>${escapeHtml(label)}</span><select class="ide-field__control ide-select" data-permission-module="${escapeHtml(moduleName)}" aria-label="Permissão inicial para ${escapeHtml(label)}"><option value="NONE" ${selected === 'NONE' ? 'selected' : ''}>Sem acesso</option><option value="READ" ${selected === 'READ' ? 'selected' : ''}>Leitura</option><option value="EDIT" ${selected === 'EDIT' ? 'selected' : ''}>Edição</option></select></label>`;
    }).join('');
  }

  function openForm(user = null) {
    clearUserFormFeedback();
    state.editingId = user && user.id || null;
    el('user-form-title').textContent = user ? 'Editar usuário' : 'Novo usuário';
    el('user-name').value = user?.name || ''; el('user-email').value = user?.email || ''; el('user-photo').value = user?.photoURL || '';
    el('user-permissions-row').hidden = Boolean(user);
    el('user-functions').innerHTML = state.functions.filter(item => item.active !== false).map(fn => `<label class="users-function-option"><input type="checkbox" value="${escapeHtml(fn.id)}" ${user?.functionIds?.includes(fn.id) ? 'checked' : ''}><span>${escapeHtml(fn.name)}</span></label>`).join('');
    if (!user) renderInitialPermissions();
    el('user-dialog').showModal(); el('user-name').focus();
  }

  function findUser(id) { return state.users.find(item => item.id === id) || null; }
  function readInitialPermissions() { const permissions = {}; el('user-permissions').querySelectorAll('[data-permission-module]').forEach(select => { permissions[select.dataset.permissionModule] = select.value; }); return permissions; }

  async function submitForm(event) {
    event.preventDefault();
    clearUserFormFeedback();
    const submitButton = el('user-submit');
    const originalButtonHtml = submitButton.innerHTML;
    const functionIds = Array.from(el('user-functions').querySelectorAll('input:checked')).map(input => input.value);
    const payload = { name: el('user-name').value.trim(), email: el('user-email').value.trim(), photoURL: el('user-photo').value.trim() || null, functionIds, permissions: state.editingId ? undefined : readInitialPermissions() };
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>Salvando...';
    try {
      let message;
      let messageType = 'success';
      if (state.editingId) {
        await service.update(state.editingId, payload);
        message = 'Usuário atualizado com sucesso.';
      } else {
        const created = await service.create(payload);
        if (created.passwordEmailSent) {
          message = 'Usuário criado com sucesso. O Firebase enviou o e-mail para definição de senha.';
        } else {
          message = `Usuário criado, mas o e-mail de definição de senha não foi confirmado: ${created.passwordEmailError || 'erro não informado'}. Use “Redefinir senha” para tentar novamente.`;
          messageType = 'error';
        }
      }
      el('user-dialog').close();
      toast(message, messageType);
      await load({ force: true });
    } catch (error) {
      console.error(error);
      const message = error.message || 'Não foi possível salvar o usuário.';
      showUserFormFeedback(message, 'error');
    } finally {
      submitButton.disabled = false;
      submitButton.innerHTML = originalButtonHtml;
    }
  }

  async function handleTableClick(event) {
    const button = event.target.closest('button[data-action]'); if (!button) return;
    try {
      if (button.dataset.action === 'edit') {
        const user = findUser(button.dataset.id); if (user) openForm(user);
      } else if (button.dataset.action === 'password') {
        if (!scope.confirm(`Solicitar ao Firebase um e-mail de redefinição de senha para ${button.dataset.email}?`)) return;
        button.disabled = true;
        try {
          await service.sendPasswordReset(button.dataset.email, button.dataset.id);
          toast(`Solicitação aceita pelo Firebase para ${button.dataset.email}. Confira também Spam, Lixo eletrônico e a aba Promoções.`);
        } finally {
          button.disabled = false;
        }
      } else if (button.dataset.action === 'status') {
        const active = button.dataset.active === 'true';
        if (!scope.confirm(`${active ? 'Reativar' : 'Inativar'} este usuário? O histórico será preservado.`)) return;
        await service.setActive(button.dataset.id, active);
        toast(active ? 'Usuário reativado.' : 'Usuário inativado sem exclusão de histórico.');
        await load({ force: true });
      }
    } catch (error) { console.error(error); toast(error.message || 'A operação não pôde ser concluída.', 'error'); }
  }

  function resetFunctionForm() { state.editingFunctionId = null; el('function-id').value = ''; el('function-name').value = ''; el('function-slug').value = ''; el('function-submit').textContent = 'Adicionar função'; el('function-cancel').hidden = true; }
  function renderFunctions(functions) {
    const editable = canEditFunctions(scope.currentMusicIdeProfile); el('functions-empty').hidden = functions.length !== 0;
    el('functions-list').innerHTML = functions.map((fn, index) => `<article class="function-row" data-function-id="${escapeHtml(fn.id)}"><div class="function-order" aria-label="Posição ${index + 1}">${index + 1}</div><div class="function-main"><strong>${escapeHtml(fn.name)}</strong><small>${escapeHtml(fn.slug)}</small></div><span class="ide-badge ${fn.active === false ? 'ide-badge--neutral' : 'ide-badge--success'}">${fn.active === false ? 'Inativa' : 'Ativa'}</span><div class="function-actions">${editable ? `<button class="ide-button ide-button--secondary ide-button--sm" type="button" data-function-action="up" data-id="${escapeHtml(fn.id)}" ${index === 0 ? 'disabled' : ''} aria-label="Mover ${escapeHtml(fn.name)} para cima"><i class="fa-solid fa-arrow-up" aria-hidden="true"></i></button><button class="ide-button ide-button--secondary ide-button--sm" type="button" data-function-action="down" data-id="${escapeHtml(fn.id)}" ${index === functions.length - 1 ? 'disabled' : ''} aria-label="Mover ${escapeHtml(fn.name)} para baixo"><i class="fa-solid fa-arrow-down" aria-hidden="true"></i></button><button class="ide-button ide-button--secondary ide-button--sm" type="button" data-function-action="edit" data-id="${escapeHtml(fn.id)}">Editar</button><button class="ide-button ${fn.active === false ? 'ide-button--primary' : 'ide-button--danger'} ide-button--sm" type="button" data-function-action="status" data-id="${escapeHtml(fn.id)}" data-active="${fn.active === false ? 'true' : 'false'}">${fn.active === false ? 'Reativar' : 'Inativar'}</button>` : '<span class="users-muted">Somente leitura</span>'}</div></article>`).join('');
  }

  async function loadFunctions({ seedDefaults = false } = {}) { el('functions-loading').hidden = false; try { if (seedDefaults && canEditFunctions(scope.currentMusicIdeProfile)) await ministryService.ensureDefaultFunctions(); state.functions = await ministryService.listFunctions(); renderFunctions(state.functions); renderFilters(state.functions); } finally { el('functions-loading').hidden = true; } }
  async function openFunctionsDialog() { const editable = canEditFunctions(scope.currentMusicIdeProfile); el('function-form').hidden = !editable; resetFunctionForm(); el('functions-dialog').showModal(); try { await loadFunctions({ seedDefaults: true }); if (editable) el('function-name').focus(); } catch (error) { console.error(error); toast(error.message || 'Não foi possível carregar as funções ministeriais.', 'error'); } }
  function beginFunctionEdit(functionId) { const fn = state.functions.find(item => item.id === functionId); if (!fn) return; state.editingFunctionId = fn.id; el('function-id').value = fn.id; el('function-name').value = fn.name; el('function-slug').value = fn.slug; el('function-submit').textContent = 'Salvar alterações'; el('function-cancel').hidden = false; el('function-name').focus(); }
  async function submitFunction(event) { event.preventDefault(); if (!canEditFunctions(scope.currentMusicIdeProfile)) return; const name = el('function-name').value.trim(); const slug = el('function-slug').value.trim(); el('function-submit').disabled = true; try { if (state.editingFunctionId) { await ministryService.updateFunction(state.editingFunctionId, { name, ...(slug ? { slug } : {}) }); toast('Função ministerial atualizada.'); } else { const maxOrder = state.functions.reduce((max, item) => Math.max(max, Number(item.order) || 0), 0); await ministryService.createFunction({ name, ...(slug ? { slug } : {}), order: maxOrder + 10, active: true }); toast('Função ministerial adicionada.'); } resetFunctionForm(); await loadFunctions(); service.invalidateDirectoryCache(); await load({ force: true }); } catch (error) { console.error(error); toast(error.message || 'Não foi possível salvar a função ministerial.', 'error'); } finally { el('function-submit').disabled = false; } }
  async function handleFunctionListClick(event) { const button = event.target.closest('button[data-function-action]'); if (!button || !canEditFunctions(scope.currentMusicIdeProfile)) return; const action = button.dataset.functionAction; const id = button.dataset.id; const index = state.functions.findIndex(item => item.id === id); if (index < 0) return; try { if (action === 'edit') return beginFunctionEdit(id); if (action === 'status') { const active = button.dataset.active === 'true'; const fn = state.functions[index]; if (!scope.confirm(`${active ? 'Reativar' : 'Inativar'} a função ${fn.name}? Os vínculos históricos serão preservados.`)) return; await ministryService.setFunctionActive(id, active); toast(active ? 'Função reativada.' : 'Função inativada sem apagar o histórico.'); } else if (action === 'up' || action === 'down') { const targetIndex = action === 'up' ? index - 1 : index + 1; if (targetIndex < 0 || targetIndex >= state.functions.length) return; const reordered = [...state.functions]; [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]]; await ministryService.reorder(reordered.map(item => ({ functionId: item.id }))); toast('Ordem das funções atualizada.'); } await loadFunctions(); service.invalidateDirectoryCache(); await load({ force: true }); } catch (error) { console.error(error); toast(error.message || 'Não foi possível alterar a função ministerial.', 'error'); } }

  function alignUsersNavigation() { const link = scope.document.querySelector('[data-nav-id="users"]'); if (!link) return false; scope.document.querySelectorAll('.ide-sidebar-link.active').forEach(item => { item.classList.remove('active'); item.removeAttribute('aria-current'); }); link.href = 'users.html'; link.classList.add('active'); link.setAttribute('aria-current', 'page'); return true; }

  async function bootstrap() {
    const authUser = await scope.musicIdeAuthReady; if (!authUser) return;
    if (!scope.firebase || typeof scope.firebase.firestore !== 'function') return toast('Firestore indisponível.', 'error');
    const database = scope.firebase.firestore(); const repository = new scope.MusicIdeUserRepository.UserRepository(database);
    service = new scope.MusicIdeUserService.UserService(repository, { auth: scope.firebase.auth(), firebase: scope.firebase, actorProvider: () => scope.currentMusicIdeUser });
    const registry = scope.MusicIdeDomainRepositories.createRepositoryRegistry(database);
    ministryService = new scope.MusicIdeMinistryFunctions.MinistryFunctionsService({ ministryFunctionsRepository: registry.ministryFunctions, userFunctionsRepository: registry.userFunctions, auditRepository: registry.auditLogs, actorProvider: () => scope.currentMusicIdeUser });
    const editable = canEdit(scope.currentMusicIdeProfile); el('new-user').hidden = !editable; el('users-readonly').hidden = editable;
    el('new-user').addEventListener('click', () => openForm()); el('manage-functions').addEventListener('click', openFunctionsDialog); el('user-form').addEventListener('submit', submitForm); el('user-cancel').addEventListener('click', () => { clearUserFormFeedback(); el('user-dialog').close(); }); el('users-body').addEventListener('click', handleTableClick);
    el('functions-close').addEventListener('click', () => el('functions-dialog').close()); el('function-cancel').addEventListener('click', resetFunctionForm); el('function-form').addEventListener('submit', submitFunction); el('functions-list').addEventListener('click', handleFunctionListClick);
    el('filter-search').addEventListener('input', event => {
      state.filters.search = event.target.value;
      clearTimeout(state.searchTimer);
      state.searchTimer = setTimeout(() => load({ busy: false }), 160);
    });
    el('filter-status').addEventListener('change', event => { state.filters.status = event.target.value; load({ busy: false }); });
    el('filter-function').addEventListener('change', event => { state.filters.functionId = event.target.value; load({ busy: false }); });
    el('clear-filters').addEventListener('click', () => { state.filters = { search: '', status: 'ALL', functionId: 'ALL' }; el('filter-search').value = ''; el('filter-status').value = 'ALL'; el('filter-function').value = 'ALL'; el('users-filter-panel').dispatchEvent(new CustomEvent('ideFiltersChanged')); load({ busy: false }); });
    alignUsersNavigation(); setTimeout(alignUsersNavigation, 100); await load();
  }

  if (scope.document.readyState === 'loading') scope.document.addEventListener('DOMContentLoaded', bootstrap, { once: true }); else bootstrap();
})(window);
