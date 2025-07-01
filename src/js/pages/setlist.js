/**
 * Setlist Management - Sistema de criação e gerenciamento de setlists
 */

class SetlistManager {
  constructor() {
    this.db = new DatabaseService();
    this.transposeService = new TransposeService();
    this.selectedSongs = [];
    this.ministers = [];
    this.allSongs = [];
    this.selectedMinister = null;
    this.editMode = false;
    this.currentSetlistId = null;
    
    this.init();
  }

  async init() {
    try {
      console.log('🚀 Iniciando SetlistManager...');
      
      // Verificar se está em modo de edição
      const urlParams = new URLSearchParams(window.location.search);
      const editId = urlParams.get('edit');
      
      if (editId) {
        this.editMode = true;
        this.currentSetlistId = editId;
        document.querySelector('.page-title').innerHTML = '<i class="fas fa-edit"></i> Editar Setlist';
        document.querySelector('.page-subtitle').textContent = 'Faça as alterações necessárias na sua setlist';
        document.getElementById('save-setlist').innerHTML = '<i class="fas fa-save"></i> Salvar Alterações';
      }

      // Inicializar banco de dados
      console.log('🔧 Inicializando banco de dados...');
      this.db.initializeFirebase();
      this.db.initializeLocalStorage();
      
      // Carregar dados sequencialmente
      console.log('📊 Carregando dados...');
      await this.loadSongs();
      await this.loadMinisters();
      
      // Verificar se dados foram carregados
      console.log('📈 Resumo dos dados carregados:');
      console.log(`- Músicas: ${this.allSongs.length}`);
      console.log(`- Ministros: ${this.ministers.length}`);
      
      // Se está editando, carregar dados da setlist
      if (this.editMode) {
        console.log('✏️ Carregando setlist para edição...');
        await this.loadSetlistForEdit();
      }
      
      // Configurar interface
      console.log('🎨 Configurando interface...');
      this.setupEventListeners();
      this.populateMinisterSelect();
      
      if (!this.editMode) {
        this.setDefaultDate();
      }
      
      console.log('✅ SetlistManager inicializado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao inicializar SetlistManager:', error);
    }
  }

  async loadSetlistForEdit() {
    try {
      // Carregar setlist do banco de dados
      let setlist = null;
      
      // Tentar Firebase primeiro
      if (this.db.firestoreDB) {
        try {
          const doc = await this.db.firestoreDB.collection('setlists').doc(this.currentSetlistId).get();
          if (doc.exists) {
            setlist = { id: doc.id, ...doc.data() };
          }
        } catch (firebaseError) {
          console.warn('⚠️ Erro ao carregar do Firebase, tentando localStorage:', firebaseError);
        }
      }
      
      // Fallback para localStorage
      if (!setlist) {
        const localSetlists = JSON.parse(localStorage.getItem('setlists') || '[]');
        setlist = localSetlists.find(s => s.id === this.currentSetlistId);
      }
      
      if (!setlist) {
        alert('Setlist não encontrada!');
        window.location.href = 'setlists.html';
        return;
      }
      
      // Preencher formulário
      document.getElementById('setlist-name').value = setlist.nome || '';
      document.getElementById('setlist-date').value = setlist.data || '';
      document.getElementById('setlist-description').value = setlist.descricao || '';
      
      // Selecionar ministro
      if (setlist.ministro) {
        // Aguardar o ministro estar carregado
        setTimeout(() => {
          document.getElementById('minister-select').value = setlist.ministro;
          this.handleMinisterSelection(setlist.ministro);
        }, 500);
      }
      
      // Carregar músicas
      if (setlist.musicas && setlist.musicas.length > 0) {
        // Buscar dados completos das músicas
        this.selectedSongs = [];
        
        for (const songData of setlist.musicas) {
          const fullSong = this.allSongs.find(s => s.id === songData.id);
          if (fullSong) {
            this.selectedSongs.push({
              ...fullSong,
              finalKey: songData.tomFinal,
              transposed: songData.transposta,
              ministerSpecificKey: songData.tomEspecificoMinistro || false,
              order: songData.ordem
            });
          }
        }
        
        // Ordenar por ordem
        this.selectedSongs.sort((a, b) => a.order - b.order);
        this.updateSelectedSongsList();
      }
      
      console.log('📝 Setlist carregada para edição:', setlist.nome);
    } catch (error) {
      console.error('❌ Erro ao carregar setlist para edição:', error);
      alert('Erro ao carregar setlist para edição!');
      window.location.href = 'setlists.html';
    }
  }

