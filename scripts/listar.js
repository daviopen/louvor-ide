// Sistema de listagem de músicas
console.log("🚀 SCRIPT listar.js CARREGADO!");

// Atualizar debug na tela
setTimeout(() => {
  const debugEl = document.getElementById('debug-info');
  if (debugEl) {
    debugEl.innerHTML = debugEl.innerHTML.replace('Script: Carregando...', 'Script: ✅ Carregado!');
  }
}, 100);

let allMusicas = [];
let filteredMusicas = [];

// Debug info
function updateDebug(message) {
  const debugEl = document.getElementById('debug-info');
  if (debugEl) {
    debugEl.textContent = `Debug: ${message}`;
  }
  console.log(`🔧 DEBUG: ${message}`);
}

window.onload = function () {
  updateDebug("Página carregada");
  console.log("🚀 Página carregada, iniciando sistema...");
  
  // Verificar se DB está disponível imediatamente
  if (window.db) {
    console.log("✅ DB já disponível, iniciando imediatamente");
    initializeApp();
  } else {
    console.log("⏳ DB não disponível, aguardando evento...");
    
    // Escutar evento de DB pronto
    window.addEventListener('dbReady', function() {
      console.log("📡 Evento dbReady recebido, iniciando app");
      initializeApp();
    });
    
    // Timeout de segurança
    setTimeout(() => {
      if (!window.db) {
        console.log("⏰ Timeout atingido, tentando inicializar mesmo assim");
        initializeApp();
      }
    }, 500);
  }
}

function initializeApp() {
  updateDebug("Inicializando app...");
  
  if (!window.db) {
    updateDebug("ERRO: DB ainda não disponível, tentando novamente...");
    // Tentar novamente após mais tempo
    setTimeout(() => {
      if (window.db) {
        console.log("✅ DB disponível na segunda tentativa");
        loadMusicas();
        setupEventListeners();
      } else {
        updateDebug("ERRO: DB definitivamente não disponível");
        console.error("❌ DB definitivamente não disponível após retry");
        document.getElementById("loading").innerHTML = "❌ Erro: Database não inicializado";
        
        // Última tentativa - renderizar dados de exemplo diretamente
        console.log("🚨 Tentativa de fallback com dados de exemplo...");
        fallbackRender();
      }
    }, 300);
    return;
  }
  
  updateDebug("DB OK, carregando músicas...");
  loadMusicas();
  setupEventListeners();
}

function loadMusicas() {
  updateDebug("loadMusicas iniciada");
  console.log("🔄 Iniciando loadMusicas...");
  
  const loading = document.getElementById("loading");
  const emptyState = document.getElementById("empty-state");
  const musicGrid = document.getElementById("lista-musicas");

  if (!loading || !emptyState || !musicGrid) {
    updateDebug("ERRO: Elementos DOM não encontrados");
    console.error("❌ Elementos DOM não encontrados!");
    return;
  }

  if (!window.db) {
    updateDebug("ERRO: DB não disponível");
    console.error("❌ Database não inicializado!");
    loading.innerHTML = "❌ Erro: Base de dados não inicializada";
    return;
  }

  updateDebug("Acessando coleção...");
  console.log("📊 Acessando coleção de músicas...");

  try {
    db.collection("musicas").orderBy("titulo").onSnapshot((snapshot) => {
      updateDebug("Snapshot recebido");
      console.log("✅ Snapshot recebido:", snapshot);
      allMusicas = [];
      
      if (!snapshot || typeof snapshot.forEach !== 'function') {
        updateDebug("ERRO: Snapshot inválido");
        console.error("❌ Snapshot inválido:", snapshot);
        loading.innerHTML = "❌ Erro: Dados inválidos recebidos";
        return;
      }
      
      snapshot.forEach((doc) => {
        try {
          const musicData = {
            id: doc.id,
            ...doc.data()
          };
          console.log("🎵 Música carregada:", musicData.titulo);
          allMusicas.push(musicData);
        } catch (error) {
          console.error("❌ Erro ao processar música:", error);
        }
      });

      updateDebug(`${allMusicas.length} músicas carregadas`);
      console.log(`📈 Total de músicas carregadas: ${allMusicas.length}`);

      // Popular filtros
      try {
        populateFilters();
        updateDebug("Filtros populados");
      } catch (error) {
        console.error("❌ Erro ao popular filtros:", error);
      }
      
      // Aplicar filtros e renderizar
      try {
        applyFilters();
        updateDebug("Filtros aplicados");
      } catch (error) {
        console.error("❌ Erro ao aplicar filtros:", error);
      }
      
      // Atualizar estatísticas
      try {
        updateStats();
        updateDebug("Estatísticas atualizadas");
      } catch (error) {
        console.error("❌ Erro ao atualizar estatísticas:", error);
      }

      // Ocultar loading
      loading.style.display = "none";
      
      if (allMusicas.length === 0) {
        updateDebug("Nenhuma música, mostrando vazio");
        console.log("📭 Nenhuma música encontrada, exibindo estado vazio");
        emptyState.style.display = "block";
        musicGrid.style.display = "none";
      } else {
        updateDebug("Músicas exibidas com sucesso");
        console.log("🎵 Exibindo músicas");
        emptyState.style.display = "none";
        musicGrid.style.display = "grid";
        
        // Force DOM update
        musicGrid.offsetHeight;
        console.log(`🔧 DOM forçado, música grid display: ${getComputedStyle(musicGrid).display}`);
      }
    }, (error) => {
      updateDebug("ERRO no callback");
      console.error("❌ Erro ao carregar músicas:", error);
      loading.innerHTML = "❌ Erro ao carregar músicas: " + (error.message || error);
    });
  } catch (error) {
    updateDebug("ERRO crítico");
    console.error("❌ Erro crítico ao acessar database:", error);
    loading.innerHTML = "❌ Erro crítico: " + (error.message || error);
  }
}

