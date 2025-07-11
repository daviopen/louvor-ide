import { Request, Response, NextFunction } from 'express';
import { MinisterService } from './minister.service';
import { CreateMinisterDto, UpdateMinisterDto, ApiResponse } from '../../types';

export class MinisterController {
  private ministerService = new MinisterService();

  /**
   * @swagger
   * /api/v1/ministers:
   *   post:
   *     summary: Create a new minister
   *     tags: [Ministers]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [nome, instrumento]
   *             properties:
   *               nome:
   *                 type: string
   *                 example: "João Silva"
   *               email:
   *                 type: string
   *                 format: email
   *                 example: "joao@email.com"
   *               telefone:
   *                 type: string
   *                 example: "+55 11 99999-9999"
   *               instrumento:
   *                 type: array
   *                 items:
   *                   type: string
   *                 example: ["Violão", "Voz"]
   *               avatar:
   *                 type: string
   *                 format: uri
   *                 example: "https://example.com/avatar.jpg"
   *               observacoes:
   *                 type: string
   *                 example: "Ministro experiente"
   *     responses:
   *       201:
   *         description: Minister created successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/Minister'
   */
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data: CreateMinisterDto = req.body;
      const minister = await this.ministerService.create(data);
      
      const response: ApiResponse = {
        success: true,
        data: minister,
        message: 'Ministro criado com sucesso',
      };
      
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/v1/ministers:
   *   get:
   *     summary: Get all ministers
   *     tags: [Ministers]
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
   *           enum: [nome, createdAt, updatedAt]
   *           default: createdAt
   *       - in: query
   *         name: sortOrder
   *         schema:
   *           type: string
   *           enum: [asc, desc]
   *           default: desc
   *     responses:
   *       200:
   *         description: Ministers retrieved successfully
   */
  findAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.query;
      const result = await this.ministerService.findAll(query);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/v1/ministers/{id}:
   *   get:
   *     summary: Get minister by ID
   *     tags: [Ministers]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Minister found
   *       404:
   *         description: Minister not found
   */
  findById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ success: false, error: 'ID do ministro não informado' });
        return;
      }
      const minister = await this.ministerService.findById(String(id));
      
      if (!minister) {
        res.status(404).json({
          success: false,
          error: 'Ministro não encontrado',
        });
        return;
      }
      
      const response: ApiResponse = {
        success: true,
        data: minister,
      };
      
      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/v1/ministers/{id}:
   *   put:
   *     summary: Update minister
   *     tags: [Ministers]
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
   *               nome:
   *                 type: string
   *               email:
   *                 type: string
   *                 format: email
   *               telefone:
   *                 type: string
   *               instrumento:
   *                 type: array
   *                 items:
   *                   type: string
   *               avatar:
   *                 type: string
   *                 format: uri
   *               observacoes:
   *                 type: string
   *     responses:
   *       200:
   *         description: Minister updated successfully
   *       404:
   *         description: Minister not found
   */
  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const data: UpdateMinisterDto = req.body;
      if (!id) {
        res.status(400).json({ success: false, error: 'ID do ministro não informado' });
        return;
      }
      const minister = await this.ministerService.update(String(id), data);
      
      if (!minister) {
        res.status(404).json({
          success: false,
          error: 'Ministro não encontrado',
        });
        return;
      }
      
      const response: ApiResponse = {
        success: true,
        data: minister,
        message: 'Ministro atualizado com sucesso',
      };
      
      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/v1/ministers/{id}:
   *   delete:
   *     summary: Delete minister
   *     tags: [Ministers]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Minister deleted successfully
   *       404:
   *         description: Minister not found
   */
  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ success: false, error: 'ID do ministro não informado' });
        return;
      }
      const deleted = await this.ministerService.delete(String(id));
      
      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Ministro não encontrado',
        });
        return;
      }
      
      const response: ApiResponse = {
        success: true,
        message: 'Ministro deletado com sucesso',
      };
      
      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/v1/ministers/by-instrument/{instrument}:
   *   get:
   *     summary: Get ministers by instrument
   *     tags: [Ministers]
   *     parameters:
   *       - in: path
   *         name: instrument
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Ministers found
   */
  findByInstrumento = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { instrument } = req.params;
      if (!instrument) {
        res.status(400).json({ success: false, error: 'Instrumento não informado' });
        return;
      }
      const ministers = await this.ministerService.findByInstrumento(String(instrument));
      
      const response: ApiResponse = {
        success: true,
        data: ministers,
      };
      
      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/v1/ministers/instruments:
   *   get:
   *     summary: Get unique instruments
   *     tags: [Ministers]
   *     responses:
   *       200:
   *         description: Unique instruments list
   */
  getUniqueInstrumentos = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const instruments = await this.ministerService.getUniqueInstrumentos();
      
      const response: ApiResponse = {
        success: true,
        data: instruments,
      };
      
      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/v1/ministers/stats:
   *   get:
   *     summary: Get ministers statistics
   *     tags: [Ministers]
   *     responses:
   *       200:
   *         description: Ministers statistics
   */
  getStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stats = await this.ministerService.getStats();
      
      const response: ApiResponse = {
        success: true,
        data: stats,
      };
      
      res.json(response);
    } catch (error) {
      next(error);
    }
  };
}
