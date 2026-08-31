/**
 * Auditoria de autenticação carregada em todas as páginas publicadas.
 * Registra somente metadados mínimos da sessão e nunca senhas/tokens.
 */
(function initAuthAuditRuntime(scope) {
  if (!scope || !scope.document || scope.__musicIdeAuthAuditRuntime) return;
  scope.__musicIdeAuthAuditRuntime = true;

  const LOGIN_AUDIT_KEY = 'musicIdeAuditLoginUid';

  function providerIds(user) {
    return Array.isArray(user && user.providerData)
      ? user.providerData.map(item => item && item.providerId).filter(Boolean)
      : [];
  }

  function timestamp() {
    const firestore = scope.firebase && scope.firebase.firestore;
    const fieldValue = firestore && firestore.FieldValue;
    return fieldValue && typeof fieldValue.serverTimestamp === 'function'
      ? fieldValue.serverTimestamp()
      : new Date();
  }

  function auditPayload(user, action, createdAt = timestamp()) {
    return {
      actorUserId: user.uid,
      action,
      entityType: 'auth',
      entityId: user.uid,
      details: { providers: providerIds(user) },
      createdAt
    };
  }

  async function record(user, action) {
    if (!user || !user.uid || !scope.firebase || typeof scope.firebase.firestore !== 'function') return null;
    return scope.firebase.firestore().collection('auditLogs').add(auditPayload(user, action));
  }

  async function recordLoginAccess(user) {
    if (!user || !user.uid || !scope.firebase || typeof scope.firebase.firestore !== 'function') return null;
    const db = scope.firebase.firestore();
    const loginAt = timestamp();
    const batch = db.batch();
    const auditRef = db.collection('auditLogs').doc();
    const userRef = db.collection('users').doc(user.uid);

    batch.set(auditRef, auditPayload(user, 'AUTH_LOGIN', loginAt));
    batch.update(userRef, { lastAccessAt: loginAt });
    return batch.commit();
  }

  function readLoggedUid() {
    try { return scope.sessionStorage && scope.sessionStorage.getItem(LOGIN_AUDIT_KEY); } catch (_) { return null; }
  }

  function writeLoggedUid(uid) {
    try { if (scope.sessionStorage) scope.sessionStorage.setItem(LOGIN_AUDIT_KEY, uid); } catch (_) { /* noop */ }
  }

  function clearLoggedUid() {
    try { if (scope.sessionStorage) scope.sessionStorage.removeItem(LOGIN_AUDIT_KEY); } catch (_) { /* noop */ }
  }

  async function recordLogin(user) {
    if (!user || !user.uid || readLoggedUid() === user.uid) return;
    try {
      await recordLoginAccess(user);
      writeLoggedUid(user.uid);
    } catch (error) {
      console.warn('Não foi possível registrar auditoria/último acesso de login:', error);
    }
  }

  function wrapSignOut() {
    const authApi = scope.MusicIdeAuth;
    if (!authApi || typeof authApi.signOut !== 'function' || authApi.signOut.__auditWrapped) return false;
    const original = authApi.signOut.bind(authApi);
    const wrapped = async function auditedSignOut() {
      const user = scope.currentMusicIdeUser;
      if (user && user.uid) {
        try {
          await record(user, 'AUTH_LOGOUT');
        } catch (error) {
          console.warn('Não foi possível registrar auditoria de logout:', error);
        }
      }
      clearLoggedUid();
      return original();
    };
    wrapped.__auditWrapped = true;
    authApi.signOut = wrapped;
    return true;
  }

  function loadScript(src, marker) {
    if (scope.document.querySelector(`script[${marker}]`)) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = scope.document.createElement('script');
      script.src = src;
      script.defer = true;
      script.setAttribute(marker, 'true');
      script.addEventListener('load', resolve, { once: true });
      script.addEventListener('error', reject, { once: true });
      scope.document.head.appendChild(script);
    });
  }

  async function bootstrapAuditRoute() {
    const page = String(scope.location && scope.location.pathname || '').split('/').filter(Boolean).pop();
    const section = new URLSearchParams(scope.location && scope.location.search || '').get('section');
    if (page !== 'module.html' || section !== 'audit') return;
    try {
      await loadScript('repositories/audit-repository.js?v=20260825-audit', 'data-ide-audit-repository');
      await loadScript('js/modules/audit-page.js?v=20260825-audit', 'data-ide-audit-page');
    } catch (error) {
      console.error('Não foi possível carregar a tela de auditoria:', error);
    }
  }

  function connect() {
    wrapSignOut();
    bootstrapAuditRoute();
    if (scope.musicIdeAuthReady && typeof scope.musicIdeAuthReady.then === 'function') {
      scope.musicIdeAuthReady.then(user => recordLogin(user)).catch(() => null);
    }
  }

  scope.addEventListener('musicIdeAuthReady', event => {
    wrapSignOut();
    recordLogin(event && event.detail && event.detail.user).catch(() => null);
  });

  connect();
  scope.setTimeout(connect, 0);
})(typeof window !== 'undefined' ? window : null);
