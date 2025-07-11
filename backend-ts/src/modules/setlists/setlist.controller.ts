import { Request, Response, NextFunction } from 'express';
import { SetlistService } from './setlist.service';
import { CreateSetlistDto, UpdateSetlistDto, ApiResponse } from '../../types';

export class SetlistController {
  private setlistService = new SetlistService();

  /**
   * @swagger
   * /api/v1/setlists:
   *   post:
   *     summary: Create a new setlist
   *     tags: [Setlists]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [titulo, data, responsavel, musicas]
   *             properties:
   *               titulo:
   *                 type: string
   *                 example: "Culto de Domingo - Manhã"
   *               data:
   *                 type: string
   *                 format: date-time
   *                 example: "2024-01-15T10:00:00Z"
   *               local:
   *                 type: string
   *                 example: "Auditório Principal"
   *               responsavel:
   *                 type: string
   *                 example: "minister-id-123"
   *               musicas:
   *                 type: array
   *                 items:
   *                   type: object
   *                   properties:
   *                     musicId:
   *                       type: string
   *                     ordem:
   *                       type: integer
   *                       minimum: 1
   *                     tom:
   *                       type: string
   *                       enum: [C, C#, D, D#, E, F, F#, G, G#, A, A#, B]
   *                     observacoes:
   *                       type: string
   *               observacoes:
   *                 type: string
   *                 example: "Primeira música deve ser cantada a cappella"
   *               tags:
   *                 type: array
   *                 items:
   *                   type: string
   *                 example: ["domingo", "manhã", "adoração"]
   *     responses:
   *       201:
   *         description: Setlist created successfully
   */
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data: CreateSetlistDto = req.body;
      const setlist = await this.setlistService.create(data);
      
      const response: ApiResponse = {
        success: true,
        data: setlist,
        message: 'Setlist criada com sucesso',
      };
      
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/v1/setlists:
   *   get:
   *     summary: Get all setlists
   *     tags: [Setlists]
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 10
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *       - in: query
   *         name: sortBy
   *         schema:
   *           type: string
   *           enum: [titulo, data, status, createdAt, updatedAt]
   *           default: data
   *       - in: query
   *         name: sortOrder
   *         schema:
   *           type: string
   *           enum: [asc, desc]
   *           default: desc
   *     responses:
   *       200:
   *         description: Setlists retrieved successfully
   */
  findAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.query;
      const result = await this.setlistService.findAll(query);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/v1/setlists/{id}:
   *   get:
   *     summary: Get setlist by ID
   *     tags: [Setlists]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Setlist found
   *       404:
   *         description: Setlist not found
   */
  findById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const setlist = await this.setlistService.findById(id!);
      
      if (!setlist) {
        res.status(404).json({
          success: false,
          error: 'Setlist não encontrada',
        });
        return;
      }
      
      const response: ApiResponse = {
        success: true,
        data: setlist,
      };
      
      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/v1/setlists/{id}:
   *   put:
   *     summary: Update setlist
   *     tags: [Setlists]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               titulo:
   *                 type: string
   *               data:
   *                 type: string
   *                 format: date-time
   *               local:
   *                 type: string
   *               responsavel:
   *                 type: string
   *               musicas:
   *                 type: array
   *                 items:
   *                   type: object
   *                   properties:
   *                     musicId:
   *                       type: string
   *                     ordem:
   *                       type: integer
   *                     tom:
   *                       type: string
   *                     observacoes:
   *                       type: string
   *               observacoes:
   *                 type: string
   *               tags:
   *                 type: array
   *                 items:
   *                   type: string
   *               status:
   *                 type: string
   *                 enum: [planejada, em_andamento, finalizada, cancelada]
   *     responses:
   *       200:
   *         description: Setlist updated successfully
   *       404:
   *         description: Setlist not found
   */
  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const data: UpdateSetlistDto = req.body;
      
      const setlist = await this.setlistService.update(id!, data);
      
      if (!setlist) {
        res.status(404).json({
          success: false,
          error: 'Setlist não encontrada',
        });
        return;
      }
      
      const response: ApiResponse = {
        success: true,
        data: setlist,
        message: 'Setlist atualizada com sucesso',
      };
      
      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/v1/setlists/{id}:
   *   delete:
   *     summary: Delete setlist
   *     tags: [Setlists]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Setlist deleted successfully
   *       404:
   *         description: Setlist not found
   */
  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const deleted = await this.setlistService.delete(id!);
      
      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Setlist não encontrada',
        });
        return;
      }
      
      const response: ApiResponse = {
        success: true,
        message: 'Setlist deletada com sucesso',
      };
      
      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/v1/setlists/by-status/{status}:
   *   get:
   *     summary: Get setlists by status
   *     tags: [Setlists]
   *     parameters:
   *       - in: path
   *         name: status
   *         required: true
   *         schema:
   *           type: string
   *           enum: [planejada, em_andamento, finalizada, cancelada]
   *     responses:
   *       200:
   *         description: Setlists found
   */
  findByStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { status } = req.params as { status: 'planejada' | 'em_andamento' | 'finalizada' | 'cancelada' };
      const setlists = await this.setlistService.findByStatus(status);
      
      const response: ApiResponse = {
        success: true,
        data: setlists,
      };
      
      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/v1/setlists/by-responsavel/{responsavel}:
   *   get:
   *     summary: Get setlists by responsible minister
   *     tags: [Setlists]
   *     parameters:
   *       - in: path
   *         name: responsavel
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Setlists found
   */
  findByResponsavel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { responsavel } = req.params;
      const setlists = await this.setlistService.findByResponsavel(responsavel!);
      
      const response: ApiResponse = {
        success: true,
        data: setlists,
      };
      
      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/v1/setlists/stats:
   *   get:
   *     summary: Get setlists statistics
   *     tags: [Setlists]
   *     responses:
   *       200:
   *         description: Setlists statistics
   */
  getStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stats = await this.setlistService.getStats();
      
      const response: ApiResponse = {
        success: true,
        data: stats,
      };
      
      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/v1/setlists/{id}/status:
   *   patch:
   *     summary: Update setlist status
   *     tags: [Setlists]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [status]
   *             properties:
   *               status:
   *                 type: string
   *                 enum: [planejada, em_andamento, finalizada, cancelada]
   *     responses:
   *       200:
   *         description: Status updated successfully
   *       404:
   *         description: Setlist not found
   */
  updateStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      const updated = await this.setlistService.updateStatus(id!, status);
      
      if (!updated) {
        res.status(404).json({
          success: false,
          error: 'Setlist não encontrada',
        });
        return;
      }
      
      const response: ApiResponse = {
        success: true,
        message: 'Status da setlist atualizado com sucesso',
      };
      
      res.json(response);
    } catch (error) {
      next(error);
    }
  };
}
