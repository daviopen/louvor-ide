(function initNotificationPush(scope) {
  'use strict';
  if (!scope || !scope.document || !scope.navigator) return;

  const BUTTON_ID = 'ide-enable-notifications';
  const STATUS = Object.freeze({
    ENABLED: 'ENABLED',
    PERMISSION_REQUIRED: 'PERMISSION_REQUIRED',
    DENIED: 'DENIED',
    UNSUPPORTED: 'UNSUPPORTED',
    IOS_INSTALL_REQUIRED: 'IOS_INSTALL_REQUIRED',
    NO_USER: 'NO_USER',
    FAILED: 'FAILED'
  });
  let registrationPromise = null;

  function observabilityWarn(eventName, message, error) {
    if (scope.MusicIdeObservability?.warn) {
      scope.MusicIdeObservability.warn(eventName, message, { page: scope.location?.pathname || '' }, { error });
      return;
    }
    console.warn(message, error || '');
  }

  function isIosDevice() {
    const userAgent = String(scope.navigator.userAgent || '');
    const platform = String(scope.navigator.platform || '');
    return /iPad|iPhone|iPod/i.test(userAgent)
      || (platform === 'MacIntel' && Number(scope.navigator.maxTouchPoints || 0) > 1);
  }

  function isStandalone() {
    return scope.navigator.standalone === true
      || Boolean(scope.matchMedia?.('(display-mode: standalone)').matches);
  }

  function requiresInstalledIosPwa() {
    return isIosDevice() && !isStandalone();
  }

  function supported() {
    return Boolean(
      scope.isSecureContext
      && 'serviceWorker' in scope.navigator
      && 'PushManager' in scope
      && 'Notification' in scope
      && scope.firebase?.auth
      && scope.firebase?.firestore
    );
  }

  function currentStatus() {
    if (requiresInstalledIosPwa()) return STATUS.IOS_INSTALL_REQUIRED;
    if (!supported()) return STATUS.UNSUPPORTED;
    if (scope.Notification.permission === 'granted') return STATUS.ENABLED;
    if (scope.Notification.permission === 'denied') return STATUS.DENIED;
    return STATUS.PERMISSION_REQUIRED;
  }

  function base64UrlToUint8Array(value) {
    const padding = '='.repeat((4 - (value.length % 4)) % 4);
    const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = scope.atob(base64);
    return Uint8Array.from([...raw].map(character => character.charCodeAt(0)));
  }

  async function publicVapidKey() {
    const snapshot = await scope.firebase.firestore().collection('notificationConfig').doc('webPush').get();
    if (!snapshot.exists || !snapshot.data()?.publicKey) throw new Error('Web Push ainda não foi inicializado.');
    return String(snapshot.data().publicKey);
  }

  async function saveSubscription(user, subscription) {
    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) throw new Error('Assinatura Web Push incompleta.');
    const id = `${user.uid}__${await endpointHash(json.endpoint)}`;
    const now = scope.firebase.firestore.FieldValue.serverTimestamp();
    await scope.firebase.firestore().collection('pushSubscriptions').doc(id).set({
      userId: user.uid,
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      enabled: true,
      createdAt: now,
      updatedAt: now
    }, { merge: true });
    return id;
  }

  async function endpointHash(endpoint) {
    const bytes = new TextEncoder().encode(endpoint);
    const hash = await scope.crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(hash)).map(byte => byte.toString(16).padStart(2, '0')).join('');
  }

  async function registerCurrentDevice(options = {}) {
    const status = currentStatus();
    if (status === STATUS.IOS_INSTALL_REQUIRED) return { status };
    if (status === STATUS.UNSUPPORTED) return { status };

    const user = scope.firebase.auth().currentUser;
    if (!user) return { status: STATUS.NO_USER };
    if (scope.Notification.permission === 'denied') return { status: STATUS.DENIED };

    if (scope.Notification.permission !== 'granted') {
      if (!options.requestPermission) return { status: STATUS.PERMISSION_REQUIRED };
      const permission = await scope.Notification.requestPermission();
      if (permission !== 'granted') {
        return { status: permission === 'denied' ? STATUS.DENIED : STATUS.PERMISSION_REQUIRED };
      }
    }

    const registration = await scope.navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      const key = await publicVapidKey();
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToUint8Array(key)
      });
    }
    await saveSubscription(user, subscription);
    return { status: STATUS.ENABLED };
  }

  function publishStatus(status) {
    if (!scope.CustomEvent) return;
    scope.document.dispatchEvent(new scope.CustomEvent('ide:notification-push-status', { detail: { status } }));
  }

  function syncButton(status) {
    const button = scope.document.getElementById(BUTTON_ID);
    if (button) {
      const label = button.querySelector('span');
      const labels = {
        [STATUS.ENABLED]: 'Ativadas',
        [STATUS.IOS_INSTALL_REQUIRED]: 'Como instalar',
        [STATUS.FAILED]: 'Tentar novamente'
      };
      const nextLabel = labels[status] || 'Ativar';
      const nextDisabled = status === STATUS.ENABLED;
      const nextPressed = String(nextDisabled);
      if (label && label.textContent !== nextLabel) label.textContent = nextLabel;
      if (button.disabled !== nextDisabled) button.disabled = nextDisabled;
      if (button.getAttribute('aria-pressed') !== nextPressed) button.setAttribute('aria-pressed', nextPressed);
      if (button.dataset.notificationStatus !== status) button.dataset.notificationStatus = status;
    }
    publishStatus(status);
  }

  async function enableFromUserGesture() {
    const preflightStatus = currentStatus();
    if (preflightStatus === STATUS.IOS_INSTALL_REQUIRED || preflightStatus === STATUS.UNSUPPORTED) {
      syncButton(preflightStatus);
      return { status: preflightStatus };
    }

    const button = scope.document.getElementById(BUTTON_ID);
    if (button) button.disabled = true;
    try {
      const result = await registerCurrentDevice({ requestPermission: true });
      syncButton(result.status);
      return result;
    } catch (error) {
      if (button) button.disabled = false;
      observabilityWarn('notifications.pushRegistrationFailed', 'Não foi possível ativar as notificações.', error);
      syncButton(STATUS.FAILED);
      return { status: STATUS.FAILED, error };
    }
  }

  function syncExistingControl() {
    syncButton(currentStatus());
  }

  async function bootstrapForUser() {
    const status = currentStatus();
    syncButton(status);
    if (status !== STATUS.ENABLED) return { status };
    if (registrationPromise) return registrationPromise;
    registrationPromise = registerCurrentDevice({ requestPermission: false })
      .then(result => {
        syncButton(result.status);
        return result;
      })
      .catch(error => {
        observabilityWarn('notifications.pushRefreshFailed', 'Não foi possível atualizar o registro de notificações.', error);
        syncButton(STATUS.FAILED);
        return { status: STATUS.FAILED };
      })
      .finally(() => { registrationPromise = null; });
    return registrationPromise;
  }

  function boot() {
    syncExistingControl();
    if (!supported() && !requiresInstalledIosPwa()) return;

    if (scope.firebase?.auth) {
      scope.firebase.auth().onAuthStateChanged(user => {
        if (!user) return;
        syncExistingControl();
        bootstrapForUser();
      });
    }

    if (typeof scope.MutationObserver === 'function' && scope.document.body && !scope.document.getElementById(BUTTON_ID)) {
      const observer = new scope.MutationObserver(() => {
        if (!scope.document.getElementById(BUTTON_ID)) return;
        // A sincronização altera o próprio botão. Desconectar primeiro impede
        // que essas mutações reativem o callback em um ciclo sem fim.
        observer.disconnect();
        syncExistingControl();
      });
      observer.observe(scope.document.body, { childList: true, subtree: true });
      scope.setTimeout(() => observer.disconnect(), 15000);
    }
  }

  scope.MusicIdeNotificationPush = Object.freeze({
    STATUS,
    supported,
    currentStatus,
    isIosDevice,
    isStandalone,
    requiresInstalledIosPwa,
    registerCurrentDevice,
    enable: enableFromUserGesture,
    bootstrapForUser,
    syncExistingControl
  });
  if (scope.document.readyState === 'loading') scope.document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})(typeof window !== 'undefined' ? window : null);
