import { Router } from 'express';
import { SetlistController } from './setlist.controller';
import { validateRequest } from '../../middleware/validation';
import { createSetlistSchema, updateSetlistSchema } from '../../utils/validation';
import { idParamSchema } from '../../utils/validation';

const router = Router();
const setlistController = new SetlistController();

/**
 * @swagger
 * tags:
 *   name: Setlists
 *   description: Setlist management endpoints
 */

// Create setlist
router.post(
  '/',
  validateRequest({ body: createSetlistSchema }),
  setlistController.create
);

// Get all setlists
router.get('/', setlistController.findAll);

// Get setlists statistics
router.get('/stats', setlistController.getStats);

// Get setlists by status
router.get('/by-status/:status', setlistController.findByStatus);

// Get setlists by responsible minister
router.get('/by-responsavel/:responsavel', setlistController.findByResponsavel);

// Get setlist by ID
router.get(
  '/:id',
  validateRequest({ params: idParamSchema }),
  setlistController.findById
);

// Update setlist
router.put(
  '/:id',
  validateRequest({ 
    params: idParamSchema,
    body: updateSetlistSchema 
  }),
  setlistController.update
);

// Update setlist status
router.patch(
  '/:id/status',
  validateRequest({ params: idParamSchema }),
  setlistController.updateStatus
);

// Delete setlist
router.delete(
  '/:id',
  validateRequest({ params: idParamSchema }),
  setlistController.delete
);

export default router;
