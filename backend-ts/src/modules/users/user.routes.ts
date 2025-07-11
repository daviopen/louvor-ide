import { Router } from 'express';
import { UserController } from './user.controller';
import { validateRequest } from '../../middleware/validation';
import { createUserSchema, updateUserSchema } from '../../utils/validation';
import { idParamSchema } from '../../utils/validation';

const router = Router();
const userController = new UserController();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management endpoints
 */

// Create user
router.post(
  '/',
  validateRequest({ body: createUserSchema }),
  userController.create
);

// Get all users
router.get('/', userController.findAll);

// Get users statistics
router.get('/stats', userController.getStats);

// Get user by Firebase UID
router.get('/uid/:uid', userController.findByUid);

// Get users by role
router.get('/by-role/:role', userController.findByRole);

// Update last login
router.post('/login/:uid', userController.updateLastLogin);

// Get user by ID
router.get(
  '/:id',
  validateRequest({ params: idParamSchema }),
  userController.findById
);

// Update user
router.put(
  '/:id',
  validateRequest({ 
    params: idParamSchema,
    body: updateUserSchema 
  }),
  userController.update
);

// Change user status
router.patch(
  '/:id/status',
  validateRequest({ params: idParamSchema }),
  userController.changeStatus
);

// Delete user
router.delete(
  '/:id',
  validateRequest({ params: idParamSchema }),
  userController.delete
);

export default router;
