import { Request, Response, NextFunction } from 'express';
import { TransposeService } from './transpose.service';
import { TransposeRequest, ApiResponse } from '../../types';

export class TransposeController {
  private transposeService = new TransposeService();

  /**
   * @swagger
   * /api/v1/transpose:
   *   post:
   *     summary: Transpose a cifra by semitones
   *     tags: [Transpose]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [cifra, semitones]
   *             properties:
   *               cifra:
   *                 type: string
   *                 example: "[G]Quão grande [D]é o meu [Em]Deus"
   *               semitones:
   *                 type: integer
   *                 minimum: -11
   *                 maximum: 11
   *                 example: 2
   *               tomOriginal:
   *                 type: string
   *                 enum: [C, C#, D, D#, E, F, F#, G, G#, A, A#, B]
   *                 example: "G"
   *     responses:
   *       200:
   *         description: Cifra transposed successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 data:
   *                   type: object
   *                   properties:
   *                     cifraOriginal:
   *                       type: string
   *                     cifraTransposta:
   *                       type: string
   *                     tomOriginal:
   *                       type: string
   *                     tomFinal:
   *                       type: string
   *                     semitones:
   *                       type: integer
   */
  transpose = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const request: TransposeRequest = req.body;
      const result = this.transposeService.transpose(request);
      
      const response: ApiResponse = {
        success: true,
        data: result,
        message: 'Cifra transposta com sucesso',
      };
      
      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/v1/transpose/validate:
   *   post:
   *     summary: Validate a cifra and extract chords
   *     tags: [Transpose]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [cifra]
   *             properties:
   *               cifra:
   *                 type: string
   *                 example: "[G]Quão grande [D]é o meu [Em]Deus"
   *     responses:
   *       200:
   *         description: Cifra validated successfully
   */
  validate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { cifra } = req.body;
      const result = this.transposeService.validate(cifra);
      
      const response: ApiResponse = {
        success: true,
        data: result,
      };
      
      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/v1/transpose/keys:
   *   get:
   *     summary: Get all valid musical keys
   *     tags: [Transpose]
   *     responses:
   *       200:
   *         description: Valid keys retrieved successfully
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
   *                     type: string
   *                   example: ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
   */
  getValidKeys = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const keys = this.transposeService.getValidKeys();
      
      const response: ApiResponse = {
        success: true,
        data: keys,
      };
      
      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/v1/transpose/key:
   *   post:
   *     summary: Transpose a single key by semitones
   *     tags: [Transpose]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [originalKey, semitones]
   *             properties:
   *               originalKey:
   *                 type: string
   *                 enum: [C, C#, D, D#, E, F, F#, G, G#, A, A#, B]
   *                 example: "G"
   *               semitones:
   *                 type: integer
   *                 minimum: -11
   *                 maximum: 11
   *                 example: 2
   *     responses:
   *       200:
   *         description: Key transposed successfully
   */
  transposeKey = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { originalKey, semitones } = req.body;
      const newKey = this.transposeService.transposeKey(originalKey, semitones);
      
      const response: ApiResponse = {
        success: true,
        data: {
          originalKey,
          newKey,
          semitones,
        },
        message: 'Tom transposto com sucesso',
      };
      
      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/v1/transpose/chord-info:
   *   post:
   *     summary: Get information about a chord
   *     tags: [Transpose]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [chord]
   *             properties:
   *               chord:
   *                 type: string
   *                 example: "Cmaj7"
   *     responses:
   *       200:
   *         description: Chord information retrieved successfully
   */
  getChordInfo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { chord } = req.body;
      const info = this.transposeService.getChordInfo(chord);
      
      if (!info) {
        res.status(400).json({
          success: false,
          error: 'Acorde inválido ou não reconhecido',
        });
        return;
      }
      
      const response: ApiResponse = {
        success: true,
        data: info,
      };
      
      res.json(response);
    } catch (error) {
      next(error);
    }
  };
}
