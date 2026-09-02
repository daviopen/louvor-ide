(function initNotificationCenter(scope) {
  'use strict';
  if (!scope?.document || !scope.firebase?.auth || !scope.firebase?.firestore) return;

  const ROOT_ID = 'ide-notification-center';
  const MAX_ITEMS = 30;
  let currentItems = [];
  let loading = false;

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

  function ensureStyles() {
    if (scope.document.getElementById('ide-notification-center-styles')) return;
    const style = scope.document.createElement('style');
    style.id = 'ide-notification-center-styles';
    style.textContent = `
      .ide-notification-center{position:relative;width:100%}
      .ide-notification-summary{width:100%;display:flex;align-items:center;gap:.65rem;justify-content:flex-start;list-style:none;cursor:pointer}
      .ide-notification-summary::-webkit-details-marker{display:none}
      .ide-notification-summary::marker{display:none;content:''}
      .ide-notification-badge{margin-left:auto;min-width:1.35rem;height:1.35rem;padding:0 .35rem;border-radius:999px;display:inline-grid;place-items:center;font-size:.72rem;font-weight:800;background:var(--primary,#b7ff35);color:#111}
      .ide-notification-badge[hidden]{display:none}
      .ide-notification-panel{position:fixed;z-index:10050;width:min(360px,calc(100vw - 24px));max-height:min(430px,calc(100vh - 24px));display:flex;flex-direction:column;border:1px solid rgba(255,255,255,.16);border-radius:16px;background:var(--sidebar-bg,var(--surface-elevated,#101513));color:var(--sidebar-text,#f5f7f6);box-shadow:0 18px 48px rgba(0,0,0,.42);overflow:hidden}
      .ide-notification-head{display:flex;align-items:center;justify-content:space-between;gap:.75rem;padding:.85rem 1rem;border-bottom:1px solid rgba(255,255,255,.1)}
      .ide-notification-head strong{font-size:.92rem}
      .ide-notification-list{display:grid;overflow:auto;overscroll-behavior:contain}
      .ide-notification-item{display:grid;gap:.22rem;text-decoration:none;color:inherit;padding:.8rem 1rem;border-top:1px solid rgba(255,255,255,.08)}
      .ide-notification-item:first-child{border-top:0}
      .ide-notification-item:hover,.ide-notification-item:focus-visible{background:rgba(255,255,255,.07)}
      .ide-notification-item.is-unread{font-weight:750}
      .ide-notification-item small{font-weight:400;color:rgba(245,247,246,.68)}
      .ide-notification-empty{padding:1.15rem 1rem;color:rgba(245,247,246,.68);text-align:center;font-size:.9rem}
      .ide-notification-mark-all{border:0;background:transparent;color:var(--primary,#b7ff35);font:inherit;font-size:.76rem;font-weight:750;cursor:pointer;padding:.3rem;border-radius:8px}
      .ide-notification-mark-all[hidden]{display:none}
      .ide-notification-push{display:flex;align-items:center;justify-content:space-between;gap:.75rem;padding:.7rem 1rem;border-bottom:1px solid rgba(255,255,255,.1);font-size:.8rem;color:rgba(245,247,246,.78)}
      .ide-notification-push[hidden]{display:none}
      .ide-notification-push button{flex:0 0 auto}
      .ide-notification-backdrop{position:fixed;inset:0;z-index:10040;background:transparent}
      @media (max-width:600px){.ide-notification-panel{width:calc(100vw - 24px);max-height:min(70vh,430px)}}`;
    scope.document.head.appendChild(style);
  }

  function root() {
    return scope.document.getElementById(ROOT_ID);
  }

  function panel() {
    return root()?.querySelector('.ide-notification-panel') || null;
  }

  function updateMarkAllVisibility(items) {
    const button = root()?.querySelector('.ide-notification-mark-all');
    if (!button) return;
    button.hidden = !items.some(item => item.read !== true);
  }

  function render(items) {
    currentItems = items;
    const node = root();
    if (!node) return;
    const list = node.querySelector('.ide-notification-list');
    const badge = node.querySelector('.ide-notification-badge');
    const unread = items.filter(item => item.read !== true).length;
    badge.textContent = unread > 99 ? '99+' : String(unread);
    badge.hidden = unread === 0;
    updateMarkAllVisibility(items);
    list.textContent = '';

    if (!items.length) {
      const empty = scope.document.createElement('div');
      empty.className = 'ide-notification-empty';
      empty.textContent = 'Nenhuma notificação por aqui.';
      list.appendChild(empty);
      return;
    }

    items.forEach(item => {
      const link = scope.document.createElement('a');
      link.className = `ide-notification-item${item.read === true ? '' : ' is-unread'}`;
      link.href = item.url || '#';
      const title = scope.document.createElement('span');
      title.textContent = item.title || 'IDE Music';
      const body = scope.document.createElement('small');
      body.textContent = item.body || '';
      const when = scope.document.createElement('small');
      when.textContent = formatWhen(item.createdAt);
      link.append(title, body, when);
      link.addEventListener('click', event => {
        if (item.read === true) return;
        event.preventDefault();
        markRead(item).finally(() => { scope.location.href = link.href; });
      });
      list.appendChild(link);
    });
  }

  async function load() {
    if (loading) return;
    const user = scope.firebase.auth().currentUser;
    if (!user) return;
    loading = true;
    try {
      const snapshot = await scope.firebase.firestore().collection('notifications')
        .where('userId', '==', user.uid)
        .limit(MAX_ITEMS)
        .get();
      const items = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((left, right) => toMillis(right.createdAt) - toMillis(left.createdAt));
      render(items);
    } catch (error) {
      console.warn('Não foi possível carregar a Central de Notificações.', error);
    } finally {
      loading = false;
    }
  }

  async function markRead(item) {
    if (!item?.id || item.read === true) return;
    const now = scope.firebase.firestore.FieldValue.serverTimestamp();
    await scope.firebase.firestore().collection('notifications').doc(item.id).update({
      read: true,
      readAt: now,
      updatedAt: now
    });
    item.read = true;
    render([...currentItems]);
  }

  async function markAllRead() {
    const unread = currentItems.filter(item => item.read !== true);
    if (!unread.length) return;
    const db = scope.firebase.firestore();
    const batch = db.batch();
    unread.forEach(item => {
      const now = scope.firebase.firestore.FieldValue.serverTimestamp();
      batch.update(db.collection('notifications').doc(item.id), {
        read: true,
        readAt: now,
        updatedAt: now
      });
    });
    await batch.commit();
    unread.forEach(item => { item.read = true; });
    render([...currentItems]);
  }

  function syncPushControl() {
    const row = root()?.querySelector('.ide-notification-push');
    const text = row?.querySelector('[data-notification-push-text]');
    const button = scope.document.getElementById('ide-enable-notifications');
    if (!row || !text || !button) return;

    const api = scope.MusicIdeNotificationPush;
    if (!api?.supported?.()) {
      row.hidden = false;
      text.textContent = 'Notificações push indisponíveis neste dispositivo.';
      button.hidden = true;
      return;
    }

    const permission = scope.Notification?.permission || 'default';
    if (permission === 'granted') {
      row.hidden = true;
      return;
    }

    row.hidden = false;
    if (permission === 'denied') {
      text.textContent = 'Notificações estão bloqueadas no navegador.';
      button.hidden = true;
      return;
    }

    text.textContent = 'Receba avisos mesmo com o IDE Music fechado.';
    button.hidden = false;
    button.disabled = false;
    button.querySelector('span').textContent = 'Ativar';
  }

  function positionPanel() {
    const node = root();
    const popup = panel();
    const summary = node?.querySelector('.ide-notification-summary');
    if (!node?.open || !popup || !summary) return;

    const margin = 12;
    const gap = 8;
    const summaryRect = summary.getBoundingClientRect();
    const popupRect = popup.getBoundingClientRect();
    const maxLeft = Math.max(margin, scope.innerWidth - popupRect.width - margin);
    const left = Math.min(Math.max(summaryRect.left, margin), maxLeft);
    const spaceAbove = summaryRect.top - margin;
    const spaceBelow = scope.innerHeight - summaryRect.bottom - margin;
    const top = spaceAbove >= popupRect.height + gap || spaceAbove >= spaceBelow
      ? Math.max(margin, summaryRect.top - popupRect.height - gap)
      : Math.min(scope.innerHeight - popupRect.height - margin, summaryRect.bottom + gap);

    popup.style.left = `${Math.round(left)}px`;
    popup.style.top = `${Math.round(Math.max(margin, top))}px`;
  }

  function removeBackdrop() {
    scope.document.getElementById('ide-notification-backdrop')?.remove();
  }

  function closePanel() {
    const node = root();
    if (node?.open) node.open = false;
  }

  function addBackdrop() {
    removeBackdrop();
    const backdrop = scope.document.createElement('button');
    backdrop.id = 'ide-notification-backdrop';
    backdrop.className = 'ide-notification-backdrop';
    backdrop.type = 'button';
    backdrop.setAttribute('aria-label', 'Fechar notificações');
    backdrop.addEventListener('click', closePanel);
    scope.document.body.appendChild(backdrop);
  }

  function mount() {
    if (root()) return true;
    const account = scope.document.getElementById('ide-sidebar-account');
    if (!account) return false;
    ensureStyles();

    const details = scope.document.createElement('details');
    details.id = ROOT_ID;
    details.className = 'ide-notification-center';
    details.innerHTML = `
      <summary class="ide-button ide-button--ghost ide-button--md ide-notification-summary">
        <i class="fa-solid fa-bell" aria-hidden="true"></i>
        <span>Notificações</span>
        <span class="ide-notification-badge" hidden>0</span>
      </summary>
      <div class="ide-notification-panel">
        <div class="ide-notification-head">
          <strong>Notificações</strong>
          <button type="button" class="ide-notification-mark-all" hidden>Marcar todas como lidas</button>
        </div>
        <div class="ide-notification-push" hidden>
          <span data-notification-push-text></span>
          <button id="ide-enable-notifications" type="button" class="ide-button ide-button--primary ide-button--sm"><i class="fa-solid fa-bell" aria-hidden="true"></i><span>Ativar</span></button>
        </div>
        <div class="ide-notification-list"><div class="ide-notification-empty">Carregando…</div></div>
      </div>`;

    details.addEventListener('toggle', () => {
      if (details.open) {
        syncPushControl();
        addBackdrop();
        scope.requestAnimationFrame(positionPanel);
        load();
      } else {
        removeBackdrop();
      }
    });

    details.querySelector('.ide-notification-mark-all').addEventListener('click', () => {
      markAllRead().catch(error => console.warn('Não foi possível marcar notificações como lidas.', error));
    });

    details.querySelector('#ide-enable-notifications').addEventListener('click', () => {
      const api = scope.MusicIdeNotificationPush;
      if (!api?.enable) return;
      api.enable()
        .then(() => syncPushControl())
        .catch(() => syncPushControl());
    });

    account.prepend(details);
    syncPushControl();
    load();
    return true;
  }

  function boot() {
    scope.firebase.auth().onAuthStateChanged(user => {
      if (!user) return;
      mount();
      syncPushControl();
      load();
    });

    scope.addEventListener('resize', positionPanel, { passive: true });
    scope.addEventListener('scroll', positionPanel, { passive: true, capture: true });
    scope.document.addEventListener('keydown', event => {
      if (event.key === 'Escape') closePanel();
    });
    scope.document.addEventListener('ide:notification-push-status', syncPushControl);

    let attempts = 0;
    const timer = scope.setInterval(() => {
      attempts += 1;
      if (mount() || attempts >= 40) scope.clearInterval(timer);
    }, 250);
  }

  scope.MusicIdeNotificationCenter = Object.freeze({ load, markAllRead, close: closePanel, syncPushControl });
  if (scope.document.readyState === 'loading') scope.document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})(typeof window !== 'undefined' ? window : null);
