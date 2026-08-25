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
  const DEFAULT_RETURN_URL = 'index.html';
  const THEME_STORAGE_KEY = 'musicIdeTheme';
  const THEME_MODES = Object.freeze(['light', 'dark', 'system']);

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

      if (parsed.origin !== base.origin || !/^[a-z0-9-]+\.html$/i.test(page)) {
        return fallback;
      }

      if (page === 'login.html') return fallback;
      return `${page}${parsed.search}${parsed.hash}`;
    } catch (error) {
      return fallback;
    }
  }

  function buildCurrentReturnUrl(locationLike) {
    if (!locationLike) return DEFAULT_RETURN_URL;

    return sanitizeReturnUrl(
      `${currentPageName(locationLike.pathname)}${locationLike.search || ''}${locationLike.hash || ''}`
    );
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
    } catch (error) {
      // Storage can be unavailable in hardened/private browser contexts.
    }
    const resolved = applyTheme(scope, normalized);
    if (scope.dispatchEvent && scope.CustomEvent) {
      scope.dispatchEvent(new scope.CustomEvent('musicIdeThemeChanged', {
        detail: { preference: normalized, theme: resolved }
      }));
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
    return user.providerData.some(provider => provider && (
      provider.providerId === 'google.com' || provider.providerId === 'password'
    ));
  }

  function friendlyAuthError(error) {
    const messages = {
      'auth/account-exists-with-different-credential': 'Este e-mail já está vinculado a outra forma de acesso.',
      'auth/invalid-credential': 'E-mail ou senha inválidos.',
      'auth/invalid-email': 'Informe um endereço de e-mail válido.',
      'auth/network-request-failed': 'Não foi possível conectar. Verifique sua internet.',
      'auth/operation-not-allowed': 'Este método de acesso ainda não foi habilitado no Firebase.',
      'auth/popup-blocked': 'O navegador bloqueou a janela de login.',
      'auth/popup-closed-by-user': 'O login foi cancelado.',
      'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.',
      'auth/unauthorized-domain': 'Este endereço ainda não foi autorizado no Firebase Authentication.',
      'auth/user-disabled': 'Esta conta está desativada. Procure a liderança do ministério.',
      'auth/user-not-found': 'E-mail ou senha inválidos.',
      'auth/wrong-password': 'E-mail ou senha inválidos.'
    };

    return messages[error && error.code]
      || 'Não foi possível entrar com o Google. Tente novamente.';
  }

  function setLoginMessage(scope, message, type = 'error') {
    const element = scope.document && scope.document.getElementById('auth-message');
    if (!element) {
      if (scope.document && scope.document.readyState === 'loading') {
        scope.document.addEventListener(
          'DOMContentLoaded',
          () => setLoginMessage(scope, message, type),
          { once: true }
        );
      }
      return;
    }

    element.textContent = message;
    element.dataset.type = type;
    element.hidden = !message;
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
      avatar.textContent = '♪';
    }

    const name = scope.document.createElement('span');
    name.className = 'music-ide-user-name';
    name.textContent = user.displayName || user.email || 'Conta Google';

    const themeLabel = scope.document.createElement('label');
    themeLabel.className = 'music-ide-theme-control';
    themeLabel.setAttribute('aria-label', 'Tema da interface');

    const themeIcon = scope.document.createElement('span');
    themeIcon.className = 'music-ide-theme-icon';
    themeIcon.setAttribute('aria-hidden', 'true');
    themeIcon.textContent = '◐';

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
    signOutButton.textContent = 'Sair';
    signOutButton.addEventListener('click', () => scope.MusicIdeAuth.signOut());

    container.append(avatar, name, themeLabel, signOutButton);
    scope.document.body.appendChild(container);
  }

  function exposeAuthState(scope, user) {
    scope.currentMusicIdeUser = user;
    scope.dispatchEvent(new scope.CustomEvent('musicIdeAuthReady', { detail: { user } }));
  }

  function finishPageReveal(scope) {
    if (scope.document && scope.document.documentElement && scope.document.documentElement.classList) {
      scope.document.documentElement.classList.remove('auth-pending');
    }
  }

  function bootstrap(scope) {
    if (!scope.document || !scope.location) return;
    if (scope.__musicIdeAuthBootstrapped) return;
    scope.__musicIdeAuthBootstrapped = true;

    // Apply the persisted/resolved theme synchronously while the auth gate keeps
    // the page hidden. This prevents a light-theme flash before dark mode loads.
    applyTheme(scope, readThemePreference(scope));
    watchSystemTheme(scope);
    if (scope.document.documentElement && scope.document.documentElement.classList) {
      scope.document.documentElement.classList.add('auth-pending');
    }

    let resolveAuthReady;
    scope.musicIdeAuthReady = new Promise(resolve => {
      resolveAuthReady = resolve;
    });

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
        return await auth.signInWithPopup(provider);
      } catch (error) {
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
        setLoginMessage(scope, friendlyAuthError(error));
        return false;
      }
    };

    scope.MusicIdeAuth.signOut = async function signOut() {
      await auth.signOut();
      scope.location.replace('login.html');
    };

    auth.getRedirectResult().catch(error => {
      setLoginMessage(scope, friendlyAuthError(error));
    });

    auth.onAuthStateChanged(async user => {
      const onLoginPage = isLoginPage(scope.location.pathname);

      if (user && !isAllowedUser(user)) {
        await auth.signOut();
        failInitialization('Use uma conta Google ou uma conta cadastrada pela liderança.');
        return;
      }

      if (!user) {
        resolveAuthReady(null);

        if (onLoginPage) {
          finishPageReveal(scope);
          exposeAuthState(scope, null);
          return;
        }

        scope.sessionStorage.setItem(RETURN_URL_KEY, buildCurrentReturnUrl(scope.location));
        scope.location.replace('login.html');
        return;
      }

      resolveAuthReady(user);
      exposeAuthState(scope, user);

      if (onLoginPage) {
        const destination = sanitizeReturnUrl(scope.sessionStorage.getItem(RETURN_URL_KEY));
        scope.sessionStorage.removeItem(RETURN_URL_KEY);
        scope.location.replace(destination);
        return;
      }

      renderAuthenticatedUser(scope, user);
      finishPageReveal(scope);
    }, error => failInitialization(friendlyAuthError(error)));
  }

  return {
    THEME_MODES,
    THEME_STORAGE_KEY,
    applyTheme,
    buildCurrentReturnUrl,
    bootstrap,
    friendlyAuthError,
    isAllowedUser,
    isLoginPage,
    normalizeThemePreference,
    readThemePreference,
    resolveTheme,
    sanitizeReturnUrl,
    setThemePreference
  };
});