  async loadSongs() {
    try {
      console.log('🎵 Iniciando carregamento de músicas...');
      
      // Tentar carregar do Firebase primeiro
      let loadedFromFirebase = false;
      
      if (this.db.firestoreDB) {
        try {
          console.log('🔥 Tentando carregar do Firebase...');
          const response = await this.db.collection('musicas').get();
          if (response.docs && response.docs.length > 0) {
            this.allSongs = response.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            loadedFromFirebase = true;
            console.log(`✅ ${this.allSongs.length} músicas carregadas do Firebase`);
          }
        } catch (firebaseError) {
          console.warn('⚠️ Erro ao carregar do Firebase:', firebaseError);
        }
      }
      
      // Se não carregou do Firebase, usar localStorage
      if (!loadedFromFirebase) {
        console.log('💾 Carregando do localStorage...');
        const localSongs = localStorage.getItem('musicas');
        if (localSongs) {
          this.allSongs = JSON.parse(localSongs);
          console.log(`✅ ${this.allSongs.length} músicas carregadas do localStorage`);
        } else {
          console.log('📝 Nenhuma música encontrada, usando dados de exemplo...');
          this.allSongs = this.db.getExampleData();
          localStorage.setItem('musicas', JSON.stringify(this.allSongs));
          console.log(`✅ ${this.allSongs.length} músicas de exemplo criadas`);
        }
      }
      
      // Verificações adicionais
      console.log('📊 Análise das músicas carregadas:');
      console.log(`- Total: ${this.allSongs.length}`);
      
      const songsWithMinisterKey = this.allSongs.filter(song => song.tomMinistro);
      console.log(`- Com tomMinistro: ${songsWithMinisterKey.length}`);
      
      if (this.allSongs.length > 0) {
        console.log('- Primeira música:', this.allSongs[0]);
      }
      
    } catch (error) {
      console.error('❌ Erro ao carregar músicas:', error);
      // Em caso de erro total, garantir que há pelo menos dados de exemplo
      this.allSongs = this.db.getExampleData();
      localStorage.setItem('musicas', JSON.stringify(this.allSongs));
      console.log('� Usando dados de exemplo como fallback');
    }
  }

  async loadMinisters() {
    try {
      console.log('🔍 Carregando ministros...');
      console.log('Total de músicas disponíveis:', this.allSongs.length);
      
      // Extrair ministros únicos do campo tomMinistro das músicas
      const ministerData = new Map();
      
      this.allSongs.forEach((song, index) => {
        console.log(`Música ${index + 1}: ${song.titulo}`);
        console.log('tomMinistro:', song.tomMinistro);
        
        if (song.tomMinistro && typeof song.tomMinistro === 'object') {
          // Iterar sobre o objeto tomMinistro { 'ministro': 'tom' }
          Object.entries(song.tomMinistro).forEach(([ministerName, ministerKey]) => {
            if (ministerName && ministerKey) {
              console.log(`  Ministro encontrado: ${ministerName} - Tom: ${ministerKey}`);
              
              if (!ministerData.has(ministerName)) {
                ministerData.set(ministerName, {
                  name: ministerName,
                  keys: [],
                  songCount: 0
                });
              }
              
              const minister = ministerData.get(ministerName);
              minister.keys.push(ministerKey);
              minister.songCount++;
            }
          });
        } else {
          console.log(`  Música sem tomMinistro ou formato inválido`);
        }
      });

      console.log('Dados de ministros coletados:', Array.from(ministerData.entries()));

      // Converter Map para array e calcular tom preferido
      this.ministers = Array.from(ministerData.values()).map(minister => {
        // Calcular o tom mais frequente
        let preferredKey = 'C';
        if (minister.keys.length > 0) {
          const keyCount = {};
          minister.keys.forEach(key => {
            keyCount[key] = (keyCount[key] || 0) + 1;
          });
          preferredKey = Object.keys(keyCount).reduce((a, b) => keyCount[a] > keyCount[b] ? a : b);
        }

        return {
          name: minister.name,
          preferredKey,
          songCount: minister.songCount,
          allKeys: [...new Set(minister.keys)] // Todos os tons únicos que o ministro canta
        };
      }).sort((a, b) => a.name.localeCompare(b.name));

      console.log(`👥 ${this.ministers.length} ministros encontrados do campo tomMinistro`);
      console.log('Ministros carregados:', this.ministers);
    } catch (error) {
      console.error('❌ Erro ao carregar ministros:', error);
      this.ministers = [];
    }
  }

