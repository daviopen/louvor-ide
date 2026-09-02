import { BaseRepository } from './base-repository.js';
import { COLLECTIONS } from '../constants/collections.js';

function auditTimestamp() {
  const fieldValue = typeof globalThis !== 'undefined'
    ? globalThis.firebase?.firestore?.FieldValue
    : null;
  if (fieldValue && typeof fieldValue.serverTimestamp === 'function') return fieldValue.serverTimestamp();
  return new Date();
}

function displayName(user) {
  return String(user?.name || user?.nome || user?.displayName || user?.fullName || user?.email || '').trim();
}

function buildCatalogAssignments(ministerKeyDocs = [], userDocs = []) {
  const usersById = new Map(userDocs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(user => user.active !== false)
    .map(user => [user.id, displayName(user)])
    .filter(([, name]) => Boolean(name)));
  const assignmentsBySong = new Map();

  ministerKeyDocs.forEach(doc => {
    const data = doc.data() || {};
    const name = usersById.get(data.userId);
    if (!data.songId || !name) return;
    const assignments = assignmentsBySong.get(data.songId) || [];
    assignments.push({ name, preferredKey: String(data.preferredKey || '').trim() || null });
    assignmentsBySong.set(data.songId, assignments);
  });

  assignmentsBySong.forEach((assignments, songId) => {
    const seen = new Set();
    assignmentsBySong.set(songId, assignments
      .filter(item => {
        const key = item.name.toLocaleLowerCase('pt-BR');
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })));
  });
  return assignmentsBySong;
}

/** Persistência canônica de músicas em `songs`. */
export class MusicRepository extends BaseRepository {
  constructor(database = null) {
    super(COLLECTIONS.SONGS, database);
  }

  async getDatabase() {
    await this.waitUntilReady();
    if (
      typeof window !== 'undefined'
      && this.db === window.db
      && window.firebase
      && typeof window.firebase.firestore === 'function'
    ) return window.firebase.firestore();
    return this.db;
  }

  async getCollection(name) {
    const database = await this.getDatabase();
    return database.collection(name);
  }

  async listCatalogMinisterAssignments() {
    const [ministerKeys, users] = await Promise.all([
      this.getCollection(COLLECTIONS.SONG_MINISTER_KEYS),
      this.getCollection(COLLECTIONS.USERS)
    ]);
    const [ministerKeysSnap, usersSnap] = await Promise.all([
      ministerKeys.get().catch(error => { throw new Error(`Não foi possível consultar tons dos ministros: ${error?.message || 'acesso negado'}`, { cause: error }); }),
      users.get().catch(error => { throw new Error(`Não foi possível consultar ministros: ${error?.message || 'acesso negado'}`, { cause: error }); })
    ]);
    return buildCatalogAssignments(ministerKeysSnap.docs, usersSnap.docs);
  }

