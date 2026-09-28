(function expose(scope) {
  'use strict';
  class NotificationRepository {
    constructor(db, currentUserId) { this.db = db; this.currentUserId = currentUserId; }
    assertOwner(userId) {
      if (!userId || this.currentUserId() !== userId) throw new Error('Sessão inválida.');
    }
    async list(userId, { pageSize = 30, cursor = null } = {}) {
      this.assertOwner(userId);
      // Composite index: notifications(userId ASC, createdAt DESC).
      let query = this.db.collection('notifications').where('userId', '==', userId)
        .orderBy('createdAt', 'desc').limit(Math.min(30, Math.max(1, pageSize)));
      if (cursor) query = query.startAfter(cursor);
      const snapshot = await query.get();
      this.assertOwner(userId);
      return { items: snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })), cursor: snapshot.docs.at(-1) || null };
    }
    async markRead(userId, items) {
      this.assertOwner(userId);
      if (items.some(item => item.userId !== userId)) throw new Error('Notificação de outro usuário.');
      if (!items.length) return;
      // Chunk atomically in the service: at most the currently displayed page is mutated.
      const batch = this.db.batch();
      items.forEach(item => batch.update(this.db.collection('notifications').doc(item.id), { read: true }));
      await batch.commit();
    }
  }
  const api = { NotificationRepository };
  if (typeof module !== 'undefined') module.exports = api;
  if (scope) scope.MusicIdeNotificationRepository = api;
})(typeof window !== 'undefined' ? window : null);
