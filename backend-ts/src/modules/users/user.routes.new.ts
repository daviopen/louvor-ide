import { Router } from 'express';
import { UserController } from './user.controller';
import { requireAuth } from '../auth/auth.middleware';
import { requirePermission } from '../../middleware/requirePermission';

const router = Router();
const userController = new UserController();

// Apply authentication middleware to all routes
router.use(requireAuth);

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management endpoints
 */

// Statistics route (admin and managers)
router.get('/statistics', requirePermission(['user.read', 'admin.all']), userController.getStatistics);

// User management routes
router.post('/', requirePermission(['user.create', 'admin.all']), userController.create);
router.get('/', requirePermission(['user.read', 'admin.all']), userController.findAll);
router.get('/uid/:uid', requirePermission(['user.read', 'admin.all']), userController.findByUid);
router.get('/:id', requirePermission(['user.read', 'admin.all']), userController.findById);
router.put('/:id', requirePermission(['user.update', 'admin.all']), userController.update);
router.patch('/:id/status', requirePermission(['user.update', 'admin.all']), userController.changeStatus);
router.delete('/:id', requirePermission(['user.delete', 'admin.all']), userController.delete);

export default router;
