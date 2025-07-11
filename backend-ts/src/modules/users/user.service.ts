import { db, auth, COLLECTIONS } from '../../services/firebase';
import { User, CreateUserDto, UpdateUserDto, PaginatedResponse, SearchQuery } from '../../types';
import { RoleService } from '../roles/role.service';
import { MinisterService } from '../ministers/minister.service';

export class UserService {
  private readonly collection = db.collection(COLLECTIONS.USERS);
  private readonly roleService = new RoleService();
  private readonly ministerService = new MinisterService();

  /**
   * Determina se um usuário deve ser automaticamente marcado como ministro baseado na atuação
   */
  private shouldBeMinister(atuacao: string[]): boolean {
    if (!atuacao || atuacao.length === 0) return false;
    
    // Usuário é ministro se toca algum instrumento, é diretor musical ou está marcado como ministro
    return atuacao.some(item => 
      ['Violão', 'Guitarra', 'Violino', 'Bateria', 'Baixo', 'Teclado', 'Sax', 'Diretor Musical', 'Ministro'].includes(item)
    );
  }

  /**
   * Create a new user
   */
  async create(data: CreateUserDto): Promise<User> {
    const now = new Date();
    
    // Validate and get role
    let role;
    if (data.roleId) {
      role = await this.roleService.findById(data.roleId);
    } else if (data.role) {
      role = await this.roleService.findByName(data.role);
    } else {
      throw new Error('Role ou roleId deve ser fornecido');
    }
    
    if (!role) {
      throw new Error('Role não encontrada');
    }

    // Se o UID é temporário, criar usuário no Firebase Auth
    let firebaseUid = data.uid;
    if (data.uid.startsWith('temp-')) {
      try {
        const password = (data as any).password || '123456'; // Senha padrão
        const firebaseUser = await auth.createUser({
          email: data.email,
          password: password,
          displayName: data.nome,
          emailVerified: false,
        });
        firebaseUid = firebaseUser.uid;
        console.log('✅ Usuário criado no Firebase Auth:', firebaseUid);
      } catch (error) {
        console.error('Erro ao criar usuário no Firebase Auth:', error);
        throw new Error('Erro ao criar usuário no sistema de autenticação');
      }
    }

    // Check if user already exists
    const existingUser = await this.findByUid(firebaseUid);
    if (existingUser) {
      throw new Error('Usuário já existe');
    }
    
    // Determinar automaticamente se é ministro baseado na atuação
    const isMinister = this.shouldBeMinister(data.atuacao || []);
    
    const userData = {
      ...data,
      uid: firebaseUid, // Use o UID real do Firebase
      roleId: role.id, // Use o ID do role encontrado
      isMinister, // Derivado automaticamente das atuações
      status: data.status || 'ativo' as const,
      createdAt: now,
      updatedAt: now,
      preferences: {
        theme: 'light' as const,
        defaultKey: 'C',
        notifications: true,
        language: 'pt' as const,
      },
    };

    // Remove campos que não devem ser salvos no Firestore
    const { role: roleField, ...userDataToSave } = userData;
    // Remove password se existir
    delete (userDataToSave as any).password;

    const docRef = await this.collection.add(userDataToSave);
    
    let user: User = {
      id: docRef.id,
      ...userDataToSave,
    };

    // Populate role
    user.role = role;
    
    return user;
  }

