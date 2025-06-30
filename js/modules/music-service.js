/**
 * Music Service - Gerenciamento de operações com músicas
 */

import { Utils, MessageService } from './utils.js';

export class MusicService {
  constructor() {
    this.db = null;
    this.isReady = false;
    this.initialize();
  }

  // Inicializar serviço
  initialize() {
    if (window.db) {
      this.db = window.db;
      this.isReady = true;
    } else {
      // Aguardar DB estar pronto
      window.addEventListener('dbReady', (event) => {
        this.db = event.detail.db;
        this.isReady = true;
        console.log("✅ MusicService: Database pronto");
      });
    }
  }

  // Aguardar DB estar pronto
  async waitForDb() {
    return new Promise((resolve) => {
      if (this.isReady && this.db) {
        resolve();
      } else {
        const checkDb = () => {
          if (this.isReady && this.db) {
            resolve();
          } else {
            setTimeout(checkDb, 100);
          }
        };
        checkDb();
      }
    });
  }

  // Carregar todas as músicas
  async loadAllMusics(callback) {
    await this.waitForDb();
    
    try {
      console.log("🎵 MusicService: Carregando todas as músicas");
      return this.db.collection("musicas").orderBy("titulo").onSnapshot(callback);
    } catch (error) {
      console.error("❌ MusicService: Erro ao carregar músicas:", error);
      throw error;
    }
  }

  // Buscar música por ID
  async getMusicById(id) {
    await this.waitForDb();
    
    try {
      console.log("🔍 MusicService: Buscando música por ID:", id);
      const doc = await this.db.collection("musicas").doc(id).get();
      
      if (doc.exists) {
        return {
          id: doc.id,
          ...doc.data()
        };
      } else {
        throw new Error("Música não encontrada");
      }
    } catch (error) {
      console.error("❌ MusicService: Erro ao buscar música:", error);
      throw error;
    }
  }

  // Salvar nova música
  async saveMusic(musicData) {
    await this.waitForDb();
    
    try {
      // Validar dados
      const validation = Utils.validateMusicData(musicData);
      if (!validation.isValid) {
        throw new Error(validation.errors.join('\n'));
      }

      // Processar dados
      const processedData = this.processMusicData(musicData);
      
      console.log("💾 MusicService: Salvando nova música:", processedData.titulo);
      const result = await this.db.collection("musicas").add(processedData);
      
      console.log("✅ MusicService: Música salva com sucesso:", result.id);
      return result;
    } catch (error) {
      console.error("❌ MusicService: Erro ao salvar música:", error);
      throw error;
    }
  }

  // Atualizar música existente
  async updateMusic(id, musicData) {
    await this.waitForDb();
    
    try {
      // Validar dados
      const validation = Utils.validateMusicData(musicData);
      if (!validation.isValid) {
        throw new Error(validation.errors.join('\n'));
      }

      // Processar dados
      const processedData = this.processMusicData(musicData);
      processedData.updatedAt = new Date();
      
      console.log("🔄 MusicService: Atualizando música:", id);
      await this.db.collection("musicas").doc(id).update(processedData);
      
      console.log("✅ MusicService: Música atualizada com sucesso");
      return { id };
    } catch (error) {
      console.error("❌ MusicService: Erro ao atualizar música:", error);
      throw error;
    }
  }

  // Excluir música
  async deleteMusic(id) {
    await this.waitForDb();
    
    try {
      console.log("🗑️ MusicService: Excluindo música:", id);
      await this.db.collection("musicas").doc(id).delete();
      
      console.log("✅ MusicService: Música excluída com sucesso");
      return true;
    } catch (error) {
      console.error("❌ MusicService: Erro ao excluir música:", error);
      throw error;
    }
  }

  // Processar dados da música para salvamento
  processMusicData(data) {
    const processed = {
      titulo: data.titulo.trim(),
      artista: data.artista?.trim() || null,
      tom: data.tom?.trim() || null,
      bpm: data.bpm ? parseInt(data.bpm) : null,
      link: data.link?.trim() || null,
      cifra: data.cifra.trim(),
      criadoEm: new Date()
    };

    // Processar ministros
    if (data.ministro) {
      const ministros = Utils.processMinistros(data.ministro);
      processed.ministro = ministros.length > 0 ? ministros.join(', ') : null;
      processed.ministros = ministros.length > 0 ? ministros : null;
    }

    // Processar tom do ministro
    if (data.tomMinistro) {
      const tomMinistroObj = Utils.processTomMinistro(data.tomMinistro);
      processed.tomMinistro = tomMinistroObj;
    }

    // Remover campos nulos
    return Utils.sanitizeForSave(processed);
  }

  // Filtrar músicas
  filterMusics(musics, searchTerm) {
    if (!searchTerm) return musics;
    
    const term = searchTerm.toLowerCase();
    return musics.filter(musica => {
      const searchFields = Utils.createSearchFields(musica);
      return searchFields.includes(term);
    });
  }

  // Ordenar músicas
  sortMusics(musics, sortBy = 'titulo', order = 'asc') {
    return [...musics].sort((a, b) => {
      let valueA = a[sortBy] || '';
      let valueB = b[sortBy] || '';
      
      if (typeof valueA === 'string') {
        valueA = valueA.toLowerCase();
      }
      if (typeof valueB === 'string') {
        valueB = valueB.toLowerCase();
      }
      
      if (order === 'asc') {
        return valueA > valueB ? 1 : -1;
      } else {
        return valueA < valueB ? 1 : -1;
      }
    });
  }

  // Exportar músicas para JSON
  async exportMusics() {
    try {
      const musics = await this.getAllMusicsArray();
      const dataStr = JSON.stringify(musics, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `louvor-ide-backup-${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      MessageService.success('Backup exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar músicas:', error);
      MessageService.error('Erro ao exportar músicas: ' + error.message);
    }
  }

  // Importar músicas de JSON
  async importMusics(file) {
    try {
      const text = await file.text();
      const musics = JSON.parse(text);
      
      if (!Array.isArray(musics)) {
        throw new Error('Arquivo inválido: deve conter um array de músicas');
      }
      
      let imported = 0;
      let errors = 0;
      
      for (const music of musics) {
        try {
          await this.saveMusic(music);
          imported++;
        } catch (error) {
          console.error('Erro ao importar música:', music.titulo, error);
          errors++;
        }
      }
      
      MessageService.success(`Importação concluída: ${imported} músicas importadas, ${errors} erros`);
    } catch (error) {
      console.error('Erro ao importar músicas:', error);
      MessageService.error('Erro ao importar músicas: ' + error.message);
    }
  }

  // Obter todas as músicas como array (para exportação)
  async getAllMusicsArray() {
    return new Promise((resolve, reject) => {
      const musics = [];
      
      this.loadAllMusics((snapshot) => {
        musics.length = 0; // Limpar array
        
        snapshot.forEach((doc) => {
          musics.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        resolve(musics);
      });
    });
  }
}

// Criar instância global
const musicService = new MusicService();

// Disponibilizar globalmente
if (typeof window !== 'undefined') {
  window.musicService = musicService;
}

export default musicService;
