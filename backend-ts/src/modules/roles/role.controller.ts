import { Request, Response, NextFunction } from 'express';
import { RoleService } from './role.service';
import { CreateRoleDto, UpdateRoleDto, ApiResponse } from '../../types';

export class RoleController {
  private roleService = new RoleService();

  /**
   * @swagger
   * /api/v1/roles:
   *   post:
   *     summary: Create a new role
   *     tags: [Roles]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [name, displayName, permissions]
   *             properties:
   *               name:
   *                 type: string
   *                 example: "custom_role"
   *               displayName:
   *                 type: string
   *                 example: "Função Personalizada"
   *               description:
   *                 type: string
   *                 example: "Descrição da função"
   *               permissions:
   *                 type: array
   *                 items:
   *                   type: string
   *                 example: ["music.read", "music.create"]
   *               color:
   *                 type: string
   *                 example: "#3b82f6"
   *     responses:
   *       201:
   *         description: Role created successfully
   *       400:
   *         description: Invalid input
   *       403:
   *         description: Insufficient permissions
   */
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const roleData: CreateRoleDto = req.body;
      
      const role = await this.roleService.create(roleData);
      
      const response: ApiResponse = {
        success: true,
        data: role,
        message: 'Role criada com sucesso',
      };
      
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/v1/roles:
   *   get:
   *     summary: Get all roles with pagination and search
   *     tags: [Roles]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *         description: Page number
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 50
   *         description: Number of items per page
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *         description: Search term for name or display name
   *       - in: query
   *         name: sortBy
   *         schema:
   *           type: string
   *           default: displayName
   *         description: Field to sort by
   *       - in: query
   *         name: sortOrder
   *         schema:
   *           type: string
   *           enum: [asc, desc]
   *           default: asc
   *         description: Sort order
   *     responses:
   *       200:
   *         description: Roles retrieved successfully
   */
  findAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.query;
      const result = await this.roleService.findAll(query);
      
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/v1/roles/{id}:
   *   get:
   *     summary: Get role by ID
   *     tags: [Roles]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Role ID
   *     responses:
   *       200:
   *         description: Role found
   *       404:
   *         description: Role not found
   */
  findById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({
          success: false,
          error: 'ID da role é obrigatório',
        });
        return;
      }
      
      const role = await this.roleService.findById(id);
      
      if (!role) {
        res.status(404).json({
          success: false,
          error: 'Role não encontrada',
        });
        return;
      }
      
      const response: ApiResponse = {
        success: true,
        data: role,
      };
      
      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/v1/roles/{id}:
   *   put:
   *     summary: Update role
   *     tags: [Roles]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Role ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               displayName:
   *                 type: string
   *               description:
   *                 type: string
   *               permissions:
   *                 type: array
   *                 items:
   *                   type: string
   *               color:
   *                 type: string
   *     responses:
   *       200:
   *         description: Role updated successfully
   *       404:
   *         description: Role not found
   *       403:
   *         description: Insufficient permissions
   */
  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const updateData: UpdateRoleDto = req.body;
      
      if (!id) {
        res.status(400).json({
          success: false,
          error: 'ID da role é obrigatório',
        });
        return;
      }
      
      const role = await this.roleService.update(id, updateData);
      
      const response: ApiResponse = {
        success: true,
        data: role,
        message: 'Role atualizada com sucesso',
      };
      
      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/v1/roles/{id}:
   *   delete:
   *     summary: Delete role
   *     tags: [Roles]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *         description: Role ID
   *     responses:
   *       200:
   *         description: Role deleted successfully
   *       404:
   *         description: Role not found
   *       403:
   *         description: Insufficient permissions or system role
   */
  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      
      if (!id) {
        res.status(400).json({
          success: false,
          error: 'ID da role é obrigatório',
        });
        return;
      }
      
      await this.roleService.delete(id);
      
      const response: ApiResponse = {
        success: true,
        message: 'Role deletada com sucesso',
      };
      
      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/v1/roles/permissions:
   *   get:
   *     summary: Get all available permissions
   *     tags: [Roles]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Permissions retrieved successfully
   */
  getPermissions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const permissions = this.roleService.getAvailablePermissions();
      
      const response: ApiResponse = {
        success: true,
        data: permissions,
      };
      
      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  /**
   * @swagger
   * /api/v1/roles/initialize:
   *   post:
   *     summary: Initialize default system roles
   *     tags: [Roles]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: System roles initialized
   *       403:
   *         description: Insufficient permissions
   */
  initializeSystemRoles = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.roleService.initializeSystemRoles();
      
      const response: ApiResponse = {
        success: true,
        message: 'Roles do sistema inicializadas com sucesso',
      };
      
      res.json(response);
    } catch (error) {
      next(error);
    }
  };
}
