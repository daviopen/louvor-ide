/**
 * Setlists List - Versão Simplificada
 */

console.log('🚀 Carregando setlists-simple.js - Versão Atualizada');

class SetlistsManager {
  constructor() {
    this.setlists = [];
    this.db = null;
    this.init();
  }

  async init() {
    console.log('🚀 Iniciando SetlistsManager...');
    await this.initFirebase();
    await this.loadSetlists();
  }

  async initFirebase() {
    try {
      if (typeof firebase !== 'undefined') {
        if (firebase.apps.length === 0) {
          const firebaseConfig = {
            apiKey: "AIzaSyDilWbw9CETFiAi-hsrHhqK0ovwvpmK2V0",
            authDomain: "louvor-ide.firebaseapp.com",
            projectId: "louvor-ide",
            storageBucket: "louvor-ide.firebasestorage.app",
            messagingSenderId: "742542004330",
            appId: "1:742542004330:web:e9db92bb88ea06c5e77a13",
            measurementId: "G-S6YHEVQE0G"
          };
          firebase.initializeApp(firebaseConfig);
        }
        this.db = firebase.firestore();
        console.log('🔥 Firebase inicializado com sucesso');
      } else {
        console.warn('⚠️ Firebase não está disponível, usando localStorage');
      }
    } catch (error) {
      console.error('❌ Erro ao inicializar Firebase:', error);
    }
  }

