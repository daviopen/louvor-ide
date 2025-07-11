import { Request, Response } from 'express';
import { authService } from './auth.service';

export class AuthController {
  /**
   * Verifica se o token é válido e retorna informações do usuário
   */
  async me(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      
      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Usuário não autenticado'
        });
        return;
      }

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      console.error('Erro ao buscar informações do usuário:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Atualiza informações do usuário
   */
  async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const { name, picture, telefone, atuacao, instrumento } = req.body;

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Usuário não autenticado'
        });
        return;
      }

      // Determinar se o usuário deve ser automaticamente marcado como ministro
      const isMinister = atuacao && atuacao.length > 0 ? authService.shouldBeMinister(atuacao) : undefined;

      await authService.createOrUpdateUser(user.uid, {
        name,
        picture,
        telefone,
        atuacao,
        instrumento,
        ...(isMinister !== undefined && { isMinister })
      });

      // Retornar usuário atualizado
      const updatedUser = await authService.getUserByUid(user.uid);

      res.json({
        success: true,
        data: updatedUser,
        message: 'Perfil atualizado com sucesso'
      });
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao atualizar perfil'
      });
    }
  }

  /**
   * Lista todos os usuários (apenas para admins)
   */
  async listUsers(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;

      if (user.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: 'Acesso negado'
        });
        return;
      }

      const maxResults = parseInt(req.query.limit as string) || 100;
      const users = await authService.listUsers(maxResults);

      res.json({
        success: true,
        data: users
      });
    } catch (error) {
      console.error('Erro ao listar usuários:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao listar usuários'
      });
    }
  }

  /**
   * Define a role de um usuário (apenas para admins)
   */
  async setUserRole(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const { userId, role } = req.body;

      if (user.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: 'Acesso negado'
        });
        return;
      }

      if (!userId || !role) {
        res.status(400).json({
          success: false,
          error: 'ID do usuário e role são obrigatórios'
        });
        return;
      }

      if (!['admin', 'minister', 'user'].includes(role)) {
        res.status(400).json({
          success: false,
          error: 'Role inválida. Use: admin, minister ou user'
        });
        return;
      }

      await authService.setUserRole(userId, role);

      res.json({
        success: true,
        message: 'Role do usuário atualizada com sucesso'
      });
    } catch (error) {
      console.error('Erro ao definir role do usuário:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao definir role do usuário'
      });
    }
  }

  /**
   * Remove um usuário (apenas para admins)
   */
  async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const { userId } = req.params;

      if (user.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: 'Acesso negado'
        });
        return;
      }

      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'ID do usuário é obrigatório'
        });
        return;
      }

      // Não permitir que o admin delete a si mesmo
      if (userId === user.uid) {
        res.status(400).json({
          success: false,
          error: 'Você não pode deletar sua própria conta'
        });
        return;
      }

      await authService.deleteUser(userId);

      res.json({
        success: true,
        message: 'Usuário removido com sucesso'
      });
    } catch (error) {
      console.error('Erro ao remover usuário:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao remover usuário'
      });
    }
  }

  /**
   * Cria um custom token para login server-side (apenas para desenvolvimento)
   */
  async createCustomToken(req: Request, res: Response): Promise<void> {
    try {
      const { uid } = req.body;

      // Apenas em desenvolvimento
      if (process.env.NODE_ENV === 'production') {
        res.status(403).json({
          success: false,
          error: 'Endpoint não disponível em produção'
        });
        return;
      }

      if (!uid) {
        res.status(400).json({
          success: false,
          error: 'UID é obrigatório'
        });
        return;
      }

      const customToken = await authService.createCustomToken(uid);

      res.json({
        success: true,
        data: { customToken }
      });
    } catch (error) {
      console.error('Erro ao criar custom token:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao criar token personalizado'
      });
    }
  }

  /**
   * Verifica se o usuário atual é admin
   */
  async checkAdminStatus(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Usuário não autenticado'
        });
        return;
      }

      // Verificar se o usuário tem role de admin através do novo sistema
      const hasAdminPermission = user.role?.permissions?.includes('admin.all') || false;
      const isAdmin = hasAdminPermission;
      const isMasterAdmin = hasAdminPermission; // Por enquanto, admin = master admin

      res.json({
        success: true,
        data: {
          isAdmin,
          isMasterAdmin,
          role: user.role?.displayName || 'user',
          permissions: user.role?.permissions || []
        }
      });
    } catch (error) {
      console.error('Erro ao verificar status de admin:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Lista todos os administradores (apenas para master admin)
   */
  async listAdmins(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;

      if (user.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: 'Acesso negado'
        });
        return;
      }

      const isMasterAdmin = await authService.isMasterAdmin(user.uid);
      if (!isMasterAdmin) {
        res.status(403).json({
          success: false,
          error: 'Apenas o master admin pode ver esta lista'
        });
        return;
      }

      const admins = await authService.listAdmins();

      res.json({
        success: true,
        data: admins
      });
    } catch (error) {
      console.error('Erro ao listar admins:', error);
      res.status(500).json({
        success: false,
        error: 'Erro ao listar administradores'
      });
    }
  }

  /**
   * Cria um novo usuário (apenas para admins)
   */
  async createUser(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const { email, password, displayName, role, telefone, atuacao, instrumento, allowedPages } = req.body;

      if (user.role !== 'admin') {
        res.status(403).json({
          success: false,
          error: 'Acesso negado'
        });
        return;
      }

      if (!email || !displayName) {
        res.status(400).json({
          success: false,
          error: 'Email e nome são obrigatórios'
        });
        return;
      }

      if (password && password.length < 6) {
        res.status(400).json({
          success: false,
          error: 'A senha deve ter pelo menos 6 caracteres'
        });
        return;
      }

      if (role && !['admin', 'minister', 'user'].includes(role)) {
        res.status(400).json({
          success: false,
          error: 'Role inválida. Use: admin, minister ou user'
        });
        return;
      }

      const newUser = await authService.createUser({
        email,
        password, // Pode ser undefined, será usado "123456" como padrão
        displayName,
        role: role || 'user',
        telefone,
        atuacao,
        instrumento,
        allowedPages
      });

      res.status(201).json({
        success: true,
        data: newUser,
        message: 'Usuário criado com sucesso'
      });
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao criar usuário'
      });
    }
  }
}

export const authController = new AuthController();
