/**
 * Contrato base para repositories do IDE Music.
 * Repositories são a única camada autorizada a conhecer a API concreta de persistência.
 */
export class BaseRepository {
  /**
   * @param {string} collectionName
   * @param {object|null} database
   */
  constructor(collectionName, database = null) {
    if (!collectionName) throw new Error('collectionName é obrigatório');
    this.collectionName = collectionName;
    this.db = database;
    this.isReady = Boolean(database);
    this._onDbReady = this._onDbReady.bind(this);

    if (!this.isReady && typeof window !== 'undefined') {
      if (window.db) {
        this.setDatabase(window.db);
      } else {
        window.addEventListener('dbReady', this._onDbReady);
      }
    }
  }

  _onDbReady(event) {
    this.setDatabase(event.detail.db);
  }

  setDatabase(database) {
    this.db = database;
    this.isReady = Boolean(database);
  }

  async waitUntilReady() {
    if (this.isReady && this.db) return;

    await new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 100;
      const check = () => {
        if (this.isReady && this.db) return resolve();
        attempts += 1;
        if (attempts >= maxAttempts) {
          return reject(new Error(`Repository ${this.collectionName} não conseguiu conectar ao banco.`));
        }
        setTimeout(check, 100);
      };
      check();
    });
  }

  async collection() {
    await this.waitUntilReady();
    return this.db.collection(this.collectionName);
  }
}

export default BaseRepository;
