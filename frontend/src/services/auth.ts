import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile as firebaseUpdateProfile,
  sendPasswordResetEmail,
  sendEmailVerification,
  onAuthStateChanged,
  type User,
  type UserCredential
} from 'firebase/auth';
import { auth } from './firebase';
import { apiConfig } from '../config/constants';
// ...existing code...
import type { AuthUser, LoginCredentials, RegisterCredentials } from '../types/auth';

/**
 * Converte um User do Firebase para AuthUser
 */
export const convertFirebaseUser = async (firebaseUser: User): Promise<AuthUser> => {
  // Buscar role do backend se necessário
  const role = await getUserRole(firebaseUser.uid);
  
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email || '',
    name: firebaseUser.displayName || firebaseUser.email?.split('@')[0],
    picture: firebaseUser.photoURL || undefined,
    emailVerified: firebaseUser.emailVerified,
    role
  };
};

/**
 * Busca a role do usuário no backend
 */
export const getUserRole = async (_uid: string): Promise<{
  id: string;
  displayName: string;
  permissions: string[];
} | string> => {
  try {
    const token = await auth.currentUser?.getIdToken();
    if (!token) return 'user';

    const response = await fetch(`${apiConfig.baseURL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      return data.data?.role || 'user';
    } else {
      console.warn(`Backend retornou status ${response.status} - usando role padrão`);
    }
  } catch (error) {
    console.warn('Backend não disponível - usando role padrão:', error);
  }
  
  return 'user';
};

/**
 * Login com email e senha
 */
export const signIn = async (credentials: LoginCredentials): Promise<AuthUser> => {
  try {
    const userCredential: UserCredential = await signInWithEmailAndPassword(
      auth,
      credentials.email,
      credentials.password
    );
    
    const authUser = await convertFirebaseUser(userCredential.user);
    
    // Sincronizar com backend
    await syncUserWithBackend(authUser);
    
    return authUser;
  } catch (error: any) {
    console.error('Erro no login:', error);
    throw new Error(getAuthErrorMessage(error.code));
  }
};

/**
 * Registro de novo usuário
 */
export const signUp = async (credentials: RegisterCredentials): Promise<AuthUser> => {
  try {
    const userCredential: UserCredential = await createUserWithEmailAndPassword(
      auth,
      credentials.email,
      credentials.password
    );
    
    // Atualizar o perfil com o nome
    await firebaseUpdateProfile(userCredential.user, {
      displayName: credentials.name
    });
    
    const authUser = await convertFirebaseUser(userCredential.user);
    
    // Sincronizar com backend
    await syncUserWithBackend({
      ...authUser,
      name: credentials.name,
      telefone: credentials.telefone,
      atuacao: credentials.atuacao
    });
    
    return authUser;
  } catch (error: any) {
    console.error('Erro no registro:', error);
    throw new Error(getAuthErrorMessage(error.code));
  }
};

/**
 * Logout
 */
export const signOut = async (): Promise<void> => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Erro no logout:', error);
    throw new Error('Erro ao fazer logout');
  }
};

/**
 * Atualizar perfil do usuário
 */
export const updateProfile = async (data: { name?: string; telefone?: string; atuacao?: string[]; picture?: string }): Promise<void> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    // Atualizar no Firebase Auth
    const profileUpdate: any = {};
    if (data.name) profileUpdate.displayName = data.name;
    if (data.picture) profileUpdate.photoURL = data.picture;
    
    if (Object.keys(profileUpdate).length > 0) {
      await firebaseUpdateProfile(user, profileUpdate);
    }

    // Tentar sincronizar com backend (opcional)
    try {
      const token = await user.getIdToken();
      const response = await fetch(`${apiConfig.baseURL}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        console.warn(`Backend update falhou (${response.status}) - perfil atualizado apenas no Firebase`);
      }
    } catch (backendError) {
      console.warn('Backend não disponível para update - perfil atualizado apenas no Firebase:', backendError);
    }
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    throw error;
  }
};

/**
 * Recuperação de senha
 */
export const resetPassword = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error: any) {
    console.error('Erro ao enviar email de recuperação:', error);
    throw new Error(getAuthErrorMessage(error.code));
  }
};

/**
 * Sincronizar usuário com backend
 */
export const syncUserWithBackend = async (authUser: AuthUser): Promise<void> => {
  try {
    const token = await auth.currentUser?.getIdToken();
    if (!token) return;

    const response = await fetch(`${apiConfig.baseURL}/auth/profile`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: authUser.name,
        telefone: authUser.telefone,
        atuacao: authUser.atuacao,
        picture: authUser.picture
      })
    });

    if (!response.ok) {
      console.warn(`Backend sync falhou (${response.status}) - continuando sem sync`);
    }
  } catch (error) {
    console.warn('Backend não disponível para sync - continuando sem sync:', error);
  }
};

/**
 * Observer para mudanças no estado de autenticação
 */
export const onAuthStateChange = (callback: (user: AuthUser | null) => void) => {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      try {
        const authUser = await convertFirebaseUser(firebaseUser);
        callback(authUser);
      } catch (error) {
        console.error('Erro ao processar mudança de autenticação:', error);
        callback(null);
      }
    } else {
      callback(null);
    }
  });
};

/**
 * Obter token do usuário atual
 */
export const getCurrentUserToken = async (): Promise<string | null> => {
  try {
    const user = auth.currentUser;
    if (!user) return null;
    
    return await user.getIdToken();
  } catch (error) {
    console.error('Erro ao obter token:', error);
    return null;
  }
};

/**
 * Envia email de verificação para o usuário atual
 */
export const sendVerificationEmail = async (): Promise<void> => {
  if (!auth.currentUser) {
    throw new Error('Usuário não autenticado');
  }

  if (auth.currentUser.emailVerified) {
    throw new Error('Email já verificado');
  }

  try {
    await sendEmailVerification(auth.currentUser);
  } catch (error: any) {
    const errorMessage = getAuthErrorMessage(error.code);
    throw new Error(errorMessage);
  }
};

/**
 * Verifica se o email do usuário atual foi verificado
 */
export const checkEmailVerification = async (): Promise<boolean> => {
  if (!auth.currentUser) {
    return false;
  }

  // Recarrega os dados do usuário para obter o status atualizado
  await auth.currentUser.reload();
  return auth.currentUser.emailVerified;
};

/**
 * Converter código de erro para mensagem amigável
 */
const getAuthErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case 'auth/user-not-found':
      return 'Usuário não encontrado';
    case 'auth/wrong-password':
      return 'Senha incorreta';
    case 'auth/invalid-credential':
      return 'Email ou senha incorretos';
    case 'auth/email-already-in-use':
      return 'Este email já está em uso';
    case 'auth/weak-password':
      return 'A senha deve ter pelo menos 6 caracteres';
    case 'auth/invalid-email':
      return 'Email inválido';
    case 'auth/too-many-requests':
      return 'Muitas tentativas. Tente novamente mais tarde';
    case 'auth/network-request-failed':
      return 'Erro de conexão. Verifique sua internet';
    case 'auth/invalid-verification-code':
      return 'Código de verificação inválido';
    case 'auth/invalid-verification-id':
      return 'ID de verificação inválido';
    default:
      return 'Erro de autenticação. Tente novamente';
  }
};
