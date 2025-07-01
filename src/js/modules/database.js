/**
 * Database Service - Sistema híbrido Firebase + localStorage
 */

class DatabaseService {
  constructor() {
    this.firebaseApp = null;
    this.firestoreDB = null;
    this.dbReady = false;
    this.collection = this.collection.bind(this);
  }

  // Configuração do Firebase
  getFirebaseConfig() {
    return {
      apiKey: "AIzaSyDilWbw9CETFiAi-hsrHhqK0ovwvpmK2V0",
      authDomain: "louvor-ide.firebaseapp.com",
      projectId: "louvor-ide",
      storageBucket: "louvor-ide.firebasestorage.app",
      messagingSenderId: "742542004330",
      appId: "1:742542004330:web:e9db92bb88ea06c5e77a13",
      measurementId: "G-S6YHEVQE0G"
    };
  }

  // Dados de exemplo
  getExampleData() {
    return [
      {
        id: 'exemplo1',
        titulo: 'Quão Grande é o Meu Deus',
        artista: 'Chris Tomlin',
        ministro: 'João Silva, Maria Santos',
        ministros: ['João Silva', 'Maria Santos'],
        tom: 'G',
        tomMinistro: { 'João Silva': 'G', 'Maria Santos': 'A' },
        bpm: 120,
        link: 'https://www.youtube.com/watch?v=cJtYTrUNFQw',
        cifra: '[G]Quão grande [D]é o meu [Em]Deus\n[C]Cantarei quão [G]grande é o meu [D]Deus\n[G]E todos [D]verão quão [Em]grande\nQuão [C]grande é o meu [G]Deus',
        timestamp: Date.now() - 86400000,
        criadoEm: new Date(Date.now() - 86400000)
      },
      {
        id: 'exemplo2',
        titulo: 'Reckless Love',
        artista: 'Cory Asbury',
        ministro: 'Maria Santos',
        ministros: ['Maria Santos'],
        tom: 'C',
        tomMinistro: { 'Maria Santos': 'C' },
        bpm: 140,
        link: 'https://www.youtube.com/watch?v=Sc6SSHuZvQE',
        cifra: '[C]Before I spoke a word, You were [Am]singing over me\n[F]You have been so, so [G]good to me\n[C]Before I took a breath, You [Am]breathed Your life in me\n[F]You have been so, so [G]kind to me',
        timestamp: Date.now() - 172800000,
        criadoEm: new Date(Date.now() - 172800000)
      },
      {
        id: 'exemplo3',
        titulo: 'Oceanos',
        artista: 'Hillsong United',
        ministro: 'Pedro Lima, Ana Costa',
        ministros: ['Pedro Lima', 'Ana Costa'],
        tom: 'D',
        tomMinistro: { 'Pedro Lima': 'D', 'Ana Costa': 'E' },
        bpm: 80,
        link: 'https://www.youtube.com/watch?v=dy9nwe9_xzw',
        cifra: '[D]Chama-me sobre as [A]águas\n[Bm]Onde os meus pés podem [G]falhar\n[D]E ali Te encontro no [A]mistério\n[Bm]Em oceanos [G]caminharei',
        timestamp: Date.now() - 259200000,
        criadoEm: new Date(Date.now() - 259200000)
      }
    ];
  }

  // Inicializar Firebase
  initializeFirebase() {
    if (typeof firebase === 'undefined') {
      console.warn("⚠️ Firebase SDK não carregado");
      return false;
    }
    
    try {
      this.firebaseApp = firebase.initializeApp(this.getFirebaseConfig());
      this.firestoreDB = firebase.firestore();
      console.log("🔥 Firebase inicializado com sucesso");
      return true;
    } catch (error) {
      console.warn("⚠️ Erro ao inicializar Firebase:", error);
      return false;
    }
  }

  // Inicializar localStorage
  initializeLocalStorage() {
    console.log("🔧 Inicializando localStorage...");
    
    if (!localStorage.getItem('musicas')) {
      console.log("🎵 Criando dados de exemplo no localStorage...");
      const exampleData = this.getExampleData();
      localStorage.setItem('musicas', JSON.stringify(exampleData));
      console.log(`✅ ${exampleData.length} músicas de exemplo salvas`);
    } else {
      console.log("📦 Dados já existem no localStorage");
      const existingData = JSON.parse(localStorage.getItem('musicas'));
      console.log(`📊 ${existingData.length} músicas encontradas no localStorage`);
    }
    
    // Verificar se as músicas têm o campo tomMinistro
    const musicas = JSON.parse(localStorage.getItem('musicas') || '[]');
    const musicasComTomMinistro = musicas.filter(m => m.tomMinistro);
    console.log(`🎤 ${musicasComTomMinistro.length} músicas com campo tomMinistro no localStorage`);
  }

