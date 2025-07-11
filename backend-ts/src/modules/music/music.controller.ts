import { Request, Response } from 'express';
import { MusicService } from './music.service';
import { ApiResponse, Music, CreateMusicDto, UpdateMusicDto, SearchQuery } from '../../types';

export class MusicController {
  private musicService = new MusicService();

  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const data: CreateMusicDto = req.body;
      const music = await this.musicService.create(data);

      const response: ApiResponse<Music> = {
        success: true,
        data: music,
        message: 'Música criada com sucesso',
      };

      res.status(201).json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao criar música',
      };

      res.status(500).json(response);
    }
  };

  findAll = async (req: Request, res: Response): Promise<void> => {
    try {
      const query: SearchQuery = req.query as any;
      const result = await this.musicService.findAll(query);

      res.json(result);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao buscar músicas',
      };

      res.status(500).json(response);
    }
  };

  findById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const music = await this.musicService.findById(id);

      if (!music) {
        const response: ApiResponse = {
          success: false,
          error: 'Música não encontrada',
        };

        res.status(404).json(response);
        return;
      }

      const response: ApiResponse<Music> = {
        success: true,
        data: music,
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao buscar música',
      };

      res.status(500).json(response);
    }
  };

  update = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const data: UpdateMusicDto = req.body;
      const music = await this.musicService.update(id, data);

      if (!music) {
        const response: ApiResponse = {
          success: false,
          error: 'Música não encontrada',
        };

        res.status(404).json(response);
        return;
      }

      const response: ApiResponse<Music> = {
        success: true,
        data: music,
        message: 'Música atualizada com sucesso',
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao atualizar música',
      };

      res.status(500).json(response);
    }
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const deleted = await this.musicService.delete(id);

      if (!deleted) {
        const response: ApiResponse = {
          success: false,
          error: 'Música não encontrada',
        };

        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        message: 'Música deletada com sucesso',
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao deletar música',
      };

      res.status(500).json(response);
    }
  };

  getUniqueMinistros = async (req: Request, res: Response): Promise<void> => {
    try {
      const ministros = await this.musicService.getUniqueMinistros();

      const response: ApiResponse<string[]> = {
        success: true,
        data: ministros,
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao buscar ministros',
      };

      res.status(500).json(response);
    }
  };

  getUniqueArtistas = async (req: Request, res: Response): Promise<void> => {
    try {
      const artistas = await this.musicService.getUniqueArtistas();

      const response: ApiResponse<string[]> = {
        success: true,
        data: artistas,
      };

      res.json(response);
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao buscar artistas',
      };

      res.status(500).json(response);
    }
  };
}
