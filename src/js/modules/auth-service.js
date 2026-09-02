/**
 * Autenticação e preferências globais do IDE Music.
 *
 * O módulo expõe funções puras para testes e inicializa automaticamente o
 * Firebase Auth e o tema quando executado no navegador.
 */
(function initAuthModule(globalScope, factory) {
  const api = factory();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (globalScope) {
    globalScope.MusicIdeAuth = api;
    api.bootstrap(globalScope);
  }
})(typeof window !== 'undefined' ? window : null, function createAuthModule() {
  const RETURN_URL_KEY = 'musicIdeReturnUrl';
  const AUTH_MESSAGE_KEY = 'musicIdeAuthMessage';
  const AUTHORIZATION_CACHE_KEY = 'musicIdeAuthorizationSession';
  const AUTHORIZATION_CACHE_VERSION = 1;
  const DEFAULT_RETURN_URL = 'index.html';
  const THEME_STORAGE_KEY = 'musicIdeTheme';
  const THEME_MODES = Object.freeze(['light', 'dark', 'system']);
  const PERMISSION_MODULES = Object.freeze([
    'dashboard', 'users', 'permissions', 'unavailability', 'events',
    'schedules', 'setlists', 'songs', 'audit'
  ]);
  const TRANSIENT_AUTHORIZATION_ERROR_CODES = new Set([
    'auth/network-request-failed',
    'firestore/unavailable', 'unavailable',
    'firestore/deadline-exceeded', 'deadline-exceeded',
    'firestore/aborted', 'aborted',
    'firestore/resource-exhausted', 'resource-exhausted',
    'app/firestore-unavailable'
  ]);

  function currentPageName(pathname) {
    if (typeof pathname !== 'string') return '';
    return pathname.split('/').filter(Boolean).pop() || 'index.html';
  }

  function isLoginPage(pathname) {
    return currentPageName(pathname) === 'login.html';
  }

  function sanitizeReturnUrl(candidate, fallback = DEFAULT_RETURN_URL) {
    if (typeof candidate !== 'string' || !candidate.trim()) return fallback;
    const trimmed = candidate.trim();
    if (trimmed.startsWith('//') || trimmed.includes('\\')) return fallback;
    try {
      const base = new URL('https://music.ide/');
      const parsed = new URL(trimmed, base);
      const page = currentPageName(parsed.pathname);
      if (parsed.origin !== base.origin || !/^[a-z0-9-]+\.html$/i.test(page)) return fallback;
      if (page === 'login.html') return fallback;
      return `${page}${parsed.search}${parsed.hash}`;
    } catch (error) {
      return fallback;
    }
  }

  function buildCurrentReturnUrl(locationLike) {
    if (!locationLike) return DEFAULT_RETURN_URL;
    return sanitizeReturnUrl(`${currentPageName(locationLike.pathname)}${locationLike.search || ''}${locationLike.hash || ''}`);
  }

  function normalizeThemePreference(value) {
    return THEME_MODES.includes(value) ? value : 'system';
  }

  function resolveTheme(preference, prefersDark = false) {
    const normalized = normalizeThemePreference(preference);
    if (normalized === 'system') return prefersDark ? 'dark' : 'light';
    return normalized;
  }

  function readThemePreference(scope) {
    try {
      return normalizeThemePreference(scope.localStorage && scope.localStorage.getItem(THEME_STORAGE_KEY));
    } catch (error) {
      return 'system';
    }
  }

  function systemPrefersDark(scope) {
    return Boolean(scope.matchMedia && scope.matchMedia('(prefers-color-scheme: dark)').matches);
  }

  function applyTheme(scope, preference) {
    if (!scope.document || !scope.document.documentElement) return 'light';
    const normalized = normalizeThemePreference(preference);
    const resolved = resolveTheme(normalized, systemPrefersDark(scope));
    const root = scope.document.documentElement;
    root.dataset = root.dataset || {};
    root.dataset.theme = resolved;
    root.dataset.themePreference = normalized;
    if (root.style) root.style.colorScheme = resolved;
    return resolved;
  }

  function setThemePreference(scope, preference) {
    const normalized = normalizeThemePreference(preference);
    try {
      if (scope.localStorage) scope.localStorage.setItem(THEME_STORAGE_KEY, normalized);
    } catch (error) {}
    const resolved = applyTheme(scope, normalized);
    if (scope.dispatchEvent && scope.CustomEvent) {
      scope.dispatchEvent(new scope.CustomEvent('musicIdeThemeChanged', { detail: { preference: normalized, theme: resolved } }));
    }
    return normalized;
  }

  function watchSystemTheme(scope) {
    if (!scope.matchMedia || scope.__musicIdeThemeWatcher) return;
    const media = scope.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (readThemePreference(scope) === 'system') applyTheme(scope, 'system');
    };
    if (typeof media.addEventListener === 'function') media.addEventListener('change', handleChange);
    else if (typeof media.addListener === 'function') media.addListener(handleChange);
    scope.__musicIdeThemeWatcher = { media, handleChange };
  }

  function isAllowedUser(user) {
    if (!user || !Array.isArray(user.providerData)) return false;
    return user.providerData.some(provider => provider && (provider.providerId === 'google.com' || provider.providerId === 'password'));
  }

  function isActiveProfile(profile) {
    return Boolean(profile && profile.active === true);
  }

  function profileRevision(profile) {
    const updatedAt = profile && profile.updatedAt;
    if (!updatedAt) return '';
    const seconds = updatedAt.seconds ?? updatedAt._seconds;
    const nanoseconds = updatedAt.nanoseconds ?? updatedAt._nanoseconds;
    if (seconds != null) return `${seconds}:${nanoseconds || 0}`;
    return String(updatedAt);
  }

  function readAuthorizationCache(scope, userId) {
    try {
      if (!scope || !scope.sessionStorage || !userId) return null;
      const raw = scope.sessionStorage.getItem(AUTHORIZATION_CACHE_KEY);
      if (!raw) return null;
      const cached = JSON.parse(raw);
      if (!cached || cached.version !== AUTHORIZATION_CACHE_VERSION || cached.userId !== userId) return null;
      if (!isActiveProfile(cached.profile)) return null;
      if (!cached.profile.permissions || typeof cached.profile.permissions !== 'object') cached.profile.permissions = {};
      return cached.profile;
    } catch (error) {
      return null;
    }
  }

  function writeAuthorizationCache(scope, userId, profile) {
    try {
      if (!scope || !scope.sessionStorage || !userId || !isActiveProfile(profile)) return false;
      scope.sessionStorage.setItem(AUTHORIZATION_CACHE_KEY, JSON.stringify({
        version: AUTHORIZATION_CACHE_VERSION,
        userId,
        profile
      }));
      return true;
    } catch (error) {
      return false;
    }
  }

  function clearAuthorizationCache(scope) {
    try {
      if (scope && scope.sessionStorage) scope.sessionStorage.removeItem(AUTHORIZATION_CACHE_KEY);
    } catch (error) {}
  }

  function isTransientAuthorizationError(error) {
    const code = String(error && error.code || '').trim().toLowerCase();
    return TRANSIENT_AUTHORIZATION_ERROR_CODES.has(code);
  }

  async function withAuthorizationRetry(operation, options = {}) {
    const maxAttempts = Math.max(1, Number(options.maxAttempts) || 2);
    const delayMs = Math.max(0, Number(options.delayMs) || 350);
    const sleep = typeof options.sleep === 'function' ? options.sleep : ms => new Promise(resolve => setTimeout(resolve, ms));
    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return await operation(attempt);
      } catch (error) {
        lastError = error;
        if (!isTransientAuthorizationError(error) || attempt >= maxAttempts) throw error;
        await sleep(delayMs);
      }
    }
    throw lastError;
  }

  function friendlyAuthError(error) {
    const messages = {
      'auth/account-exists-with-different-credential': 'Este e-mail já está vinculado a outra forma de acesso. Entre com o provedor já associado ou redefina a senha.',
      'auth/app-not-authorized': 'Este aplicativo não está autorizado a usar o Firebase Authentication.',
      'auth/credential-already-in-use': 'Esta credencial já está vinculada a outra conta.',
      'auth/email-already-in-use': 'Este e-mail já está vinculado a outra conta.',
      'auth/internal-error': 'O Firebase Authentication retornou uma falha interna. Tente novamente em instantes.',
      'auth/invalid-api-key': 'A configuração de autenticação da aplicação está inválida.',
      'auth/invalid-credential': 'E-mail ou senha inválidos.',
      'auth/invalid-login-credentials': 'E-mail ou senha inválidos.',
      'auth/invalid-email': 'Informe um endereço de e-mail válido.',
      'auth/missing-password': 'Informe sua senha.',
      'auth/network-request-failed': 'Não foi possível conectar. Verifique sua internet.',
      'auth/operation-not-allowed': 'Este método de acesso ainda não foi habilitado no Firebase.',
      'auth/popup-blocked': 'O navegador bloqueou a janela de login.',
      'auth/popup-closed-by-user': 'O login foi cancelado.',
      'auth/cancelled-popup-request': 'A tentativa anterior de login foi substituída. Tente novamente.',
      'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.',
      'auth/unauthorized-domain': 'Este endereço ainda não foi autorizado no Firebase Authentication.',
      'auth/user-disabled': 'Esta conta está desativada. Procure a liderança do ministério.',
      'auth/user-mismatch': 'A credencial informada pertence a outra conta.',
      'auth/user-not-found': 'E-mail ou senha inválidos.',
      'auth/weak-password': 'A senha informada não atende aos requisitos mínimos de segurança.',
      'auth/wrong-password': 'E-mail ou senha inválidos.'
    };
    return messages[error && error.code] || 'Não foi possível concluir a autenticação. Tente novamente.';
  }

  function reportAuthError(scope, context, error) {
    if (!scope || !scope.console || typeof scope.console.warn !== 'function') return;
    const code = error && typeof error.code === 'string' ? error.code : 'auth/unknown';
    scope.console.warn(`[Auth] ${context}: ${code}`);
  }

  function setLoginMessage(scope, message, type = 'error') {
    const element = scope.document && scope.document.getElementById('auth-message');
    if (!element) {
      if (scope.document && scope.document.readyState === 'loading') {
        scope.document.addEventListener('DOMContentLoaded', () => setLoginMessage(scope, message, type), { once: true });
      }
      return;
    }
    element.textContent = message;
    element.dataset.type = type;
    element.hidden = !message;
  }

  function persistAuthMessage(scope, message) {
    try {
      if (scope.sessionStorage) scope.sessionStorage.setItem(AUTH_MESSAGE_KEY, message);
    } catch (error) {}
  }

  function consumeAuthMessage(scope) {
    try {
      if (!scope.sessionStorage) return null;
      const message = scope.sessionStorage.getItem(AUTH_MESSAGE_KEY);
      scope.sessionStorage.removeItem(AUTH_MESSAGE_KEY);
      return message;
    } catch (error) {
      return null;
    }
  }

  function renderAuthenticatedUser(scope, user) {
    if (!scope.document || scope.document.getElementById('music-ide-user')) return;
    if (!scope.document.body) {
      scope.document.addEventListener('DOMContentLoaded', () => renderAuthenticatedUser(scope, user), { once: true });
      return;
    }
    const container = scope.document.createElement('div');
    container.id = 'music-ide-user';
    container.className = 'music-ide-user';
    let avatar;
    if (user.photoURL) {
      avatar = scope.document.createElement('img');
      avatar.src = user.photoURL;
      avatar.alt = '';
      avatar.referrerPolicy = 'no-referrer';
    } else {
      avatar = scope.document.createElement('span');
      avatar.className = 'music-ide-user-placeholder';
      avatar.setAttribute('aria-hidden', 'true');
      avatar.textContent = String(user.displayName || user.email || 'U').trim().charAt(0).toUpperCase();
    }
    const name = scope.document.createElement('span');
    name.className = 'music-ide-user-name';
    name.textContent = user.displayName || user.email || 'Conta Google';
    const themeLabel = scope.document.createElement('label');
    themeLabel.className = 'music-ide-theme-control';
    themeLabel.setAttribute('aria-label', 'Tema da interface');
    const themeIcon = scope.document.createElement('i');
    themeIcon.className = 'fa-solid fa-circle-half-stroke music-ide-theme-icon';
    themeIcon.setAttribute('aria-hidden', 'true');
    const themeSelect = scope.document.createElement('select');
    themeSelect.className = 'music-ide-theme-select';
    themeSelect.title = 'Tema da interface';
    themeSelect.innerHTML = '<option value="system">Sistema</option><option value="light">Claro</option><option value="dark">Escuro</option>';
    themeSelect.value = readThemePreference(scope);
    themeSelect.addEventListener('change', event => setThemePreference(scope, event.target.value));
    themeLabel.append(themeIcon, themeSelect);
    const signOutButton = scope.document.createElement('button');
    signOutButton.type = 'button';
    signOutButton.className = 'music-ide-signout';
    signOutButton.innerHTML = '<i class="fa-solid fa-arrow-right-from-bracket" aria-hidden="true"></i><span>Sair</span>';
    signOutButton.addEventListener('click', () => scope.MusicIdeAuth.signOut());
    container.append(avatar, name, themeLabel, signOutButton);
    scope.document.body.appendChild(container);
  }

  function exposeAuthState(scope, user, profile = null) {
    scope.currentMusicIdeUser = user;
    scope.currentMusicIdeProfile = profile;
    scope.dispatchEvent(new scope.CustomEvent('musicIdeAuthReady', { detail: { user, profile } }));
  }

  function finishPageReveal(scope) {
    if (scope.document && scope.document.documentElement && scope.document.documentElement.classList) {
      scope.document.documentElement.classList.remove('auth-pending');
    }
  }

  async function recordLastAccess(scope, user) {
    if (!user || !user.uid || !scope.firebase || typeof scope.firebase.firestore !== 'function') return;
    const firestore = scope.firebase.firestore;
    const fieldValue = firestore.FieldValue;
    const timestamp = fieldValue && typeof fieldValue.serverTimestamp === 'function' ? fieldValue.serverTimestamp() : new Date();
    try {
      await firestore().collection('users').doc(user.uid).set({ lastAccessAt: timestamp }, { merge: true });
    } catch (error) {
      if (scope.console && typeof scope.console.warn === 'function') scope.console.warn('Não foi possível registrar o último acesso do usuário.', error);
    }
  }

  async function loadEffectivePermissions(scope, userId, mirroredPermissions = {}) {
    const database = scope.firebase.firestore();
    const permissionsCollection = database.collection('permissions');
    const entries = await Promise.all(PERMISSION_MODULES.map(async moduleName => {
      const snapshot = await permissionsCollection.doc(`${userId}__${moduleName}`).get();
      if (!snapshot.exists) return null;
      const data = snapshot.data() || {};
      if (data.userId !== userId || data.module !== moduleName) return null;
      const level = String(data.level || '').toUpperCase();
      if (!['READ', 'EDIT'].includes(level)) return null;
      return [moduleName, level];
    }));
    const rank = { NONE: 0, READ: 1, EDIT: 2 };
    const effective = {};
    for (const moduleName of PERMISSION_MODULES) {
      const mirrored = mirroredPermissions?.[moduleName];
      const mirroredValue = mirrored && typeof mirrored === 'object' ? mirrored.level || mirrored.access : mirrored;
      const mirroredLevel = String(mirroredValue || 'NONE').toUpperCase();
      const technicalLevel = entries.find(entry => entry && entry[0] === moduleName)?.[1] || 'NONE';
      const level = rank[technicalLevel] > rank[mirroredLevel] ? technicalLevel : mirroredLevel;
      if (level === 'READ' || level === 'EDIT') effective[moduleName] = level;
    }
    return effective;
  }

  async function resolveAuthorizedProfile(scope, user, options = {}) {
    if (!scope.firebase || typeof scope.firebase.firestore !== 'function') {
      const error = new Error('Firestore indisponível para validar autorização.');
      error.code = 'app/firestore-unavailable';
      throw error;
    }
    const profileRef = scope.firebase.firestore().collection('users').doc(user.uid);
    const snapshot = await profileRef.get();
    if (!snapshot.exists) {
      return { authorized: false, reason: 'not-provisioned', profile: null, permissionsFromCache: false };
    }
    const profile = snapshot.data() || null;
    if (!isActiveProfile(profile)) return { authorized: false, reason: 'inactive', profile, permissionsFromCache: false };

    const cachedProfile = options.cachedProfile;
    const canReusePermissions = Boolean(
      cachedProfile
      && isActiveProfile(cachedProfile)
      && String(cachedProfile.role || '') === String(profile.role || '')
      && String(cachedProfile.accessProfile || '') === String(profile.accessProfile || '')
      && profileRevision(cachedProfile) === profileRevision(profile)
      && cachedProfile.permissions
      && typeof cachedProfile.permissions === 'object'
    );
    const permissions = profile.role === 'SUPER_ADMIN'
      ? {}
      : canReusePermissions
        ? cachedProfile.permissions
        : await loadEffectivePermissions(scope, user.uid, profile.permissions);

    return {
      authorized: true,
      reason: null,
      permissionsFromCache: profile.role !== 'SUPER_ADMIN' && canReusePermissions,
      profile: { ...profile, permissions }
    };
  }

  function authorizationFailureMessage(reason) {
    if (reason === 'inactive') return 'Esta conta está desativada. Procure a liderança do ministério.';
    if (reason === 'not-provisioned') return 'Esta conta ainda não foi liberada pela liderança.';
    if (reason === 'transient') return 'Não foi possível validar seu acesso agora. Verifique sua conexão e tente novamente.';
    return 'Não foi possível validar sua autorização. Tente novamente.';
  }

  function bootstrap(scope) {
    if (!scope.document || !scope.location) return;
    if (scope.__musicIdeAuthBootstrapped) return;
    scope.__musicIdeAuthBootstrapped = true;
    applyTheme(scope, readThemePreference(scope));
    watchSystemTheme(scope);
    if (scope.document.documentElement && scope.document.documentElement.classList) scope.document.documentElement.classList.add('auth-pending');

    let resolveAuthReady;
    scope.musicIdeAuthReady = new Promise(resolve => { resolveAuthReady = resolve; });

    function failInitialization(message) {
      finishPageReveal(scope);
      setLoginMessage(scope, message);
      resolveAuthReady(null);
    }

    if (!scope.firebase || typeof scope.firebase.auth !== 'function') {
      failInitialization('O Firebase Authentication não foi carregado.');
      return;
    }

    let auth;
    try {
      auth = scope.firebase.auth();
    } catch (error) {
      reportAuthError(scope, 'inicialização', error);
      failInitialization(friendlyAuthError(error));
      return;
    }
    auth.useDeviceLanguage();

    scope.MusicIdeAuth.signInWithGoogle = async function signInWithGoogle() {
      setLoginMessage(scope, 'Abrindo o Google...', 'info');
      try {
        await auth.setPersistence(scope.firebase.auth.Auth.Persistence.LOCAL);
        const provider = new scope.firebase.auth.GoogleAuthProvider();
        provider.addScope('profile');
        provider.addScope('email');
        if (typeof provider.setCustomParameters === 'function') provider.setCustomParameters({ prompt: 'select_account' });
        const result = await auth.signInWithPopup(provider);
        setLoginMessage(scope, 'Conta Google autenticada. Carregando seu acesso...', 'info');
        return result;
      } catch (error) {
        reportAuthError(scope, 'login Google', error);
        setLoginMessage(scope, friendlyAuthError(error));
        return null;
      }
    };

    scope.MusicIdeAuth.signInWithEmail = async function signInWithEmail(email, password) {
      const normalizedEmail = typeof email === 'string' ? email.trim() : '';
      if (!normalizedEmail || typeof password !== 'string' || !password) {
        setLoginMessage(scope, 'Informe seu e-mail e sua senha.');
        return null;
      }
      setLoginMessage(scope, 'Entrando...', 'info');
      try {
        await auth.setPersistence(scope.firebase.auth.Auth.Persistence.LOCAL);
        return await auth.signInWithEmailAndPassword(normalizedEmail, password);
      } catch (error) {
        reportAuthError(scope, 'login e-mail/senha', error);
        setLoginMessage(scope, friendlyAuthError(error));
        return null;
      }
    };

    scope.MusicIdeAuth.sendPasswordReset = async function sendPasswordReset(email) {
      const normalizedEmail = typeof email === 'string' ? email.trim() : '';
      if (!normalizedEmail) {
        setLoginMessage(scope, 'Informe seu e-mail para recuperar a senha.');
        return false;
      }
      try {
        await auth.sendPasswordResetEmail(normalizedEmail);
        setLoginMessage(scope, 'Se houver uma conta cadastrada, enviaremos as instruções para esse e-mail.', 'info');
        return true;
      } catch (error) {
        reportAuthError(scope, 'recuperação de senha', error);
        setLoginMessage(scope, friendlyAuthError(error));
        return false;
      }
    };

    scope.MusicIdeAuth.signOut = async function signOut() {
      try {
        await auth.signOut();
        scope.currentMusicIdeUser = null;
        scope.currentMusicIdeProfile = null;
        clearAuthorizationCache(scope);
        if (scope.sessionStorage) {
          scope.sessionStorage.removeItem(RETURN_URL_KEY);
          scope.sessionStorage.removeItem(AUTH_MESSAGE_KEY);
        }
        scope.location.replace('login.html');
        return true;
      } catch (error) {
        reportAuthError(scope, 'logout', error);
        setLoginMessage(scope, 'Não foi possível encerrar a sessão. Tente novamente.');
        return false;
      }
    };

    auth.getRedirectResult().catch(error => {
      reportAuthError(scope, 'retorno de autenticação', error);
      setLoginMessage(scope, friendlyAuthError(error));
    });

    auth.onAuthStateChanged(async user => {
      const onLoginPage = isLoginPage(scope.location.pathname);

      if (user && !isAllowedUser(user)) {
        clearAuthorizationCache(scope);
        await auth.signOut();
        failInitialization('Use uma conta Google ou uma conta cadastrada pela liderança.');
        return;
      }

      if (!user) {
        clearAuthorizationCache(scope);
        resolveAuthReady(null);
        if (onLoginPage) {
          finishPageReveal(scope);
          exposeAuthState(scope, null, null);
          const pendingMessage = consumeAuthMessage(scope);
          if (pendingMessage) setLoginMessage(scope, pendingMessage);
          return;
        }
        if (scope.sessionStorage) scope.sessionStorage.setItem(RETURN_URL_KEY, buildCurrentReturnUrl(scope.location));
        scope.location.replace('login.html');
        return;
      }

      // As permissões são hidratadas no login/bootstrap da sessão e ficam em
      // sessionStorage somente como cache de UX. Em cada página o perfil ainda
      // é relido para confirmar active=true; as Firestore Rules seguem como
      // autoridade definitiva para qualquer leitura/escrita protegida.
      const cachedProfile = onLoginPage ? null : readAuthorizationCache(scope, user.uid);
      let authorization;
      try {
        authorization = await withAuthorizationRetry(
          () => resolveAuthorizedProfile(scope, user, { cachedProfile }),
          { maxAttempts: 2, delayMs: 350 }
        );
      } catch (error) {
        reportAuthError(scope, 'validação de autorização', error);

        if (isTransientAuthorizationError(error)) {
          const message = authorizationFailureMessage('transient');
          resolveAuthReady(null);
          if (!onLoginPage) persistAuthMessage(scope, message);
          finishPageReveal(scope);
          if (onLoginPage) setLoginMessage(scope, message);
          else scope.location.replace('login.html');
          return;
        }

        clearAuthorizationCache(scope);
        const message = authorizationFailureMessage('validation-error');
        if (!onLoginPage) persistAuthMessage(scope, message);
        await auth.signOut().catch(() => null);
        if (onLoginPage) failInitialization(message);
        else scope.location.replace('login.html');
        return;
      }

      if (!authorization.authorized) {
        clearAuthorizationCache(scope);
        const message = authorizationFailureMessage(authorization.reason);
        if (!onLoginPage) persistAuthMessage(scope, message);
        await auth.signOut().catch(() => null);
        if (onLoginPage) failInitialization(message);
        else scope.location.replace('login.html');
        return;
      }

      const sessionWasHydrated = Boolean(cachedProfile);
      writeAuthorizationCache(scope, user.uid, authorization.profile);
      if (!sessionWasHydrated) void recordLastAccess(scope, user);

      resolveAuthReady(user);
      exposeAuthState(scope, user, authorization.profile);

      if (onLoginPage) {
        const destination = sanitizeReturnUrl(scope.sessionStorage && scope.sessionStorage.getItem(RETURN_URL_KEY));
        if (scope.sessionStorage) scope.sessionStorage.removeItem(RETURN_URL_KEY);
        scope.location.replace(destination);
        return;
      }

      renderAuthenticatedUser(scope, user);
      finishPageReveal(scope);
    }, error => {
      reportAuthError(scope, 'observador de sessão', error);
      failInitialization(friendlyAuthError(error));
    });
  }

  return {
    AUTHORIZATION_CACHE_KEY,
    THEME_MODES,
    THEME_STORAGE_KEY,
    applyTheme,
    authorizationFailureMessage,
    buildCurrentReturnUrl,
    bootstrap,
    clearAuthorizationCache,
    friendlyAuthError,
    isActiveProfile,
    isAllowedUser,
    isLoginPage,
    isTransientAuthorizationError,
    loadEffectivePermissions,
    normalizeThemePreference,
    readAuthorizationCache,
    readThemePreference,
    recordLastAccess,
    resolveAuthorizedProfile,
    resolveTheme,
    sanitizeReturnUrl,
    setThemePreference,
    withAuthorizationRetry,
    writeAuthorizationCache
  };
});
