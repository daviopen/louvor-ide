// Common types
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface SearchQuery extends PaginationQuery {
  search?: string;
  ministro?: string;
  tom?: string;
}

// Music types
export interface Music extends BaseEntity {
  titulo: string;
  artista: string;
  tom: string;
  bpm?: number;
  link?: string;
  cifra: string;
  ministros: string[];
  tomMinistro: Record<string, string>;
  status: 'ativo' | 'inativo';
  tags?: string[];
  observacoes?: string;
}

export interface CreateMusicDto {
  titulo: string;
  artista: string;
  tom: string;
  bpm?: number;
  link?: string;
  cifra: string;
  ministros: string[];
  tags?: string[];
  observacoes?: string;
}

export interface UpdateMusicDto extends Partial<CreateMusicDto> {}

// Permission and Role types
export type Permission = 
  | 'music.create' 
  | 'music.read' 
  | 'music.update' 
  | 'music.delete'
  | 'minister.create'
  | 'minister.read'
  | 'minister.update'
  | 'minister.delete'
  | 'setlist.create'
  | 'setlist.read'
  | 'setlist.update'
  | 'setlist.delete'
  | 'user.create'
  | 'user.read'
  | 'user.update'
  | 'user.delete'
  | 'admin.all';

export interface Role extends BaseEntity {
  name: string;
  displayName: string;
  description?: string;
  permissions: Permission[];
  isSystem: boolean; // Roles do sistema não podem ser deletadas
  color?: string;
}

export interface CreateRoleDto {
  name: string;
  displayName: string;
  description?: string;
  permissions: Permission[];
  color?: string;
}

export interface UpdateRoleDto extends Partial<CreateRoleDto> {}

// Minister/User Profile types
export interface Minister extends BaseEntity {
  uid?: string; // Firebase UID (se for um usuário registrado)
  nome: string;
  email?: string;
  telefone?: string;
  instrumento: string[];
  status: 'ativo' | 'inativo';
  avatar?: string;
  observacoes?: string;
  roleId?: string; // Referência ao role
  role?: Role; // Populated role
  dadosPessoais?: PersonalData;
  ministerio?: MinistryData;
}

export interface PersonalData {
  dataNascimento?: Date;
  endereco?: {
    rua?: string;
    numero?: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
    cep?: string;
  };
  contatos?: {
    telefoneSecundario?: string;
    whatsapp?: string;
    instagram?: string;
  };
  emergencia?: {
    nomeContato?: string;
    parentesco?: string;
    telefone?: string;
  };
}

export interface MinistryData {
  dataInicioMinisterio?: Date;
  cargos?: string[];
  especialidades?: string[];
  disponibilidade?: {
    diasSemana?: string[];
    periodo?: 'manha' | 'tarde' | 'noite' | 'qualquer';
    observacoes?: string;
  };
  formacao?: {
    cursos?: string[];
    certificacoes?: string[];
    experiencia?: string;
  };
}

export interface CreateMinisterDto {
  nome: string;
  email?: string;
  telefone?: string;
  instrumento: string[];
  avatar?: string;
  observacoes?: string;
  roleId?: string;
  dadosPessoais?: PersonalData;
  ministerio?: MinistryData;
}

export interface UpdateMinisterDto extends Partial<CreateMinisterDto> {}

// User types
export interface User extends BaseEntity {
  uid: string; // Firebase UID
  nome: string;
  email: string;
  telefone?: string;
  atuacao?: string[];
  roleId: string; // Referência ao role
  role?: Role; // Populated role
  avatar?: string;
  status: 'ativo' | 'inativo' | 'pendente';
  lastLogin?: Date;
  emailVerified?: boolean;
  isMinister?: boolean; // Flag para indicar se é ministro
  instrumento?: string[]; // Instrumentos que o usuário toca (apenas se for ministro)
  allowedPages?: string[]; // Páginas que o usuário pode acessar
  preferences?: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark';
  defaultKey: string;
  notifications: boolean;
  language: 'pt' | 'en';
}

export interface CreateUserDto {
  uid: string;
  nome: string;
  email: string;
  telefone?: string;
  atuacao?: string[];
  roleId?: string;
  role?: string; // Nome do role, alternativa ao roleId
  avatar?: string;
  isMinister?: boolean;
  instrumento?: string[];
  allowedPages?: string[];
  status?: 'ativo' | 'inativo' | 'pendente';
}

export interface UpdateUserDto extends Partial<Omit<CreateUserDto, 'uid'>> {
  preferences?: Partial<UserPreferences>;
  status?: 'ativo' | 'inativo' | 'pendente';
  password?: string; // Campo para redefinir senha
}

// Setlist types
export interface SetlistItem {
  musicId: string;
  ordem: number;
  tom?: string; // Tom específico para esta apresentação
  observacoes?: string;
}

export interface Setlist extends BaseEntity {
  titulo: string;
  data: Date;
  local?: string;
  responsavel: string; // Minister ID
  musicas: SetlistItem[];
  status: 'planejada' | 'em_andamento' | 'finalizada' | 'cancelada';
  observacoes?: string;
  tags?: string[];
}

export interface CreateSetlistDto {
  titulo: string;
  data: Date;
  local?: string;
  responsavel: string;
  musicas: SetlistItem[];
  observacoes?: string;
  tags?: string[];
}

export interface UpdateSetlistDto extends Partial<CreateSetlistDto> {}

// Transpose types
export interface TransposeRequest {
  cifra: string;
  semitones: number;
  tomOriginal?: string;
}

export interface TransposeResponse {
  cifraOriginal: string;
  cifraTransposta: string;
  tomOriginal?: string;
  tomFinal?: string;
  semitones: number;
}

export interface ValidationResponse {
  valid: boolean;
  errors: string[];
  warnings: string[];
  chordsFound: string[];
}

// Export all as namespace
export * from './index';
