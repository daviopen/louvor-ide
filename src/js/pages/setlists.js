/**
 * Setlists Management - Sistema de listagem e gerenciamento de setlists
 */

class SetlistsManager {
  constructor() {
    this.db = new DatabaseService();
    this.setlists = [];
    
    this.init();
  }

  async init() {
    try {
      // Inicializar banco de dados
      this.db.initializeFirebase();
      this.db.initializeLocalStorage();
      
      // Carregar setlists
      await this.loadSetlists();
      
      console.log('✅ SetlistsManager inicializado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao inicializar SetlistsManager:', error);
      this.showError('Erro ao carregar setlists');
    }
  }

  async loadSetlists() {
    const loadingEl = document.getElementById('loading');
    const setlistsListEl = document.getElementById('setlists-list');
    const emptyStateEl = document.getElementById('empty-state');

    try {
      loadingEl.style.display = 'block';
      setlistsListEl.style.display = 'none';
      emptyStateEl.style.display = 'none';

      // Carregar setlists do banco de dados
      const response = await this.db.collection('setlists').get();
      
      if (response.docs && response.docs.length > 0) {
        this.setlists = response.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      } else {
        // Tentar carregar do localStorage como fallback
        const localSetlists = localStorage.getItem('setlists');
        this.setlists = localSetlists ? JSON.parse(localSetlists) : [];
      }

      // Ordenar por data (mais recentes primeiro)
      this.setlists.sort((a, b) => {
        const dateA = new Date(a.data || a.criadoEm);
        const dateB = new Date(b.data || b.criadoEm);
        return dateB - dateA;
      });

      loadingEl.style.display = 'none';

      if (this.setlists.length === 0) {
        emptyStateEl.style.display = 'block';
      } else {
        setlistsListEl.style.display = 'block';
        this.renderSetlists();
      }

      console.log(`📋 ${this.setlists.length} setlists carregadas`);
    } catch (error) {
      console.error('❌ Erro ao carregar setlists:', error);
      loadingEl.style.display = 'none';
      this.showError('Erro ao carregar setlists');
    }
  }

  renderSetlists() {
    const setlistsListEl = document.getElementById('setlists-list');
    
    setlistsListEl.innerHTML = this.setlists.map(setlist => 
      this.createSetlistCard(setlist)
    ).join('');
  }

