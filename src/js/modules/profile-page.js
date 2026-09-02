/**
 * Controller da tela Meu Perfil.
 */
(function initProfilePage(scope) {
  if (!scope || !scope.document) return;
  const pathname = String(scope.location?.pathname || '');
  if (!pathname.endsWith('/profile.html') && !pathname.endsWith('profile.html')) return;

  const state = { user: null, profile: null, pendingPhotoURL: null, uploading: false };

  const byId = id => scope.document.getElementById(id);
  const setText = (id, value) => { const node = byId(id); if (node) node.textContent = value == null ? '' : String(value); };

  function toast(message, type = 'success') {
    const node = byId('profile-toast');
    if (!node) return;
    node.textContent = message;
    node.dataset.type = type;
    node.hidden = false;
    scope.clearTimeout(scope.__profileToastTimer);
    scope.__profileToastTimer = scope.setTimeout(() => { node.hidden = true; }, 5000);
  }

  function setBusy(button, busy, busyLabel) {
    if (!button) return;
    if (!button.dataset.originalLabel) button.dataset.originalLabel = button.innerHTML;
    button.disabled = Boolean(busy);
    button.setAttribute('aria-busy', String(Boolean(busy)));
    button.innerHTML = busy ? `<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>${busyLabel}` : button.dataset.originalLabel;
  }

  function initials(name, email) {
    return String(name || email || 'U').trim().split(/\s+/).slice(0, 2).map(part => part.charAt(0)).join('').toUpperCase() || 'U';
  }

  function renderAvatar(url, name, email) {
    const image = byId('profile-avatar-image');
    const fallback = byId('profile-avatar-fallback');
    if (!image || !fallback) return;
    if (url) {
      image.src = url;
      image.alt = `Foto de ${name || 'perfil'}`;
      image.hidden = false;
      fallback.hidden = true;
    } else {
      image.removeAttribute('src');
      image.hidden = true;
      fallback.textContent = initials(name, email);
      fallback.hidden = false;
    }
  }

  function friendlyRole(profile) {
    const map = {
      PARTICIPANT: 'Participante', MINISTER: 'Ministro', DM: 'DM', LEADER: 'Líder', ADMINISTRATOR: 'Administrador'
    };
    return map[String(profile?.accessProfile || '').toUpperCase()] || 'Usuário';
  }

  function selectedPhotoURL() {
    if (state.pendingPhotoURL !== null) return state.pendingPhotoURL || null;
    return state.profile?.photoURL || null;
  }

  function syncAccountControls(name, photoURL) {
    const container = byId('music-ide-user');
    if (!container) return;
    const label = container.querySelector('.music-ide-user-name');
    if (label) label.textContent = name || state.user?.email || 'Conta';
    const current = container.querySelector('img, .music-ide-user-placeholder');
    if (!current) return;
    let replacement;
    if (photoURL) {
      replacement = scope.document.createElement('img');
      replacement.src = photoURL;
      replacement.alt = '';
      replacement.referrerPolicy = 'no-referrer';
    } else {
      replacement = scope.document.createElement('span');
      replacement.className = 'music-ide-user-placeholder';
      replacement.setAttribute('aria-hidden', 'true');
      replacement.textContent = initials(name, state.user?.email).charAt(0);
    }
    current.replaceWith(replacement);
  }

  async function bootstrapFromAuth(user, profileFromAuth) {
    if (!user || state.user) return;
    state.user = user;
    try {
      const database = scope.firebase.firestore();
      const { ProfileRepository } = scope.MusicIdeProfileRepository;
      const { ProfileService } = scope.MusicIdeProfileService;
      const repository = new ProfileRepository(database);
      state.service = new ProfileService(repository, { auth: scope.firebase.auth(), firebase: scope.firebase });
      const loaded = await state.service.load(user);
      state.profile = { ...(profileFromAuth || {}), ...loaded.profile };
      state.capabilities = loaded.capabilities;
      state.googlePhotoURL = loaded.googlePhotoURL;
      populate();
    } catch (error) {
      console.error('[Profile] Falha ao carregar perfil:', error);
      toast(error?.message || 'Não foi possível carregar seu perfil.', 'error');
      byId('profile-loading').hidden = true;
      byId('profile-content').hidden = false;
    }
  }

  function populate() {
    const profile = state.profile || {};
    const effectivePhoto = profile.photoURL || state.googlePhotoURL || state.user?.photoURL || null;
    byId('profile-loading').hidden = true;
    byId('profile-content').hidden = false;
    byId('profile-name').value = profile.name || state.user?.displayName || '';
    byId('profile-phone').value = profile.phone || '';
    byId('profile-birth-date').value = profile.birthDate || '';
    byId('profile-email').value = profile.email || state.user?.email || '';
    setText('profile-role', friendlyRole(profile));
    setText('profile-header-name', profile.name || state.user?.displayName || state.user?.email || 'Meu Perfil');
    setText('profile-header-email', profile.email || state.user?.email || '');
    renderAvatar(effectivePhoto, profile.name, profile.email || state.user?.email);

    const canChangePassword = Boolean(state.capabilities?.canChangePassword);
    byId('profile-password-form').hidden = !canChangePassword;
    byId('profile-google-password-note').hidden = canChangePassword;
    byId('profile-use-google-photo').hidden = !state.googlePhotoURL;
    byId('profile-remove-photo').hidden = !profile.photoURL;
  }

  async function handlePhotoSelection(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || state.uploading) return;
    const button = byId('profile-change-photo');
    try {
      state.uploading = true;
      setBusy(button, true, 'Enviando...');
      const config = scope.MusicIdeCloudinaryConfig;
      const { ProfileImageService } = scope.MusicIdeProfileImageService;
      const imageService = new ProfileImageService(config);
      const result = await imageService.prepareAndUpload(scope, file);
      state.pendingPhotoURL = result.url;
      renderAvatar(result.url, byId('profile-name').value, state.user?.email);
      byId('profile-remove-photo').hidden = false;
      toast('Foto enviada. Clique em “Salvar alterações” para concluir.');
    } catch (error) {
      console.error('[Profile] Falha no upload da foto:', error);
      toast(error?.message || 'Não foi possível enviar a foto.', 'error');
    } finally {
      state.uploading = false;
      setBusy(button, false);
    }
  }

  async function saveProfile(event) {
    event.preventDefault();
    const button = byId('profile-save');
    try {
      setBusy(button, true, 'Salvando...');
      const updated = await state.service.save(state.user, {
        name: byId('profile-name').value,
        phone: byId('profile-phone').value,
        birthDate: byId('profile-birth-date').value,
        photoURL: selectedPhotoURL()
      });
      state.profile = { ...state.profile, ...updated };
      state.pendingPhotoURL = null;
      const effectivePhoto = state.profile.photoURL || state.googlePhotoURL || null;
      setText('profile-header-name', state.profile.name);
      renderAvatar(effectivePhoto, state.profile.name, state.user?.email);
      syncAccountControls(state.profile.name, effectivePhoto);
      byId('profile-remove-photo').hidden = !state.profile.photoURL;
      if (scope.currentMusicIdeProfile) scope.currentMusicIdeProfile = { ...scope.currentMusicIdeProfile, ...state.profile };
      toast('Perfil atualizado com sucesso.');
    } catch (error) {
      console.error('[Profile] Falha ao salvar perfil:', error);
      toast(error?.message || 'Não foi possível salvar seu perfil.', 'error');
    } finally {
      setBusy(button, false);
    }
  }

  async function changePassword(event) {
    event.preventDefault();
    const button = byId('profile-password-save');
    try {
      setBusy(button, true, 'Alterando...');
      await state.service.changePassword(state.user, {
        currentPassword: byId('profile-current-password').value,
        newPassword: byId('profile-new-password').value,
        confirmPassword: byId('profile-confirm-password').value
      });
      event.target.reset();
      toast('Senha alterada com sucesso.');
    } catch (error) {
      console.error('[Profile] Falha ao alterar senha:', error);
      toast(error?.message || 'Não foi possível alterar sua senha.', 'error');
    } finally {
      setBusy(button, false);
    }
  }

  function bind() {
    byId('profile-form')?.addEventListener('submit', saveProfile);
    byId('profile-password-form')?.addEventListener('submit', changePassword);
    byId('profile-photo-input')?.addEventListener('change', handlePhotoSelection);
    byId('profile-change-photo')?.addEventListener('click', () => byId('profile-photo-input')?.click());
    byId('profile-remove-photo')?.addEventListener('click', () => {
      state.pendingPhotoURL = '';
      renderAvatar(state.googlePhotoURL || null, byId('profile-name').value, state.user?.email);
      toast(state.googlePhotoURL ? 'A foto personalizada será removida e a foto do Google será usada.' : 'A foto será removida ao salvar.');
    });
    byId('profile-use-google-photo')?.addEventListener('click', () => {
      if (!state.googlePhotoURL) return;
      state.pendingPhotoURL = state.googlePhotoURL;
      renderAvatar(state.googlePhotoURL, byId('profile-name').value, state.user?.email);
      toast('Foto do Google selecionada. Clique em “Salvar alterações” para concluir.');
    });
  }

  function start() {
    bind();
    if (scope.currentMusicIdeUser) bootstrapFromAuth(scope.currentMusicIdeUser, scope.currentMusicIdeProfile);
    scope.addEventListener('musicIdeAuthReady', event => bootstrapFromAuth(event.detail?.user, event.detail?.profile), { once: true });
  }

  if (scope.document.readyState === 'loading') scope.document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})(typeof window !== 'undefined' ? window : null);
