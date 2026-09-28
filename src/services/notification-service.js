(function expose(scope) {
  'use strict';
  function safeNotificationUrl(value, base) {
    try {
      const url = new URL(value || 'mural.html', base);
      if (url.origin === new URL(base).origin && ['http:', 'https:'].includes(url.protocol)) return url.href;
    } catch (_) { /* Invalid destinations stay in the application. */ }
    return new URL('mural.html', base).href;
  }
  class NotificationService {
    constructor(repository, userId) {
      this.repository = repository; this.userId = userId;
      this.items = []; this.cursor = null; this.hasMore = false;
      this.readIds = new Set();
    }
    async load({ append = false, pageSize = 30 } = {}) {
      const result = await this.repository.list(this.userId, { pageSize, cursor: append ? this.cursor : null });
      const incoming = result.items.filter(item => item.userId === this.userId)
        .map(item => ({ ...item, read: item.read === true || this.readIds.has(item.id) }));
      this.items = [...new Map([...(append ? this.items : []), ...incoming].map(item => [item.id, item])).values()];
      this.cursor = result.cursor;
      this.hasMore = result.items.length === pageSize;
      return this.items;
    }
    async markRead(item) { return this.markAllRead([item]); }
    async markAllRead(items) {
      const unread = items.filter(item => !item.read);
      if (unread.some(item => item.userId !== this.userId)) throw new Error('Acesso negado.');
      // Each successful chunk stays confirmed even if a later chunk fails.
      for (let offset = 0; offset < unread.length; offset += 30) {
        const chunk = unread.slice(offset, offset + 30);
        await this.repository.markRead(this.userId, chunk);
        chunk.forEach(item => { this.readIds.add(item.id); item.read = true; });
        this.items.forEach(item => { if (this.readIds.has(item.id)) item.read = true; });
      }
    }
  }
  const api = { NotificationService, safeNotificationUrl };
  if (typeof module !== 'undefined') module.exports = api;
  if (scope) scope.MusicIdeNotificationService = api;
})(typeof window !== 'undefined' ? window : null);
