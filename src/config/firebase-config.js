// Configuração do Firebase - Usando variáveis de ambiente
const firebaseConfig = {
  apiKey: window.ENV?.VITE_FIREBASE_API_KEY || '',
  authDomain: window.ENV?.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: window.ENV?.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: window.ENV?.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: window.ENV?.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: window.ENV?.VITE_FIREBASE_APP_ID || '',
  measurementId: window.ENV?.VITE_FIREBASE_MEASUREMENT_ID || ''
};

// Validar se as variáveis essenciais estão configuradas
const requiredEnvVars = ['apiKey', 'authDomain', 'projectId'];
const missingVars = requiredEnvVars.filter(key => !firebaseConfig[key]);

if (missingVars.length > 0) {
  console.warn(`⚠️ Variáveis de ambiente Firebase faltando: ${missingVars.join(', ')}`);
  console.warn('📋 Verifique se o arquivo .env está configurado corretamente');
  console.warn('🔧 Execute: npm run build para processar as variáveis de ambiente');
}

// Estado de inicialização
let firebaseApp = null;
let firestoreDB = null;
let dbReady = false;

console.log("🔧 Iniciando firebase-config.js v2.0");

// Dados de exemplo
const exemploMusicas = [
  {
    id: 'exemplo1',
    titulo: 'Quão Grande é o Meu Deus',
    artista: 'Chris Tomlin',
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

// Tentar inicializar Firebase
function initializeFirebase() {
  if (typeof firebase === 'undefined') {
    console.warn("⚠️ Firebase SDK não carregado");
    return false;
  }
  
  try {
    firebaseApp = firebase.initializeApp(firebaseConfig);
    firestoreDB = firebase.firestore();
    console.log("🔥 Firebase inicializado com sucesso");
    return true;
  } catch (error) {
    console.warn("⚠️ Erro ao inicializar Firebase:", error);
    return false;
  }
}

// Inicializar dados de exemplo no localStorage se não existirem
function initializeLocalStorage() {
  // Limpar dados antigos primeiro para garantir consistência
  const currentData = localStorage.getItem('musicas');
  if (currentData) {
    try {
      const parsedData = JSON.parse(currentData);
      // Verificar se os dados têm a estrutura esperada
      if (!Array.isArray(parsedData) || parsedData.some(item => !item.id || typeof item.ministros === 'undefined')) {
        console.log("🔄 Dados antigos detectados, atualizando...");
        localStorage.removeItem('musicas');
      }
    } catch (error) {
      console.log("🔄 Dados corrompidos detectados, limpando...");
      localStorage.removeItem('musicas');
    }
  }
  
  if (!localStorage.getItem('musicas')) {
    console.log("🎵 Criando dados de exemplo no localStorage...");
    localStorage.setItem('musicas', JSON.stringify(exemploMusicas));
    console.log(`✅ ${exemploMusicas.length} músicas de exemplo salvas`);
  } else {
    console.log("📦 Dados já existem no localStorage");
  }
}

// Criar objeto DB híbrido
function createHybridDB() {
  return {
    collection: function(collectionName) {
      return {
        add: function(data) {
          return new Promise(async (resolve, reject) => {
            try {
              // Tentar Firebase primeiro se disponível
              if (firestoreDB) {
                try {
                  const docRef = await firestoreDB.collection(collectionName).add(data);
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
        
        doc: function(id) {
          return {
            get: function() {
              return new Promise(async (resolve, reject) => {
                try {
                  // Tentar Firebase primeiro se disponível
                  if (firestoreDB) {
                    try {
                      const doc = await firestoreDB.collection(collectionName).doc(id).get();
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
            
            delete: function() {
              return new Promise(async (resolve, reject) => {
                try {
                  // Tentar Firebase primeiro se disponível
                  if (firestoreDB) {
                    try {
                      await firestoreDB.collection(collectionName).doc(id).delete();
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
            
            update: function(updateData) {
              return new Promise(async (resolve, reject) => {
                try {
                  // Tentar Firebase primeiro se disponível
                  if (firestoreDB) {
                    try {
                      await firestoreDB.collection(collectionName).doc(id).update(updateData);
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
        
        orderBy: function(field) {
          return {
            onSnapshot: function(callback) {
              console.log(`📊 Carregando coleção ${collectionName}...`);
              
              // Se Firebase disponível, tentar usar
              if (firestoreDB) {
                try {
                  return firestoreDB.collection(collectionName)
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
                  localStorage.setItem(collectionName, JSON.stringify(exemploMusicas));
                  const sortedItems = [...exemploMusicas].sort((a, b) => {
                    if (field === 'titulo' && a.titulo && b.titulo) {
                      return a.titulo.localeCompare(b.titulo);
                    }
                    return 0;
                  });
                  
                  // Simular snapshot do Firestore
                  const snapshot = {
                    forEach: function(callback) {
                      try {
                        sortedItems.forEach((item, index) => {
                          if (!item || !item.id) {
                            console.warn(`⚠️ Item inválido no índice ${index}:`, item);
                            return;
                          }
                          
                          try {
                            callback({
                              id: item.id,
                              data: () => {
                                const { id, ...data } = item;
                                return data;
                              }
                            });
                          } catch (callbackError) {
                            console.error(`❌ Erro no callback para item ${item.id}:`, callbackError);
                          }
                        });
                      } catch (forEachError) {
                        console.error("❌ Erro no forEach do snapshot:", forEachError);
                      }
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
                  forEach: function(callback) {
                    try {
                      sortedItems.forEach((item, index) => {
                        if (!item || !item.id) {
                          console.warn(`⚠️ Item inválido no índice ${index}:`, item);
                          return;
                        }
                        
                        try {
                          callback({
                            id: item.id,
                            data: () => {
                              const { id, ...data } = item;
                              return data;
                            }
                          });
                        } catch (callbackError) {
                          console.error(`❌ Erro no callback para item ${item.id}:`, callbackError);
                        }
                      });
                    } catch (forEachError) {
                      console.error("❌ Erro no forEach do snapshot:", forEachError);
                    }
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
        }
      };
    }
  };
}

// Função principal de inicialização
function initializeSystem() {
  console.log("🚀 Inicializando sistema de dados...");
  
  // Tentar inicializar Firebase
  const firebaseSuccess = initializeFirebase();
  
  // Inicializar localStorage
  initializeLocalStorage();
  
  // Criar e disponibilizar DB híbrido
  window.db = createHybridDB();
  dbReady = true;
  
  console.log(`✅ Sistema inicializado (Firebase: ${firebaseSuccess ? 'OK' : 'ERRO'}, localStorage: OK)`);
  
  // Disparar evento
  window.dispatchEvent(new CustomEvent('dbReady', { 
    detail: { 
      db: window.db,
      firebase: firebaseSuccess,
      localStorage: true
    }
  }));
  console.log("📡 Evento 'dbReady' disparado");
}

// Inicializar quando script carregar
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeSystem);
} else {
  initializeSystem();
}

// Também inicializar no window.onload como backup
window.addEventListener('load', function() {
  if (!dbReady) {
    console.log("🔄 Backup: inicializando no window.onload");
    initializeSystem();
  }
});