  // Criar coleção híbrida
  collection(collectionName) {
    return {
      add: (data) => {
        return new Promise(async (resolve, reject) => {
          try {
            // Tentar Firebase primeiro se disponível
            if (this.firestoreDB) {
              try {
                const docRef = await this.firestoreDB.collection(collectionName).add(data);
                console.log(`🔥 Item adicionado ao Firebase: ${docRef.id}`);
                resolve({ id: docRef.id });
                return;
              } catch (firebaseError) {
                console.warn("⚠️ Erro no Firebase, usando localStorage:", firebaseError);
              }
            }
            
            // Fallback localStorage
            const items = JSON.parse(localStorage.getItem(collectionName) || '[]');
            const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
            const newItem = { ...data, id };
            items.push(newItem);
            localStorage.setItem(collectionName, JSON.stringify(items));
            console.log(`💾 Item adicionado ao localStorage: ${id}`);
            resolve({ id });
          } catch (error) {
            console.error(`❌ Erro ao adicionar item:`, error);
            reject(error);
          }
        });
      },

      doc: (id) => {
        return {
          get: () => {
            return new Promise(async (resolve, reject) => {
              try {
                // Tentar Firebase primeiro se disponível
                if (this.firestoreDB) {
                  try {
                    const doc = await this.firestoreDB.collection(collectionName).doc(id).get();
                    resolve({
                      exists: doc.exists,
                      data: () => doc.data(),
                      id: doc.id
                    });
                    return;
                  } catch (firebaseError) {
                    console.warn("⚠️ Erro no Firebase, usando localStorage:", firebaseError);
                  }
                }
                
                // Fallback localStorage
                const items = JSON.parse(localStorage.getItem(collectionName) || '[]');
                const item = items.find(i => i.id === id);
                resolve({
                  exists: !!item,
                  data: () => item,
                  id: id
                });
              } catch (error) {
                console.error(`❌ Erro ao buscar item:`, error);
                reject(error);
              }
            });
          },

          delete: () => {
            return new Promise(async (resolve, reject) => {
              try {
                // Tentar Firebase primeiro se disponível
                if (this.firestoreDB) {
                  try {
                    await this.firestoreDB.collection(collectionName).doc(id).delete();
                    console.log(`🔥 Item removido do Firebase`);
                    resolve();
                    return;
                  } catch (firebaseError) {
                    console.warn("⚠️ Erro no Firebase, usando localStorage:", firebaseError);
                  }
                }
                
                // Fallback localStorage
                const items = JSON.parse(localStorage.getItem(collectionName) || '[]');
                const filteredItems = items.filter(i => i.id !== id);
                localStorage.setItem(collectionName, JSON.stringify(filteredItems));
                console.log(`💾 Item removido do localStorage`);
                resolve();
              } catch (error) {
                console.error(`❌ Erro ao remover item:`, error);
                reject(error);
              }
            });
          },

          update: (updateData) => {
            return new Promise(async (resolve, reject) => {
              try {
                // Tentar Firebase primeiro se disponível
                if (this.firestoreDB) {
                  try {
                    await this.firestoreDB.collection(collectionName).doc(id).update(updateData);
                    console.log(`🔥 Item atualizado no Firebase: ${id}`);
                    resolve();
                    return;
                  } catch (firebaseError) {
                    console.warn("⚠️ Erro no Firebase, usando localStorage:", firebaseError);
                  }
                }
                
                // Fallback localStorage
                const items = JSON.parse(localStorage.getItem(collectionName) || '[]');
                const itemIndex = items.findIndex(i => i.id === id);
                
                if (itemIndex !== -1) {
                  // Atualizar item existente
                  items[itemIndex] = { ...items[itemIndex], ...updateData };
                  localStorage.setItem(collectionName, JSON.stringify(items));
                  console.log(`💾 Item atualizado no localStorage: ${id}`);
                  resolve();
                } else {
                  const error = new Error(`Item com ID ${id} não encontrado`);
                  console.error(`❌ ${error.message}`);
                  reject(error);
                }
              } catch (error) {
                console.error(`❌ Erro ao atualizar item:`, error);
                reject(error);
              }
            });
          }
        };
      },

      orderBy: (field) => {
        return {
          onSnapshot: (callback) => {
            console.log(`📊 Carregando coleção ${collectionName}...`);
            
            // Se Firebase disponível, tentar usar
            if (this.firestoreDB) {
              try {
                return this.firestoreDB.collection(collectionName)
                  .orderBy(field)
                  .onSnapshot(callback);
              } catch (error) {
                console.warn("⚠️ Erro no Firebase snapshot, usando localStorage:", error);
              }
            }
            
            // Fallback localStorage
            try {
              const items = JSON.parse(localStorage.getItem(collectionName) || '[]');
              
              // Se não há itens no localStorage, inicializar com dados de exemplo
              if (items.length === 0 && collectionName === 'musicas') {
                console.log("🔄 Inicializando localStorage com dados de exemplo");
                const exampleData = this.getExampleData();
                localStorage.setItem(collectionName, JSON.stringify(exampleData));
                const sortedItems = [...exampleData].sort((a, b) => {
                  if (field === 'titulo' && a.titulo && b.titulo) {
                    return a.titulo.localeCompare(b.titulo);
                  }
                  return 0;
                });
                
                // Simular snapshot do Firestore
                const snapshot = {
                  forEach: (callback) => {
                    sortedItems.forEach(item => {
                      callback({
                        id: item.id,
                        data: () => {
                          const { id, ...data } = item;
                          return data;
                        }
                      });
                    });
                  }
                };
                
                // Chamar callback de forma assíncrona
                setTimeout(() => {
                  try {
                    callback(snapshot);
                    console.log("✅ Callback localStorage (dados de exemplo) executado");
                  } catch (error) {
                    console.error("❌ Erro no callback:", error);
                  }
                }, 10);
                
                return;
              }
              
              // Ordenar itens existentes
              const sortedItems = items.sort((a, b) => {
                if (field === 'titulo' && a.titulo && b.titulo) {
                  return a.titulo.localeCompare(b.titulo);
                }
                return 0;
              });
              
              console.log(`💾 Retornando ${sortedItems.length} itens do localStorage`);
              
              // Simular snapshot do Firestore
              const snapshot = {
                forEach: (callback) => {
                  sortedItems.forEach(item => {
                    callback({
                      id: item.id,
                      data: () => {
                        const { id, ...data } = item;
                        return data;
                      }
                    });
                  });
                }
              };
              
              // Chamar callback de forma assíncrona para simular Firestore
              setTimeout(() => {
                try {
                  callback(snapshot);
                  console.log("✅ Callback localStorage executado");
                } catch (error) {
                  console.error("❌ Erro no callback:", error);
                }
              }, 10);
              
            } catch (localStorageError) {
              console.error("❌ Erro no localStorage:", localStorageError);
              // Em caso de erro total, retornar dados vazios
              setTimeout(() => {
                callback({ forEach: () => {} });
              }, 10);
            }
          }
        };
      },

      get: () => {
        return new Promise(async (resolve, reject) => {
          try {
            // Tentar Firebase primeiro se disponível
            if (this.firestoreDB) {
              try {
                const snapshot = await this.firestoreDB.collection(collectionName).get();
                const docs = [];
                snapshot.forEach(doc => {
                  docs.push({
                    id: doc.id,
                    data: () => doc.data(),
                    exists: true
                  });
                });
                resolve({ docs });
                return;
              } catch (firebaseError) {
                console.warn("⚠️ Erro no Firebase, usando localStorage:", firebaseError);
              }
            }
            
            // Fallback localStorage
            const items = JSON.parse(localStorage.getItem(collectionName) || '[]');
            const docs = items.map(item => ({
              id: item.id,
              data: () => {
                const { id, ...data } = item;
                return data;
              },
              exists: true
            }));
            
            resolve({ docs });
          } catch (error) {
            console.error(`❌ Erro ao buscar coleção:`, error);
            reject(error);
          }
        });
      },
    };
  }

  // Inicializar sistema
  initialize() {
    console.log("🚀 Inicializando sistema de dados...");
    
    // Tentar inicializar Firebase
    const firebaseSuccess = this.initializeFirebase();
    
    // Inicializar localStorage
    this.initializeLocalStorage();
    
    // Marcar como pronto
    this.dbReady = true;
    
    console.log(`✅ Sistema inicializado (Firebase: ${firebaseSuccess ? 'OK' : 'ERRO'}, localStorage: OK)`);
    
    // Disponibilizar globalmente
    window.db = this;
    
    // Disparar evento
    window.dispatchEvent(new CustomEvent('dbReady', { 
      detail: { 
        db: this,
        firebase: firebaseSuccess,
        localStorage: true
      }
    }));
    console.log("📡 Evento 'dbReady' disparado");
  }
}

// Exportar e inicializar
const dbService = new DatabaseService();

// Inicializar quando script carregar
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => dbService.initialize());
} else {
  dbService.initialize();
}

// Também inicializar no window.onload como backup
window.addEventListener('load', function() {
  if (!dbService.dbReady) {
    console.log("🔄 Backup: inicializando no window.onload");
    dbService.initialize();
  }
});

export default DatabaseService;
