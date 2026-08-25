import { BaseRepository } from './base-repository.js';
import { COLLECTIONS } from '../constants/collections.js';

/**
 * Camada de persistência de músicas.
 * Nenhuma tela ou service deve acessar Firestore/localStorage diretamente.
 */
export class MusicRepository extends BaseRepository {
  constructor(database = null) {
    super(COLLECTIONS.MUSICS, database);
  }

  async subscribeAllOrderedByTitle(callback) {
    const collection = await this.collection();
    return collection.orderBy('titulo').onSnapshot(callback);
  }

  async findById(id) {
    const collection = await this.collection();
    const doc = await collection.doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  }

  async create(data) {
    const collection = await this.collection();
    return collection.add(data);
  }

  async update(id, data) {
    const collection = await this.collection();
    await collection.doc(id).update(data);
    return { id };
  }

  async delete(id) {
    const collection = await this.collection();
    await collection.doc(id).delete();
    return true;
  }

  async findAll() {
    const collection = await this.collection();
    const snapshot = await collection.get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }
}

const musicRepository = new MusicRepository();
export default musicRepository;
