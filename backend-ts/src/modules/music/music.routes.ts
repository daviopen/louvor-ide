import { Router } from 'express';
import { MusicController } from './music.controller';
import { requireAuth, optionalAuth } from '../auth/auth.middleware';

const router = Router();
const musicController = new MusicController();

/**
 * @swagger
 * tags:
 *   name: Music
 *   description: Music management endpoints
 */

/**
 * @swagger
 * /api/v1/music:
 *   get:
 *     summary: Get all music
 *     tags: [Music]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.get('/', optionalAuth, musicController.findAll);

/**
 * @swagger
 * /api/v1/music:
 *   post:
 *     summary: Create new music
 *     tags: [Music]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Music'
 *     responses:
 *       201:
 *         description: Music created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.post('/', requireAuth, musicController.create);

/**
 * @swagger
 * /api/v1/music/{id}:
 *   get:
 *     summary: Get music by ID
 *     tags: [Music]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.get('/:id', optionalAuth, musicController.findById);

/**
 * @swagger
 * /api/v1/music/{id}:
 *   put:
 *     summary: Update music by ID
 *     tags: [Music]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Music'
 *     responses:
 *       200:
 *         description: Music updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.put('/:id', requireAuth, musicController.update);

/**
 * @swagger
 * /api/v1/music/{id}:
 *   delete:
 *     summary: Delete music by ID
 *     tags: [Music]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Music deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 */
router.delete('/:id', requireAuth, musicController.delete);

// Health check for music routes
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Music routes working',
    timestamp: new Date().toISOString()
  });
});

export default router;
