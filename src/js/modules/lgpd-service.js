/**
 * LGPD consent lifecycle for IDE Music.
 * Keeps consent explicit, versioned and auditable without collecting
 * unnecessary device, IP or behavioral data.
 */
(function initLgpdModule(globalScope, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (globalScope) globalScope.MusicIdeLgpd = api;
})(typeof window !== 'undefined' ? window : null, function createLgpdModule() {
  const TERMS_VERSION = '2026-08-25';
  const PRIVACY_VERSION = '2026-08-25';
  const CONSENT_VERSION = `terms:${TERMS_VERSION}|privacy:${PRIVACY_VERSION}`;
  const CONSENT_PAGE = 'consentimento.html';
  const PUBLIC_LEGAL_PAGES = Object.freeze(['termos.html', 'privacidade.html']);

  function currentPageName(pathname) {
    return String(pathname || '').split('/').filter(Boolean).pop() || 'index.html';
  }

  function isConsentPage(pathname) {
    return currentPageName(pathname) === CONSENT_PAGE;
  }

  function isPublicLegalPage(pathname) {
    return PUBLIC_LEGAL_PAGES.includes(currentPageName(pathname));
  }

  function needsConsent(profile) {
    return !profile || profile.lgpdConsentVersion !== CONSENT_VERSION;
  }

  function sanitizeReturnUrl(candidate, fallback = 'index.html') {
    if (typeof candidate !== 'string' || !candidate.trim()) return fallback;
    const trimmed = candidate.trim();
    if (trimmed.startsWith('//') || trimmed.includes('\\')) return fallback;
    try {
      const base = new URL('https://music.ide/');
      const parsed = new URL(trimmed, base);
      const page = currentPageName(parsed.pathname);
      if (parsed.origin !== base.origin || !/^[a-z0-9-]+\.html$/i.test(page)) return fallback;
      if ([CONSENT_PAGE, 'login.html'].includes(page)) return fallback;
      return `${page}${parsed.search}${parsed.hash}`;
    } catch (error) {
      return fallback;
    }
  }

  function currentReturnUrl(locationLike) {
    if (!locationLike) return 'index.html';
    return sanitizeReturnUrl(`${currentPageName(locationLike.pathname)}${locationLike.search || ''}${locationLike.hash || ''}`);
  }

  function consentDocumentId(uid) {
    const normalizedVersion = CONSENT_VERSION.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
    return `${uid}__${normalizedVersion}`;
  }

  function buildConsentPayload(user, timestamp) {
    if (!user || !user.uid) throw new TypeError('Usuário autenticado é obrigatório.');
    return {
      userId: user.uid,
      consentVersion: CONSENT_VERSION,
      termsVersion: TERMS_VERSION,
      privacyVersion: PRIVACY_VERSION,
      acceptedAt: timestamp,
      status: 'ACCEPTED',
      source: 'web'
    };
  }

  async function recordConsent(scope, user) {
    if (!scope || !scope.firebase || typeof scope.firebase.firestore !== 'function') {
      throw new Error('Firestore indisponível para registrar o consentimento.');
    }
    if (!user || !user.uid) throw new Error('Usuário autenticado não encontrado.');

    const db = scope.firebase.firestore();
    const fieldValue = scope.firebase.firestore.FieldValue;
    const timestamp = fieldValue && typeof fieldValue.serverTimestamp === 'function'
      ? fieldValue.serverTimestamp()
      : new Date();
    const consentRef = db.collection('lgpdConsents').doc(consentDocumentId(user.uid));
    const userRef = db.collection('users').doc(user.uid);
    const batch = db.batch();

    batch.set(consentRef, buildConsentPayload(user, timestamp));
    batch.update(userRef, {
      lgpdConsentVersion: CONSENT_VERSION,
      lgpdTermsVersion: TERMS_VERSION,
      lgpdPrivacyVersion: PRIVACY_VERSION,
      lgpdConsentAcceptedAt: timestamp,
      updatedAt: timestamp
    });
    await batch.commit();
    return CONSENT_VERSION;
  }

  function gateDestination(scope, profile) {
    if (!scope || !scope.location || isConsentPage(scope.location.pathname) || isPublicLegalPage(scope.location.pathname)) {
      return null;
    }
    if (!needsConsent(profile)) return null;
    const returnUrl = encodeURIComponent(currentReturnUrl(scope.location));
    return `${CONSENT_PAGE}?return=${returnUrl}`;
  }

  function reveal(scope) {
    if (scope && scope.document && scope.document.documentElement) {
      scope.document.documentElement.classList.remove('lgpd-pending');
    }
  }

  function bootstrapGate(scope) {
    if (!scope || !scope.document || !scope.location || scope.__musicIdeLgpdGateBootstrapped) return;
    scope.__musicIdeLgpdGateBootstrapped = true;

    if (isPublicLegalPage(scope.location.pathname) || isConsentPage(scope.location.pathname)) {
      reveal(scope);
      return;
    }

    scope.document.documentElement.classList.add('lgpd-pending');
    const style = scope.document.createElement('style');
    style.setAttribute('data-lgpd-gate-style', 'true');
    style.textContent = 'html.lgpd-pending body{visibility:hidden!important}';
    scope.document.head.appendChild(style);

    const evaluate = detail => {
      if (!detail || !detail.user) return;
      const destination = gateDestination(scope, detail.profile);
      if (destination) {
        scope.location.replace(destination);
        return;
      }
      reveal(scope);
    };

    if (scope.currentMusicIdeUser) {
      evaluate({ user: scope.currentMusicIdeUser, profile: scope.currentMusicIdeProfile });
      return;
    }

    scope.addEventListener('musicIdeAuthReady', event => evaluate(event.detail), { once: true });
  }

  return {
    CONSENT_PAGE,
    CONSENT_VERSION,
    PRIVACY_VERSION,
    PUBLIC_LEGAL_PAGES,
    TERMS_VERSION,
    bootstrapGate,
    buildConsentPayload,
    consentDocumentId,
    currentReturnUrl,
    gateDestination,
    isConsentPage,
    isPublicLegalPage,
    needsConsent,
    recordConsent,
    sanitizeReturnUrl
  };
});
