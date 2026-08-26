/**
 * Index Page - Página principal com listagem de músicas
 */

import musicService from '../modules/music-service.js';
import { Utils, MessageService } from '../modules/utils.js';

class IndexPage {
  constructor() {
    this.allMusicas = [];
    this.filteredMusicas = [];
    this.currentFilter = '';
    this.sortBy = 'titulo';
    this.sortOrder = 'asc';
    
    this.initialize();
  }

  // Inicializar página
  initialize() {
    console.log("🏠 IndexPage: Inicializando...");
    
    // Aguardar DOM estar pronto
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupPage());
    } else {
      this.setupPage();
    }
  }

  // Configurar página
  setupPage() {
    this.initializeElements();
    this.setupEventListeners();
    this.loadMusicas();
  }

  // Inicializar elementos DOM
  initializeElements() {
    this.searchInput = document.getElementById('search-input');
    this.musicGrid = document.getElementById('lista-musicas');
    this.emptyState = document.getElementById('empty-state');
    this.loading = document.getElementById('loading');
    this.totalCount = document.getElementById('total-count');
    this.debugInfo = document.getElementById('debug-info');

    // Verificar elementos críticos
    const requiredElements = {
      musicGrid: this.musicGrid,
      loading: this.loading
    };

    const missingElements = Object.entries(requiredElements)
      .filter(([name, element]) => !element)
      .map(([name]) => name);

    if (missingElements.length > 0) {
      console.error("❌ IndexPage: Elementos DOM não encontrados:", missingElements);
      return false;
    }

    console.log("✅ IndexPage: Elementos DOM inicializados");
    return true;
  }

  // Configurar event listeners
  setupEventListeners() {
    // Busca
    if (this.searchInput) {
      this.searchInput.addEventListener('input', 
        Utils.debounce(() => this.handleSearch(), 300)
      );
    }

    // Funções globais para os botões
    window.clearFilters = () => this.clearFilters();
    window.editMusica = (id) => this.editMusica(id);
    window.deleteMusica = (id, titulo) => this.deleteMusica(id, titulo);

    console.log("✅ IndexPage: Event listeners configurados");
  }

  // Carregar músicas
  async loadMusicas() {
    try {
      console.log("🔄 IndexPage: Carregando músicas...");
      this.showLoading(true);
      
      await musicService.loadAllMusics((snapshot) => {
        console.log("📥 IndexPage: Snapshot recebido");
        this.processSnapshot(snapshot);
      });
    } catch (error) {
      console.error("❌ IndexPage: Erro ao carregar músicas:", error);
      this.showError("Erro ao carregar músicas: " + error.message);
    }
  }

  // Processar snapshot do banco
  processSnapshot(snapshot) {
    try {
      this.allMusicas = [];
      
      if (!snapshot || typeof snapshot.forEach !== 'function') {
        console.error("❌ IndexPage: Snapshot inválido");
        this.showError("Dados inválidos recebidos");
        return;
      }
      
      snapshot.forEach((doc) => {
        try {
          const musicData = {
            id: doc.id,
            ...doc.data()
          };
          this.allMusicas.push(musicData);
        } catch (error) {
          console.error("❌ IndexPage: Erro ao processar documento:", error);
        }
      });

      console.log(`📊 IndexPage: ${this.allMusicas.length} músicas carregadas`);
      this.updateDebugInfo(`${this.allMusicas.length} músicas carregadas`);
      
      this.showLoading(false);
      this.applyFiltersAndRender();
    } catch (error) {
      console.error("❌ IndexPage: Erro ao processar snapshot:", error);
      this.showError("Erro ao processar dados");
    }
  }

  // Aplicar filtros e renderizar
  applyFiltersAndRender() {
    // Aplicar filtro de busca
    this.filteredMusicas = musicService.filterMusics(this.allMusicas, this.currentFilter);
    
    // Aplicar ordenação
    this.filteredMusicas = musicService.sortMusics(this.filteredMusicas, this.sortBy, this.sortOrder);
    
    this.renderMusicas();
    this.updateStats();
  }

  // Renderizar músicas
  renderMusicas() {
    if (!this.musicGrid) {
      console.error("❌ IndexPage: musicGrid não disponível");
      return;
    }

    this.musicGrid.innerHTML = '';

    if (this.filteredMusicas.length === 0) {
      this.showEmptyState();
      return;
    }

    this.hideEmptyState();

    this.filteredMusicas.forEach((musica, index) => {
      try {
        const card = this.createMusicCard(musica, index);
        this.musicGrid.appendChild(card);
      } catch (error) {
        console.error("❌ IndexPage: Erro ao criar card:", error);
      }
    });

    console.log(`🎨 IndexPage: ${this.filteredMusicas.length} cards renderizados`);
  }

  // Criar card de música
  createMusicCard(musica, index) {
    const card = document.createElement('div');
    card.className = 'music-card';
    card.dataset.index = index;

    const ministrosDisplay = Utils.formatMinistros(musica);
    const tomMinistroDisplay = Utils.formatTomMinistro(musica);

    card.innerHTML = `
      <div class="music-header">
        <h3 class="music-title">${Utils.escapeHtml(musica.titulo || 'Título não informado')}</h3>
        ${musica.artista ? `<p class="music-artist">${Utils.escapeHtml(musica.artista)}</p>` : ''}
      </div>
      
      <div class="music-info">
        <div class="info-row">
          ${ministrosDisplay !== 'Não informado' ? 
            `<span class="info-item">
              <i class="fa-solid fa-user"></i>
              ${Utils.escapeHtml(ministrosDisplay)}
            </span>` : ''
          }
          ${musica.tom ? 
            `<span class="info-item">
              <i class="fa-solid fa-music"></i>
              Tom: ${Utils.escapeHtml(musica.tom)}
            </span>` : ''
          }
        </div>
        
        ${tomMinistroDisplay ? 
          `<div class="info-row">
            <span class="info-item tom-ministro">
              <i class="fa-solid fa-user-music"></i>
              ${Utils.escapeHtml(tomMinistroDisplay)}
            </span>
          </div>` : ''
        }
        
        <div class="info-row">
          ${musica.bpm && !isNaN(musica.bpm) ? 
            `<span class="info-item">
              <i class="fa-solid fa-tachometer-alt"></i>
              ${musica.bpm} BPM
            </span>` : ''
          }
          ${musica.criadoEm ? 
            `<span class="info-item">
              <i class="fa-solid fa-calendar"></i>
              ${Utils.formatTimestamp(musica.criadoEm)}
            </span>` : ''
          }
        </div>
      </div>

      <div class="music-actions">
        <a href="consultar.html" class="action-btn btn-view">
          <i class="fa-solid fa-eye"></i>
          Consultar
        </a>
        <a href="ver.html?id=${encodeURIComponent(musica.id)}" class="action-btn btn-view-full">
          <i class="fa-solid fa-file-alt"></i>
          Visualizar
        </a>
        ${musica.link ? 
          `<a href="${Utils.escapeHtml(musica.link)}" target="_blank" class="action-btn btn-link">
            <i class="fa-solid fa-external-link-alt"></i>
            Link
          </a>` : ''
        }
        <button class="action-btn btn-edit" onclick="editMusica('${musica.id}')">
          <i class="fa-solid fa-edit"></i>
          Editar
        </button>
        <button class="action-btn btn-delete" onclick="deleteMusica('${musica.id}', '${Utils.escapeHtml(musica.titulo || '')}')">
          <i class="fa-solid fa-trash"></i>
          Excluir
        </button>
      </div>
    `;

    return card;
  }

  // Lidar com busca
  handleSearch() {
    if (!this.searchInput) return;
    
    this.currentFilter = this.searchInput.value.trim();
    console.log("🔍 IndexPage: Aplicando filtro:", this.currentFilter);
    
    this.applyFiltersAndRender();
  }

  // Limpar filtros
  clearFilters() {
    if (this.searchInput) {
      this.searchInput.value = '';
    }
    this.currentFilter = '';
    this.applyFiltersAndRender();
    console.log("🗑️ IndexPage: Filtros limpos");
  }

  // Editar música
  editMusica(id) {
    window.location.href = `nova-musica.html?edit=${id}`;
  }

  // Excluir música
  async deleteMusica(id, titulo) {
    if (!confirm(`Tem certeza que deseja excluir a música "${titulo}"?`)) {
      return;
    }

    try {
      console.log("🗑️ IndexPage: Excluindo música:", id);
      await musicService.deleteMusic(id);
      MessageService.success(`Música "${titulo}" excluída com sucesso!`);
    } catch (error) {
      console.error("❌ IndexPage: Erro ao excluir música:", error);
      MessageService.error("Erro ao excluir música: " + error.message);
    }
  }

  // Mostrar loading
  showLoading(show) {
    if (this.loading) {
      this.loading.style.display = show ? 'block' : 'none';
    }
    if (this.musicGrid) {
      this.musicGrid.style.display = show ? 'none' : 'grid';
    }
  }

  // Mostrar estado vazio
  showEmptyState() {
    if (this.emptyState) {
      this.emptyState.style.display = 'block';
    }
    if (this.musicGrid) {
      this.musicGrid.style.display = 'none';
    }
  }

  // Esconder estado vazio
  hideEmptyState() {
    if (this.emptyState) {
      this.emptyState.style.display = 'none';
    }
    if (this.musicGrid) {
      this.musicGrid.style.display = 'grid';
    }
  }

  // Mostrar erro
  showError(message) {
    this.showLoading(false);
    if (this.loading) {
      this.loading.innerHTML = `❌ ${message}`;
      this.loading.style.display = 'block';
    }
  }

  // Atualizar estatísticas
  updateStats() {
    if (this.totalCount) {
      this.totalCount.textContent = `${this.filteredMusicas.length} de ${this.allMusicas.length} músicas`;
    }
  }

  // Atualizar informações de debug
  updateDebugInfo(message) {
    if (this.debugInfo) {
      this.debugInfo.textContent = `Debug: ${message}`;
    }
    console.log(`📊 IndexPage Debug: ${message}`);
  }
}

// Inicializar página quando script carregar
new IndexPage();
