import Joi from 'joi';

// Music validation schemas
export const createMusicSchema = Joi.object({
  titulo: Joi.string().min(1).max(200).required(),
  artista: Joi.string().min(1).max(100).required(),
  tom: Joi.string().valid('C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B').required(),
  bpm: Joi.number().integer().min(60).max(200).optional(),
  link: Joi.string().uri().optional(),
  cifra: Joi.string().min(1).required(),
  ministros: Joi.array().items(Joi.string().min(1)).required(),
  tags: Joi.array().items(Joi.string()).optional(),
});

export const updateMusicSchema = Joi.object({
  titulo: Joi.string().min(1).max(200).optional(),
  artista: Joi.string().min(1).max(100).optional(),
  tom: Joi.string().valid('C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B').optional(),
  bpm: Joi.number().integer().min(60).max(200).optional(),
  link: Joi.string().uri().optional(),
  cifra: Joi.string().min(1).optional(),
  ministros: Joi.array().items(Joi.string().min(1)).optional(),
  tags: Joi.array().items(Joi.string()).optional(),
});

export const idParamSchema = Joi.object({
  id: Joi.string().required(),
});

export const searchQuerySchema = Joi.object({
  search: Joi.string().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sortBy: Joi.string().valid('titulo', 'artista', 'createdAt', 'updatedAt').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  ministro: Joi.string().optional(),
  tom: Joi.string().valid('C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B').optional(),
});
