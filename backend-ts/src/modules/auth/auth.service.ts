import admin from 'firebase-admin';
import { DecodedIdToken } from 'firebase-admin/auth';

export interface AuthUser {
  uid: string;
  email: string;
  name?: string;
  picture?: string;
  emailVerified: boolean;
  role?: 'admin' | 'minister' | 'user';
  telefone?: string;
  atuacao?: string[];
  isMinister?: boolean;
  instrumento?: string;
  allowedPages?: string[];
}

export interface LoginResponse {
  user: AuthUser;
  customToken?: string;
}

export class AuthService {
  /**
   * Verifica e decodifica um token JWT do Firebase
   */
  async verifyToken(token: string): Promise<DecodedIdToken> {
    try {
      // Remove o prefixo "Bearer " se presente
      const cleanToken = token.replace(/^Bearer\s+/i, '');
      
      const decodedToken = await admin.auth().verifyIdToken(cleanToken);
      return decodedToken;
    } catch (error) {
      console.error('Erro ao verificar token:', error);
      throw new Error('Token inválido ou expirado');
    }
  }

  /**
   * Busca informações do usuário pelo UID
   */
  async getUserByUid(uid: string): Promise<AuthUser> {
    try {
      const userRecord = await admin.auth().getUser(uid);
      
      // Buscar dados completos do usuário no Firestore
      const db = admin.firestore();
      const userDoc = await db.collection('users').doc(uid).get();
      const userData = userDoc.exists ? userDoc.data() : {};
      
      return {
        uid: userRecord.uid,
        email: userRecord.email || '',
        name: userRecord.displayName || userData?.name || userRecord.email?.split('@')[0],
        picture: userRecord.photoURL || userData?.picture,
        emailVerified: userRecord.emailVerified,
        role: userData?.role || 'user',
        telefone: userData?.telefone,
        atuacao: userData?.atuacao,
        isMinister: userData?.isMinister || false,
        instrumento: userData?.instrumento,
        allowedPages: userData?.allowedPages
      };
    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
      throw new Error('Usuário não encontrado');
    }
  }

  /**
   * Busca a role do usuário no Firestore
   */
  private async getUserRole(uid: string): Promise<'admin' | 'minister' | 'user'> {
    try {
      const db = admin.firestore();
      const userDoc = await db.collection('users').doc(uid).get();
      
      if (userDoc.exists) {
        const userData = userDoc.data();
        return userData?.role || 'user';
      }
      
      return 'user';
    } catch (error) {
      console.warn('Erro ao buscar role do usuário:', error);
      return 'user';
    }
  }

  /**
   * Cria ou atualiza informações do usuário no Firestore
   */
  async createOrUpdateUser(uid: string, userData: Partial<AuthUser>): Promise<void> {
    try {
      const db = admin.firestore();
      const userRef = db.collection('users').doc(uid);
      
      const userDoc = await userRef.get();
      const timestamp = admin.firestore.FieldValue.serverTimestamp();
      
      if (userDoc.exists) {
        // Atualizar usuário existente
        const updateData: any = {
          ...userData,
          updatedAt: timestamp,
        };
        
        // Remover campos undefined
        Object.keys(updateData).forEach(key => {
          if (updateData[key] === undefined) {
            delete updateData[key];
          }
        });
        
        await userRef.update(updateData);
      } else {
        // Criar novo usuário
        await userRef.set({
          uid,
          email: userData.email,
          name: userData.name,
          picture: userData.picture,
          role: userData.role || 'user',
          emailVerified: userData.emailVerified || false,
          telefone: userData.telefone || '',
          atuacao: userData.atuacao || [],
          isMinister: userData.isMinister || false,
          instrumento: userData.instrumento || '',
          allowedPages: userData.allowedPages || [],
          createdAt: timestamp,
          updatedAt: timestamp,
        });
      }
    } catch (error) {
      console.error('Erro ao criar/atualizar usuário:', error);
      throw new Error('Erro ao salvar dados do usuário');
    }
  }

