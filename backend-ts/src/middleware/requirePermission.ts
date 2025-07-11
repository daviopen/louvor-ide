import { Request, Response, NextFunction } from 'express';
import { RoleService } from '../modules/roles/role.service';
import { Permission } from '../types';

declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        email: string;
        role?: {
          id: string;
          permissions: Permission[];
        };
      };
    }
  }
}

const roleService = new RoleService();

/**
 * Middleware to check if user has required permissions
 */
export const requirePermission = (requiredPermissions: Permission[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Usuário não autenticado'
        });
        return;
      }

      // Get user permissions from role
      const userPermissions = req.user.role?.permissions || [];
      
      // Check if user has required permissions
      const hasPermission = roleService.hasAnyPermission(userPermissions, requiredPermissions);
      
      if (!hasPermission) {
        res.status(403).json({
          success: false,
          error: 'Permissões insuficientes'
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Erro no middleware de permissão:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  };
};

/**
 * Middleware to check if user has admin privileges
 */
export const requireAdmin = requirePermission(['admin.all']);

/**
 * Middleware to check specific permission
 */
export const hasPermission = (permission: Permission) => {
  return requirePermission([permission]);
};