  async loadSetlists() {
    try {
      console.log('📋 Carregando setlists...');
      
      if (this.db) {
        // Carregar do Firestore
        const snapshot = await this.db.collection('setlists').orderBy('criadoEm', 'desc').get();
        this.setlists = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          criadoEm: doc.data().criadoEm?.toDate?.() || doc.data().criadoEm
        }));
        console.log(`🔥 ${this.setlists.length} setlists carregadas do Firestore`);
      } else {
        // Fallback para localStorage
        const stored = localStorage.getItem('setlists');
        this.setlists = stored ? JSON.parse(stored) : [];
        console.log(`💾 ${this.setlists.length} setlists carregadas do localStorage`);
      }

      // Migrar dados antigos se necessário
      this.setlists = this.setlists.map(setlist => {
        if (setlist.musicas) {
          setlist.musicas = setlist.musicas.map(song => {
            const tomOriginal = song.tomOriginal || song.tom || 'C';
            const tomFinal = song.tomFinal || song.tom || tomOriginal;
            
            return {
              ...song,
              tomOriginal,
              tomFinal,
              tomEspecificoMinistro: song.tomEspecificoMinistro || false
            };
          });
        }
        return setlist;
      });
      
      // Ordenar por data
      this.setlists.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
      
      this.renderSetlists();
      console.log(`📋 ${this.setlists.length} setlists processadas:`, this.setlists);
    } catch (error) {
      console.error('❌ Erro ao carregar setlists:', error);
      this.showError();
    }
  }

  renderSetlists() {
    const loading = document.getElementById('loading');
    const list = document.getElementById('setlists-list');
    const empty = document.getElementById('empty-state');

    loading.style.display = 'none';

    if (this.setlists.length === 0) {
      empty.style.display = 'block';
      list.style.display = 'none';
    } else {
      empty.style.display = 'none';
      list.style.display = 'block';
      list.innerHTML = this.setlists.map(setlist => this.createSetlistCard(setlist)).join('');
    }
  }

  createSetlistCard(setlist) {
    const date = this.formatDate(setlist.data);
    const created = this.formatDate(setlist.criadoEm);
    
    return `
      <div class="setlist-card" onclick="setlistsManager.viewSetlist('${setlist.id}')">
        <div class="setlist-header">
          <div class="setlist-info">
            <h3>${setlist.nome}</h3>
            <div class="setlist-meta">
              <span><i class="fas fa-calendar"></i> ${date}</span>
              <span><i class="fas fa-music"></i> ${setlist.totalMusicas} música${setlist.totalMusicas !== 1 ? 's' : ''}</span>
              <span><i class="fas fa-clock"></i> Criado em ${created}</span>
            </div>
            ${setlist.descricao ? `<div class="setlist-description">${setlist.descricao}</div>` : ''}
          </div>
          
          <div class="setlist-actions" onclick="event.stopPropagation()">
            <button class="action-btn view" onclick="setlistsManager.viewSetlist('${setlist.id}')" title="Visualizar">
              <i class="fas fa-eye"></i>
            </button>
            <button class="action-btn cifras" onclick="setlistsManager.viewCifras('${setlist.id}')" title="Ver Cifras">
              <i class="fas fa-music"></i>
            </button>
            <button class="action-btn edit" onclick="setlistsManager.editSetlist('${setlist.id}')" title="Editar">
              <i class="fas fa-edit"></i>
            </button>
            <button class="action-btn delete" onclick="setlistsManager.deleteSetlist('${setlist.id}')" title="Excluir">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>

        <div class="minister-info">
          <span><i class="fas fa-users"></i> <strong>Ministros:</strong> ${this.getMinistersSummary(setlist)}</span>
        </div>

        ${setlist.musicas && setlist.musicas.length > 0 ? `
          <div class="setlist-songs">
            <div class="songs-header">
              <i class="fas fa-list"></i> Músicas da Setlist:
            </div>
            <div class="songs-list">
              ${setlist.musicas.slice(0, 6).map(song => `
                <div class="song-item">
                  <div class="song-title">${song.ordem}. ${song.titulo}</div>
                  <div class="song-details">
                    <span>${song.artista}</span>
                    <span>
                      <span class="song-key">${song.tomFinal}</span>
                      ${song.ministro ? 
                        `<span class="minister-indicator" style="color: #4CAF50;">● ${song.ministro}</span>` : 
                        `<span class="minister-indicator" style="color: #f44336;">● Sem ministro</span>`}
                    </span>
                  </div>
                </div>
              `).join('')}
              ${setlist.musicas.length > 6 ? `
                <div class="song-item" style="opacity: 0.7; font-style: italic;">
                  <div class="song-title">+ ${setlist.musicas.length - 6} música(s) a mais...</div>
                </div>
              ` : ''}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  formatDate(date) {
    if (!date) return 'Data não informada';
    try {
      return new Date(date).toLocaleDateString('pt-BR');
    } catch {
      return 'Data inválida';
    }
  }

  viewSetlist(id) {
    const setlist = this.setlists.find(s => s.id === id);
    if (!setlist) return;

    this.showModal(setlist);
  }

  showModal(setlist) {
    console.log('🔍 Abrindo modal com setlist:', setlist);
    
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.8); display: flex; justify-content: center;
      align-items: center; z-index: 1000; padding: 20px;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      background: white; border-radius: 20px; padding: 30px;
      max-width: 800px; max-height: 90vh; overflow-y: auto; width: 100%;
    `;

    content.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
        <h2 style="color: #333; margin: 0;">${setlist.nome}</h2>
        <button onclick="this.closest('div').remove()" 
                style="background: #f44336; color: white; border: none; border-radius: 50%; width: 35px; height: 35px; cursor: pointer; font-size: 18px;">×</button>
      </div>

      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 15px; padding: 20px; margin-bottom: 25px; color: white;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
          <div>
            <h4 style="margin: 0 0 5px 0; opacity: 0.9;">📅 Data do Culto</h4>
            <p style="margin: 0; font-size: 1.1rem; font-weight: 600;">${this.formatDate(setlist.data)}</p>
          </div>
          <div>
            <h4 style="margin: 0 0 5px 0; opacity: 0.9;">🎤 Ministros</h4>
            <p style="margin: 0; font-size: 1.1rem; font-weight: 600;">${this.getMinistersSummary(setlist)}</p>
          </div>
          <div>
            <h4 style="margin: 0 0 5px 0; opacity: 0.9;">🎵 Total de Músicas</h4>
            <p style="margin: 0; font-size: 1.1rem; font-weight: 600;">${setlist.musicas?.length || 0} música${(setlist.musicas?.length || 0) !== 1 ? 's' : ''}</p>
          </div>
        </div>
        ${setlist.descricao ? `
          <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.3);">
            <h4 style="margin: 0 0 5px 0; opacity: 0.9;">📝 Descrição</h4>
            <p style="margin: 0; font-style: italic;">${setlist.descricao}</p>
          </div>
        ` : ''}
      </div>

      <div style="margin-bottom: 25px;">
        <h3 style="color: #333; margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">
          <i class="fas fa-list-ol" style="color: #4CAF50;"></i>
          Músicas da Setlist
        </h3>
        ${setlist.musicas && setlist.musicas.length > 0 ? `
          <div style="display: grid; gap: 12px;">
            ${setlist.musicas.map(song => `
              <div style="background: #ffffff; border: 2px solid #f0f0f0; border-radius: 12px; padding: 18px; transition: all 0.3s ease; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                  <div style="flex: 1;">
                    <h4 style="color: #333; margin: 0 0 5px 0; font-size: 1.1rem;">
                      <span style="color: #667eea; font-weight: 700;">${song.ordem}.</span> ${song.titulo}
                    </h4>
                    <p style="color: #666; margin: 0; font-size: 0.95rem;">
                      <i class="fas fa-user" style="color: #999; margin-right: 5px;"></i>
                      ${song.artista}
                    </p>
                    ${song.ministro ? `
                      <p style="color: #4CAF50; margin: 5px 0 0 0; font-size: 0.85rem; font-weight: 600;">
                        <i class="fas fa-user-tie" style="margin-right: 5px;"></i>
                        Ministro: ${song.ministro}
                      </p>
                    ` : `
                      <p style="color: #f44336; margin: 5px 0 0 0; font-size: 0.85rem; font-weight: 600;">
                        <i class="fas fa-exclamation-triangle" style="margin-right: 5px;"></i>
                        Sem ministro definido
                      </p>
                    `}
                  </div>
                  <div style="text-align: right;">
                    <div style="background: #4CAF50; color: white; padding: 8px 12px; border-radius: 20px; font-size: 0.9rem; font-weight: 700; margin-bottom: 5px;">
                      Tom: ${song.tomFinal}
                    </div>
                    ${song.ministro ? `
                      <div style="background: #667eea; color: white; padding: 4px 10px; border-radius: 15px; font-size: 0.75rem; font-weight: 600;">
                        ● ${song.ministro}
                      </div>
                    ` : ''}
                  </div>
                </div>
                <div style="background: #f8f9fa; border-radius: 8px; padding: 10px; font-size: 0.85rem; color: #666;">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span>
                      <i class="fas fa-music" style="color: #999; margin-right: 5px;"></i>
                      Tom Original: <strong>${song.tomOriginal || song.tom}</strong>
                    </span>
                    ${song.ministro && song.tomFinal !== (song.tomOriginal || song.tom) ? `
                      <span style="color: #4CAF50; font-weight: 600;">
                        <i class="fas fa-arrow-right" style="margin: 0 5px;"></i>
                        Ajustado para ${song.ministro}
                      </span>
                    ` : song.tomFinal !== (song.tomOriginal || song.tom) ? `
                      <span style="color: #ff9800; font-weight: 600;">
                        <i class="fas fa-arrow-right" style="margin: 0 5px;"></i>
                        Tom Transposto
                      </span>
                    ` : ''}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        ` : '<p style="color: #666; font-style: italic; text-align: center; padding: 40px;">Nenhuma música na setlist.</p>'}
      </div>

      <div style="display: flex; gap: 15px; justify-content: center; padding-top: 20px; border-top: 2px solid #f0f0f0;">
        <button onclick="setlistsManager.editSetlist('${setlist.id}'); this.closest('div').remove();" 
                style="background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%); color: white; border: none; border-radius: 25px; padding: 12px 25px; cursor: pointer; font-weight: 600; display: flex; align-items: center; gap: 8px; transition: all 0.3s ease;">
          <i class="fas fa-edit"></i> Editar Setlist
        </button>
      </div>
    `;

    modal.appendChild(content);
    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }

  editSetlist(id) {
    window.location.href = `setlist.html?edit=${id}`;
  }

  viewCifras(id) {
    window.location.href = `setlist-view.html?id=${id}`;
  }

  async deleteSetlist(id) {
    const setlist = this.setlists.find(s => s.id === id);
    if (!setlist) return;

    if (confirm(`Tem certeza que deseja excluir a setlist "${setlist.nome}"?`)) {
      try {
        // Excluir do Firestore se disponível
        if (this.db) {
          console.log(`🗑️ Excluindo setlist do Firestore: ${id}`);
          await this.db.collection('setlists').doc(id).delete();
          console.log('✅ Setlist excluída do Firestore');
        }
        
        // Excluir da lista local
        this.setlists = this.setlists.filter(s => s.id !== id);
        
        // Atualizar localStorage como backup
        localStorage.setItem('setlists', JSON.stringify(this.setlists));
        
        // Rerender a lista
        this.renderSetlists();
        
        alert('✅ Setlist excluída com sucesso!');
        
      } catch (error) {
        console.error('❌ Erro ao excluir setlist:', error);
        alert('❌ Erro ao excluir setlist. Tente novamente.');
      }
    }
  }

  showError() {
    const container = document.querySelector('.setlists-container');
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #f44336;">
        <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 20px;"></i>
        <h3>Erro ao carregar setlists</h3>
        <button onclick="location.reload()" 
                style="background: #4CAF50; color: white; border: none; border-radius: 25px; padding: 12px 25px; cursor: pointer; margin-top: 15px;">
          <i class="fas fa-refresh"></i> Tentar Novamente
        </button>
      </div>
    `;
  }

  // Função para gerar resumo dos ministros de uma setlist
  getMinistersSummary(setlist) {
    if (!setlist.musicas || setlist.musicas.length === 0) {
      return 'Nenhuma música';
    }
    
    const ministerMap = new Map();
    
    setlist.musicas.forEach(song => {
      if (song.ministro) {
        if (!ministerMap.has(song.ministro)) {
          ministerMap.set(song.ministro, {
            name: song.ministro,
            count: 0,
            songs: []
          });
        }
        const minister = ministerMap.get(song.ministro);
        minister.count++;
        minister.songs.push(song.titulo);
      }
    });
    
    if (ministerMap.size === 0) {
      return 'Nenhum ministro definido';
    }
    
    if (ministerMap.size === 1) {
      const minister = Array.from(ministerMap.values())[0];
      return `${minister.name} (${minister.count} música${minister.count > 1 ? 's' : ''})`;
    }
    
    const ministers = Array.from(ministerMap.values());
    return ministers.map(m => `${m.name} (${m.count})`).join(', ');
  }
}