  createSetlistCard(setlist) {
    const formattedDate = this.formatDate(setlist.data);
    const createdDate = this.formatDate(setlist.criadoEm);
    const totalSongs = setlist.totalMusicas || setlist.musicas?.length || 0;

    return `
      <div class="setlist-card" onclick="setlistsManager.viewSetlist('${setlist.id}')">
        <div class="setlist-header">
          <div class="setlist-info">
            <h3>${setlist.nome}</h3>
            <div class="setlist-meta">
              <span>
                <i class="fas fa-calendar"></i>
                ${formattedDate}
              </span>
              <span>
                <i class="fas fa-music"></i>
                ${totalSongs} música${totalSongs !== 1 ? 's' : ''}
              </span>
              <span>
                <i class="fas fa-clock"></i>
                Criado em ${createdDate}
              </span>
            </div>
            ${setlist.descricao ? `<div class="setlist-description">${setlist.descricao}</div>` : ''}
          </div>
          
          <div class="setlist-actions" onclick="event.stopPropagation()">
            <button class="action-btn view" onclick="setlistsManager.viewSetlist('${setlist.id}')" title="Visualizar">
              <i class="fas fa-eye"></i>
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
          <span>
            <i class="fas fa-user-tie"></i>
            <strong>Ministro:</strong> ${setlist.ministro}
          </span>
          <span class="minister-key">Tom: ${setlist.ministroTom || 'N/A'}</span>
        </div>

        ${setlist.musicas && setlist.musicas.length > 0 ? `
          <div class="setlist-songs">
            <div class="songs-header">
              <i class="fas fa-list"></i>
              Músicas da Setlist:
            </div>
            <div class="songs-list">
              ${setlist.musicas.slice(0, 6).map(song => `
                <div class="song-item">
                  <div class="song-title">${song.ordem}. ${song.titulo}</div>
                  <div class="song-details">
                    <span>${song.artista}</span>
                    <span>
                      <span class="song-key">${song.tomFinal}</span>
                      ${song.tomEspecificoMinistro ? 
                        '<span class="transposed-indicator" style="color: #4CAF50;">● Tom do Ministro</span>' : 
                        song.transposta ? '<span class="transposed-indicator">● Transposta</span>' : ''
                      }
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
      const d = new Date(date);
      if (isNaN(d.getTime())) return 'Data inválida';
      
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      return 'Data inválida';
    }
  }

  viewSetlist(setlistId) {
    const setlist = this.setlists.find(s => s.id === setlistId);
    if (!setlist) {
      alert('Setlist não encontrada!');
      return;
    }

    // Criar uma página de visualização detalhada ou modal
    this.showSetlistDetails(setlist);
  }

  showSetlistDetails(setlist) {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
      padding: 20px;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      background: white;
      border-radius: 20px;
      padding: 30px;
      max-width: 800px;
      max-height: 90vh;
      overflow-y: auto;
      width: 100%;
    `;

    content.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px;">
        <h2 style="color: #333; margin: 0;">${setlist.nome}</h2>
        <button onclick="this.closest('.modal').remove()" style="background: #f44336; color: white; border: none; border-radius: 50%; width: 35px; height: 35px; cursor: pointer; font-size: 18px;">×</button>
      </div>

      <div style="margin-bottom: 20px;">
        <p><strong>Data do Culto:</strong> ${this.formatDate(setlist.data)}</p>
        <p><strong>Ministro:</strong> ${setlist.ministro} (Tom: ${setlist.ministroTom})</p>
        ${setlist.descricao ? `<p><strong>Descrição:</strong> ${setlist.descricao}</p>` : ''}
        <p><strong>Total de Músicas:</strong> ${setlist.musicas?.length || 0}</p>
      </div>

      <div style="margin-bottom: 25px;">
        <h3 style="color: #333; margin-bottom: 15px;">Músicas da Setlist:</h3>
        ${setlist.musicas && setlist.musicas.length > 0 ? `
          <div style="display: grid; gap: 10px;">
            ${setlist.musicas.map(song => `
              <div style="background: #f8f9fa; border-radius: 8px; padding: 15px; border-left: 4px solid #4CAF50;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 5px;">
                  <strong style="color: #333;">${song.ordem}. ${song.titulo}</strong>
                  <span style="background: #4CAF50; color: white; padding: 4px 8px; border-radius: 12px; font-size: 0.8rem; font-weight: 600;">
                    ${song.tomFinal}
                  </span>
                </div>
                <div style="color: #666; font-size: 0.9rem;">
                  <p>Artista: ${song.artista}</p>
                  <p>Tom Original: ${song.tomOriginal} ${
                    song.tomEspecificoMinistro ? 
                      '→ <span style="color: #4CAF50;">Tom específico do ministro (' + song.tomFinal + ')</span>' :
                      song.transposta ? '→ <span style="color: #ff9800;">Transposta para ' + song.tomFinal + '</span>' : ''
                  }</p>
                </div>
              </div>
            `).join('')}
          </div>
        ` : '<p style="color: #666; font-style: italic;">Nenhuma música na setlist.</p>'}
      </div>

      <div style="display: flex; gap: 15px; justify-content: center;">
        <button onclick="setlistsManager.editSetlist('${setlist.id}'); this.closest('.modal').remove();" 
                style="background: #2196F3; color: white; border: none; border-radius: 25px; padding: 12px 25px; cursor: pointer; font-weight: 600;">
          <i class="fas fa-edit"></i> Editar Setlist
        </button>
        <button onclick="setlistsManager.printSetlist('${setlist.id}')" 
                style="background: #4CAF50; color: white; border: none; border-radius: 25px; padding: 12px 25px; cursor: pointer; font-weight: 600;">
          <i class="fas fa-print"></i> Imprimir
        </button>
      </div>
    `;

    modal.className = 'modal';
    modal.appendChild(content);
    document.body.appendChild(modal);

    // Fechar modal ao clicar fora do conteúdo
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  editSetlist(setlistId) {
    // Redirecionar para página de edição
    window.location.href = `setlist.html?edit=${setlistId}`;
  }

  async deleteSetlist(setlistId) {
    const setlist = this.setlists.find(s => s.id === setlistId);
    if (!setlist) {
      alert('Setlist não encontrada!');
      return;
    }

    const confirmDelete = confirm(`Tem certeza que deseja excluir a setlist "${setlist.nome}"?\n\nEsta ação não pode ser desfeita.`);
    if (!confirmDelete) return;

    try {
      // Tentar deletar do Firebase primeiro
      if (this.db.firestoreDB) {
        try {
          await this.db.firestoreDB.collection('setlists').doc(setlistId).delete();
          console.log('🔥 Setlist excluída do Firebase');
        } catch (firebaseError) {
          console.warn('⚠️ Erro ao excluir do Firebase, tentando localStorage:', firebaseError);
          // Fallback para localStorage
          const localSetlists = JSON.parse(localStorage.getItem('setlists') || '[]');
          const updatedSetlists = localSetlists.filter(s => s.id !== setlistId);
          localStorage.setItem('setlists', JSON.stringify(updatedSetlists));
          console.log('💾 Setlist excluída do localStorage');
        }
      } else {
        // Deletar apenas do localStorage
        const localSetlists = JSON.parse(localStorage.getItem('setlists') || '[]');
        const updatedSetlists = localSetlists.filter(s => s.id !== setlistId);
        localStorage.setItem('setlists', JSON.stringify(updatedSetlists));
        console.log('💾 Setlist excluída do localStorage');
      }

      // Atualizar a lista local
      this.setlists = this.setlists.filter(s => s.id !== setlistId);
      
      // Re-renderizar a lista
      if (this.setlists.length === 0) {
        document.getElementById('setlists-list').style.display = 'none';
        document.getElementById('empty-state').style.display = 'block';
      } else {
        this.renderSetlists();
      }

      alert('✅ Setlist excluída com sucesso!');
      
    } catch (error) {
      console.error('❌ Erro ao excluir setlist:', error);
      alert('❌ Erro ao excluir setlist. Tente novamente.');
    }
  }

  printSetlist(setlistId) {
    const setlist = this.setlists.find(s => s.id === setlistId);
    if (!setlist) {
      alert('Setlist não encontrada!');
      return;
    }

    // Criar uma janela de impressão
    const printWindow = window.open('', '_blank');
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Setlist - ${setlist.nome}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
          .info { margin-bottom: 25px; }
          .info p { margin: 5px 0; }
          .songs { margin-top: 25px; }
          .song { margin: 10px 0; padding: 10px; border-left: 3px solid #4CAF50; background: #f9f9f9; }
          .song-title { font-weight: bold; margin-bottom: 5px; }
          .song-details { font-size: 0.9rem; color: #666; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${setlist.nome}</h1>
          <p>Louvor IDE - Sistema de Cifras</p>
        </div>
        
        <div class="info">
          <p><strong>Data do Culto:</strong> ${this.formatDate(setlist.data)}</p>
          <p><strong>Ministro Principal:</strong> ${setlist.ministro}</p>
          <p><strong>Tom Preferido:</strong> ${setlist.ministroTom}</p>
          ${setlist.descricao ? `<p><strong>Descrição:</strong> ${setlist.descricao}</p>` : ''}
          <p><strong>Total de Músicas:</strong> ${setlist.musicas?.length || 0}</p>
        </div>

        <div class="songs">
          <h2>Músicas da Setlist:</h2>
          ${setlist.musicas && setlist.musicas.length > 0 ? 
            setlist.musicas.map(song => `
              <div class="song">
                <div class="song-title">${song.ordem}. ${song.titulo}</div>
                <div class="song-details">
                  <p>Artista: ${song.artista}</p>
                  <p>Tom: ${song.tomFinal} ${
                    song.tomEspecificoMinistro ? 
                      '(Tom específico do ministro)' :
                      song.transposta ? '(Transposta de ' + song.tomOriginal + ')' : ''
                  }</p>
                </div>
              </div>
            `).join('') : 
            '<p>Nenhuma música na setlist.</p>'
          }
        </div>

        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() {
              window.close();
            };
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
  }

  showError(message) {
    const container = document.querySelector('.setlists-container');
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #f44336;">
        <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 20px;"></i>
        <h3>Erro ao carregar setlists</h3>
        <p>${message}</p>
        <button onclick="location.reload()" style="background: #4CAF50; color: white; border: none; border-radius: 25px; padding: 12px 25px; cursor: pointer; margin-top: 15px;">
          <i class="fas fa-refresh"></i> Tentar Novamente
        </button>
      </div>
    `;
  }
}

// Inicializar quando a página carregar
let setlistsManager;

document.addEventListener('DOMContentLoaded', () => {
  setlistsManager = new SetlistsManager();
});
