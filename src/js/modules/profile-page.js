/**
 * Controller da tela Meu Perfil.
 */
(function initProfilePage(scope) {
  if (!scope || !scope.document) return;
  const pathname = String(scope.location?.pathname || '');
  if (!pathname.endsWith('/profile.html') && !pathname.endsWith('profile.html')) return;

  const state = { user: null, profile: null, uploading: false, formSnapshot: null };

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

  function formatPhone(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return raw;
  }

  function currentFormValues() {
    return {
      name: String(byId('profile-name')?.value || '').trim(),
      phone: String(byId('profile-phone')?.value || '').trim(),
      birthDate: String(byId('profile-birth-date')?.value || '')
    };
  }

  function sameFormValues(left, right) {
    return Boolean(left && right)
      && left.name === right.name
      && left.phone === right.phone
      && left.birthDate === right.birthDate;
  }

  function setSaveStatus(message, status) {
    const node = byId('profile-save-status');
    if (!node) return;
    node.textContent = message;
    if (status) node.dataset.state = status;
    else delete node.dataset.state;
  }

  function updateSaveState() {
    const button = byId('profile-save');
    if (!button || !state.formSnapshot) return;
    const dirty = !sameFormValues(currentFormValues(), state.formSnapshot);
    button.disabled = !dirty;
    setSaveStatus(dirty ? 'Alterações não salvas' : 'Tudo salvo', dirty ? 'dirty' : 'saved');
  }

  function captureFormSnapshot() {
    state.formSnapshot = currentFormValues();
    updateSaveState();
  }

  function setPhotoStatus(message) {
    setText('profile-photo-status', message);
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

  function refreshPhotoActions() {
    const hasCustomPhoto = Boolean(state.profile?.photoURL);
    byId('profile-use-google-photo').hidden = !state.googlePhotoURL || !hasCustomPhoto;
    byId('profile-remove-photo').hidden = !hasCustomPhoto;
  }

  function populate() {
    const profile = state.profile || {};
    const effectivePhoto = profile.photoURL || state.googlePhotoURL || state.user?.photoURL || null;
    const role = friendlyRole(profile);
    const email = profile.email || state.user?.email || '';
    byId('profile-loading').hidden = true;
    byId('profile-content').hidden = false;
    byId('profile-name').value = profile.name || state.user?.displayName || '';
    byId('profile-phone').value = formatPhone(profile.phone || '');
    byId('profile-birth-date').value = profile.birthDate || '';
    setText('profile-role', role);
    setText('profile-access-role', role);
    setText('profile-access-email', email || 'Não informado');
    setText('profile-header-name', profile.name || state.user?.displayName || state.user?.email || 'Meu Perfil');
    setText('profile-header-email', email);
    renderAvatar(effectivePhoto, profile.name, email);
    setPhotoStatus('Foto salva automaticamente');

    const canChangePassword = Boolean(state.capabilities?.canChangePassword);
    byId('profile-password-form').hidden = !canChangePassword;
    byId('profile-google-password-note').hidden = canChangePassword;
    refreshPhotoActions();
    captureFormSnapshot();
  }

  async function persistPhoto(photoURL, successMessage) {
    const updated = await state.service.savePhoto(state.user, photoURL);
    state.profile = { ...state.profile, ...updated };
    const effectivePhoto = state.profile.photoURL || state.googlePhotoURL || null;
    renderAvatar(effectivePhoto, byId('profile-name').value, state.user?.email);
    syncAccountControls(state.profile.name || byId('profile-name').value, effectivePhoto);
    refreshPhotoActions();
    if (scope.currentMusicIdeProfile) scope.currentMusicIdeProfile = { ...scope.currentMusicIdeProfile, ...state.profile };
    setPhotoStatus(successMessage);
    toast(successMessage);
  }

  async function handlePhotoSelection(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || state.uploading) return;
    const button = byId('profile-change-photo');
    try {
      state.uploading = true;
      setPhotoStatus('Preparando foto...');
      setBusy(button, true, 'Enviando...');
      const config = scope.MusicIdeCloudinaryConfig;
      const { ProfileImageService } = scope.MusicIdeProfileImageService;
      const imageService = new ProfileImageService(config);
      const result = await imageService.prepareAndUpload(scope, file);
      setPhotoStatus('Salvando foto...');
      setBusy(button, true, 'Salvando...');
      await persistPhoto(result.url, 'Foto atualizada');
    } catch (error) {
      console.error('[Profile] Falha ao atualizar foto:', error);
      setPhotoStatus('Não foi possível atualizar a foto');
      toast(error?.message || 'Não foi possível atualizar a foto.', 'error');
    } finally {
      state.uploading = false;
      setBusy(button, false);
    }
  }

  async function saveProfile(event) {
    event.preventDefault();
    const button = byId('profile-save');
    if (!state.formSnapshot || sameFormValues(currentFormValues(), state.formSnapshot)) return;
    try {
      setBusy(button, true, 'Salvando...');
      setSaveStatus('Salvando alterações...', 'dirty');
      const updated = await state.service.save(state.user, {
        name: byId('profile-name').value,
        phone: byId('profile-phone').value,
        birthDate: byId('profile-birth-date').value,
        photoURL: state.profile?.photoURL || null
      });
      state.profile = { ...state.profile, ...updated };
      const effectivePhoto = state.profile.photoURL || state.googlePhotoURL || null;
      setText('profile-header-name', state.profile.name);
      renderAvatar(effectivePhoto, state.profile.name, state.user?.email);
      syncAccountControls(state.profile.name, effectivePhoto);
      if (scope.currentMusicIdeProfile) scope.currentMusicIdeProfile = { ...scope.currentMusicIdeProfile, ...state.profile };
      byId('profile-phone').value = formatPhone(state.profile.phone || byId('profile-phone').value);
      captureFormSnapshot();
      setSaveStatus('Alterações salvas', 'saved');
      toast('Perfil atualizado com sucesso.');
    } catch (error) {
      console.error('[Profile] Falha ao salvar perfil:', error);
      setSaveStatus('Não foi possível salvar', 'dirty');
      toast(error?.message || 'Não foi possível salvar seu perfil.', 'error');
    } finally {
      setBusy(button, false);
      updateSaveState();
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
    ['profile-name', 'profile-phone', 'profile-birth-date'].forEach(id => {
      byId(id)?.addEventListener('input', updateSaveState);
      byId(id)?.addEventListener('change', updateSaveState);
    });
    byId('profile-phone')?.addEventListener('blur', event => {
      event.target.value = formatPhone(event.target.value);
      updateSaveState();
    });
    byId('profile-remove-photo')?.addEventListener('click', async () => {
      const button = byId('profile-remove-photo');
      if (state.uploading) return;
      try {
        state.uploading = true;
        setPhotoStatus('Removendo foto...');
        setBusy(button, true, 'Removendo...');
        await persistPhoto(null, state.googlePhotoURL ? 'Foto do Google ativada' : 'Foto removida');
      } catch (error) {
        console.error('[Profile] Falha ao remover foto:', error);
        setPhotoStatus('Não foi possível remover a foto');
        toast(error?.message || 'Não foi possível remover a foto.', 'error');
      } finally {
        state.uploading = false;
        setBusy(button, false);
      }
    });
    byId('profile-use-google-photo')?.addEventListener('click', async () => {
      if (!state.googlePhotoURL || state.uploading) return;
      const button = byId('profile-use-google-photo');
      try {
        state.uploading = true;
        setPhotoStatus('Ativando foto do Google...');
        setBusy(button, true, 'Salvando...');
        await persistPhoto(null, 'Foto do Google ativada');
      } catch (error) {
        console.error('[Profile] Falha ao usar foto do Google:', error);
        setPhotoStatus('Não foi possível usar a foto do Google');
        toast(error?.message || 'Não foi possível usar a foto do Google.', 'error');
      } finally {
        state.uploading = false;
        setBusy(button, false);
      }
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
