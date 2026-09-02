/**
 * Casos de uso do perfil pessoal e segurança da própria conta.
 */
(function initProfileService(globalScope, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (globalScope) globalScope.MusicIdeProfileService = api;
})(typeof window !== 'undefined' ? window : null, function createProfileServiceModule() {
  const PHONE_PATTERN = /^[0-9+()\-\s]{8,30}$/;
  const BIRTH_DATE_PATTERN = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;

  function normalizeText(value) { return String(value == null ? '' : value).trim(); }

  function validateBirthDate(value, now = new Date()) {
    const birthDate = normalizeText(value);
    if (!birthDate) return null;
    if (!BIRTH_DATE_PATTERN.test(birthDate)) throw new Error('Informe uma data de nascimento válida.');
    const [year, month, day] = birthDate.split('-').map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
      throw new Error('Informe uma data de nascimento válida.');
    }
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    if (parsed > today) throw new Error('A data de nascimento não pode estar no futuro.');
    if (year < 1900) throw new Error('Informe uma data de nascimento válida.');
    return birthDate;
  }

  function normalizeProfileInput(input = {}, now = new Date()) {
    const name = normalizeText(input.name);
    if (!name) throw new Error('Nome é obrigatório.');
    if (name.length > 120) throw new Error('O nome deve ter no máximo 120 caracteres.');

    const phone = normalizeText(input.phone);
    if (phone && !PHONE_PATTERN.test(phone)) throw new Error('Informe um telefone válido.');

    const photoURL = input.photoURL == null || input.photoURL === '' ? null : normalizeText(input.photoURL);
    if (photoURL && photoURL.length > 1000) throw new Error('A URL da foto é inválida.');

    return {
      name,
      phone: phone || null,
      birthDate: validateBirthDate(input.birthDate, now),
      photoURL
    };
  }

  function authCapabilities(user) {
    const providers = new Set((user?.providerData || []).map(provider => provider?.providerId).filter(Boolean));
    return Object.freeze({
      canChangePassword: providers.has('password'),
      hasGoogleProvider: providers.has('google.com'),
      providers: [...providers]
    });
  }

  function googleProviderPhoto(user) {
    return (user?.providerData || []).find(provider => provider?.providerId === 'google.com')?.photoURL || null;
  }

  function validatePasswordChange(input = {}) {
    const currentPassword = String(input.currentPassword || '');
    const newPassword = String(input.newPassword || '');
    const confirmPassword = String(input.confirmPassword || '');
    if (!currentPassword) throw new Error('Informe sua senha atual.');
    if (newPassword.length < 8) throw new Error('A nova senha deve ter pelo menos 8 caracteres.');
    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      throw new Error('Use pelo menos uma letra maiúscula, uma minúscula e um número na nova senha.');
    }
    if (newPassword !== confirmPassword) throw new Error('A confirmação da nova senha não confere.');
    if (newPassword === currentPassword) throw new Error('A nova senha deve ser diferente da senha atual.');
    return { currentPassword, newPassword };
  }

  class ProfileService {
    constructor(repository, options = {}) {
      if (!repository) throw new Error('ProfileRepository é obrigatório.');
      this.repository = repository;
      this.auth = options.auth || null;
      this.firebase = options.firebase || null;
      this.clock = options.clock || (() => new Date());
    }

    async load(user) {
      if (!user?.uid) throw new Error('Usuário autenticado não identificado.');
      const profile = await this.repository.getOwnProfile(user.uid);
      if (!profile) throw new Error('Perfil do usuário não encontrado.');
      return { profile, capabilities: authCapabilities(user), googlePhotoURL: googleProviderPhoto(user) };
    }

    async save(user, input) {
      if (!user?.uid) throw new Error('Usuário autenticado não identificado.');
      const safe = normalizeProfileInput(input, this.clock());
      const updated = await this.repository.updateOwnProfile(user.uid, safe);
      if (typeof user.updateProfile === 'function') {
        await user.updateProfile({ displayName: safe.name, photoURL: safe.photoURL || googleProviderPhoto(user) || null });
      }
      return updated;
    }

    async changePassword(user, input) {
      if (!user?.uid || !user.email) throw new Error('Conta autenticada inválida.');
      if (!authCapabilities(user).canChangePassword) throw new Error('Esta conta utiliza login pelo Google e não possui senha local para alterar.');
      if (!this.firebase?.auth?.EmailAuthProvider) throw new Error('Firebase Authentication indisponível.');
      const { currentPassword, newPassword } = validatePasswordChange(input);
      const credential = this.firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
      try {
        await user.reauthenticateWithCredential(credential);
        await user.updatePassword(newPassword);
        return true;
      } catch (error) {
        if (['auth/wrong-password', 'auth/invalid-credential', 'auth/invalid-login-credentials'].includes(error?.code)) {
          throw new Error('A senha atual está incorreta.');
        }
        if (error?.code === 'auth/too-many-requests') throw new Error('Muitas tentativas. Aguarde alguns minutos e tente novamente.');
        if (error?.code === 'auth/weak-password') throw new Error('A nova senha não atende aos requisitos de segurança.');
        throw error;
      }
    }
  }

  return Object.freeze({
    ProfileService,
    normalizeProfileInput,
    validateBirthDate,
    validatePasswordChange,
    authCapabilities,
    googleProviderPhoto,
    PHONE_PATTERN,
    BIRTH_DATE_PATTERN
  });
});
