(function initNotificationPush(scope) {
  'use strict';
  if (!scope || !scope.document || !scope.navigator) return;

  const SDK_URL = 'https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js';
  const BUTTON_ID = 'ide-enable-notifications';
  let registrationPromise = null;
  let sdkPromise = null;

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
      && 'Notification' in scope
      && scope.crypto?.subtle
      && scope.firebase?.auth
      && scope.firebase?.firestore
    );
  }

  function vapidKey() {
    return String(scope.ENV?.VITE_FIREBASE_VAPID_KEY || '').trim();
  }

  function loadMessagingSdk() {
    if (scope.firebase?.messaging) return Promise.resolve();
    if (sdkPromise) return sdkPromise;
    sdkPromise = new Promise((resolve, reject) => {
      const existing = scope.document.querySelector(`script[src="${SDK_URL}"]`);
      if (existing) {
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }
      const script = scope.document.createElement('script');
      script.src = SDK_URL;
      script.async = true;
      script.addEventListener('load', resolve, { once: true });
      script.addEventListener('error', () => reject(new Error('Não foi possível carregar Firebase Messaging.')), { once: true });
      scope.document.head.appendChild(script);
    });
    return sdkPromise;
  }

  async function digest(value) {
    const bytes = new TextEncoder().encode(value);
    const hash = await scope.crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(hash)).map(byte => byte.toString(16).padStart(2, '0')).join('');
  }

  async function saveToken(user, token) {
    const tokenHash = await digest(token);
    const id = `${user.uid}__${tokenHash}`;
    const serverTimestamp = scope.firebase.firestore.FieldValue.serverTimestamp();
    await scope.firebase.firestore().collection('pushSubscriptions').doc(id).set({
      userId: user.uid,
      token,
      enabled: true,
      createdAt: serverTimestamp,
      updatedAt: serverTimestamp
    }, { merge: true });
    return id;
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

    await loadMessagingSdk();
    const registration = await scope.navigator.serviceWorker.ready;
    const messaging = scope.firebase.messaging();
    const tokenOptions = { serviceWorkerRegistration: registration };
    const key = vapidKey();
    if (key) tokenOptions.vapidKey = key;
    const token = await messaging.getToken(tokenOptions);
    if (!token) throw new Error('FCM não retornou token para este dispositivo.');
    await saveToken(user, token);
    return { status: 'ENABLED' };
  }

  function buttonLabel(status) {
    if (status === 'ENABLED') return 'Notificações ativadas';
    if (status === 'DENIED') return 'Notificações bloqueadas';
    return 'Ativar notificações';
  }

  function syncButton(status) {
    const button = scope.document.getElementById(BUTTON_ID);
    if (!button) return;
    const label = button.querySelector('span');
    if (label) label.textContent = buttonLabel(status);
    button.disabled = status === 'ENABLED' || status === 'DENIED';
    button.setAttribute('aria-pressed', String(status === 'ENABLED'));
    button.dataset.notificationStatus = status;
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
      throw error;
    }
  }

  function mountButton() {
    if (!supported() || scope.document.getElementById(BUTTON_ID)) return;
    const account = scope.document.getElementById('ide-sidebar-account');
    if (!account) return;
    const button = scope.document.createElement('button');
    button.id = BUTTON_ID;
    button.type = 'button';
    button.className = 'ide-button ide-button--ghost ide-button--md';
    button.style.width = '100%';
    button.setAttribute('aria-pressed', 'false');
    button.innerHTML = '<i class="fa-solid fa-bell" aria-hidden="true"></i><span>Ativar notificações</span>';
    button.addEventListener('click', () => enableFromUserGesture().catch(() => {}));
    account.prepend(button);
    syncButton(scope.Notification.permission === 'granted' ? 'ENABLED' : scope.Notification.permission === 'denied' ? 'DENIED' : 'PERMISSION_REQUIRED');
  }

  async function bootstrapForUser() {
    mountButton();
    if (!supported() || scope.Notification.permission !== 'granted') return;
    if (registrationPromise) return registrationPromise;
    registrationPromise = registerCurrentDevice({ requestPermission: false })
      .then(result => {
        syncButton(result.status);
        return result;
      })
      .catch(error => {
        observabilityWarn('notifications.pushRefreshFailed', 'Não foi possível atualizar o registro de notificações.', error);
        return { status: 'FAILED' };
      })
      .finally(() => { registrationPromise = null; });
    return registrationPromise;
  }

  function boot() {
    if (!supported()) return;
    scope.firebase.auth().onAuthStateChanged(user => {
      if (!user) return;
      mountButton();
      bootstrapForUser();
    });
    const observer = new MutationObserver(() => mountButton());
    if (scope.document.body) observer.observe(scope.document.body, { childList: true, subtree: true });
    scope.setTimeout(() => observer.disconnect(), 15000);
  }

  scope.MusicIdeNotificationPush = Object.freeze({ supported, registerCurrentDevice, enable: enableFromUserGesture, bootstrapForUser });
  if (scope.document.readyState === 'loading') scope.document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})(typeof window !== 'undefined' ? window : null);