  /**
   * Get all users with pagination and search
   */
  async findAll(query: SearchQuery): Promise<PaginatedResponse<User>> {
    const {
      page = 1,
      limit = 10,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    // Remover filtro rígido de status para permitir listagem de todos os usuários
    // (exceto excluídos que podem ser filtrados se necessário)
    let queryBuilder = this.collection
      .where('status', '!=', 'excluido')  // Só excluir usuários realmente excluídos
      .orderBy('status')  // Necessário para o != query
      .orderBy(sortBy, sortOrder);

    const snapshot = await queryBuilder.get();
    let users = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
      lastLogin: doc.data().lastLogin?.toDate() || null,
    })) as User[];

    // Apply search filter
    if (search) {
      const searchTerm = search.toLowerCase();
      users = users.filter(user =>
        user.nome.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm)
      );
    }

    // Apply pagination
    const total = users.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedUsers = users.slice(startIndex, endIndex);

    // Populate relationships
    const populatedUsers = await this.populateUserRelations(paginatedUsers);

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      data: populatedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Get user by ID
   */
  async findById(id: string): Promise<User | null> {
    const doc = await this.collection.doc(id).get();
    
    if (!doc.exists) {
      return null;
    }

    const data = doc.data();
    let user: User = {
      id: doc.id,
      ...data,
      createdAt: data?.createdAt?.toDate(),
      updatedAt: data?.updatedAt?.toDate(),
      lastLogin: data?.lastLogin?.toDate() || null,
    } as User;

    // Populate relationships
    const populatedUsers = await this.populateUserRelations([user]);
    return populatedUsers[0] || null;
  }

  /**
   * Populate user relationships (role and minister)
   */
  private async populateUserRelations(users: User[]): Promise<User[]> {
    const populatedUsers = [];
    
    for (const user of users) {
      let populatedUser = { ...user };
      
      // Populate role
      if (user.roleId) {
        const role = await this.roleService.findById(user.roleId);
        if (role) {
          populatedUser.role = role;
        }
      }
      
      populatedUsers.push(populatedUser);
    }
    
    return populatedUsers;
  }

  /**
   * Get user by Firebase UID
   */
  async findByUid(uid: string): Promise<User | null> {
    const snapshot = await this.collection.where('uid', '==', uid).get();
    
    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    if (!doc) {
      return null;
    }

    const data = doc.data();
    let user: User = {
      id: doc.id,
      ...data,
      createdAt: data?.createdAt?.toDate(),
      updatedAt: data?.updatedAt?.toDate(),
      lastLogin: data?.lastLogin?.toDate(),
    } as User;

    // Populate relationships
    const populatedUsers = await this.populateUserRelations([user]);
    return populatedUsers[0] || null;
  }

  /**
   * Update user
   */
  async update(id: string, data: UpdateUserDto): Promise<User | null> {
    const userRef = this.collection.doc(id);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return null;
    }

    const userData = userDoc.data();
    if (!userData) {
      return null;
    }

    // Se atuação está sendo atualizada, recalcular isMinister
    const updateData: any = { ...data };
    if (data.atuacao) {
      updateData.isMinister = this.shouldBeMinister(data.atuacao);
    }

    // Se role está sendo atualizado, resolver o roleId
    if ((data as any).role) {
      const role = await this.roleService.findByName((data as any).role);
      if (!role) {
        throw new Error(`Role '${(data as any).role}' não encontrada`);
      }
      updateData.roleId = role.id;
      // Remove o campo 'role' dos dados do Firestore
      delete updateData.role;
    }

    // Se senha foi fornecida, atualizar no Firebase Auth
    if ((data as any).password) {
      try {
        // Verificar se o UID é um usuário real do Firebase (não temporário)
        if (!userData.uid.startsWith('temp-')) {
          await auth.updateUser(userData.uid, {
            password: (data as any).password
          });
          console.log('✅ Senha atualizada no Firebase Auth para usuário:', userData.uid);
        } else {
          console.log('⚠️ Usuário temporário, senha não atualizada no Firebase Auth:', userData.uid);
        }
      } catch (error) {
        console.error('Erro ao atualizar senha no Firebase Auth:', error);
        // Para usuários temporários ou em caso de erro, apenas log e continue
        if (!userData.uid.startsWith('temp-')) {
          throw new Error('Erro ao atualizar senha do usuário');
        }
      }
    }

    // Remover password dos dados que vão para o Firestore
    delete updateData.password;
    updateData.updatedAt = new Date();

    await userRef.update(updateData);

    const updatedDoc = await userRef.get();
    const updatedData = updatedDoc.data();

    let user: User = {
      id: updatedDoc.id,
      ...updatedData,
      createdAt: updatedData?.createdAt?.toDate(),
      updatedAt: updatedData?.updatedAt?.toDate(),
      lastLogin: updatedData?.lastLogin?.toDate() || null,
    } as User;

    // Populate role
    if (user.roleId) {
      const role = await this.roleService.findById(user.roleId);
      if (role) {
        user.role = role;
      }
    }

    return user;
  }

  /**
   * Update last login
   */
  async updateLastLogin(uid: string): Promise<void> {
    const snapshot = await this.collection
      .where('uid', '==', uid)
      .where('status', '==', 'ativo')
      .limit(1)
      .get();

    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      if (doc) {
        await doc.ref.update({
          lastLogin: new Date(),
          updatedAt: new Date(),
        });
      }
    }
  }

  /**
   * Delete user (soft delete)
   */
  async delete(id: string): Promise<boolean> {
    const userRef = this.collection.doc(id);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return false;
    }

    await userRef.update({
      status: 'excluido',
      updatedAt: new Date(),
    });

    return true;
  }

  /**
   * Get users by role
   */
  async findByRole(role: 'admin' | 'lider' | 'ministro' | 'membro'): Promise<User[]> {
    const snapshot = await this.collection
      .where('status', '==', 'ativo')
      .where('role', '==', role)
      .orderBy('nome')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
      lastLogin: doc.data().lastLogin?.toDate() || null,
    })) as User[];
  }

  /**
   * Get users statistics
   */
  async getStats(): Promise<{
    total: number;
    totalActive: number;
    totalInactive: number;
    byRole: Record<string, number>;
    recentLogins: number;
  }> {
    const snapshot = await this.collection.get();
    
    let total = 0;
    let totalActive = 0;
    let totalInactive = 0;
    let recentLogins = 0;
    const byRole: Record<string, number> = {};

    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      total++;

      if (data.status === 'ativo') {
        totalActive++;
        
        // Count by role
        if (data.role) {
          byRole[data.role] = (byRole[data.role] || 0) + 1;
        }

        // Count recent logins
        if (data.lastLogin && data.lastLogin.toDate() > lastWeek) {
          recentLogins++;
        }
      } else {
        totalInactive++;
      }
    });

    return {
      total,
      totalActive,
      totalInactive,
      byRole,
      recentLogins,
    };
  }

  /**
   * Change user status
   */
  async changeStatus(id: string, status: 'ativo' | 'inativo' | 'pendente'): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    await this.collection.doc(id).update({
      status,
      updatedAt: new Date(),
    });

    return {
      ...user,
      status,
      updatedAt: new Date(),
    };
  }

  /**
   * Get user statistics
   */
  async getStatistics(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byRole: Record<string, number>;
    recentLogins: number; // Last 30 days
  }> {
    const snapshot = await this.collection.get();
    const users = snapshot.docs.map(doc => ({
      ...doc.data(),
      lastLogin: doc.data().lastLogin?.toDate(),
    })) as User[];

    const total = users.length;
    
    const byStatus = users.reduce((acc, user) => {
      acc[user.status] = (acc[user.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // For byRole, we need to populate roles first
    const byRole: Record<string, number> = {};
    for (const user of users) {
      if (user.roleId) {
        const role = await this.roleService.findById(user.roleId);
        if (role) {
          byRole[role.displayName] = (byRole[role.displayName] || 0) + 1;
        }
      }
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentLogins = users.filter(user => 
      user.lastLogin && user.lastLogin > thirtyDaysAgo
    ).length;

    return {
      total,
      byStatus,
      byRole,
      recentLogins,
    };
  }
}