  setupEventListeners() {
    // Busca de músicas
    const songSearch = document.getElementById('song-search');
    const songSuggestions = document.getElementById('song-suggestions');
    
    songSearch.addEventListener('input', (e) => {
      this.handleSongSearch(e.target.value);
    });

    // Fechar sugestões ao clicar fora
    document.addEventListener('click', (e) => {
      if (!songSearch.contains(e.target) && !songSuggestions.contains(e.target)) {
        songSuggestions.style.display = 'none';
      }
    });

    // Seleção de ministro
    const ministerSelect = document.getElementById('minister-select');
    ministerSelect.addEventListener('change', (e) => {
      this.handleMinisterSelection(e.target.value);
    });

    // Salvar setlist
    const saveButton = document.getElementById('save-setlist');
    saveButton.addEventListener('click', () => {
      this.saveSetlist();
    });
  }

  populateMinisterSelect() {
    const ministerSelect = document.getElementById('minister-select');
    
    if (!ministerSelect) {
      console.error('❌ Elemento minister-select não encontrado');
      return;
    }
    
    // Limpar opções existentes (exceto a primeira)
    while (ministerSelect.children.length > 1) {
      ministerSelect.removeChild(ministerSelect.lastChild);
    }

    console.log(`🎤 Populando select com ${this.ministers.length} ministros`);

    // Adicionar ministros
    if (this.ministers.length === 0) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'Nenhum ministro encontrado';
      option.disabled = true;
      ministerSelect.appendChild(option);
    } else {
      this.ministers.forEach((minister, index) => {
        console.log(`  ${index + 1}. ${minister.name} - Tom: ${minister.preferredKey} (${minister.songCount} músicas)`);
        
        const option = document.createElement('option');
        option.value = minister.name;
        option.textContent = `${minister.name} - Tom: ${minister.preferredKey} (${minister.songCount} música${minister.songCount !== 1 ? 's' : ''})`;
        ministerSelect.appendChild(option);
      });
    }

