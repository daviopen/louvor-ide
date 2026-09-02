(function initNotificationPush(scope) {
  'use strict';
  if (!scope || !scope.document || !scope.navigator) return;

  const BUTTON_ID = 'ide-enable-notifications';
  let registrationPromise = null;

  function observabilityWarn(eventName, message, error) {
    if (scope.MusicIdeObservability?.warn) {
      scope.MusicIdeObservability.warn(eventName, message, { page: scope.location?.pathname || '' }, { error });
      return;
    }
    console.warn(message, error || '');
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
    if (!supported()) return { status: 'UNSUPPORTED' };
    const user = scope.firebase.auth().currentUser;
    if (!user) return { status: 'NO_USER' };
    if (scope.Notification.permission === 'denied') return { status: 'DENIED' };

    if (scope.Notification.permission !== 'granted') {
      if (!options.requestPermission) return { status: 'PERMISSION_REQUIRED' };
      const permission = await scope.Notification.requestPermission();
      if (permission !== 'granted') return { status: permission === 'denied' ? 'DENIED' : 'PERMISSION_REQUIRED' };
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
    return { status: 'ENABLED' };
  }

  function publishStatus(status) {
    scope.document.dispatchEvent(new CustomEvent('ide:notification-push-status', { detail: { status } }));
  }

  function syncButton(status) {
    const button = scope.document.getElementById(BUTTON_ID);
    if (button) {
      const label = button.querySelector('span');
      if (label) label.textContent = status === 'PERMISSION_REQUIRED' ? 'Ativar' : status === 'ENABLED' ? 'Ativadas' : 'Ativar';
      button.disabled = status === 'ENABLED';
      button.setAttribute('aria-pressed', String(status === 'ENABLED'));
      button.dataset.notificationStatus = status;
    }
    publishStatus(status);
  }

  async function enableFromUserGesture() {
    const button = scope.document.getElementById(BUTTON_ID);
    if (button) button.disabled = true;
    try {
      const result = await registerCurrentDevice({ requestPermission: true });
      syncButton(result.status);
      return result;
    } catch (error) {
      if (button) button.disabled = false;
      observabilityWarn('notifications.pushRegistrationFailed', 'Não foi possível ativar as notificações.', error);
      publishStatus('FAILED');
      throw error;
    }
  }

  function syncExistingControl() {
    if (!supported()) {
      publishStatus('UNSUPPORTED');
      return;
    }
    const status = scope.Notification.permission === 'granted'
      ? 'ENABLED'
      : scope.Notification.permission === 'denied'
        ? 'DENIED'
        : 'PERMISSION_REQUIRED';
    syncButton(status);
  }

  async function bootstrapForUser() {
    syncExistingControl();
    if (!supported() || scope.Notification.permission !== 'granted') return;
    if (registrationPromise) return registrationPromise;
    registrationPromise = registerCurrentDevice({ requestPermission: false })
      .then(result => {
        syncButton(result.status);
        return result;
      })
      .catch(error => {
        observabilityWarn('notifications.pushRefreshFailed', 'Não foi possível atualizar o registro de notificações.', error);
        publishStatus('FAILED');
        return { status: 'FAILED' };
      })
      .finally(() => { registrationPromise = null; });
    return registrationPromise;
  }

  function boot() {
    if (!supported()) {
      publishStatus('UNSUPPORTED');
      return;
    }

    scope.firebase.auth().onAuthStateChanged(user => {
      if (!user) return;
      syncExistingControl();
      bootstrapForUser();
    });

    const observer = new MutationObserver(() => {
      if (scope.document.getElementById(BUTTON_ID)) syncExistingControl();
    });
    if (scope.document.body) observer.observe(scope.document.body, { childList: true, subtree: true });
    scope.setTimeout(() => observer.disconnect(), 15000);
  }

  scope.MusicIdeNotificationPush = Object.freeze({
    supported,
    registerCurrentDevice,
    enable: enableFromUserGesture,
    bootstrapForUser,
    syncExistingControl
  });
  if (scope.document.readyState === 'loading') scope.document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})(typeof window !== 'undefined' ? window : null);
