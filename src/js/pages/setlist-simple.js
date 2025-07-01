/**
 * Setlist Management - Versão Simplificada
 */

class SetlistManager {
  constructor() {
    this.allSongs = [];
    this.ministers = [];
    this.selectedSongs = [];
    this.editMode = false;
    this.currentSetlistId = null;
    
    this.init();
  }

  async init() {
    console.log('🚀 Iniciando SetlistManager simples...');
    
    try {
      // Carregar dados básicos
      await this.loadData();
      
      // Configurar interface
      await this.setupInterface();
      
      console.log('✅ SetlistManager inicializado');
    } catch (error) {
      console.error('❌ Erro:', error);
    }
  }

  async loadData() {
    console.log('📊 Carregando dados...');
    
    try {
      // Inicializar Firebase se disponível
      let db = null;
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
        db = firebase.firestore();
        console.log('🔥 Firebase inicializado com sucesso');
        
        // Teste de conexão com Firestore
        await this.testFirestoreConnection(db);
      }

      // Tentar carregar do Firestore primeiro
      if (db) {
        try {
          console.log('🔍 Buscando músicas no Firestore...');
          const snapshot = await db.collection('musicas').get();
          
          if (!snapshot.empty) {
            this.allSongs = [];
            snapshot.forEach(doc => {
              const data = doc.data();
              this.allSongs.push({
                id: doc.id,
                titulo: data.titulo || '',
                artista: data.artista || '',
                tom: data.tom || 'C',
                tomMinistro: data.tomMinistro || {},
                ministro: data.ministro || '',
                cifra: data.cifra || '',
                bpm: data.bpm || 120,
                link: data.link || ''
              });
            });
            console.log(`✅ ${this.allSongs.length} músicas carregadas do Firestore`);
            
            // Salvar no localStorage como backup
            localStorage.setItem('musicas', JSON.stringify(this.allSongs));
          } else {
            console.log('📭 Nenhuma música encontrada no Firestore, usando fallback');
            this.loadFallbackData();
          }
        } catch (firestoreError) {
          console.warn('⚠️ Erro ao carregar do Firestore:', firestoreError);
          this.loadFallbackData();
        }
      } else {
        console.log('🚫 Firebase não disponível, usando dados locais');
        this.loadFallbackData();
      }

      // Extrair ministros das músicas carregadas
      this.extractMinisters();

    } catch (error) {
      console.error('❌ Erro geral ao carregar dados:', error);
      this.loadFallbackData();
      this.extractMinisters();
    }
  }

  async testFirestoreConnection(db) {
    try {
      console.log('🧪 Testando conexão com Firestore...');
      
      // Teste simples de leitura
      const testSnapshot = await db.collection('musicas').limit(1).get();
      console.log('✅ Teste de leitura do Firestore bem-sucedido');
      
      // Teste de escrita (documento temporário)
      const testDoc = {
        teste: true,
        timestamp: new Date(),
        tipo: 'teste-conexao'
      };
      
      await db.collection('_test').doc('conexao-test').set(testDoc);
      console.log('✅ Teste de escrita do Firestore bem-sucedido');
      
      // Limpar teste
      await db.collection('_test').doc('conexao-test').delete();
      console.log('✅ Limpeza do teste concluída');
      
    } catch (testError) {
      console.error('❌ ERRO no teste de conexão Firestore:', {
        message: testError.message,
        code: testError.code,
        details: testError
      });
      
      if (testError.code === 'permission-denied') {
        console.error('🔒 PERMISSÕES DO FIRESTORE NEGADAS!');
        console.error('Verifique as regras de segurança do Firestore');
      }
    }
  }

  loadFallbackData() {
    console.log('📝 Carregando dados de fallback...');
    
    // Tentar localStorage primeiro
    const localSongs = localStorage.getItem('musicas');
    if (localSongs) {
      try {
        this.allSongs = JSON.parse(localSongs);
        console.log(`💾 ${this.allSongs.length} músicas carregadas do localStorage`);
        return;
      } catch (parseError) {
        console.warn('⚠️ Erro ao parsear localStorage:', parseError);
      }
    }

    // Dados de exemplo como último recurso
    this.allSongs = [
      {
        id: 'exemplo1',
        titulo: 'Quão Grande é o Meu Deus',
        artista: 'Chris Tomlin',
        tom: 'G',
        tomMinistro: { 'João Silva': 'G', 'Maria Santos': 'A' }
      },
      {
        id: 'exemplo2',
        titulo: 'Reckless Love',
        artista: 'Cory Asbury',
        tom: 'C',
        tomMinistro: { 'Maria Santos': 'C' }
      },
      {
        id: 'exemplo3',
        titulo: 'Oceanos',
        artista: 'Hillsong United',
        tom: 'D',
        tomMinistro: { 'Pedro Lima': 'D', 'Ana Costa': 'E' }
      },
      {
        id: 'exemplo4',
        titulo: 'Jesus em Tua Presença',
        artista: 'Kleber Lucas',
        tom: 'F',
        tomMinistro: { 'João Silva': 'F', 'Pedro Lima': 'G' }
      },
      {
        id: 'exemplo5',
        titulo: 'Lugar Secreto',
        artista: 'Diante do Trono',
        tom: 'E',
        tomMinistro: { 'Maria Santos': 'E', 'Ana Costa': 'F' }
      }
    ];
    console.log(`📋 ${this.allSongs.length} músicas de exemplo carregadas`);
  }

  extractMinisters() {
    console.log('👥 Extraindo ministros das músicas...');
    
    const ministerMap = new Map();
    
    this.allSongs.forEach(song => {
      console.log(`Processando música: ${song.titulo}`);
      console.log('tomMinistro:', song.tomMinistro);
      
      if (song.tomMinistro && typeof song.tomMinistro === 'object') {
        Object.entries(song.tomMinistro).forEach(([name, key]) => {
          if (name && key) {
            console.log(`  Ministro encontrado: ${name} - Tom: ${key}`);
            
            if (!ministerMap.has(name)) {
              ministerMap.set(name, { name, keys: [], songCount: 0 });
            }
            ministerMap.get(name).keys.push(key);
            ministerMap.get(name).songCount++;
          }
        });
      }
    });

    // Converter para array e calcular tons preferidos
    this.ministers = Array.from(ministerMap.values()).map(minister => {
      // Tom mais frequente
      const keyCount = {};
      minister.keys.forEach(key => keyCount[key] = (keyCount[key] || 0) + 1);
      const preferredKey = Object.keys(keyCount).reduce((a, b) => keyCount[a] > keyCount[b] ? a : b, 'C');
      
      return {
        name: minister.name,
        preferredKey,
        songCount: minister.songCount,
        allKeys: [...new Set(minister.keys)]
      };
    }).sort((a, b) => a.name.localeCompare(b.name));

    console.log(`✅ ${this.allSongs.length} músicas e ${this.ministers.length} ministros carregados`);
    console.log('Ministros encontrados:', this.ministers.map(m => `${m.name} (${m.preferredKey})`));
  }

  async setupInterface() {
    console.log('🎨 Configurando interface...');
    
    // Verificar se está em modo de edição
    await this.checkEditMode();
    
    // Configurar eventos
    this.setupEvents();
    
    // Data padrão (se não estiver editando)
    if (!this.editMode) {
      const dateInput = document.getElementById('setlist-date');
      if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.value = today;
      }
    }
  }

  async checkEditMode() {
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('edit');
    
    console.log('🔍 Verificando modo de edição...', { 
      urlParams: urlParams.toString(), 
      editId 
    });
    
    if (editId) {
      console.log('📝 Modo de edição detectado para ID:', editId);
      this.editMode = true;
      this.currentSetlistId = editId;
      await this.loadSetlistForEdit(editId);
      
      // Alterar título da página
      const title = document.querySelector('.header h1');
      if (title) {
        title.textContent = 'Editar Setlist';
      }
      
      // Alterar título da página principal
      const pageTitle = document.querySelector('.page-title');
      if (pageTitle) {
        pageTitle.innerHTML = '<i class="fas fa-edit"></i> Editar Setlist';
      }
      
      // Alterar texto do botão salvar
      const saveBtn = document.getElementById('save-setlist');
      if (saveBtn) {
        saveBtn.textContent = 'Atualizar Setlist';
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Atualizar Setlist';
      }
    } else {
      console.log('✨ Modo de criação de nova setlist');
    }
  }

  async loadSetlistForEdit(id) {
    console.log('🔍 Carregando setlist para edição:', id);
    
    try {
      let setlist = null;
      
      // Tentar carregar do Firestore primeiro
      if (this.db) {
        console.log('🔥 Tentando carregar do Firestore...');
        const doc = await this.db.collection('setlists').doc(id).get();
        if (doc.exists) {
          setlist = {
            id: doc.id,
            ...doc.data(),
            criadoEm: doc.data().criadoEm?.toDate?.() || doc.data().criadoEm
          };
          console.log('✅ Setlist carregada do Firestore');
        }
      }
      
      // Fallback para localStorage se não encontrou no Firestore
      if (!setlist) {
        console.log('💾 Fallback: tentando carregar do localStorage...');
        const stored = localStorage.getItem('setlists');
        const setlists = stored ? JSON.parse(stored) : [];
        setlist = setlists.find(s => s.id === id);
      }
      
      if (!setlist) {
        console.error('❌ Setlist não encontrada:', id);
        alert('Setlist não encontrada!');
        window.location.href = 'setlists.html';
        return;
      }
      
      console.log('📋 Setlist encontrada:', setlist);
      
      // Preencher formulário
      this.fillFormWithSetlist(setlist);
      
    } catch (error) {
      console.error('❌ Erro ao carregar setlist:', error);
      alert('Erro ao carregar setlist para edição!');
      window.location.href = 'setlists.html';
    }
  }

  fillFormWithSetlist(setlist) {
    console.log('📝 Preenchendo formulário com dados da setlist:', setlist);
    
    // Nome
    const nameInput = document.getElementById('setlist-name');
    if (nameInput) nameInput.value = setlist.nome || '';
    
    // Data
    const dateInput = document.getElementById('setlist-date');
    if (dateInput && setlist.data) {
      try {
        const date = new Date(setlist.data);
        dateInput.value = date.toISOString().split('T')[0];
      } catch (e) {
        console.warn('⚠️ Erro ao converter data:', e);
      }
    }
    
    // Descrição
    const descInput = document.getElementById('setlist-description');
    if (descInput) descInput.value = setlist.descricao || '';
    
    // Músicas - carregar com ministros individuais
    if (setlist.musicas && setlist.musicas.length > 0) {
      console.log('🎵 Carregando músicas com ministros individuais...');
      
      this.selectedSongs = setlist.musicas.map((song, index) => {
        // Determinar ministro específico da música
        let assignedMinister = null;
        
        // Verificar se a música tem ministro específico (formato novo)
        if (song.ministro && song.ministroEspecifico) {
          assignedMinister = song.ministro;
        } else if (song.ministro && song.ministro !== setlist.ministro) {
          // Ministro diferente do padrão indica específico
          assignedMinister = song.ministro;
        }
        
        console.log(`  Música: ${song.titulo} - Ministro: ${assignedMinister || 'padrão'} - Tom: ${song.tomFinal || song.tom}`);
        
        return {
          id: song.id,
          titulo: song.titulo,
          artista: song.artista,
          tom: song.tomOriginal || song.tom, // tom original da música
          finalKey: song.tomFinal || song.tom, // tom final aplicado
          ministerSpecific: song.tomEspecificoMinistro || false,
          assignedMinister: assignedMinister, // ministro específico para esta música
          order: song.ordem || (index + 1)
        };
      });
      
      console.log(`✅ ${this.selectedSongs.length} músicas carregadas para edição com ministros individuais`);
      
      // Atualizar a lista visual de músicas
      setTimeout(() => {
        this.updateSongsList();
      }, 100); // pequeno delay para garantir que o DOM esteja pronto
    }
  }

  setupEvents() {
    // Busca de músicas
    const songSearch = document.getElementById('song-search');
    if (songSearch) {
      songSearch.addEventListener('input', (e) => {
        this.handleSongSearch(e.target.value);
      });
    }

    // Botão salvar
    const saveButton = document.getElementById('save-setlist');
    if (saveButton) {
      saveButton.addEventListener('click', async () => {
        await this.saveSetlist();
      });
    }

    console.log('✅ Eventos configurados');
  }

  handleSongSearch(query) {
    const suggestions = document.getElementById('song-suggestions');
    
    if (!query.trim()) {
      suggestions.style.display = 'none';
      return;
    }

    // Filtrar músicas
    const filteredSongs = this.allSongs.filter(song => {
      const searchTerm = query.toLowerCase();
      return song.titulo.toLowerCase().includes(searchTerm) ||
             song.artista.toLowerCase().includes(searchTerm);
    }).slice(0, 5);

    this.displaySuggestions(filteredSongs);
  }

  displaySuggestions(songs) {
    const suggestions = document.getElementById('song-suggestions');
    
    if (songs.length === 0) {
      suggestions.innerHTML = '<div class="song-suggestion" style="opacity: 0.7;">Nenhuma música encontrada</div>';
    } else {
      suggestions.innerHTML = songs.map(song => `
        <div class="song-suggestion" onclick="setlistManager.addSong('${song.id}')">
          <div class="song-title">${song.titulo}</div>
          <div class="song-artist">${song.artista} • Tom: ${song.tom}</div>
        </div>
      `).join('');
    }
    
    suggestions.style.display = 'block';
  }

  addSong(songId) {
    const song = this.allSongs.find(s => s.id === songId);
    if (!song) return;

    // Verificar se já está na lista
    if (this.selectedSongs.find(s => s.id === songId)) {
      alert('Esta música já está na setlist!');
      return;
    }

    // Inicialmente adicionar a música sem ministro definido (tom original)
    let finalKey = song.tom;
    let ministerSpecific = false;
    let assignedMinister = null; // Sem ministro inicialmente
    
    // Adicionar à lista sem ministro predefinido
    this.selectedSongs.push({
      ...song,
      finalKey,
      ministerSpecific,
      assignedMinister, // Ministro específico para esta música (null inicialmente)
      order: this.selectedSongs.length + 1
    });

    this.updateSongsList();
    this.clearSearch();
    
    console.log(`🎵 Música adicionada: ${song.titulo} (Tom: ${finalKey}, Ministro: Não definido)`);
  }

  updateSongsList() {
    const list = document.getElementById('selected-songs-list');
    
    if (this.selectedSongs.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-music" style="font-size: 2rem; margin-bottom: 10px; opacity: 0.5;"></i>
          <p>Nenhuma música selecionada ainda.</p>
        </div>
      `;
      this.updateMinistersSummary();
      return;
    }

    list.innerHTML = this.selectedSongs.map((song, index) => `
      <div class="selected-song" style="background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin-bottom: 10px;">
        <div class="song-info">
          <div class="song-title" style="font-weight: bold; margin-bottom: 8px;">${index + 1}. ${song.titulo}</div>
          <div class="song-details" style="margin-bottom: 12px;">
            <span style="color: #666;">Artista: ${song.artista}</span>
            <span class="song-key" style="background: #4CAF50; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem; margin-left: 10px;">Tom: ${song.finalKey}</span>
          </div>
          
          <div class="minister-selector" style="margin-bottom: 10px;">
            <label style="font-size: 0.9rem; color: #555; margin-bottom: 5px; display: block;">
              <i class="fas fa-user-tie" style="margin-right: 5px;"></i>Ministro para esta música:
            </label>
            <select onchange="setlistManager.changeSongMinister(${index}, this.value)" 
                    style="width: 100%; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-size: 0.9rem;">
              <option value="">Selecione um ministro...</option>
              ${this.getMinistersForSong(song).map(minister => `
                <option value="${minister.name}" ${song.assignedMinister === minister.name ? 'selected' : ''}>
                  ${minister.name} ${minister.specificKey ? `(Tom específico: ${minister.specificKey})` : `(Tom preferido: ${minister.preferredKey})`}
                </option>
              `).join('')}
            </select>
          </div>
          
          ${song.assignedMinister ? `
            <div style="font-size: 0.85rem; color: #4CAF50; margin-bottom: 8px;">
              <i class="fas fa-check-circle" style="margin-right: 5px;"></i>
              Ministro: <strong>${song.assignedMinister}</strong>
              ${song.ministerSpecific ? ' (Tom específico aplicado)' : ' (Tom preferido aplicado)'}
            </div>
          ` : `
            <div style="font-size: 0.85rem; color: #f44336; margin-bottom: 8px;">
              <i class="fas fa-exclamation-triangle" style="margin-right: 5px;"></i>
              <strong>Nenhum ministro definido!</strong>
            </div>
          `}
        </div>
        
        <div class="song-actions" style="text-align: right;">
          <button class="btn-remove" onclick="setlistManager.removeSong(${index})" 
                  style="background: #f44336; color: white; border: none; border-radius: 4px; padding: 6px 12px; cursor: pointer;">
            <i class="fas fa-trash"></i> Remover
          </button>
        </div>
      </div>
    `).join('');
    
    // Atualizar resumo dos ministros
    this.updateMinistersSummary();
  }

  updateMinistersSummary() {
    const summaryElement = document.getElementById('ministers-summary');
    if (!summaryElement) return;

    if (this.selectedSongs.length === 0) {
      summaryElement.style.display = 'none';
      return;
    }

    const ministersUsed = this.getMinistersUsedInSetlist();
    
    if (ministersUsed.length === 0) {
      summaryElement.innerHTML = `
        <div style="background: #ffebee; border: 1px solid #f44336; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
          <h4 style="color: #f44336; margin: 0 0 10px 0;">
            <i class="fas fa-exclamation-triangle" style="margin-right: 8px;"></i>Atenção!
          </h4>
          <p style="margin: 0; color: #666;">Nenhum ministro definido para as músicas da setlist.</p>
        </div>
      `;
      summaryElement.style.display = 'block';
      return;
    }

    summaryElement.innerHTML = `
      <div style="background: #f5f5f5; border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
        <h4 style="color: #333; margin: 0 0 15px 0;">
          <i class="fas fa-users" style="margin-right: 8px;"></i>Ministros na Setlist
        </h4>
        <div style="display: grid; gap: 10px;">
          ${ministersUsed.map(minister => `
            <div style="background: white; border: 1px solid #e0e0e0; border-radius: 6px; padding: 12px;">
              <div style="font-weight: bold; color: #333; margin-bottom: 5px;">
                <i class="fas fa-user" style="margin-right: 5px; color: #4CAF50;"></i>
                ${minister.name}
                ${minister.isDefault ? ' (Padrão)' : ''}
                <span style="font-size: 0.8rem; background: #2196F3; color: white; padding: 2px 6px; border-radius: 10px; margin-left: 8px;">
                  ${minister.musicas.length} música${minister.musicas.length > 1 ? 's' : ''}
                </span>
              </div>
              <div style="font-size: 0.9rem; color: #666;">
                Músicas: ${minister.musicas.map(m => `${m.ordem}. ${m.titulo} (${m.tom})`).join(', ')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    summaryElement.style.display = 'block';
  }

  removeSong(index) {
    this.selectedSongs.splice(index, 1);
    this.updateSongsList();
  }

  changeSongMinister(songIndex, ministerName) {
    console.log(`🎤 Alterando ministro da música ${songIndex} para: ${ministerName}`);
    
    if (songIndex < 0 || songIndex >= this.selectedSongs.length) {
      console.error('❌ Índice de música inválido:', songIndex);
      return;
    }

    const song = this.selectedSongs[songIndex];
    const originalSong = this.allSongs.find(s => s.id === song.id);
    
    if (!originalSong) {
      console.error('❌ Música original não encontrada:', song.id);
      return;
    }

    // Atualizar ministro da música
    song.assignedMinister = ministerName || null;
    
    // Recalcular tom baseado no novo ministro
    let newKey = originalSong.tom; // Tom original como fallback
    let ministerSpecific = false;
    
    if (ministerName) {
      // Buscar tom específico do ministro se disponível
      if (originalSong.tomMinistro && originalSong.tomMinistro[ministerName]) {
        newKey = originalSong.tomMinistro[ministerName];
        ministerSpecific = true;
        console.log(`🎵 Tom específico encontrado para ${ministerName}: ${newKey}`);
      } else {
        // Usar tom preferido do ministro se não houver tom específico
        const minister = this.ministers.find(m => m.name === ministerName);
        if (minister && minister.preferredKey) {
          newKey = minister.preferredKey;
          console.log(`🎵 Usando tom preferido do ministro ${ministerName}: ${newKey}`);
        }
      }
    }
    
    // Atualizar propriedades da música
    song.finalKey = newKey;
    song.ministerSpecific = ministerSpecific;
    
    console.log(`✅ Música atualizada:`, {
      titulo: song.titulo,
      ministro: song.assignedMinister,
      tomFinal: song.finalKey,
      tomEspecifico: song.ministerSpecific
    });
    
    // Atualizar a interface
    this.updateSongsList();
  }

  clearSearch() {
    const searchInput = document.getElementById('song-search');
    const suggestions = document.getElementById('song-suggestions');
    
    if (searchInput) searchInput.value = '';
    if (suggestions) suggestions.style.display = 'none';
  }

  getMinistersUsedInSetlist() {
    console.log('👥 Calculando ministros utilizados na setlist...');
    
    const ministerMap = new Map();
    
    // Processar cada música
    this.selectedSongs.forEach((song, index) => {
      const ministerName = song.assignedMinister;
      
      if (ministerName) {
        if (!ministerMap.has(ministerName)) {
          // Buscar dados do ministro
          const minister = this.ministers.find(m => m.name === ministerName);
          ministerMap.set(ministerName, {
            name: ministerName,
            tom: minister?.preferredKey || 'C',
            musicas: [],
            isDefault: false
          });
        }
        
        // Adicionar música à lista do ministro
        ministerMap.get(ministerName).musicas.push({
          ordem: index + 1,
          titulo: song.titulo,
          tom: song.finalKey
        });
      }
    });
    
    const result = Array.from(ministerMap.values());
    console.log('✅ Ministros utilizados:', result);
    
    return result;
  }

  // Função para obter ministros que cantam uma música específica
  getMinistersForSong(song) {
    const ministersForSong = [];
    
    // Verificar se a música tem tom específico para ministros
    if (song.tomMinistro) {
      Object.keys(song.tomMinistro).forEach(ministerName => {
        const minister = this.ministers.find(m => m.name === ministerName);
        if (minister) {
          ministersForSong.push({
            ...minister,
            specificKey: song.tomMinistro[ministerName]
          });
        }
      });
    }
    
    // Se não há ministros específicos definidos, retornar todos os ministros
    if (ministersForSong.length === 0) {
      return this.ministers.map(minister => ({
        ...minister,
        specificKey: null
      }));
    }
    
    return ministersForSong;
  }

  async saveSetlist() {
    console.log('💾 Iniciando processo de salvamento...');
    
    const name = document.getElementById('setlist-name').value.trim();
    const date = document.getElementById('setlist-date').value;
    const description = document.getElementById('setlist-description').value.trim();

    console.log('📝 Dados do formulário:', { name, date, description });

    if (!name) {
      alert('Por favor, digite um nome para a setlist.');
      return;
    }

    if (this.selectedSongs.length === 0) {
      alert('Por favor, adicione pelo menos uma música.');
      return;
    }

    // Verificar se todas as músicas têm ministro definido
    const songsWithoutMinister = this.selectedSongs.filter(song => !song.assignedMinister);
    
    if (songsWithoutMinister.length > 0) {
      const songTitles = songsWithoutMinister.map(s => s.titulo).join(', ');
      alert(`As seguintes músicas não têm ministro definido: ${songTitles}\n\nPor favor, defina um ministro para cada música.`);
      return;
    }

    console.log('✅ Validação passou:', {
      musicas: this.selectedSongs.length,
      todasComMinistro: true
    });

    // Determinar ministro principal (primeiro ministro da setlist)
    const primaryMinister = this.selectedSongs[0]?.assignedMinister || null;
    const primaryMinisterObj = this.ministers.find(m => m.name === primaryMinister);
    const primaryMinisterKey = primaryMinisterObj?.preferredKey || 'C';

    const setlistData = {
      id: this.editMode ? this.currentSetlistId : Date.now().toString(),
      nome: name,
      data: date,
      descricao: description,
      ministro: primaryMinister, // Ministro padrão/principal
      ministroTom: primaryMinisterKey,
      musicas: this.selectedSongs.map((song, index) => ({
        id: song.id,
        titulo: song.titulo,
        artista: song.artista,
        tomOriginal: song.tom,
        tomFinal: song.finalKey,
        tomEspecificoMinistro: song.ministerSpecific,
        ministro: song.assignedMinister, // Cada música tem seu ministro definido
        ministroEspecifico: true, // Todos os ministros são específicos agora
        ordem: index + 1
      })),
      totalMusicas: this.selectedSongs.length,
      // Resumo de ministros na setlist
      ministrosUtilizados: this.getMinistersUsedInSetlist(),
      criadoEm: this.editMode ? this.getOriginalCreationDate() : new Date()
    };

    // Adicionar atualizadoEm apenas se estiver editando
    if (this.editMode) {
      setlistData.atualizadoEm = new Date();
    }

    // Remover campos undefined antes de salvar no Firestore
    const cleanSetlistData = this.removeUndefinedFields(setlistData);

    console.log('🔄 Dados da setlist preparados:', cleanSetlistData);

    try {
      console.log('🔥 Verificando Firebase...');
      // Tentar salvar no Firestore primeiro
      if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
        console.log('🔥 Firebase disponível, tentando salvar...');
        const db = firebase.firestore();
        
        console.log('📡 Conectando com Firestore...');
        
        if (this.editMode) {
          console.log(`✏️ Atualizando setlist existente com ID: ${this.currentSetlistId}`);
          // Atualizar setlist existente no Firestore
          await db.collection('setlists').doc(this.currentSetlistId).update(cleanSetlistData);
          console.log('✅ Setlist atualizada no Firestore com sucesso!');
        } else {
          console.log(`➕ Criando nova setlist com ID: ${cleanSetlistData.id}`);
          // Adicionar nova setlist no Firestore
          await db.collection('setlists').doc(cleanSetlistData.id).set(cleanSetlistData);
          console.log('✅ Nova setlist salva no Firestore com sucesso!');
        }
        
        console.log('🎉 Operação no Firestore concluída com sucesso!');
      } else {
        console.log('🚫 Firebase não disponível, salvando apenas no localStorage');
      }
    } catch (firestoreError) {
      console.error('❌ ERRO DETALHADO no Firestore:', {
        message: firestoreError.message,
        code: firestoreError.code,
        stack: firestoreError.stack,
        fullError: firestoreError
      });
      
      // Verificar se é erro de permissão
      if (firestoreError.code === 'permission-denied') {
        console.error('🔒 ERRO DE PERMISSÃO: Verifique as regras do Firestore');
        alert('Erro de permissão no banco de dados. Salvando localmente...');
      } else if (firestoreError.code === 'unavailable') {
        console.error('📡 ERRO DE CONEXÃO: Firestore indisponível');
        alert('Erro de conexão com o banco. Salvando localmente...');
      } else {
        console.error('🔥 ERRO DESCONHECIDO no Firestore');
        alert('Erro ao salvar no banco. Salvando localmente...');
      }
    }

    // Salvar no localStorage como backup
    const existingSetlists = JSON.parse(localStorage.getItem('setlists') || '[]');
    
    if (this.editMode) {
      // Atualizar setlist existente
      const index = existingSetlists.findIndex(s => s.id === this.currentSetlistId);
      if (index !== -1) {
        existingSetlists[index] = cleanSetlistData;
        console.log('✏️ Setlist atualizada no localStorage');
      } else {
        // Se não encontrou no localStorage, pode ser porque foi criada recentemente no Firestore
        // Vamos adicionar mas também verificar se não há duplicatas por nome/data
        const duplicateIndex = existingSetlists.findIndex(s => 
          s.nome === cleanSetlistData.nome && 
          s.data === cleanSetlistData.data &&
          s.id !== this.currentSetlistId
        );
        
        if (duplicateIndex !== -1) {
          // Substituir duplicata
          existingSetlists[duplicateIndex] = cleanSetlistData;
          console.log('🔄 Substituindo setlist duplicada no localStorage');
        } else {
          // Adicionar nova
          existingSetlists.unshift(cleanSetlistData); // unshift para colocar no início
          console.log('➕ Setlist adicionada ao localStorage (não encontrada originalmente)');
        }
      }
    } else {
      // Verificar duplicatas antes de adicionar nova setlist
      const duplicateIndex = existingSetlists.findIndex(s => 
        s.nome === cleanSetlistData.nome && 
        s.data === cleanSetlistData.data
      );
      
      if (duplicateIndex !== -1) {
        console.log('⚠️ Setlist com mesmo nome e data já existe, substituindo...');
        existingSetlists[duplicateIndex] = cleanSetlistData;
      } else {
        // Adicionar nova setlist no início da lista
        existingSetlists.unshift(cleanSetlistData);
        console.log('➕ Nova setlist salva no localStorage');
      }
    }
    
    localStorage.setItem('setlists', JSON.stringify(existingSetlists));

    alert(this.editMode ? '✅ Setlist atualizada com sucesso!' : '✅ Setlist salva com sucesso!');
    
    // Redirecionar
    window.location.href = 'setlists.html';
  }

  getOriginalCreationDate() {
    try {
      const stored = localStorage.getItem('setlists');
      const setlists = stored ? JSON.parse(stored) : [];
      const original = setlists.find(s => s.id === this.currentSetlistId);
      return original ? original.criadoEm : new Date();
    } catch (error) {
      console.warn('⚠️ Erro ao obter data de criação original:', error);
      return new Date();
    }
  }

  removeUndefinedFields(obj) {
    const cleaned = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          // Para arrays, limpar cada item
          cleaned[key] = value.map(item => 
            typeof item === 'object' ? this.removeUndefinedFields(item) : item
          );
        } else if (typeof value === 'object' && value instanceof Date) {
          // Manter objetos Date
          cleaned[key] = value;
        } else if (typeof value === 'object') {
          // Para objetos, recursivamente limpar
          cleaned[key] = this.removeUndefinedFields(value);
        } else {
          // Para valores primitivos válidos
          cleaned[key] = value;
        }
      }
    }
    
    return cleaned;
  }
}

// Inicializar
let setlistManager;

// Função para debug das permissões do Firestore
window.testFirestorePermissions = async function() {
  console.log('🧪 Testando permissões do Firestore...');
  
  try {
    if (typeof firebase === 'undefined' || firebase.apps.length === 0) {
      console.error('❌ Firebase não inicializado');
      return;
    }
    
    const db = firebase.firestore();
    
    // Teste 1: Ler músicas
    console.log('📖 Teste 1: Lendo músicas...');
    const musicasSnapshot = await db.collection('musicas').limit(1).get();
    console.log('✅ Leitura de músicas: OK');
    
    // Teste 2: Tentar escrever em setlists
    console.log('📝 Teste 2: Testando escrita em setlists...');
    const testSetlist = {
      nome: 'Teste de Permissão',
      teste: true,
      timestamp: new Date()
    };
    
    await db.collection('setlists').doc('teste-permissao').set(testSetlist);
    console.log('✅ Escrita em setlists: OK');
    
    // Limpar teste
    await db.collection('setlists').doc('teste-permissao').delete();
    console.log('✅ Limpeza do teste: OK');
    
    console.log('🎉 TODAS AS PERMISSÕES ESTÃO OK!');
    
  } catch (error) {
    console.error('❌ ERRO nas permissões:', {
      code: error.code,
      message: error.message,
      fullError: error
    });
    
    if (error.code === 'permission-denied') {
      console.error('🔒 PROBLEMA: Permissões negadas no Firestore');
      console.error('SOLUÇÃO: Verifique as regras de segurança no console do Firebase');
    }
  }
};

// Função para forçar salvamento manual
window.forceSaveTest = async function() {
  console.log('🔧 Forçando teste de salvamento...');
  
  if (!setlistManager) {
    console.error('❌ SetlistManager não carregado');
    return;
  }
  
  const testData = {
    id: 'teste-manual-' + Date.now(),
    nome: 'Teste Manual',
    data: '2025-06-30',
    ministro: 'Teste',
    ministroTom: 'C',
    musicas: [],
    totalMusicas: 0,
    criadoEm: new Date()
  };
  
  try {
    const db = firebase.firestore();
    await db.collection('setlists').doc(testData.id).set(testData);
    console.log('✅ Teste manual salvo com sucesso!');
  } catch (error) {
    console.error('❌ Erro no teste manual:', error);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  console.log('🌐 DOM carregado');
  setlistManager = new SetlistManager();
  window.setlistManager = setlistManager;
});