// Inicializar
let setlistsManager;

// Função de teste para debugging
window.testModal = function() {
  const testSetlist = {
    id: 'test',
    nome: 'Culto Domingo - Teste',
    data: '2025-06-30',
    descricao: 'Setlist de teste com nova visualização',
    ministro: 'Edy',
    ministroTom: 'D',
    musicas: [
      {
        ordem: 1,
        titulo: 'Maranata',
        artista: 'Theo Rubia',
        tomOriginal: 'C',
        tomFinal: 'D',
        tomEspecificoMinistro: true
      },
      {
        ordem: 2,
        titulo: 'Pode morar aqui',
        artista: 'Theo Rubia',
        tomOriginal: 'G',
        tomFinal: 'G',
        tomEspecificoMinistro: false
      },
      {
        ordem: 3,
        titulo: 'Oceanos',
        artista: 'Hillsong United',
        tomOriginal: 'F',
        tomFinal: 'D',
        tomEspecificoMinistro: true
      }
    ]
  };
  
  console.log('🧪 Testando modal com dados:', testSetlist);
  
  if (setlistsManager) {
    setlistsManager.showModal(testSetlist);
  } else {
    console.error('SetlistsManager não está carregado');
  }
};

// Função para limpar dados e recarregar
window.resetData = function() {
  localStorage.removeItem('setlists');
  location.reload();
};

document.addEventListener('DOMContentLoaded', () => {
  console.log('🌐 DOM carregado - Setlists');
  setlistsManager = new SetlistsManager();
});
