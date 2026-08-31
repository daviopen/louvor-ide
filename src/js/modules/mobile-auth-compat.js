(function initMobileAuthCompat(globalScope, factory) {
  const api = factory();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (globalScope) {
    globalScope.MusicIdeMobileAuthCompat = api;
    api.install(globalScope);
  }
})(typeof window !== 'undefined' ? window : null, function createMobileAuthCompat() {
  const EMBEDDED_BROWSER_PATTERN = /(FBAN|FBAV|FB_IAB|Instagram|Line\/|WhatsApp|Twitter|LinkedInApp|Snapchat|; wv\)|\bwv\b)/i;
  const MOBILE_USER_AGENT_PATTERN = /(Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile)/i;
  const POPUP_FALLBACK_CODES = new Set([
    'auth/popup-blocked',
    'auth/cancelled-popup-request',
    'auth/operation-not-supported-in-this-environment',
    'auth/web-storage-unsupported'
  ]);

  function navigatorUserAgent(navigatorLike) {
    return String(navigatorLike && navigatorLike.userAgent || '');
  }

  function isIpadOs(navigatorLike) {
    return Boolean(
      navigatorLike
      && navigatorLike.platform === 'MacIntel'
      && Number(navigatorLike.maxTouchPoints || 0) > 1
    );
  }

  function isMobileBrowser(navigatorLike) {
    if (!navigatorLike) return false;
    if (navigatorLike.userAgentData && typeof navigatorLike.userAgentData.mobile === 'boolean') {
      return navigatorLike.userAgentData.mobile || isIpadOs(navigatorLike);
    }
    return MOBILE_USER_AGENT_PATTERN.test(navigatorUserAgent(navigatorLike)) || isIpadOs(navigatorLike);
  }

  function isEmbeddedBrowser(navigatorLike) {
    return EMBEDDED_BROWSER_PATTERN.test(navigatorUserAgent(navigatorLike));
  }

  function googleAuthStrategy(navigatorLike) {
    if (isEmbeddedBrowser(navigatorLike)) return 'external-browser';
    return isMobileBrowser(navigatorLike) ? 'redirect' : 'popup';
  }

  function isPopupFallbackError(error) {
    return POPUP_FALLBACK_CODES.has(String(error && error.code || '').trim().toLowerCase());
  }

  function preferredExternalBrowser(navigatorLike) {
    const userAgent = navigatorUserAgent(navigatorLike);
    if (/(iPhone|iPad|iPod)/i.test(userAgent) || isIpadOs(navigatorLike)) return 'Safari';
    if (/Android/i.test(userAgent)) return 'Chrome';
    return 'Chrome ou Safari';
  }

  function embeddedBrowserMessage(navigatorLike) {
    return `Este navegador interno pode bloquear o acesso com Google. Abra este link no ${preferredExternalBrowser(navigatorLike)} e tente novamente. Você também pode entrar com e-mail e senha.`;
  }

  function setLoginMessage(scope, message, type = 'error') {
    const element = scope && scope.document && scope.document.getElementById('auth-message');
    if (!element) return false;
    element.textContent = message;
    element.dataset.type = type;
    element.hidden = !message;
    return true;
  }

  function report(scope, event, context = {}) {
    const observability = scope && scope.MusicIdeObservability;
    if (observability && typeof observability.info === 'function') {
      observability.info(event, 'Estratégia de autenticação Google selecionada.', context);
    }
  }

  function createGoogleProvider(scope) {
    const provider = new scope.firebase.auth.GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');
    if (typeof provider.setCustomParameters === 'function') {
      provider.setCustomParameters({ prompt: 'select_account' });
    }
    return provider;
  }

  function friendlyAuthError(scope, error) {
    if (scope && scope.MusicIdeAuth && typeof scope.MusicIdeAuth.friendlyAuthError === 'function') {
      return scope.MusicIdeAuth.friendlyAuthError(error);
    }
    return 'Não foi possível concluir a autenticação. Tente novamente.';
  }

  async function redirectWithGoogle(scope, auth, provider) {
    setLoginMessage(scope, 'Abrindo o Google no navegador...', 'info');
    await auth.signInWithRedirect(provider);
    return null;
  }

  function installGoogleSignIn(scope) {
    if (!scope || !scope.firebase || typeof scope.firebase.auth !== 'function') return false;
    if (!scope.MusicIdeAuth || typeof scope.MusicIdeAuth.signInWithGoogle !== 'function') return false;
    if (scope.MusicIdeAuth.__mobileCompatInstalled) return true;

    const auth = scope.firebase.auth();
    const initialStrategy = googleAuthStrategy(scope.navigator);

    scope.MusicIdeAuth.signInWithGoogle = async function signInWithGoogleResponsive() {
      const strategy = googleAuthStrategy(scope.navigator);
      report(scope, 'auth.google.strategy', { strategy, mobile: isMobileBrowser(scope.navigator), embedded: isEmbeddedBrowser(scope.navigator) });

      if (strategy === 'external-browser') {
        setLoginMessage(scope, embeddedBrowserMessage(scope.navigator), 'info');
        return null;
      }

      try {
        await auth.setPersistence(scope.firebase.auth.Auth.Persistence.LOCAL);
        const provider = createGoogleProvider(scope);

        if (strategy === 'redirect') {
          return await redirectWithGoogle(scope, auth, provider);
        }

        setLoginMessage(scope, 'Abrindo o Google...', 'info');
        try {
          const result = await auth.signInWithPopup(provider);
          setLoginMessage(scope, 'Conta Google autenticada. Carregando seu acesso...', 'info');
          return result;
        } catch (error) {
          if (!isPopupFallbackError(error)) throw error;
          report(scope, 'auth.google.popup_fallback', { code: error && error.code || null });
          return await redirectWithGoogle(scope, auth, provider);
        }
      } catch (error) {
        if (scope.console && typeof scope.console.warn === 'function') {
          scope.console.warn(`[Auth] login Google responsivo: ${error && error.code || 'auth/unknown'}`);
        }
        setLoginMessage(scope, friendlyAuthError(scope, error));
        return null;
      }
    };

    scope.MusicIdeAuth.__mobileCompatInstalled = true;
    scope.MusicIdeAuth.googleAuthStrategy = () => googleAuthStrategy(scope.navigator);
    if (initialStrategy === 'external-browser') {
      setLoginMessage(scope, embeddedBrowserMessage(scope.navigator), 'info');
    }
    return true;
  }

  function install(scope) {
    if (!scope || !scope.document) return false;
    if (installGoogleSignIn(scope)) return true;

    let attempts = 0;
    const maxAttempts = 100;
    const intervalMs = 50;
    const timer = scope.setInterval(() => {
      attempts += 1;
      if (installGoogleSignIn(scope) || attempts >= maxAttempts) {
        scope.clearInterval(timer);
      }
    }, intervalMs);

    return true;
  }

  return {
    embeddedBrowserMessage,
    googleAuthStrategy,
    install,
    installGoogleSignIn,
    isEmbeddedBrowser,
    isIpadOs,
    isMobileBrowser,
    isPopupFallbackError,
    preferredExternalBrowser
  };
});