    console.log(`✅ ${this.ministers.length} ministros adicionados ao select`);
  }

  setDefaultDate() {
    const dateInput = document.getElementById('setlist-date');
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    dateInput.value = `${yyyy}-${mm}-${dd}`;
  }

  handleSongSearch(query) {
    const songSuggestions = document.getElementById('song-suggestions');
    
    console.log('🔍 Buscando músicas para:', query);
    console.log('Total de músicas disponíveis:', this.allSongs.length);
    
    if (!query.trim()) {
      songSuggestions.style.display = 'none';
      return;
    }

    // Filtrar músicas que não estão na setlist
    const availableSongs = this.allSongs.filter(song => 
      !this.selectedSongs.find(selected => selected.id === song.id)
    );
    
    console.log('Músicas disponíveis (não na setlist):', availableSongs.length);

    // Buscar por título, artista ou ministro
    const filteredSongs = availableSongs.filter(song => {
      const searchTerm = query.toLowerCase();
      const titleMatch = song.titulo && song.titulo.toLowerCase().includes(searchTerm);
      const artistMatch = song.artista && song.artista.toLowerCase().includes(searchTerm);
      const ministerMatch = song.ministro && song.ministro.toLowerCase().includes(searchTerm);
      
      return titleMatch || artistMatch || ministerMatch;
    }).slice(0, 5); // Limitar a 5 resultados

    console.log('Músicas filtradas:', filteredSongs.length);
    console.log('Primeiras músicas encontradas:', filteredSongs.slice(0, 2));

    this.displaySongSuggestions(filteredSongs);
  }

  displaySongSuggestions(songs) {
    const songSuggestions = document.getElementById('song-suggestions');
    
    console.log('📋 Exibindo sugestões:', songs.length, 'músicas');
    
    if (songs.length === 0) {
      songSuggestions.innerHTML = '<div class="song-suggestion" style="opacity: 0.7; font-style: italic;">Nenhuma música encontrada</div>';
      songSuggestions.style.display = 'block';
      return;
    }

    songSuggestions.innerHTML = '';
    songs.forEach((song, index) => {
      console.log(`  ${index + 1}. ${song.titulo} - ${song.artista}`);
      
      const suggestionDiv = document.createElement('div');
      suggestionDiv.className = 'song-suggestion';
      suggestionDiv.innerHTML = `
        <div class="song-title">${song.titulo}</div>
        <div class="song-artist">${song.artista} • Tom: ${song.tom}</div>
      `;
      
      suggestionDiv.addEventListener('click', () => {
        console.log('🎵 Música selecionada:', song.titulo);
        this.addSongToSetlist(song);
      });
      
      songSuggestions.appendChild(suggestionDiv);
    });
    
    songSuggestions.style.display = 'block';
    console.log('✅ Sugestões exibidas');
  }

  addSongToSetlist(song) {
    // Verificar se a música já está na setlist
    if (this.selectedSongs.find(selected => selected.id === song.id)) {
      alert('Esta música já está na setlist!');
      return;
    }

    // Calcular tom baseado no ministro selecionado
    let finalKey = song.tom;
    let transposed = false;
    let ministerSpecificKey = false;
    
    if (this.selectedMinister) {
      // Verificar se existe tom específico do ministro para esta música
      if (song.tomMinistro && song.tomMinistro[this.selectedMinister.name]) {
        finalKey = song.tomMinistro[this.selectedMinister.name];
        ministerSpecificKey = true;
        transposed = finalKey !== song.tom;
        console.log(`🎵 Tom específico encontrado para ${this.selectedMinister.name}: ${finalKey}`);
      } else {
        // Usar tom preferido do ministro como fallback
        const ministerKey = this.selectedMinister.preferredKey;
        if (ministerKey && ministerKey !== song.tom) {
          try {
            finalKey = this.transposeService.transposeKey(song.tom, ministerKey);
            transposed = finalKey !== song.tom;
            console.log(`🎼 Transpondo de ${song.tom} para ${finalKey} (tom preferido do ministro)`);
          } catch (error) {
            console.warn('Erro ao transpor música:', error);
            finalKey = song.tom;
          }
        }
      }
    }

    const songData = {
      ...song,
      finalKey,
      transposed,
      ministerSpecificKey,
      order: this.selectedSongs.length + 1
    };

    this.selectedSongs.push(songData);
    this.updateSelectedSongsList();
    this.clearSongSearch();

    console.log(`🎵 Música adicionada: ${song.titulo} (Tom: ${finalKey}${ministerSpecificKey ? ' - tom específico' : ''})`);
  }

  removeSongFromSetlist(songId) {
    this.selectedSongs = this.selectedSongs.filter(song => song.id !== songId);
    this.updateSelectedSongsList();
    console.log('🗑️ Música removida da setlist');
  }

  moveSong(songId, direction) {
    const currentIndex = this.selectedSongs.findIndex(song => song.id === songId);
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    if (newIndex >= 0 && newIndex < this.selectedSongs.length) {
      const temp = this.selectedSongs[currentIndex];
      this.selectedSongs[currentIndex] = this.selectedSongs[newIndex];
      this.selectedSongs[newIndex] = temp;
      
      this.updateSelectedSongsList();
      console.log('🔄 Ordem das músicas alterada');
    }
  }

  updateSelectedSongsList() {
    const selectedSongsList = document.getElementById('selected-songs-list');
    
    if (this.selectedSongs.length === 0) {
      selectedSongsList.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-music" style="font-size: 2rem; margin-bottom: 10px; opacity: 0.5;"></i>
          <p>Nenhuma música selecionada ainda.</p>
          <p>Use o campo de busca acima para adicionar músicas.</p>
        </div>
      `;
      return;
    }

    selectedSongsList.innerHTML = '';
    
    this.selectedSongs.forEach((song, index) => {
      const songDiv = document.createElement('div');
      songDiv.className = 'selected-song';
      
      // Determinar o tipo de transposição
      let transposeInfo = '';
      if (song.ministerSpecificKey) {
        transposeInfo = '<span style="color: #4CAF50; font-size: 0.8rem;">● Tom do Ministro</span>';
      } else if (song.transposed) {
        transposeInfo = '<span style="color: #ff9800; font-size: 0.8rem;">● Transposta</span>';
      }
      
      songDiv.innerHTML = `
        <div class="song-info">
          <div class="song-title">${index + 1}. ${song.titulo}</div>
          <div class="song-details">
            <span>Artista: ${song.artista}</span>
            <span class="song-key">Tom: ${song.finalKey}</span>
            ${song.tom !== song.finalKey ? `<span style="color: #666; font-size: 0.8rem;">(Original: ${song.tom})</span>` : ''}
            ${transposeInfo}
          </div>
        </div>
        <div class="song-actions">
          ${index > 0 ? `<button class="btn-move" onclick="setlistManager.moveSong('${song.id}', 'up')"><i class="fas fa-arrow-up"></i></button>` : ''}
          ${index < this.selectedSongs.length - 1 ? `<button class="btn-move" onclick="setlistManager.moveSong('${song.id}', 'down')"><i class="fas fa-arrow-down"></i></button>` : ''}
          <button class="btn-remove" onclick="setlistManager.removeSongFromSetlist('${song.id}')">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      `;
      
      selectedSongsList.appendChild(songDiv);
    });
  }

  clearSongSearch() {
    const songSearch = document.getElementById('song-search');
    const songSuggestions = document.getElementById('song-suggestions');
    
    songSearch.value = '';
    songSuggestions.style.display = 'none';
  }

  handleMinisterSelection(ministerName) {
    if (!ministerName) {
      this.selectedMinister = null;
      document.getElementById('minister-info').classList.remove('show');
      return;
    }

    this.selectedMinister = this.ministers.find(m => m.name === ministerName);
    
    if (this.selectedMinister) {
      const ministerInfo = document.getElementById('minister-info');
      const ministerKey = ministerInfo.querySelector('.minister-key');
      
      ministerKey.textContent = this.selectedMinister.preferredKey;
      
      // Atualizar o texto da informação do ministro
      ministerInfo.innerHTML = `
        <p><strong>Tom Preferido:</strong> <span class="minister-key">${this.selectedMinister.preferredKey}</span></p>
        <p><strong>Total de Músicas:</strong> ${this.selectedMinister.songCount}</p>
        ${this.selectedMinister.allKeys.length > 1 ? 
          `<p><strong>Outros Tons:</strong> ${this.selectedMinister.allKeys.filter(k => k !== this.selectedMinister.preferredKey).join(', ')}</p>` : 
          ''
        }
        <p><small>As músicas serão automaticamente ajustadas para os tons específicos deste ministro quando disponíveis.</small></p>
      `;
      
      ministerInfo.classList.add('show');

      // Reajustar tons das músicas já selecionadas
      this.adjustSongsForMinister();
      
      console.log(`👤 Ministro selecionado: ${ministerName} (Tom preferido: ${this.selectedMinister.preferredKey})`);
      console.log(`🎵 Ministro canta ${this.selectedMinister.songCount} músicas nos tons: ${this.selectedMinister.allKeys.join(', ')}`);
    }
  }

  adjustSongsForMinister() {
    if (!this.selectedMinister || this.selectedSongs.length === 0) return;

    this.selectedSongs.forEach(song => {
      let newKey = song.tom;
      let transposed = false;
      let ministerSpecificKey = false;

      // Verificar se existe tom específico do ministro para esta música
      if (song.tomMinistro && song.tomMinistro[this.selectedMinister.name]) {
        newKey = song.tomMinistro[this.selectedMinister.name];
        ministerSpecificKey = true;
        transposed = newKey !== song.tom;
        console.log(`🎵 Tom específico para ${song.titulo}: ${newKey}`);
      } else {
        // Usar tom preferido do ministro como fallback
        const ministerKey = this.selectedMinister.preferredKey;
        if (ministerKey && ministerKey !== song.tom) {
          try {
            newKey = this.transposeService.transposeKey(song.tom, ministerKey);
            transposed = newKey !== song.tom;
            console.log(`🎼 Transpondo ${song.titulo}: ${song.tom} → ${newKey}`);
          } catch (error) {
            console.warn('Erro ao transpor música:', error);
            newKey = song.tom;
          }
        }
      }

      song.finalKey = newKey;
      song.transposed = transposed;
      song.ministerSpecificKey = ministerSpecificKey;
    });

    this.updateSelectedSongsList();
    console.log('🎼 Tons das músicas ajustados para o ministro');
  }

  async saveSetlist() {
    const setlistName = document.getElementById('setlist-name').value.trim();
    const setlistDate = document.getElementById('setlist-date').value;
    const setlistDescription = document.getElementById('setlist-description').value.trim();

    // Validações
    if (!setlistName) {
      alert('Por favor, digite um nome para a setlist.');
      return;
    }

    if (!setlistDate) {
      alert('Por favor, selecione uma data para o culto.');
      return;
    }

    if (!this.selectedMinister) {
      alert('Por favor, selecione um ministro principal.');
      return;
    }

    if (this.selectedSongs.length === 0) {
      alert('Por favor, adicione pelo menos uma música à setlist.');
      return;
    }

    const setlistData = {
      nome: setlistName,
      data: setlistDate,
      descricao: setlistDescription,
      ministro: this.selectedMinister.name,
      ministroTom: this.selectedMinister.preferredKey,
      musicas: this.selectedSongs.map((song, index) => ({
        id: song.id,
        titulo: song.titulo,
        artista: song.artista,
        tomOriginal: song.tom,
        tomFinal: song.finalKey,
        transposta: song.transposed,
        tomEspecificoMinistro: song.ministerSpecificKey || false,
        ordem: index + 1
      })),
      totalMusicas: this.selectedSongs.length,
      timestamp: Date.now()
    };

    // Se não é edição, adicionar data de criação
    if (!this.editMode) {
      setlistData.criadoEm = new Date();
    }

    try {
      let result;
      
      if (this.editMode) {
        // Atualizar setlist existente
        if (this.db.firestoreDB) {
          try {
            await this.db.firestoreDB.collection('setlists').doc(this.currentSetlistId).update(setlistData);
            result = { id: this.currentSetlistId };
          } catch (firebaseError) {
            console.warn('⚠️ Erro ao atualizar no Firebase, usando localStorage:', firebaseError);
            // Fallback para localStorage
            const localSetlists = JSON.parse(localStorage.getItem('setlists') || '[]');
            const index = localSetlists.findIndex(s => s.id === this.currentSetlistId);
            if (index !== -1) {
              localSetlists[index] = { ...setlistData, id: this.currentSetlistId };
              localStorage.setItem('setlists', JSON.stringify(localSetlists));
              result = { id: this.currentSetlistId };
            }
          }
        } else {
          // Apenas localStorage
          const localSetlists = JSON.parse(localStorage.getItem('setlists') || '[]');
          const index = localSetlists.findIndex(s => s.id === this.currentSetlistId);
          if (index !== -1) {
            localSetlists[index] = { ...setlistData, id: this.currentSetlistId };
            localStorage.setItem('setlists', JSON.stringify(localSetlists));
            result = { id: this.currentSetlistId };
          }
        }
        
        alert('✅ Setlist atualizada com sucesso!');
        console.log('✅ Setlist atualizada:', this.currentSetlistId);
      } else {
        // Criar nova setlist
        result = await this.db.collection('setlists').add(setlistData);
        alert('✅ Setlist salva com sucesso!');
        console.log('✅ Setlist salva:', result.id);
      }
      
      // Redirecionar para lista de setlists
      window.location.href = 'setlists.html';
      
    } catch (error) {
      console.error('❌ Erro ao salvar setlist:', error);
      alert('❌ Erro ao salvar setlist. Tente novamente.');
    }
  }
}

// Inicializar quando a página carregar
let setlistManager;

document.addEventListener('DOMContentLoaded', async () => {
  console.log('🌐 DOM carregado, iniciando SetlistManager...');
  
  // Aguardar um pouco para garantir que todos os scripts foram carregados
  await new Promise(resolve => setTimeout(resolve, 100));
  
  try {
    setlistManager = new SetlistManager();
    window.setlistManager = setlistManager;
    console.log('🎯 SetlistManager disponível globalmente');
  } catch (error) {
    console.error('❌ Erro ao criar SetlistManager:', error);
  }
});
