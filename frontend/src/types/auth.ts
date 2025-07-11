export interface AuthUser {
  uid: string;
  email: string;
  name?: string;
  telefone?: string;
  atuacao?: string[];
  picture?: string;
  emailVerified: boolean;
  isMinister?: boolean; // Flag para indicar se o usuário é ministro
  instrumento?: string[]; // Instrumentos que o usuário toca (apenas se for ministro)
  allowedPages?: string[]; // Páginas que o usuário pode acessar
  role?: {
    id: string;
    displayName: string;
    permissions: string[];
  } | string; // Manter compatibilidade com string para casos antigos
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  name: string;
  telefone?: string;
  atuacao?: string[];
}

export interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (credentials: LoginCredentials) => Promise<void>;
  signUp: (credentials: RegisterCredentials) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: { name?: string; telefone?: string; atuacao?: string[]; picture?: string }) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  checkEmailVerification: () => Promise<boolean>;
}
