import Joi from 'joi';

// Music validation schemas
export const createMusicSchema = Joi.object({
  titulo: Joi.string().trim().min(1).max(200).required(),
  artista: Joi.string().trim().min(1).max(100).required(),
  tom: Joi.string().valid('C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B').required(),
  bpm: Joi.number().integer().min(60).max(200).optional(),
  link: Joi.string().uri().optional(),
  cifra: Joi.string().trim().min(1).required(),
  ministros: Joi.array().items(Joi.string().trim().min(1)).min(1).required(),
  tags: Joi.array().items(Joi.string().trim()).optional(),
});

export const updateMusicSchema = Joi.object({
  titulo: Joi.string().trim().min(1).max(200).optional(),
  artista: Joi.string().trim().min(1).max(100).optional(),
  tom: Joi.string().valid('C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B').optional(),
  bpm: Joi.number().integer().min(60).max(200).optional(),
  link: Joi.string().uri().optional(),
  cifra: Joi.string().trim().min(1).optional(),
  ministros: Joi.array().items(Joi.string().trim().min(1)).optional(),
  tags: Joi.array().items(Joi.string().trim()).optional(),
});

export const searchMusicSchema = Joi.object({
  search: Joi.string().trim().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sortBy: Joi.string().valid('titulo', 'artista', 'createdAt', 'updatedAt').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});

// Minister validation schemas
export const createMinisterSchema = Joi.object({
  nome: Joi.string().trim().min(1).max(100).required(),
  email: Joi.string().email().optional(),
  telefone: Joi.string().trim().optional(),
  instrumento: Joi.array().items(Joi.string().trim().min(1)).min(1).required(),
  avatar: Joi.string().uri().optional(),
  observacoes: Joi.string().trim().optional(),
});

export const updateMinisterSchema = Joi.object({
  nome: Joi.string().trim().min(1).max(100).optional(),
  email: Joi.string().email().optional(),
  telefone: Joi.string().trim().optional(),
  instrumento: Joi.array().items(Joi.string().trim().min(1)).optional(),
  status: Joi.string().valid('ativo', 'inativo').optional(),
  avatar: Joi.string().uri().optional(),
  observacoes: Joi.string().trim().optional(),
});

// User validation schemas
export const createUserSchema = Joi.object({
  uid: Joi.string().trim().required(),
  nome: Joi.string().trim().min(1).max(100).required(),
  email: Joi.string().email().required(),
  roleId: Joi.string().trim().optional(),
  role: Joi.string().valid('admin', 'lider', 'ministro', 'membro').optional(),
  avatar: Joi.string().uri().optional(),
  telefone: Joi.string().trim().optional(),
  atuacao: Joi.array().items(Joi.string()).optional(),
  isMinister: Joi.boolean().optional(),
  status: Joi.string().valid('ativo', 'inativo', 'pendente').optional().default('ativo'),
  password: Joi.string().min(6).optional(), // Campo opcional para senha personalizada
}).or('roleId', 'role'); // Pelo menos um dos dois deve estar presente

export const updateUserSchema = Joi.object({
  nome: Joi.string().trim().min(1).max(100).optional(),
  email: Joi.string().email().optional(),
  role: Joi.string().valid('admin', 'lider', 'ministro', 'membro').optional(),
  avatar: Joi.string().uri().optional(),
  status: Joi.string().valid('ativo', 'inativo', 'pendente').optional(),
  isMinister: Joi.boolean().optional(),
  telefone: Joi.string().trim().optional(),
  atuacao: Joi.array().items(Joi.string()).optional(),
  instrumento: Joi.array().items(Joi.string()).optional(),
  password: Joi.string().min(6).optional(), // Novo campo para redefinir senha
  preferences: Joi.object({
    theme: Joi.string().valid('light', 'dark').optional(),
    defaultKey: Joi.string().valid('C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B').optional(),
    notifications: Joi.boolean().optional(),
    language: Joi.string().valid('pt', 'en').optional(),
  }).optional(),
});

// Setlist validation schemas
export const createSetlistSchema = Joi.object({
  titulo: Joi.string().trim().min(1).max(200).required(),
  data: Joi.date().required(),
  local: Joi.string().trim().optional(),
  responsavel: Joi.string().trim().required(),
  musicas: Joi.array().items(
    Joi.object({
      musicId: Joi.string().trim().required(),
      ordem: Joi.number().integer().min(1).required(),
      tom: Joi.string().valid('C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B').optional(),
      observacoes: Joi.string().trim().optional(),
    })
  ).required(),
  observacoes: Joi.string().trim().optional(),
  tags: Joi.array().items(Joi.string().trim()).optional(),
});

export const updateSetlistSchema = Joi.object({
  titulo: Joi.string().trim().min(1).max(200).optional(),
  data: Joi.date().optional(),
  local: Joi.string().trim().optional(),
  responsavel: Joi.string().trim().optional(),
  musicas: Joi.array().items(
    Joi.object({
      musicId: Joi.string().trim().required(),
      ordem: Joi.number().integer().min(1).required(),
      tom: Joi.string().valid('C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B').optional(),
      observacoes: Joi.string().trim().optional(),
    })
  ).optional(),
  observacoes: Joi.string().trim().optional(),
  tags: Joi.array().items(Joi.string().trim()).optional(),
  status: Joi.string().valid('planejada', 'em_andamento', 'finalizada', 'cancelada').optional(),
});

// Transpose validation schemas
export const transposeSchema = Joi.object({
  cifra: Joi.string().trim().min(1).required(),
  semitones: Joi.number().integer().min(-11).max(11).required(),
  tomOriginal: Joi.string().valid('C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B').optional(),
});

// Common validation schemas
export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sortBy: Joi.string().optional(),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});

export const idParamSchema = Joi.object({
  id: Joi.string().trim().required(),
});
