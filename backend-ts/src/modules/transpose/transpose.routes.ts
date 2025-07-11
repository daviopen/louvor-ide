import { Router, Request, Response } from 'express';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Transpose
 *   description: Music transposition and chord analysis endpoints
 */

// Simple transpose endpoint for now
router.post('/', (req: Request, res: Response) => {
  try {
    const { cifra, semitones = 0 } = req.body;
    
    if (!cifra) {
      return res.status(400).json({
        success: false,
        message: 'Cifra é obrigatória'
      });
    }

    // Simple transpose logic - for now just return original
    return res.json({
      success: true,
      data: {
        originalCifra: cifra,
        transposedCifra: cifra, // TODO: implement actual transposition
        semitones: semitones
      }
    });
  } catch (error) {
    console.error('Erro na transposição:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// Get valid keys
router.get('/keys', (req: Request, res: Response) => {
  const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  return res.json({
    success: true,
    data: keys
  });
});

export default router;
