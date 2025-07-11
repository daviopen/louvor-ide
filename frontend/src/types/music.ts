export interface Music {
  id: string;
  titulo: string;
  artista: string;
  ministro?: string;
  ministros: string[];
  tom: string;
  tomMinistro: Record<string, string>;
  bpm?: number;
  link?: string;
  cifra: string;
  status: 'ativo' | 'inativo';
  tags?: string[];
  timestamp?: number;
  criadoEm?: Date | string;
  createdAt: string;
  updatedAt?: string;
}

export interface MusicFormData {
  titulo: string;
  artista: string;
  tom: string;
  bpm?: number;
  link?: string;
  cifra: string;
  ministros: string[];
}

export interface TransposeRequest {
  cifra: string;
  semitones: number;
  tom_original?: string;
}

export interface TransposeResponse {
  cifra_original: string;
  cifra_transposta: string;
  tom_original?: string;
  tom_final?: string;
  semitones: number;
}

export interface ValidationResponse {
  valid: boolean;
  errors: string[];
  warnings: string[];
  chords_found: string[];
}

export interface FilterOptions {
  search: string;
  ministro: string;
  tom: string;
  artista: string;
}

export interface Minister {
  id: string;
  nome: string;
  email?: string;
  telefone?: string;
  instrumento: string[];
  avatar?: string;
  observacoes?: string;
  status: 'ativo' | 'inativo';
  createdAt: string;
  updatedAt?: string;
}
