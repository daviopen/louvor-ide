/**
 * Autenticação do IDE Music.
 *
 * O módulo expõe funções puras para testes e inicializa automaticamente o
 * Firebase Auth quando executado no navegador.
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

    const signOutButton = scope.document.createElement('button');
    signOutButton.type = 'button';
    signOutButton.className = 'music-ide-signout';
    signOutButton.textContent = 'Sair';
    signOutButton.addEventListener('click', () => scope.MusicIdeAuth.signOut());

    container.append(avatar, name, signOutButton);
    scope.document.body.appendChild(container);
  }

  function exposeAuthState(scope, user) {
    scope.currentMusicIdeUser = user;
    scope.dispatchEvent(new scope.CustomEvent('musicIdeAuthReady', { detail: { user } }));
  }

  function finishPageReveal(scope) {
    if (scope.document) scope.document.documentElement.classList.remove('auth-pending');
  }

  function bootstrap(scope) {
    if (!scope.document || !scope.location) return;
    if (scope.__musicIdeAuthBootstrapped) return;
    scope.__musicIdeAuthBootstrapped = true;

    scope.document.documentElement.classList.add('auth-pending');

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
        // O popup é iniciado diretamente pelo clique do usuário e não depende
        // do armazenamento de terceiros usado pelo fluxo de redirect. Isso
        // evita o retorno em loop para login em janelas anônimas e navegadores
        // com proteção reforçada contra rastreamento.
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
    buildCurrentReturnUrl,
    bootstrap,
    friendlyAuthError,
    isAllowedUser,
    isLoginPage,
    sanitizeReturnUrl
  };
});
