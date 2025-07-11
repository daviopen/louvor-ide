import { Router } from 'express';
import { MinisterController } from './minister.controller';
import { validateRequest } from '../../middleware/validation';
import { createMinisterSchema, updateMinisterSchema } from '../../utils/validation';
import { idParamSchema } from '../../utils/validation';
import { requireAuth, requireRole, optionalAuth } from '../auth/auth.middleware';

const router = Router();
const ministerController = new MinisterController();

/**
 * @swagger
 * tags:
 *   name: Ministers
 *   description: Ministers management endpoints
 */

// Create minister
router.post(
  '/',
  requireAuth,
  requireRole(['admin', 'minister']),
  validateRequest({ body: createMinisterSchema }),
  ministerController.create
);

// Get all ministers
router.get('/', optionalAuth, ministerController.findAll);

// Get ministers statistics
router.get('/stats', optionalAuth, ministerController.getStats);

// Get unique instruments
router.get('/instruments', optionalAuth, ministerController.getUniqueInstrumentos);

// Get ministers by instrument
router.get('/by-instrument/:instrument', optionalAuth, ministerController.findByInstrumento);

// Get minister by ID
router.get(
  '/:id',
  optionalAuth,
  validateRequest({ params: idParamSchema }),
  ministerController.findById
);

// Update minister
router.put(
  '/:id',
  requireAuth,
  requireRole(['admin', 'minister']),
  validateRequest({ 
    params: idParamSchema,
    body: updateMinisterSchema 
  }),
  ministerController.update
);

// Delete minister
router.delete(
  '/:id',
  requireAuth,
  requireRole(['admin']),
  validateRequest({ params: idParamSchema }),
  ministerController.delete
);

export default router;
