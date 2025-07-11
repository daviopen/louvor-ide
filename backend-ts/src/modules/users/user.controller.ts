import { Request, Response, NextFunction } from 'express';
import { UserService } from './user.service';
import { CreateUserDto, UpdateUserDto, ApiResponse } from '../../types';

export class UserController {
  private userService = new UserService();

  /**
   * @swagger
   * /api/v1/users:
   *   post:
   *     summary: Create a new user
   *     tags: [Users]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [uid, nome, email, role]
   *             properties:
   *               uid:
   *                 type: string
   *                 example: "firebase-uid-123"
   *               nome:
   *                 type: string
   *                 example: "João Silva"
   *               email:
   *                 type: string
   *                 format: email
   *                 example: "joao@email.com"
   *               role:
   *                 type: string
   *                 enum: [admin, lider, ministro, membro]
   *                 example: "ministro"
   *               avatar:
   *                 type: string
   *                 format: uri
   *                 example: "https://example.com/avatar.jpg"
   *     responses:
   *       201:
   *         description: User created successfully
   */
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data: CreateUserDto = req.body;
      const user = await this.userService.create(data);
      
      const response: ApiResponse = {
        success: true,
        data: user,
        message: 'Usuário criado com sucesso',
      };
      
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/v1/users:
   *   get:
   *     summary: Get all users
   *     tags: [Users]
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
   *           enum: [nome, email, role, createdAt, updatedAt]
   *           default: createdAt
   *       - in: query
   *         name: sortOrder
   *         schema:
   *           type: string
   *           enum: [asc, desc]
   *           default: desc
   *     responses:
   *       200:
   *         description: Users retrieved successfully
   */
  findAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.query;
      const result = await this.userService.findAll(query);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/v1/users/{id}:
   *   get:
   *     summary: Get user by ID
   *     tags: [Users]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: User found
   *       404:
   *         description: User not found
   */
  findById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const user = await this.userService.findById(id!);
      
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'Usuário não encontrado',
        });
        return;
      }
      
      const response: ApiResponse = {
        success: true,
        data: user,
      };
      
      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/v1/users/uid/{uid}:
   *   get:
   *     summary: Get user by Firebase UID
   *     tags: [Users]
   *     parameters:
   *       - in: path
   *         name: uid
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: User found
   *       404:
   *         description: User not found
   */
  findByUid = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { uid } = req.params;
      const user = await this.userService.findByUid(uid!);
      
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'Usuário não encontrado',
        });
        return;
      }
      
      const response: ApiResponse = {
        success: true,
        data: user,
      };
      
      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/v1/users/{id}:
   *   put:
   *     summary: Update user
   *     tags: [Users]
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
   *               role:
   *                 type: string
   *                 enum: [admin, lider, ministro, membro]
   *               avatar:
   *                 type: string
   *                 format: uri
   *               preferences:
   *                 type: object
   *                 properties:
   *                   theme:
   *                     type: string
   *                     enum: [light, dark]
   *                   defaultKey:
   *                     type: string
   *                     enum: [C, C#, D, D#, E, F, F#, G, G#, A, A#, B]
   *                   notifications:
   *                     type: boolean
   *                   language:
   *                     type: string
   *                     enum: [pt, en]
   *     responses:
   *       200:
   *         description: User updated successfully
   *       404:
   *         description: User not found
   */
  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const data: UpdateUserDto = req.body;
      
      const user = await this.userService.update(id!, data);
      
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'Usuário não encontrado',
        });
        return;
      }
      
      const response: ApiResponse = {
        success: true,
        data: user,
        message: 'Usuário atualizado com sucesso',
      };
      
      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/v1/users/{id}:
   *   delete:
   *     summary: Delete user
   *     tags: [Users]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: User deleted successfully
   *       404:
   *         description: User not found
   */
  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const deleted = await this.userService.delete(id!);
      
      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Usuário não encontrado',
        });
        return;
      }
      
      const response: ApiResponse = {
        success: true,
        message: 'Usuário deletado com sucesso',
      };
      
      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/v1/users/by-role/{role}:
   *   get:
   *     summary: Get users by role
   *     tags: [Users]
   *     parameters:
   *       - in: path
   *         name: role
   *         required: true
   *         schema:
   *           type: string
   *           enum: [admin, lider, ministro, membro]
   *     responses:
   *       200:
   *         description: Users found
   */
  findByRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { role } = req.params as { role: 'admin' | 'lider' | 'ministro' | 'membro' };
      const users = await this.userService.findByRole(role);
      
      const response: ApiResponse = {
        success: true,
        data: users,
      };
      
      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/v1/users/stats:
   *   get:
   *     summary: Get users statistics
   *     tags: [Users]
   *     responses:
   *       200:
   *         description: Users statistics
   */
  getStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stats = await this.userService.getStats();
      
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
   * /api/v1/users/login/{uid}:
   *   post:
   *     summary: Update user last login
   *     tags: [Users]
   *     parameters:
   *       - in: path
   *         name: uid
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Last login updated
   */
  updateLastLogin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { uid } = req.params;
      await this.userService.updateLastLogin(uid!);
      
      const response: ApiResponse = {
        success: true,
        message: 'Last login atualizado com sucesso',
      };
      
      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/v1/users/{id}/status:
   *   patch:
   *     summary: Change user status
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: User ID
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
   *                 enum: [ativo, inativo, pendente]
   *     responses:
   *       200:
   *         description: User status updated successfully
   *       404:
   *         description: User not found
   *       403:
   *         description: Insufficient permissions
   */
  changeStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!id) {
        res.status(400).json({
          success: false,
          error: 'ID do usuário é obrigatório',
        });
        return;
      }

      if (!status || !['ativo', 'inativo', 'pendente'].includes(status)) {
        res.status(400).json({
          success: false,
          error: 'Status inválido',
        });
        return;
      }
      
      const user = await this.userService.changeStatus(id, status);
      
      const response: ApiResponse = {
        success: true,
        data: user,
        message: 'Status do usuário atualizado com sucesso',
      };
      
      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/v1/users/statistics:
   *   get:
   *     summary: Get user statistics
   *     tags: [Users]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Statistics retrieved successfully
   *       403:
   *         description: Insufficient permissions
   */
  getStatistics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stats = await this.userService.getStatistics();
      
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
