import { Router } from 'express';
import { authController } from './auth.controller';
import { requireAuth, requireRole } from './auth.middleware';

const router = Router();

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Obter informações do usuário autenticado
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Informações do usuário
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/AuthUser'
 *       401:
 *         description: Token inválido ou não fornecido
 */
router.get('/me', requireAuth, authController.me);

/**
 * @swagger
 * /auth/profile:
 *   put:
 *     summary: Atualizar perfil do usuário
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "João Silva"
 *               picture:
 *                 type: string
 *                 example: "https://exemplo.com/foto.jpg"
 *               telefone:
 *                 type: string
 *                 example: "(11) 99999-9999"
 *               atuacao:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [Violão, Guitarra, Violino, Bateria, Baixo, Teclado, Sax, Ministro, Diretor Musical]
 *                 example: ["Violão", "Ministro"]
 *               instrumento:
 *                 type: string
 *                 example: "Violão"
 *               allowedPages:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [home, search, add-music, edit-music, profile, admin, ministers]
 *                 example: ["home", "search", "profile"]
 *                 description: "Páginas que o usuário pode acessar"
 *     responses:
 *       200:
 *         description: Perfil atualizado com sucesso
 *       401:
 *         description: Token inválido ou não fornecido
 */
router.put('/profile', requireAuth, authController.updateProfile);

/**
 * @swagger
 * /auth/users:
 *   get:
 *     summary: Listar todos os usuários (apenas admins)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Número máximo de usuários para retornar
 *     responses:
 *       200:
 *         description: Lista de usuários
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
 *                     $ref: '#/components/schemas/AuthUser'
 *       403:
 *         description: Acesso negado
 */
router.get('/users', requireAuth, requireRole('admin'), authController.listUsers);

/**
 * @swagger
 * /auth/users/role:
 *   put:
 *     summary: Definir role de um usuário (apenas admins)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - role
 *             properties:
 *               userId:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [admin, minister, user]
 *     responses:
 *       200:
 *         description: Role atualizada com sucesso
 *       403:
 *         description: Acesso negado
 */
router.put('/users/role', requireAuth, requireRole('admin'), authController.setUserRole);

/**
 * @swagger
 * /auth/users/{userId}:
 *   delete:
 *     summary: Remover um usuário (apenas admins)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do usuário a ser removido
 *     responses:
 *       200:
 *         description: Usuário removido com sucesso
 *       403:
 *         description: Acesso negado
 */
router.delete('/users/:userId', requireAuth, requireRole('admin'), authController.deleteUser);

/**
 * @swagger
 * /auth/users:
 *   post:
 *     summary: Criar um novo usuário (apenas admins)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - displayName
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "usuario@exemplo.com"
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: "senha123"
 *                 description: "Opcional. Se não fornecida, será usada senha padrão '123456'"
 *               displayName:
 *                 type: string
 *                 example: "João Silva"
 *               role:
 *                 type: string
 *                 enum: [admin, minister, user]
 *                 default: user
 *                 example: "user"
 *               telefone:
 *                 type: string
 *                 example: "(11) 99999-9999"
 *               atuacao:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [Violão, Guitarra, Violino, Bateria, Baixo, Teclado, Sax, Ministro, Diretor Musical]
 *                 example: ["Violão", "Ministro"]
 *               instrumento:
 *                 type: string
 *                 example: "Violão"
 *     responses:
 *       201:
 *         description: Usuário criado com sucesso
 *       400:
 *         description: Dados inválidos
 *       403:
 *         description: Acesso negado
 */
router.post('/users', requireAuth, requireRole('admin'), authController.createUser);

/**
 * @swagger
 * /auth/custom-token:
 *   post:
 *     summary: Criar token personalizado (apenas desenvolvimento)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - uid
 *             properties:
 *               uid:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token criado com sucesso
 *       403:
 *         description: Endpoint não disponível em produção
 */
if (process.env.NODE_ENV !== 'production') {
  router.post('/custom-token', authController.createCustomToken);
}

/**
 * @swagger
 * /auth/admin-status:
 *   get:
 *     summary: Verificar se o usuário é admin
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Status de admin do usuário
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
 *                     isAdmin:
 *                       type: boolean
 *                     isMasterAdmin:
 *                       type: boolean
 *                     role:
 *                       type: string
 *       401:
 *         description: Token inválido ou não fornecido
 */
router.get('/admin-status', requireAuth, authController.checkAdminStatus);

/**
 * @swagger
 * /auth/admins:
 *   get:
 *     summary: Listar todos os administradores (apenas master admin)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de administradores
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
 *                     $ref: '#/components/schemas/AuthUser'
 *       403:
 *         description: Acesso negado - apenas master admin
 */
router.get('/admins', requireAuth, authController.listAdmins);

export default router;
