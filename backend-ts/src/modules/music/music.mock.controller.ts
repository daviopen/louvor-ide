import { Request, Response } from 'express';
import { ApiResponse, Music } from '../../types';

// Mock data for testing
const mockMusics: Music[] = [
  {
    id: '1',
    titulo: 'Quão Grande é o Meu Deus',
    artista: 'Chris Tomlin',
    tom: 'G',
    bpm: 120,
    link: 'https://www.youtube.com/watch?v=cJtYTrUNFQw',
    cifra: '[G]Quão grande [D]é o meu [Em]Deus\n[C]Cantarei quão [G]grande é o meu [D]Deus',
    ministros: ['João Silva', 'Maria Santos'],
    tomMinistro: { 'João Silva': 'G', 'Maria Santos': 'A' },
    status: 'ativo',
    tags: ['louvor', 'adoração'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: '2',
    titulo: 'Reckless Love',
    artista: 'Cory Asbury',
    tom: 'C',
    bpm: 140,
    link: 'https://www.youtube.com/watch?v=Sc6SSHuZvQE',
    cifra: '[C]Before I spoke a word, You were [Am]singing over me',
    ministros: ['Maria Santos'],
    tomMinistro: { 'Maria Santos': 'C' },
    status: 'ativo',
    tags: ['contemporary', 'love'],
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
  },
];

export class MockMusicController {
  
  /**
   * @swagger
   * /api/v1/music:
   *   get:
   *     summary: Listar todas as músicas (MOCK)
   *     tags: [Music]
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           minimum: 1
   *         description: Página
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *         description: Limite por página
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *         description: Termo de busca
   *     responses:
   *       200:
   *         description: Lista de músicas
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Music'
   */
  static async getAllMusics(req: Request, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 10, search } = req.query;
      
      let filteredMusics = [...mockMusics];
      
      // Apply search filter
      if (search && typeof search === 'string') {
        const searchTerm = search.toLowerCase();
        filteredMusics = mockMusics.filter(music =>
          music.titulo.toLowerCase().includes(searchTerm) ||
          music.artista.toLowerCase().includes(searchTerm) ||
          music.ministros.some(ministro => ministro.toLowerCase().includes(searchTerm))
        );
      }
      
      // Apply pagination
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const startIndex = (pageNum - 1) * limitNum;
      const endIndex = startIndex + limitNum;
      const paginatedMusics = filteredMusics.slice(startIndex, endIndex);
      
      const response: ApiResponse = {
        success: true,
        data: paginatedMusics,
        message: `${paginatedMusics.length} músicas encontradas (MOCK DATA)`,
      };
      
      res.json(response);
    } catch (error) {
      console.error('❌ Error fetching musics:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao buscar músicas',
      });
    }
  }

  /**
   * @swagger
   * /api/v1/music/{id}:
   *   get:
   *     summary: Buscar música por ID (MOCK)
   *     tags: [Music]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Música encontrada
   *       404:
   *         description: Música não encontrada
   */
  static async getMusicById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const music = mockMusics.find(m => m.id === id);
      
      if (!music) {
        res.status(404).json({
          success: false,
          error: 'Música não encontrada',
        });
        return;
      }
      
      res.json({
        success: true,
        data: music,
      });
    } catch (error) {
      console.error('❌ Error fetching music:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao buscar música',
      });
    }
  }

  /**
   * @swagger
   * /api/v1/music/ministers:
   *   get:
   *     summary: Listar ministros únicos (MOCK)
   *     tags: [Music]
   *     responses:
   *       200:
   *         description: Lista de ministros
   */
  static async getUniqueMinistros(req: Request, res: Response): Promise<void> {
    try {
      const ministrosSet = new Set<string>();
      mockMusics.forEach(music => {
        music.ministros.forEach(ministro => ministrosSet.add(ministro));
      });
      
      res.json({
        success: true,
        data: Array.from(ministrosSet).sort(),
        message: 'Ministros únicos (MOCK DATA)',
      });
    } catch (error) {
      console.error('❌ Error fetching ministers:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao buscar ministros',
      });
    }
  }

  /**
   * @swagger
   * /api/v1/music/stats:
   *   get:
   *     summary: Estatísticas das músicas (MOCK)
   *     tags: [Music]
   *     responses:
   *       200:
   *         description: Estatísticas
   */
  static async getStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = {
        total: mockMusics.length,
        totalActive: mockMusics.filter(m => m.status === 'ativo').length,
        totalInactive: mockMusics.filter(m => m.status === 'inativo').length,
        byKey: mockMusics.reduce((acc, music) => {
          acc[music.tom] = (acc[music.tom] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        byMinister: mockMusics.reduce((acc, music) => {
          music.ministros.forEach(ministro => {
            acc[ministro] = (acc[ministro] || 0) + 1;
          });
          return acc;
        }, {} as Record<string, number>),
      };
      
      res.json({
        success: true,
        data: stats,
        message: 'Estatísticas (MOCK DATA)',
      });
    } catch (error) {
      console.error('❌ Error fetching stats:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao buscar estatísticas',
      });
    }
  }
}
