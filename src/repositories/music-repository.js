import { BaseRepository } from './base-repository.js';
import { COLLECTIONS } from '../constants/collections.js';

/**
 * Persistência canônica de músicas.
 * `songs` recebe novas gravações; `musicas` permanece somente leitura durante
 * a migração para preservar o repertório histórico publicado.
 */
export class MusicRepository extends BaseRepository {
  constructor(database = null) {
    super(COLLECTIONS.SONGS, database);
    this.legacyCollectionName = COLLECTIONS.MUSICS;
  }

  async getCollection(name) {
    await this.waitUntilReady();
    return this.db.collection(name);
  }

  async subscribeAllOrderedByTitle(callback) {
    const canonical = await this.getCollection(COLLECTIONS.SONGS);
    const legacy = await this.getCollection(this.legacyCollectionName);
    let canonicalDocs = [];
    let legacyDocs = [];

    const emit = () => {
      const byId = new Map();
      legacyDocs.forEach(doc => byId.set(doc.id, doc));
      canonicalDocs.forEach(doc => byId.set(doc.id, doc));
      const docs = [...byId.values()].sort((a, b) => {
        const titleA = String(a.data()?.titulo || a.data()?.name || '');
        const titleB = String(b.data()?.titulo || b.data()?.name || '');
        return titleA.localeCompare(titleB, 'pt-BR', { sensitivity: 'base' });
      });
      callback({ forEach(handler) { docs.forEach(handler); } });
    };

    const unsubscribeLegacy = legacy.orderBy('titulo').onSnapshot(snapshot => {
      legacyDocs = snapshot.docs;
      emit();
    });
    const unsubscribeCanonical = canonical.orderBy('titulo').onSnapshot(snapshot => {
      canonicalDocs = snapshot.docs;
      emit();
    });

    return () => {
      unsubscribeLegacy?.();
      unsubscribeCanonical?.();
    };
  }

  async findById(id) {
    const canonical = await this.getCollection(COLLECTIONS.SONGS);
    const canonicalDoc = await canonical.doc(id).get();
    if (canonicalDoc.exists) return { id: canonicalDoc.id, ...canonicalDoc.data(), _collection: COLLECTIONS.SONGS };

    const legacy = await this.getCollection(this.legacyCollectionName);
    const legacyDoc = await legacy.doc(id).get();
    if (!legacyDoc.exists) return null;
    return { id: legacyDoc.id, ...legacyDoc.data(), _collection: this.legacyCollectionName };
  }

  async create(data) {
    const canonical = await this.getCollection(COLLECTIONS.SONGS);
    return canonical.add(data);
  }

  async update(id, data) {
    const canonical = await this.getCollection(COLLECTIONS.SONGS);
    const canonicalDoc = await canonical.doc(id).get();
    if (canonicalDoc.exists) {
      await canonical.doc(id).update(data);
      return { id };
    }

    const legacy = await this.getCollection(this.legacyCollectionName);
    const legacyDoc = await legacy.doc(id).get();
    if (!legacyDoc.exists) throw new Error('Música não encontrada.');
    await canonical.doc(id).set({ ...legacyDoc.data(), ...data });
    return { id, migratedFrom: this.legacyCollectionName };
  }

  async delete(id) {
    const canonical = await this.getCollection(COLLECTIONS.SONGS);
    const doc = await canonical.doc(id).get();
    if (!doc.exists) throw new Error('A exclusão de registros legados exige migração prévia.');
    await canonical.doc(id).delete();
    return true;
  }

  async listEligibleMinisters() {
    const [functions, users, links] = await Promise.all([
      this.getCollection(COLLECTIONS.MINISTRY_FUNCTIONS),
      this.getCollection(COLLECTIONS.USERS),
      this.getCollection(COLLECTIONS.USER_FUNCTIONS)
    ]);
    const [functionsSnap, usersSnap, linksSnap] = await Promise.all([functions.get(), users.get(), links.get()]);
    const normalize = value => String(value || '').trim().toLocaleLowerCase('pt-BR');
    const ministerFunctionIds = new Set(functionsSnap.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(fn => fn.active !== false && [fn.slug, fn.name, fn.nome].some(value => normalize(value) === 'ministro'))
      .map(fn => fn.id));
    const eligibleUserIds = new Set(linksSnap.docs
      .map(doc => doc.data())
      .filter(link => link.active !== false && ministerFunctionIds.has(link.functionId))
      .map(link => link.userId));
    return usersSnap.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(user => user.active !== false && eligibleUserIds.has(user.id))
      .sort((a, b) => String(a.name || a.email || '').localeCompare(String(b.name || b.email || ''), 'pt-BR'));
  }

  async getMinisterKeys(songId) {
    const collection = await this.getCollection(COLLECTIONS.SONG_MINISTER_KEYS);
    const snapshot = await collection.where('songId', '==', songId).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async replaceMinisterKeys(songId, selection) {
    await this.waitUntilReady();
    const collection = this.db.collection(COLLECTIONS.SONG_MINISTER_KEYS);
    const existing = await collection.where('songId', '==', songId).get();
    const batch = this.db.batch();
    existing.docs.forEach(doc => batch.delete(doc.ref));
    selection.forEach(item => {
      const ref = collection.doc(`${songId}_${item.userId}`);
      batch.set(ref, {
        songId,
        userId: item.userId,
        preferredKey: item.preferredKey || null,
        updatedAt: new Date()
      }, { merge: true });
    });
    await batch.commit();
    return selection;
  }

  async addAuditLog(actorUserId, action, entityId, details = {}) {
    await this.waitUntilReady();
    const createdAt = new Date();
    const ref = await this.db.collection(COLLECTIONS.AUDIT_LOGS).add({
      actorUserId,
      action,
      entityType: 'song',
      entityId,
      details,
      createdAt
    });
    return { id: ref.id, actorUserId, action, entityType: 'song', entityId, details, createdAt };
  }

  async findAll() {
    const [canonical, legacy] = await Promise.all([
      this.getCollection(COLLECTIONS.SONGS),
      this.getCollection(this.legacyCollectionName)
    ]);
    const [canonicalSnapshot, legacySnapshot] = await Promise.all([canonical.get(), legacy.get()]);
    const byId = new Map();
    legacySnapshot.docs.forEach(doc => byId.set(doc.id, { id: doc.id, ...doc.data() }));
    canonicalSnapshot.docs.forEach(doc => byId.set(doc.id, { id: doc.id, ...doc.data() }));
    return [...byId.values()];
  }
}

const musicRepository = new MusicRepository();
export default musicRepository;
