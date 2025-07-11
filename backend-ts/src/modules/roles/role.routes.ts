import { Router } from 'express';
import { RoleController } from './role.controller';
import { requireAuth } from '../auth/auth.middleware';
import { requirePermission } from '../../middleware/requirePermission';

const router = Router();
const roleController = new RoleController();

// Apply authentication middleware to all routes
router.use(requireAuth);

/**
 * @swagger
 * tags:
 *   name: Roles
 *   description: Role management endpoints
 */

// Get all available permissions (accessible to users who can read users)
router.get('/permissions', requirePermission(['user.read', 'admin.all']), roleController.getPermissions);

// Initialize system roles (admin only)
router.post('/initialize', requirePermission(['admin.all']), roleController.initializeSystemRoles);

// CRUD routes
router.post('/', requirePermission(['admin.all']), roleController.create);
router.get('/', requirePermission(['user.read', 'admin.all']), roleController.findAll);
router.get('/:id', requirePermission(['user.read', 'admin.all']), roleController.findById);
router.put('/:id', requirePermission(['admin.all']), roleController.update);
router.delete('/:id', requirePermission(['admin.all']), roleController.delete);

export default router;