  async subscribeAllOrderedByTitle(callback, onError = null) {
    const [songs, ministerKeys, users] = await Promise.all([
      this.getCollection(COLLECTIONS.SONGS),
      this.getCollection(COLLECTIONS.SONG_MINISTER_KEYS),
      this.getCollection(COLLECTIONS.USERS)
    ]);
    const state = { songs: null, ministerKeys: null, users: null };

    const titleOf = doc => {
      const data = typeof doc?.data === 'function' ? doc.data() : {};
      return String(data?.titulo || data?.title || data?.nome || data?.name || '');
    };
    const handleError = error => {
      const contextual = error?.message?.startsWith('Não foi possível consultar')
        ? error
        : new Error(`Não foi possível consultar catálogo de músicas: ${error?.message || 'acesso negado'}`, { cause: error });
      console.error('Erro ao acompanhar catálogo de músicas:', contextual);
      if (typeof onError === 'function') onError(contextual);
    };
    const emit = () => {
      if (!state.songs || !state.ministerKeys || !state.users) return;
      const assignmentsBySong = buildCatalogAssignments(state.ministerKeys.docs, state.users.docs);
      const docs = [...state.songs.docs]
        .sort((a, b) => titleOf(a).localeCompare(titleOf(b), 'pt-BR', { sensitivity: 'base' }))
        .map(doc => {
          const data = doc.data() || {};
          const assignments = assignmentsBySong.get(doc.id) || [];
          const ministros = assignments.map(item => item.name);
          const tomMinistro = {};
          assignments.forEach(item => { if (item.preferredKey) tomMinistro[item.name] = item.preferredKey; });
          const catalogData = {
            ...data,
            ministro: ministros.length ? ministros.join(', ') : null,
            ministros: ministros.length ? ministros : null,
            tomMinistro: Object.keys(tomMinistro).length ? tomMinistro : null
          };
          return { id: doc.id, data() { return catalogData; } };
        });
      callback({ forEach(handler) { docs.forEach(handler); } });
    };

    // Três listeners incrementais substituem o antigo padrão N+1 em que qualquer
    // alteração em songs disparava novas leituras integrais de users e songMinisterKeys.
    const unsubscribers = [
      songs.onSnapshot(snapshot => { state.songs = snapshot; emit(); }, handleError),
      ministerKeys.onSnapshot(snapshot => { state.ministerKeys = snapshot; emit(); }, handleError),
      users.onSnapshot(snapshot => { state.users = snapshot; emit(); }, handleError)
    ];
    return () => unsubscribers.forEach(unsubscribe => { if (typeof unsubscribe === 'function') unsubscribe(); });
  }

  async findById(id) {
    const canonical = await this.getCollection(COLLECTIONS.SONGS);
    const doc = await canonical.doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data(), _collection: COLLECTIONS.SONGS };
  }

  async create(data) {
    const canonical = await this.getCollection(COLLECTIONS.SONGS);
    return canonical.add(data);
  }

  async update(id, data) {
    const canonical = await this.getCollection(COLLECTIONS.SONGS);
    const doc = await canonical.doc(id).get();
    if (!doc.exists) throw new Error('Música não encontrada.');
    await canonical.doc(id).update(data);
    return { id };
  }

  async delete(id) {
    const canonical = await this.getCollection(COLLECTIONS.SONGS);
    const doc = await canonical.doc(id).get();
    if (!doc.exists) throw new Error('Música não encontrada.');
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

  async listUsersByIds(userIds = []) {
    const ids = [...new Set(userIds.filter(Boolean))];
    if (!ids.length) return [];
    const users = await this.getCollection(COLLECTIONS.USERS);
    const snapshots = await Promise.all(ids.map(id => users.doc(id).get()));
    return snapshots.filter(snapshot => snapshot.exists).map(snapshot => ({ id: snapshot.id, ...snapshot.data() }));
  }

  async getMinisterKeys(songId) {
    const collection = await this.getCollection(COLLECTIONS.SONG_MINISTER_KEYS);
    const snapshot = await collection.where('songId', '==', songId).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async replaceMinisterKeys(songId, selection) {
    const database = await this.getDatabase();
    const collection = database.collection(COLLECTIONS.SONG_MINISTER_KEYS);
    const existing = await collection.where('songId', '==', songId).get();
    const batch = database.batch();
    existing.docs.forEach(doc => batch.delete(doc.ref));
    selection.forEach(item => {
      const ref = collection.doc(`${songId}_${item.userId}`);
      batch.set(ref, { songId, userId: item.userId, preferredKey: item.preferredKey || null, updatedAt: new Date() }, { merge: true });
    });
    await batch.commit();
    return selection;
  }

  async addAuditLog(actorUserId, action, entityId, details = {}) {
    const database = await this.getDatabase();
    const createdAt = auditTimestamp();
    const ref = await database.collection(COLLECTIONS.AUDIT_LOGS).add({ actorUserId, action, entityType: 'song', entityId, details, createdAt });
    return { id: ref.id, actorUserId, action, entityType: 'song', entityId, details, createdAt };
  }

  async findAll() {
    const canonical = await this.getCollection(COLLECTIONS.SONGS);
    const snapshot = await canonical.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
}

const musicRepository = new MusicRepository();
export { buildCatalogAssignments };
export default musicRepository;
