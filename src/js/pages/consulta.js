/**
 * Consulta Page - Página de consulta e transposição
 */

import musicService from '../modules/music-service.js';
import transposeService from '../modules/transpose-service.js';
import { Utils, MessageService } from '../modules/utils.js';

class ConsultaPage {
  constructor() {
    this.allMusicas = [];
    this.selectedMusica = null;
    
    this.initialize();
  }

  // Inicializar página
  initialize() {
    console.log("🔍 ConsultaPage: Inicializando...");
    
    // Aguardar DOM estar pronto
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupPage());
    } else {
      this.setupPage();
    }
  }

  // Configurar página
  setupPage() {
    if (this.initializeElements()) {
      this.setupEventListeners();
      this.loadMusicas();
    }
  }

  // Inicializar elementos DOM
  initializeElements() {
    try {
      this.searchInput = document.getElementById('search-input');
      this.musicList = document.getElementById('music-list');
      this.loading = document.getElementById('loading');
      this.emptyViewer = document.getElementById('empty-viewer');
      this.musicViewer = document.getElementById('music-viewer');
      this.cifraContent = document.getElementById('cifra-content');
      this.currentTitle = document.getElementById('current-title');
      this.currentMinistro = document.getElementById('current-ministro');
      this.currentArtista = document.getElementById('current-artista');
      this.currentOriginalKey = document.getElementById('current-original-key');
      this.currentKey = document.getElementById('current-key');
      this.currentBpm = document.getElementById('current-bpm');
      this.bpmContainer = document.getElementById('bpm-container');
      this.linkContainerConsulta = document.getElementById('link-container-consulta');
      this.currentLink = document.getElementById('current-link');
      this.btnDown = document.getElementById('btn-down');
      this.btnUp = document.getElementById('btn-up');
      this.btnReset = document.getElementById('btn-reset');
      this.currentTomMinistro = document.getElementById('current-tom-ministro');
      this.tomMinistroContainer = document.getElementById('tom-ministro-container-consulta');

      // Verificar elementos críticos
      const criticalElements = {
        searchInput: this.searchInput,
        musicList: this.musicList,
        loading: this.loading,
        emptyViewer: this.emptyViewer,
        musicViewer: this.musicViewer,
        cifraContent: this.cifraContent,
        currentTitle: this.currentTitle,
        currentKey: this.currentKey
      };

      const missingElements = Object.entries(criticalElements)
        .filter(([name, element]) => !element)
        .map(([name]) => name);

      if (missingElements.length > 0) {
        throw new Error(`Elementos DOM não encontrados: ${missingElements.join(', ')}`);
      }

      console.log("✅ ConsultaPage: Todos os elementos DOM encontrados");
      return true;
    } catch (error) {
      console.error("❌ ConsultaPage: Erro ao inicializar elementos DOM:", error);
      this.showError(`Erro DOM: ${error.message}`);
      return false;
    }
  }

  // Configurar event listeners
  setupEventListeners() {
    if (!this.searchInput) {
      console.error("❌ ConsultaPage: searchInput não disponível para eventos");
      return;
    }
    
    this.searchInput.addEventListener('input', Utils.debounce(() => this.renderMusicList(), 300));
    
    // Atalhos de teclado
    document.addEventListener('keydown', (event) => {
      if (this.selectedMusica && !this.searchInput.matches(':focus')) {
        switch(event.key) {
          case 'ArrowUp':
            event.preventDefault();
            this.transposeUp();
            break;
          case 'ArrowDown':
            event.preventDefault();
            this.transposeDown();
            break;
          case 'r':
          case 'R':
            event.preventDefault();
            this.resetTranspose();
            break;
          case 'Escape':
            event.preventDefault();
            this.clearSelection();
            break;
        }
      }
    });

    // Eventos dos botões de transposição
    if (this.btnUp) this.btnUp.onclick = () => this.transposeUp();
    if (this.btnDown) this.btnDown.onclick = () => this.transposeDown();
    if (this.btnReset) this.btnReset.onclick = () => this.resetTranspose();
    
    console.log("✅ ConsultaPage: Event listeners configurados");
  }

  // Carregar músicas
  async loadMusicas() {
    try {
      console.log("🔄 ConsultaPage: Carregando músicas...");
      this.showMessage("Carregando músicas...", "info");
      
      await musicService.loadAllMusics((snapshot) => {
        console.log("📥 ConsultaPage: Snapshot recebido");
        this.processSnapshot(snapshot);
      });
    } catch (error) {
      console.error("❌ ConsultaPage: Erro ao carregar músicas:", error);
      this.showError("Erro ao carregar músicas: " + error.message);
    }
  }

  // Processar snapshot do banco
  processSnapshot(snapshot) {
    try {
      this.allMusicas = [];
      
      if (!snapshot || typeof snapshot.forEach !== 'function') {
        console.error("❌ ConsultaPage: Snapshot inválido");
        this.showError("Dados inválidos recebidos");
        return;
      }
      
      snapshot.forEach((doc) => {
        try {
          if (!doc || typeof doc.id !== 'string') {
            console.warn("⚠️ ConsultaPage: Documento inválido:", doc);
            return;
          }
          
          const data = typeof doc.data === 'function' ? doc.data() : doc.data;
          if (!data) {
            console.warn("⚠️ ConsultaPage: Documento sem dados:", doc.id);
            return;
          }
          
          const musicData = {
            id: doc.id,
            ...data
          };
          
          this.allMusicas.push(musicData);
        } catch (docError) {
          console.error("❌ ConsultaPage: Erro ao processar documento:", docError);
        }
      });

      console.log(`📈 ConsultaPage: ${this.allMusicas.length} músicas carregadas`);
      this.showMessage(`${this.allMusicas.length} músicas carregadas`, "success");

      this.loading.style.display = "none";
      this.musicList.style.display = "block";
      
      this.renderMusicList();
    } catch (error) {
      console.error("❌ ConsultaPage: Erro ao processar snapshot:", error);
      this.showError("Erro ao processar dados");
    }
  }

  // Renderizar lista de músicas
  renderMusicList() {
    if (!this.musicList) {
      console.error("❌ ConsultaPage: musicList element não encontrado");
      return;
    }
    
    const searchTerm = this.searchInput ? this.searchInput.value.toLowerCase() : '';
    const filteredMusicas = this.allMusicas.filter(musica => {
      if (!musica) return false;
      
      const searchFields = Utils.createSearchFields(musica);
      return !searchTerm || searchFields.includes(searchTerm);
    });

    this.musicList.innerHTML = '';

    if (filteredMusicas.length === 0) {
      this.musicList.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-search"></i>
          <h3>Nenhuma música encontrada</h3>
          <p>Tente um termo diferente</p>
        </div>
      `;
      return;
    }

    filteredMusicas.forEach((musica) => {
      if (!musica || !musica.id) {
        console.warn(`⚠️ ConsultaPage: Música inválida:`, musica);
        return;
      }
      
      const item = this.createMusicListItem(musica);
      this.musicList.appendChild(item);
    });
  }

  // Criar item da lista de música
  createMusicListItem(musica) {
    const item = document.createElement('div');
    item.className = 'music-item';
    if (this.selectedMusica && this.selectedMusica.id === musica.id) {
      item.classList.add('selected');
    }
    
    const ministrosDisplay = Utils.formatMinistros(musica);
    const tomMinistroDisplay = Utils.formatTomMinistro(musica);
    
    item.innerHTML = `
      <div class="music-item-title">${Utils.escapeHtml(musica.titulo || 'Título não informado')}</div>
      ${musica.artista ? `<div class="music-item-artist">${Utils.escapeHtml(musica.artista)}</div>` : ''}
      <div class="music-item-info">
        ${ministrosDisplay !== 'Não informado' ? `<span><i class="fas fa-user"></i> ${Utils.escapeHtml(ministrosDisplay)}</span>` : ''}
        ${musica.tom ? `<span><i class="fas fa-music"></i> ${Utils.escapeHtml(musica.tom)}</span>` : ''}
        ${tomMinistroDisplay ? `<span style="color: #4CAF50;"><i class="fas fa-user-music"></i> Tom: ${Utils.escapeHtml(tomMinistroDisplay)}</span>` : ''}
        ${musica.bpm && !isNaN(musica.bpm) ? `<span><i class="fas fa-tachometer-alt"></i> ${musica.bpm} BPM</span>` : ''}
      </div>
    `;
    
    item.onclick = () => this.selectMusica(musica);
    return item;
  }

  // Selecionar música
  selectMusica(musica) {
    this.selectedMusica = musica;
    
    // Inicializar serviço de transposição
    if (!transposeService.initialize(musica)) {
      console.error("❌ ConsultaPage: Erro ao inicializar transposição");
      this.showError("Erro ao inicializar transposição");
      return;
    }

    // Atualizar informações
    this.updateMusicInfo(musica);
    
    // Exibir cifra
    this.displayCifra(musica.cifra || '');
    this.updateCurrentKey();
    
    // Mostrar viewer
    this.emptyViewer.style.display = 'none';
    this.musicViewer.style.display = 'block';
    
    // Atualizar lista
    this.renderMusicList();
    
    // Atualizar título da página
    document.title = `${musica.titulo} - Consulta e Transposição`;
    
    console.log("✅ ConsultaPage: Música selecionada:", musica.titulo);
  }

  // Atualizar informações da música
  updateMusicInfo(musica) {
    if (this.currentTitle) {
      this.currentTitle.textContent = musica.titulo || 'Título não informado';
    }
    
    if (this.currentMinistro) {
      this.currentMinistro.textContent = Utils.formatMinistros(musica);
    }
    
    if (this.currentArtista) {
      this.currentArtista.textContent = musica.artista || 'Não informado';
    }
    
    if (this.currentOriginalKey) {
      this.currentOriginalKey.textContent = musica.tom || 'N/A';
    }
    
    // Tom do Ministro
    if (this.tomMinistroContainer && this.currentTomMinistro) {
      const tomMinistroText = Utils.formatTomMinistro(musica);
      if (tomMinistroText) {
        this.currentTomMinistro.textContent = tomMinistroText;
        this.tomMinistroContainer.style.display = 'flex';
      } else {
        this.tomMinistroContainer.style.display = 'none';
      }
    }
    
    // BPM
    if (this.bpmContainer && this.currentBpm) {
      if (musica.bpm && !isNaN(musica.bpm)) {
        this.currentBpm.textContent = `${musica.bpm} BPM`;
        this.bpmContainer.style.display = 'flex';
      } else {
        this.bpmContainer.style.display = 'none';
      }
    }
    
    // Link
    if (this.linkContainerConsulta && this.currentLink) {
      if (musica.link && musica.link.trim()) {
        this.currentLink.href = musica.link;
        this.linkContainerConsulta.style.display = 'flex';
      } else {
        this.linkContainerConsulta.style.display = 'none';
      }
    }
  }

  // Exibir cifra
  displayCifra(cifra) {
    if (!this.cifraContent) return;
    
    if (cifra) {
      const highlightedCifra = Utils.highlightChords(cifra);
      this.cifraContent.innerHTML = highlightedCifra;
    } else {
      this.cifraContent.innerHTML = '<div style="color: #999; text-align: center; padding: 40px;">Cifra não disponível para esta música</div>';
    }
  }

  // Atualizar tom atual
  updateCurrentKey() {
    if (!this.currentKey) return;
    
    const transposeInfo = transposeService.getTransposeInfo();
    this.currentKey.textContent = transposeInfo.currentKey;
    
    // Atualizar estado do botão reset
    if (this.btnReset) {
      if (transposeInfo.isOriginal) {
        this.btnReset.disabled = true;
        this.btnReset.style.opacity = '0.5';
      } else {
        this.btnReset.disabled = false;
        this.btnReset.style.opacity = '1';
      }
    }
  }

  // Transpor para cima
  transposeUp() {
    this.transpose(() => transposeService.transposeUp());
  }

  // Transpor para baixo
  transposeDown() {
    this.transpose(() => transposeService.transposeDown());
  }

  // Transpor
  transpose(transposeFunction) {
    if (!this.selectedMusica) return;
    
    try {
      const result = transposeFunction();
      this.displayCifra(result.cifra);
      this.updateCurrentKey();
      
      // Efeito visual
      if (this.cifraContent) {
        this.cifraContent.style.transform = 'scale(0.98)';
        setTimeout(() => {
          this.cifraContent.style.transform = 'scale(1)';
        }, 150);
      }
      
    } catch (error) {
      console.error("❌ ConsultaPage: Erro ao transpor:", error);
      MessageService.error(error.message);
    }
  }

  // Resetar transposição
  resetTranspose() {
    if (!this.selectedMusica) return;
    
    try {
      const result = transposeService.reset();
      this.displayCifra(result.cifra);
      this.updateCurrentKey();
      
      // Efeito visual
      if (this.cifraContent) {
        this.cifraContent.style.transform = 'scale(1.02)';
        setTimeout(() => {
          this.cifraContent.style.transform = 'scale(1)';
        }, 200);
      }
      
    } catch (error) {
      console.error("❌ ConsultaPage: Erro ao resetar:", error);
      MessageService.error(error.message);
    }
  }

  // Limpar seleção
  clearSelection() {
    this.selectedMusica = null;
    
    this.emptyViewer.style.display = 'block';
    this.musicViewer.style.display = 'none';
    
    this.renderMusicList();
    
    document.title = 'Consulta e Transposição — IDE Music';
  }

  // Mostrar erro
  showError(message) {
    if (this.loading) {
      this.loading.innerHTML = `❌ ${message}`;
      this.loading.style.display = 'block';
    }
    console.error("❌ ConsultaPage:", message);
  }

  // Mostrar mensagem
  showMessage(message, type = 'info') {
    MessageService.show(message, type);
  }
}

// Inicializar página quando script carregar
new ConsultaPage();