  /**
   * Define a role de um usuário
   */
  async setUserRole(uid: string, role: 'admin' | 'minister' | 'user'): Promise<void> {
    try {
      const db = admin.firestore();
      await db.collection('users').doc(uid).update({
        role,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Também pode definir custom claims no Firebase Auth
      await admin.auth().setCustomUserClaims(uid, { role });
    } catch (error) {
      console.error('Erro ao definir role do usuário:', error);
      throw new Error('Erro ao definir permissões do usuário');
    }
  }

  /**
   * Lista todos os usuários (apenas para admins)
   */
  async listUsers(maxResults: number = 100): Promise<AuthUser[]> {
    try {
      const listUsersResult = await admin.auth().listUsers(maxResults);
      const db = admin.firestore();
      
      const users: AuthUser[] = [];
      
      for (const userRecord of listUsersResult.users) {
        // Buscar dados completos do usuário no Firestore
        const userDoc = await db.collection('users').doc(userRecord.uid).get();
        const userData = userDoc.exists ? userDoc.data() : {};
        
        users.push({
          uid: userRecord.uid,
          email: userRecord.email || '',
          name: userRecord.displayName || userData?.name || userRecord.email?.split('@')[0],
          picture: userRecord.photoURL || userData?.picture,
          emailVerified: userRecord.emailVerified,
          role: userData?.role || 'user',
          telefone: userData?.telefone,
          atuacao: userData?.atuacao,
          isMinister: userData?.isMinister || false,
          instrumento: userData?.instrumento
        });
      }
      
      return users;
    } catch (error) {
      console.error('Erro ao listar usuários:', error);
      throw new Error('Erro ao buscar lista de usuários');
    }
  }

  /**
   * Remove um usuário
   */
  async deleteUser(uid: string): Promise<void> {
    try {
      // Remover do Firebase Auth
      await admin.auth().deleteUser(uid);
      
      // Remover do Firestore
      const db = admin.firestore();
      await db.collection('users').doc(uid).delete();
    } catch (error) {
      console.error('Erro ao remover usuário:', error);
      throw new Error('Erro ao remover usuário');
    }
  }

  /**
   * Cria um custom token para um usuário (útil para login server-side)
   */
  async createCustomToken(uid: string): Promise<string> {
    try {
      const customToken = await admin.auth().createCustomToken(uid);
      return customToken;
    } catch (error) {
      console.error('Erro ao criar custom token:', error);
      throw new Error('Erro ao criar token personalizado');
    }
  }

  /**
   * Verifica se um usuário é admin
   */
  async isAdmin(uid: string): Promise<boolean> {
    try {
      const userRole = await this.getUserRole(uid);
      return userRole === 'admin';
    } catch (error) {
      console.warn('Erro ao verificar se usuário é admin:', error);
      return false;
    }
  }

  /**
   * Verifica se um usuário é master admin
   */
  async isMasterAdmin(uid: string): Promise<boolean> {
    try {
      const userRecord = await admin.auth().getUser(uid);
      const customClaims = userRecord.customClaims;
      return customClaims?.isMasterAdmin === true;
    } catch (error) {
      console.warn('Erro ao verificar se usuário é master admin:', error);
      return false;
    }
  }

  /**
   * Lista todos os admins do sistema
   */
  async listAdmins(): Promise<AuthUser[]> {
    try {
      const allUsers = await this.listUsers(1000);
      return allUsers.filter(user => user.role === 'admin');
    } catch (error) {
      console.error('Erro ao listar admins:', error);
      throw new Error('Erro ao buscar lista de administradores');
    }
  }

  /**
   * Cria um novo usuário no Firebase Auth (apenas para admins)
   */
  async createUser(userData: {
    email: string;
    password?: string;
    displayName: string;
    role?: 'admin' | 'minister' | 'user';
    telefone?: string;
    atuacao?: string[];
    isMinister?: boolean;
    instrumento?: string;
    allowedPages?: string[];
  }): Promise<AuthUser> {
    try {
      // Usar senha padrão se não fornecida
      const defaultPassword = '123456';
      
      // Criar usuário no Firebase Auth
      const userRecord = await admin.auth().createUser({
        email: userData.email,
        password: userData.password || defaultPassword,
        displayName: userData.displayName,
        emailVerified: false
      });

      // Determinar se é ministro baseado na atuação
      const isMinister = userData.atuacao && userData.atuacao.length > 0 
        ? this.shouldBeMinister(userData.atuacao)
        : userData.isMinister || false;

      // Criar perfil no Firestore
      await this.createOrUpdateUser(userRecord.uid, {
        uid: userRecord.uid,
        email: userData.email,
        name: userData.displayName,
        role: userData.role || 'user',
        emailVerified: false,
        telefone: userData.telefone,
        atuacao: userData.atuacao,
        instrumento: userData.instrumento,
        allowedPages: userData.allowedPages,
        isMinister
      });

      // Definir custom claims se necessário
      if (userData.role && userData.role !== 'user') {
        await admin.auth().setCustomUserClaims(userRecord.uid, { role: userData.role });
      }

      return {
        uid: userRecord.uid,
        email: userData.email,
        name: userData.displayName,
        emailVerified: false,
        role: userData.role || 'user',
        telefone: userData.telefone,
        atuacao: userData.atuacao,
        isMinister,
        instrumento: userData.instrumento,
        allowedPages: userData.allowedPages
      };
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      if (error instanceof Error && error.message.includes('email-already-exists')) {
        throw new Error('Este email já está em uso');
      }
      throw new Error('Erro ao criar usuário');
    }
  }

  /**
   * Determina se um usuário deve ser automaticamente marcado como ministro baseado na atuação
   */
  shouldBeMinister(atuacao: string[]): boolean {
    const instrumentos = ['Violão', 'Guitarra', 'Violino', 'Bateria', 'Baixo', 'Teclado', 'Sax'];
    const vocal = ['Voz'];
    const ministerio = ['Ministro'];
    
    return atuacao.some(item => 
      instrumentos.includes(item) || vocal.includes(item) || ministerio.includes(item)
    );
  }
}

export const authService = new AuthService();
