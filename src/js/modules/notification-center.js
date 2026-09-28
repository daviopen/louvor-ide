(function initNotificationCenter(scope) {
  'use strict';
  if (!scope?.document) return;
  const page = scope.location.pathname.split('/').pop() || 'index.html';
  if (!['index.html', 'mural.html', 'profile.html'].includes(page)) return;
  const ROOT_ID = 'ide-notification-feed';
  let currentItems = [];
  let service = null;
  let loading = false;
  let generation = 0;
  const root = () => scope.document.getElementById(ROOT_ID);
  const status = message => {
    const node = root()?.querySelector('[data-notification-status]');
    if (node) node.textContent = message;
  };
  function toMillis(value) {
    if (!value) return 0;
    if (typeof value.toMillis === 'function') return value.toMillis();
    if (typeof value.toDate === 'function') return value.toDate().getTime();
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
  }

  function formatWhen(value) {
    const ms = toMillis(value);
    if (!ms) return '';
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(ms));
  }

  async function closeDisplayedPushNotifications(items) {
    if (!scope.navigator?.serviceWorker) return;
    const tags = new Set((Array.isArray(items) ? items : [items])
      .filter(Boolean)
      .map(item => item.outboxId ? `ide-music-${item.outboxId}` : null)
      .filter(Boolean));
    if (!tags.size) return;

    try {
      const registration = await scope.navigator.serviceWorker.getRegistration();
      if (!registration?.getNotifications) return;
      const notifications = await registration.getNotifications();
      notifications.forEach(notification => {
        if (tags.has(String(notification.tag || ''))) notification.close();
      });
    } catch (error) {
      console.warn('Não foi possível fechar o alerta push já exibido.', error);
    }
  }


  function render(items) {
    currentItems = items;
    const list = root()?.querySelector('.ide-notification-list');
    if (!list) return;
    list.replaceChildren();
    if (!items.length) {
      const empty = scope.document.createElement('p');
      empty.textContent = 'Você ainda não recebeu notificações.';
      list.append(empty);
    }
    items.forEach(item => {
      const link = scope.document.createElement('a');
      link.className = 'ide-notification-item';
      link.href = scope.MusicIdeNotificationService.safeNotificationUrl(item.url, scope.location.href);
      const title = scope.document.createElement('strong');
      title.textContent = item.title || 'IDE Music';
      const body = scope.document.createElement('span');
      body.textContent = item.body || '';
      const when = scope.document.createElement('small');
      when.textContent = `${formatWhen(item.createdAt)} · ${item.read ? 'Lida' : 'Não lida'}`;
      link.append(title, body, when);
      link.addEventListener('click', async event => {
        if (item.read || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        const active = service;
        try {
          await active.markRead(item);
          if (active !== service) return;
          await closeDisplayedPushNotifications(item);
          scope.location.href = link.href;
        } catch (_) {
          status('Não foi possível registrar a leitura. Tente novamente.');
        }
      });
      list.append(link);
    });
    const more = root().querySelector('[data-notification-more]');
    if (more) more.hidden = !service?.hasMore;
    const mark = root().querySelector('[data-notification-mark-all]');
    if (mark) mark.hidden = !items.some(item => !item.read);
  }

  async function load(append = false) {
    if (loading || !service || page === 'profile.html') return;
    const active = service;
    const run = generation;
    loading = true;
    status('Carregando notificações…');
    const more = root()?.querySelector('[data-notification-more]');
    if (more) more.disabled = true;
    try {
      const items = await active.load({ append, pageSize: page === 'index.html' ? 5 : 30 });
      if (run !== generation) return;
      render(items);
      status('');
    } catch (_) {
      if (run === generation) status('Não foi possível carregar as notificações. Use Atualizar para tentar novamente.');
    } finally {
      if (run === generation) {
        loading = false;
        if (more) more.disabled = false;
      }
    }
  }

  async function markAllRead() {
    if (!service) return;
    const active = service;
    const button = root()?.querySelector('[data-notification-mark-all]');
    if (button) button.disabled = true;
    const unread = currentItems.filter(item => !item.read);
    try {
      await active.markAllRead(unread);
      if (active !== service) return;
      await closeDisplayedPushNotifications(unread);
      render(active.items);
      status('Notificações exibidas marcadas como lidas.');
    } catch (_) {
      if (active === service) {
        render(active.items);
        status('Não foi possível marcar todas como lidas. Tente novamente.');
      }
    } finally {
      if (button) button.disabled = false;
    }
  }
  function resolvePushStatus(input, api) {
    if (typeof input === 'string') return input;
    if (input?.detail?.status) return input.detail.status;
    if (typeof api?.currentStatus === 'function') return api.currentStatus();
    if (!api?.supported?.()) return 'UNSUPPORTED';
    if (scope.Notification?.permission === 'granted') return 'ENABLED';
    if (scope.Notification?.permission === 'denied') return 'DENIED';
    return 'PERMISSION_REQUIRED';
  }

  function syncPushControl(statusInput) {
    const row = root()?.querySelector('.ide-notification-push');
    const text = row?.querySelector('[data-notification-push-text]');
    const button = scope.document.getElementById('ide-enable-notifications');
    if (!row || !text || !button) return;

    const api = scope.MusicIdeNotificationPush;
    const status = resolvePushStatus(statusInput, api);
    const label = button.querySelector('span');
    button.dataset.notificationStatus = status;
    button.dataset.notificationAction = 'enable';
    button.hidden = false;
    button.disabled = false;
    row.hidden = false;

    if (status === 'ENABLED') {
      text.textContent = 'Notificações push ativadas neste dispositivo.';
      button.hidden = true;
      return;
    }

    if (status === 'IOS_INSTALL_REQUIRED') {
      text.textContent = 'No iPhone/iPad, instale o IDE Music na Tela de Início e abra pelo ícone para ativar notificações.';
      button.dataset.notificationAction = 'install';
      if (label) label.textContent = 'Como instalar';
      return;
    }

    if (status === 'UNSUPPORTED') {
      text.textContent = 'Notificações push não estão disponíveis neste navegador ou dispositivo.';
      button.hidden = true;
      return;
    }

    if (status === 'DENIED') {
      text.textContent = 'Notificações estão bloqueadas nas configurações do navegador.';
      button.hidden = true;
      return;
    }

    if (status === 'FAILED') {
      text.textContent = 'Não foi possível ativar as notificações. Verifique a conexão e tente novamente.';
      if (label) label.textContent = 'Tentar novamente';
      return;
    }

    text.textContent = 'Receba avisos mesmo com o IDE Music fechado.';
    if (label) label.textContent = 'Ativar';
  }


  function boot() {
    if (!root() || !scope.firebase?.auth) return;
    root().querySelector('[data-notification-more]')?.addEventListener('click', () => load(true));
    root().querySelector('[data-notification-refresh]')?.addEventListener('click', () => load());
    root().querySelector('[data-notification-mark-all]')?.addEventListener('click', markAllRead);
    root().querySelector('#ide-enable-notifications')?.addEventListener('click', event => {
      const button = event.currentTarget;
      if (button.dataset.notificationAction === 'install') {
        scope.location.href = 'help.html#install-title';
        return;
      }
      const api = scope.MusicIdeNotificationPush;
      if (!api?.enable) return syncPushControl('UNSUPPORTED');
      button.disabled = true;
      api.enable().then(result => syncPushControl(result?.status)).catch(() => syncPushControl('FAILED'));
    });
    scope.document.addEventListener('ide:notification-push-status', syncPushControl);
    syncPushControl();
    scope.firebase.auth().onAuthStateChanged(user => {
      generation += 1;
      loading = false;
      service = null;
      render([]);
      if (!user) { status('Entre na sua conta para ver as notificações.'); return; }
      if (page === 'profile.html') return;
      const Repository = scope.MusicIdeNotificationRepository.NotificationRepository;
      service = new scope.MusicIdeNotificationService.NotificationService(new Repository(scope.firebase.firestore(), () => scope.firebase.auth().currentUser?.uid), user.uid);
      load();
    });
  }
  scope.MusicIdeNotificationCenter = Object.freeze({ load, markAllRead, syncPushControl });
  if (scope.document.readyState === 'loading') scope.document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})(typeof window !== 'undefined' ? window : null);