function populateFilters() {
  const ministroSelect = document.getElementById("filter-ministro");
  const ministrosSet = new Set();
  
  // Coletar todos os ministros (tanto do campo ministro quanto do array ministros)
  allMusicas.forEach(musica => {
    if (musica.ministro) {
      ministrosSet.add(musica.ministro);
    }
    if (musica.ministros && Array.isArray(musica.ministros)) {
      musica.ministros.forEach(m => ministrosSet.add(m));
    }
  });
  
  const ministros = Array.from(ministrosSet).filter(Boolean);
  
  // Limpar opções existentes (exceto a primeira)
  ministroSelect.innerHTML = '<option value="">Todos os ministros</option>';
  
  ministros.sort().forEach(ministro => {
    const option = document.createElement("option");
    option.value = ministro;
    option.textContent = ministro;
    ministroSelect.appendChild(option);
  });
}

function setupEventListeners() {
  const searchInput = document.getElementById("search-input");
  const filterMinistro = document.getElementById("filter-ministro");
  const filterTom = document.getElementById("filter-tom");
  const sortOption = document.getElementById("sort-option");

  // Busca em tempo real
  searchInput.addEventListener("input", debounce(applyFilters, 300));
  
  // Filtros
  filterMinistro.addEventListener("change", applyFilters);
  filterTom.addEventListener("change", applyFilters);
  sortOption.addEventListener("change", applyFilters);
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function applyFilters() {
  const searchTerm = document.getElementById("search-input").value.toLowerCase();
  const selectedMinistro = document.getElementById("filter-ministro").value;
  const selectedTom = document.getElementById("filter-tom").value;
  const sortBy = document.getElementById("sort-option").value;

  // Filtrar músicas
  filteredMusicas = allMusicas.filter(musica => {
    const searchFields = [
      musica.titulo,
      musica.artista,
      musica.ministro,
      musica.tom,
      musica.bpm?.toString()
    ].filter(Boolean).join(' ').toLowerCase();
    
    // Incluir ministros do array se existir
    if (musica.ministros && Array.isArray(musica.ministros)) {
      searchFields += ' ' + musica.ministros.join(' ').toLowerCase();
    }
    
    // Incluir tom do ministro na busca
    if (musica.tomMinistro && typeof musica.tomMinistro === 'object') {
      const tomMinistroText = Object.entries(musica.tomMinistro)
        .map(([nome, tom]) => `${nome} ${tom}`)
        .join(' ').toLowerCase();
      searchFields += ' ' + tomMinistroText;
    }
    
    const matchesSearch = !searchTerm || searchFields.includes(searchTerm);
    
    const matchesMinistro = !selectedMinistro || 
      musica.ministro === selectedMinistro ||
      (musica.ministros && musica.ministros.includes(selectedMinistro));
    
    const matchesTom = !selectedTom || musica.tom === selectedTom ||
      (musica.tomMinistro && Object.values(musica.tomMinistro).includes(selectedTom));

    return matchesSearch && matchesMinistro && matchesTom;
  });

  // Ordenar músicas
  filteredMusicas.sort((a, b) => {
    switch (sortBy) {
      case "titulo":
        return a.titulo.localeCompare(b.titulo);
      case "ministro":
        return (a.ministro || "").localeCompare(b.ministro || "");
      case "tom":
        return (a.tom || "").localeCompare(b.tom || "");
      case "data":
        return (b.timestamp || 0) - (a.timestamp || 0);
      default:
        return a.titulo.localeCompare(b.titulo);
    }
  });

  renderMusicas();
}

function renderMusicas() {
  console.log("🎨 renderMusicas iniciada");
  console.log(`📊 allMusicas.length: ${allMusicas.length}`);
  console.log(`📊 filteredMusicas.length: ${filteredMusicas.length}`);
  
  const musicGrid = document.getElementById("lista-musicas");
  const emptyState = document.getElementById("empty-state");

  if (!musicGrid) {
    console.error("❌ Elemento lista-musicas não encontrado!");
    updateDebug("ERRO: lista-musicas não encontrado");
    return;
  }
  
  if (!emptyState) {
    console.error("❌ Elemento empty-state não encontrado!");
    updateDebug("ERRO: empty-state não encontrado");
    return;
  }

  if (filteredMusicas.length === 0 && allMusicas.length > 0) {
    // Tem músicas mas nenhuma passou no filtro
    console.log("🔍 Nenhuma música passou no filtro");
    updateDebug("Filtros bloqueando músicas");
    emptyState.innerHTML = `
      <i class="fas fa-search"></i>
      <h3>Nenhuma música encontrada</h3>
      <p>Tente ajustar os filtros de busca</p>
    `;
    emptyState.style.display = "block";
    musicGrid.style.display = "none";
    return;
  }

  if (filteredMusicas.length === 0) {
    console.log("📭 Nenhuma música para exibir");
    updateDebug("Nenhuma música carregada");
    emptyState.innerHTML = `
      <i class="fas fa-music"></i>
      <h3>Nenhuma música encontrada</h3>
      <p>Comece adicionando sua primeira música!</p>
    `;
    emptyState.style.display = "block";
    musicGrid.style.display = "none";
    return;
  }

  console.log(`🎵 Renderizando ${filteredMusicas.length} músicas`);
  updateDebug(`Renderizando ${filteredMusicas.length} músicas`);
  
  emptyState.style.display = "none";
  musicGrid.style.display = "grid";
  musicGrid.innerHTML = "";

  filteredMusicas.forEach((musica, index) => {
    console.log(`🎵 Criando card para música ${index + 1}: ${musica.titulo}`);
    try {
      const musicCard = createMusicCard(musica);
      if (musicCard) {
        musicGrid.appendChild(musicCard);
        console.log(`✅ Card adicionado: ${musica.titulo}`);
      } else {
        console.error(`❌ Card não criado para: ${musica.titulo}`);
      }
    } catch (error) {
      console.error(`❌ Erro ao criar card para ${musica.titulo}:`, error);
    }
  });
  
  // Forçar atualização DOM
  musicGrid.offsetHeight;
  
  console.log("✅ renderMusicas concluída");
  console.log(`🔧 Display final do grid: ${getComputedStyle(musicGrid).display}`);
  updateDebug(`✅ ${filteredMusicas.length} músicas renderizadas`);
}

function createMusicCard(musica) {
  console.log(`🔧 createMusicCard iniciada para: ${musica.titulo}`);
  
  try {
    const card = document.createElement("div");
    card.className = "music-card";
    card.onclick = () => window.location.href = `ver.html?id=${musica.id}`;

    // Processar ministros (se for array ou string)
    let ministrosDisplay = '';
    if (musica.ministros && Array.isArray(musica.ministros)) {
      ministrosDisplay = musica.ministros.join(', ');
    } else if (musica.ministro) {
      ministrosDisplay = musica.ministro;
    }

    // Processar tom do ministro para exibição
  let tomMinistroDisplay = '';
  if (musica.tomMinistro && typeof musica.tomMinistro === 'object') {
    const tomsMinistros = Object.entries(musica.tomMinistro)
      .map(([nome, tom]) => `${nome}: ${tom}`)
      .join(', ');
    tomMinistroDisplay = tomsMinistros;
  }

  card.innerHTML = `
    <div class="music-title">${musica.titulo}</div>
    ${musica.artista ? `<div class="music-subtitle">${musica.artista}</div>` : ''}
    <div class="music-info">
      ${ministrosDisplay ? `
        <div class="info-tag ministro">
          <i class="fas fa-user"></i>
          ${ministrosDisplay}
        </div>
      ` : ''}
      ${musica.tom ? `
        <div class="info-tag tom">
          <i class="fas fa-music"></i>
          ${musica.tom}
        </div>
      ` : ''}
      ${tomMinistroDisplay ? `
        <div class="info-tag tom-ministro">
          <i class="fas fa-user-music"></i>
          ${tomMinistroDisplay}
        </div>
      ` : ''}
      ${musica.bpm ? `
        <div class="info-tag bpm">
          <i class="fas fa-tachometer-alt"></i>
          ${musica.bpm} BPM
        </div>
      ` : ''}
      ${musica.link ? `
        <div class="info-tag link">
          <i class="fas fa-external-link-alt"></i>
          Link
        </div>
      ` : ''}
    </div>
    <div class="music-actions" onclick="event.stopPropagation()">
      <a href="ver.html?id=${musica.id}" class="action-btn btn-view">
        <i class="fas fa-eye"></i>
        Ver
      </a>
      ${musica.link ? `
        <a href="${musica.link}" target="_blank" class="action-btn btn-link">
          <i class="fas fa-external-link-alt"></i>
          Link
        </a>
      ` : ''}
      <button class="action-btn btn-edit" onclick="editMusica('${musica.id}')">
        <i class="fas fa-edit"></i>
        Editar
      </button>
      <button class="action-btn btn-delete" onclick="deleteMusica('${musica.id}', '${musica.titulo}')">
        <i class="fas fa-trash"></i>
        Excluir
      </button>
    </div>
  `;

  console.log(`✅ Card criado com sucesso para: ${musica.titulo}`);
  return card;
  
  } catch (error) {
    console.error(`❌ Erro ao criar card para ${musica.titulo}:`, error);
    return null;
  }
}

function updateStats() {
  const totalMusicas = allMusicas.length;
  const totalMinistros = new Set(allMusicas.map(m => m.ministro).filter(Boolean)).size;
  const totalTons = new Set(allMusicas.map(m => m.tom).filter(Boolean)).size;

  document.getElementById("total-musicas").textContent = totalMusicas;
  document.getElementById("total-ministros").textContent = totalMinistros;
  document.getElementById("total-tons").textContent = totalTons;
}

function clearFilters() {
  document.getElementById("search-input").value = "";
  document.getElementById("filter-ministro").value = "";
  document.getElementById("filter-tom").value = "";
  document.getElementById("sort-option").value = "titulo";
  applyFilters();
}

function editMusica(id) {
  // Implementar edição (pode ser uma nova página ou modal)
  window.location.href = `nova-musica.html?edit=${id}`;
}

// Função de fallback para renderizar dados diretamente
function fallbackRender() {
  console.log("🚨 Executando fallback render...");
  updateDebug("Fallback: renderizando dados exemplo");
  
  // Dados de exemplo diretos
  const exemploMusicas = [
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
      timestamp: Date.now() - 86400000
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
      timestamp: Date.now() - 172800000
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
      timestamp: Date.now() - 259200000
    }
  ];
  
  // Definir as músicas globalmente
  allMusicas = exemploMusicas;
  
  console.log(`🎵 Fallback: ${allMusicas.length} músicas carregadas`);
  updateDebug(`Fallback: ${allMusicas.length} músicas`);
  
  // Popular filtros
  try {
    populateFilters();
    updateDebug("Fallback: Filtros populados");
  } catch (error) {
    console.error("❌ Erro ao popular filtros no fallback:", error);
  }
  
  // Aplicar filtros e renderizar
  try {
    applyFilters();
    updateDebug("Fallback: Filtros aplicados");
  } catch (error) {
    console.error("❌ Erro ao aplicar filtros no fallback:", error);
  }
  
  // Atualizar estatísticas
  try {
    updateStats();
    updateDebug("Fallback: Estatísticas atualizadas");
  } catch (error) {
    console.error("❌ Erro ao atualizar estatísticas no fallback:", error);
  }
  
  // Ocultar loading
  const loading = document.getElementById("loading");
  const emptyState = document.getElementById("empty-state");
  const musicGrid = document.getElementById("lista-musicas");
  
  if (loading) loading.style.display = "none";
  
  if (allMusicas.length === 0) {
    updateDebug("Fallback: Nenhuma música, mostrando vazio");
    if (emptyState) emptyState.style.display = "block";
    if (musicGrid) musicGrid.style.display = "none";
  } else {
    updateDebug("Fallback: Músicas exibidas");
    if (emptyState) emptyState.style.display = "none";
    if (musicGrid) {
      musicGrid.style.display = "grid";
      // Force DOM update
      musicGrid.offsetHeight;
      console.log(`🔧 Fallback DOM forçado, música grid display: ${getComputedStyle(musicGrid).display}`);
    }
  }
  
  console.log("✅ Fallback render concluído");
}

function deleteMusica(id, titulo) {
  if (confirm(`Tem certeza que deseja excluir a música "${titulo}"?`)) {
    db.collection("musicas").doc(id).delete().then(() => {
      console.log("Música excluída com sucesso!");
      // A lista será atualizada automaticamente devido ao onSnapshot
    }).catch((error) => {
      console.error("Erro ao excluir música:", error);
      alert("Erro ao excluir música. Tente novamente.");
    });
  }
}
