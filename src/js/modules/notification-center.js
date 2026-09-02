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
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(ms));
  }

  function ensureStyles() {
    if (scope.document.getElementById('ide-notification-center-styles')) return;
    const style = scope.document.createElement('style');
    style.id = 'ide-notification-center-styles';
    style.textContent = `
      .ide-notification-center{position:relative;width:100%}.ide-notification-summary{width:100%;display:flex;align-items:center;gap:.65rem;justify-content:flex-start}.ide-notification-badge{margin-left:auto;min-width:1.35rem;height:1.35rem;padding:0 .35rem;border-radius:999px;display:inline-grid;place-items:center;font-size:.72rem;font-weight:800;background:var(--primary,#2f6d54);color:#fff}.ide-notification-badge[hidden]{display:none}.ide-notification-panel{margin-top:.45rem;border:1px solid var(--border,#d8e1dc);border-radius:12px;background:var(--surface,#fff);overflow:hidden}.ide-notification-head{display:flex;align-items:center;justify-content:space-between;gap:.5rem;padding:.75rem}.ide-notification-list{display:grid;max-height:330px;overflow:auto}.ide-notification-item{display:grid;gap:.2rem;text-decoration:none;color:inherit;padding:.75rem;border-top:1px solid var(--border,#e1e7e3)}.ide-notification-item:hover{background:var(--surface-secondary,#f5f8f6)}.ide-notification-item.is-unread{font-weight:700}.ide-notification-item small{font-weight:400;color:var(--text-secondary,#68746e)}.ide-notification-empty{padding:1rem;color:var(--text-secondary,#68746e);text-align:center}.ide-notification-mark-all{border:0;background:transparent;color:var(--primary,#2f6d54);font:inherit;font-size:.78rem;font-weight:700;cursor:pointer}`;
    scope.document.head.appendChild(style);
  }

  function root() { return scope.document.getElementById(ROOT_ID); }

  function render(items) {
    currentItems = items;
    const node = root();
    if (!node) return;
    const list = node.querySelector('.ide-notification-list');
    const badge = node.querySelector('.ide-notification-badge');
    const unread = items.filter(item => item.read !== true).length;
    badge.textContent = unread > 99 ? '99+' : String(unread);
    badge.hidden = unread === 0;
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
    await scope.firebase.firestore().collection('notifications').doc(item.id).update({ read: true, readAt: now, updatedAt: now });
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
      batch.update(db.collection('notifications').doc(item.id), { read: true, readAt: now, updatedAt: now });
    });
    await batch.commit();
    unread.forEach(item => { item.read = true; });
    render([...currentItems]);
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
        <i class="fa-solid fa-bell" aria-hidden="true"></i><span>Notificações</span><span class="ide-notification-badge" hidden>0</span>
      </summary>
      <div class="ide-notification-panel">
        <div class="ide-notification-head"><strong>Central de Notificações</strong><button type="button" class="ide-notification-mark-all">Marcar todas como lidas</button></div>
        <div class="ide-notification-list"><div class="ide-notification-empty">Carregando…</div></div>
      </div>`;
    details.addEventListener('toggle', () => { if (details.open) load(); });
    details.querySelector('.ide-notification-mark-all').addEventListener('click', () => markAllRead().catch(error => console.warn('Não foi possível marcar notificações como lidas.', error)));
    account.prepend(details);
    load();
    return true;
  }

  function boot() {
    scope.firebase.auth().onAuthStateChanged(user => {
      if (!user) return;
      mount();
      load();
    });
    let attempts = 0;
    const timer = scope.setInterval(() => {
      attempts += 1;
      if (mount() || attempts >= 40) scope.clearInterval(timer);
    }, 250);
  }

  scope.MusicIdeNotificationCenter = Object.freeze({ load, markAllRead });
  if (scope.document.readyState === 'loading') scope.document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})(typeof window !== 'undefined' ? window : null);
