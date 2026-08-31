(function initPwaInstallGuide(scope) {
  if (!scope || !scope.document) return;

  function loadMobileAuthCompat() {
    if (scope.document.querySelector('script[data-ide-mobile-auth-compat]')) return;
    const script = scope.document.createElement('script');
    script.src = '../js/modules/mobile-auth-compat.js?v=20260831-mobile-auth';
    script.async = false;
    script.setAttribute('data-ide-mobile-auth-compat', 'true');
    scope.document.head.appendChild(script);
  }

  function mountLoginHint() {
    const panel = scope.document.querySelector('.access-panel');
    if (!panel || scope.document.getElementById('login-install-hint')) return;
    const hint = scope.document.createElement('aside');
    hint.id = 'login-install-hint';
    hint.style.cssText = 'margin-top:1.25rem;padding:1rem;border:1px solid rgba(17,20,21,.14);border-radius:14px;background:var(--ide-color-neutral-50);color:var(--ide-color-neutral-800);font-size:.86rem;line-height:1.5';
    hint.innerHTML = '<strong style="display:block;margin-bottom:.25rem">📱 Use o IDE Music como aplicativo</strong><span>Depois de entrar, abra <b>Ajuda</b> para ver como instalar o portal na tela inicial do iPhone/iPad ou Android.</span>';
    panel.appendChild(hint);
  }

  const page = String(scope.location?.pathname || '').split('/').pop();
  if (page !== 'login.html') return;

  loadMobileAuthCompat();
  if (scope.document.readyState === 'loading') scope.document.addEventListener('DOMContentLoaded', mountLoginHint, { once: true });
  else mountLoginHint();
})(window);
