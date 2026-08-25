/**
 * Music Service - regras de negócio e casos de uso de músicas.
 * Persistência fica isolada em MusicRepository.
 */

import { Utils, MessageService } from './utils.js';
import musicRepository from '../../repositories/music-repository.js';
import { AppError } from '../../core/app-error.js';

export class MusicService {
  constructor(repository = musicRepository) {
    this.repository = repository;
  }

  async loadAllMusics(callback) {
    try {
      console.log('🎵 MusicService: Carregando todas as músicas');
      return await this.repository.subscribeAllOrderedByTitle(callback);
    } catch (error) {
      console.error('❌ MusicService: Erro ao carregar músicas:', error);
      throw AppError.from(error, 'Não foi possível carregar as músicas.');
    }
  }

  async getMusicById(id) {
    if (!id) throw new AppError('ID da música é obrigatório.', { code: 'MUSIC_ID_REQUIRED' });

    try {
      const music = await this.repository.findById(id);
      if (!music) {
        throw new AppError('Música não encontrada', { code: 'MUSIC_NOT_FOUND' });
      }
      return music;
    } catch (error) {
      console.error('❌ MusicService: Erro ao buscar música:', error);
      throw AppError.from(error, 'Não foi possível buscar a música.');
    }
  }

  async saveMusic(musicData) {
    try {
      const validation = Utils.validateMusicData(musicData);
      if (!validation.isValid) {
        throw new AppError(validation.errors.join('\n'), { code: 'MUSIC_VALIDATION_ERROR' });
      }

      const processedData = this.processMusicData(musicData);
      const result = await this.repository.create(processedData);
      console.log('✅ MusicService: Música salva com sucesso:', result.id);
      return result;
    } catch (error) {
      console.error('❌ MusicService: Erro ao salvar música:', error);
      throw AppError.from(error, 'Não foi possível salvar a música.');
    }
  }

  async updateMusic(id, musicData) {
    if (!id) throw new AppError('ID da música é obrigatório.', { code: 'MUSIC_ID_REQUIRED' });

    try {
      const validation = Utils.validateMusicData(musicData);
      if (!validation.isValid) {
        throw new AppError(validation.errors.join('\n'), { code: 'MUSIC_VALIDATION_ERROR' });
      }

      const processedData = this.processMusicData(musicData);
      processedData.updatedAt = new Date();
      return await this.repository.update(id, processedData);
    } catch (error) {
      console.error('❌ MusicService: Erro ao atualizar música:', error);
      throw AppError.from(error, 'Não foi possível atualizar a música.');
    }
  }

  async deleteMusic(id) {
    if (!id) throw new AppError('ID da música é obrigatório.', { code: 'MUSIC_ID_REQUIRED' });

    try {
      return await this.repository.delete(id);
    } catch (error) {
      console.error('❌ MusicService: Erro ao excluir música:', error);
      throw AppError.from(error, 'Não foi possível excluir a música.');
    }
  }

  processMusicData(data) {
    const processed = {
      titulo: data.titulo.trim(),
      artista: data.artista?.trim() || null,
      tom: data.tom?.trim() || null,
      bpm: data.bpm ? parseInt(data.bpm, 10) : null,
      link: data.link?.trim() || null,
      cifra: data.cifra.trim(),
      criadoEm: data.criadoEm || new Date()
    };

    if (data.ministro) {
      const ministros = Utils.processMinistros(data.ministro);
      processed.ministro = ministros.length > 0 ? ministros.join(', ') : null;
      processed.ministros = ministros.length > 0 ? ministros : null;
    }

    if (data.tomMinistro) {
      processed.tomMinistro = Utils.processTomMinistro(data.tomMinistro);
    }

    return Utils.sanitizeForSave(processed);
  }

  filterMusics(musics, searchTerm) {
    if (!searchTerm) return musics;
    const term = searchTerm.toLowerCase();
    return musics.filter((musica) => Utils.createSearchFields(musica).includes(term));
  }

  sortMusics(musics, sortBy = 'titulo', order = 'asc') {
    return [...musics].sort((a, b) => {
      let valueA = a[sortBy] || '';
      let valueB = b[sortBy] || '';
      if (typeof valueA === 'string') valueA = valueA.toLowerCase();
      if (typeof valueB === 'string') valueB = valueB.toLowerCase();
      if (valueA === valueB) return 0;
      if (order === 'asc') return valueA > valueB ? 1 : -1;
      return valueA < valueB ? 1 : -1;
    });
  }

  async exportMusics() {
    try {
      const musics = await this.getAllMusicsArray();
      const dataStr = JSON.stringify(musics, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
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

  async importMusics(file) {
    try {
      const text = await file.text();
      const musics = JSON.parse(text);
      if (!Array.isArray(musics)) {
        throw new AppError('Arquivo inválido: deve conter um array de músicas', { code: 'INVALID_IMPORT' });
      }

      let imported = 0;
      let errors = 0;
      for (const music of musics) {
        try {
          await this.saveMusic(music);
          imported += 1;
        } catch (error) {
          console.error('Erro ao importar música:', music.titulo, error);
          errors += 1;
        }
      }
      MessageService.success(`Importação concluída: ${imported} músicas importadas, ${errors} erros`);
    } catch (error) {
      console.error('Erro ao importar músicas:', error);
      MessageService.error('Erro ao importar músicas: ' + error.message);
    }
  }

  async getAllMusicsArray() {
    return this.repository.findAll();
  }
}

const musicService = new MusicService();
if (typeof window !== 'undefined') window.musicService = musicService;
export default musicService;
