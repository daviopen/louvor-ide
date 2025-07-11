import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { UserService } from '../users/user.service';

const userService = new UserService();

/**
 * Middleware para verificar se o usuário está autenticado
 */
export const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      res.status(401).json({
        success: false,
        error: 'Token de autenticação não fornecido'
      });
      return;
    }

    const token = authHeader.replace(/^Bearer\s+/i, '');
    
    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Token de autenticação inválido'
      });
      return;
    }

    // Verificar o token
    const decodedToken = await authService.verifyToken(token);
    
    // Buscar informações completas do usuário no nosso sistema
    const systemUser = await userService.findByUid(decodedToken.uid);
    
    // Se o usuário não existe no nosso sistema, usar dados básicos do Firebase
    let user;
    if (systemUser) {
      user = {
        uid: systemUser.uid,
        email: systemUser.email,
        nome: systemUser.nome,
        role: systemUser.role ? {
          id: systemUser.role.id,
          displayName: systemUser.role.displayName,
          permissions: systemUser.role.permissions
        } : undefined
      };
    } else {
      // Usuário do Firebase, mas não registrado no sistema
      const firebaseUser = await authService.getUserByUid(decodedToken.uid);
      user = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        nome: firebaseUser.name || firebaseUser.email?.split('@')[0] || '',
        role: undefined // Sem permissões até ser registrado
      };
    }
    
    // Adicionar o usuário ao request para uso nos controllers
    (req as any).user = user;
    (req as any).token = decodedToken;
    
    next();
  } catch (error) {
    console.error('Erro na autenticação:', error);
    res.status(401).json({
      success: false,
      error: 'Token inválido ou expirado'
    });
  }
};

/**
 * Middleware para verificar se o usuário tem uma role específica
 */
export const requireRole = (roles: string | string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = (req as any).user;
      
      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Usuário não autenticado'
        });
        return;
      }

      const allowedRoles = Array.isArray(roles) ? roles : [roles];
      
      if (!allowedRoles.includes(user.role)) {
        res.status(403).json({
          success: false,
          error: 'Permissão insuficiente'
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Erro na verificação de role:', error);
      res.status(403).json({
        success: false,
        error: 'Erro na verificação de permissões'
      });
    }
  };
};

/**
 * Middleware opcional de autenticação (não falha se não houver token)
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader) {
      const token = authHeader.replace(/^Bearer\s+/i, '');
      
      if (token) {
        try {
          const decodedToken = await authService.verifyToken(token);
          const user = await authService.getUserByUid(decodedToken.uid);
          
          (req as any).user = user;
          (req as any).token = decodedToken;
        } catch (error) {
          // Ignorar erros de token em autenticação opcional
          console.warn('Token opcional inválido:', error);
        }
      }
    }
    
    next();
  } catch (error) {
    // Em caso de erro, continuar sem autenticação
    next();
  }
};
