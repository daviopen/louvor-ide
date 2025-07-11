import { db, COLLECTIONS } from '../../services/firebase';
import { Role, CreateRoleDto, UpdateRoleDto, PaginatedResponse, SearchQuery, Permission } from '../../types';

export class RoleService {
  private readonly collection = db.collection(COLLECTIONS.ROLES);

  /**
   * Initialize default system roles
   */
  async initializeSystemRoles(): Promise<void> {
    const defaultRoles: CreateRoleDto[] = [
      {
        name: 'admin',
        displayName: 'Administrador',
        description: 'Acesso completo ao sistema',
        permissions: ['admin.all'],
        color: '#dc2626'
      },
      {
        name: 'lider',
        displayName: 'Líder de Louvor',
        description: 'Pode gerenciar músicas, setlists e ministros',
        permissions: [
          'music.create', 'music.read', 'music.update', 'music.delete',
          'setlist.create', 'setlist.read', 'setlist.update', 'setlist.delete',
          'minister.read', 'minister.update',
          'user.read'
        ],
        color: '#2563eb'
      },
      {
        name: 'ministro',
        displayName: 'Ministro',
        description: 'Pode visualizar e sugerir músicas',
        permissions: [
          'music.read', 'music.create',
          'setlist.read',
          'minister.read',
          'user.read'
        ],
        color: '#059669'
      },
      {
        name: 'membro',
        displayName: 'Membro',
        description: 'Acesso somente leitura',
        permissions: [
          'music.read',
          'setlist.read',
          'minister.read'
        ],
        color: '#7c3aed'
      }
    ];

    for (const roleData of defaultRoles) {
      const existing = await this.findByName(roleData.name);
      if (!existing) {
        await this.create({ ...roleData }, true);
      }
    }
  }

  /**
   * Create a new role
   */
  async create(data: CreateRoleDto, isSystem = false): Promise<Role> {
    const now = new Date();
    const roleData = {
      ...data,
      isSystem,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await this.collection.add(roleData);
    
    return {
      id: docRef.id,
      ...roleData,
    };
  }

  /**
   * Get all roles with pagination and search
   */
  async findAll(query: SearchQuery = {}): Promise<PaginatedResponse<Role>> {
    const {
      page = 1,
      limit = 50,
      search,
      sortBy = 'displayName',
      sortOrder = 'asc',
    } = query;

    let queryBuilder = this.collection;
    
    const snapshot = await queryBuilder.get();
    let roles = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as Role[];

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      roles = roles.filter(role => 
        role.displayName.toLowerCase().includes(searchLower) ||
        role.name.toLowerCase().includes(searchLower) ||
        role.description?.toLowerCase().includes(searchLower)
      );
    }

    // Sort
    roles.sort((a, b) => {
      const aValue = a[sortBy as keyof Role] as any;
      const bValue = b[sortBy as keyof Role] as any;
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    // Pagination
    const total = roles.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginatedRoles = roles.slice(offset, offset + limit);

    return {
      success: true,
      data: paginatedRoles,
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
   * Get role by ID
   */
  async findById(id: string): Promise<Role | null> {
    const doc = await this.collection.doc(id).get();
    
    if (!doc.exists) {
      return null;
    }

    return {
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data()?.createdAt?.toDate(),
      updatedAt: doc.data()?.updatedAt?.toDate(),
    } as Role;
  }

  /**
   * Get role by name
   */
  async findByName(name: string): Promise<Role | null> {
    const snapshot = await this.collection.where('name', '==', name).get();
    
    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    if (!doc) {
      return null;
    }

    return {
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data()?.createdAt?.toDate(),
      updatedAt: doc.data()?.updatedAt?.toDate(),
    } as Role;
  }

  /**
   * Update role
   */
  async update(id: string, data: UpdateRoleDto): Promise<Role> {
    const role = await this.findById(id);
    if (!role) {
      throw new Error('Role não encontrada');
    }

    if (role.isSystem) {
      // System roles can only update permissions and description
      const allowedUpdates: Partial<UpdateRoleDto> = {};
      if (data.permissions) allowedUpdates.permissions = data.permissions;
      if (data.description) allowedUpdates.description = data.description;
      data = allowedUpdates;
    }

    const updatedData = {
      ...data,
      updatedAt: new Date(),
    };

    await this.collection.doc(id).update(updatedData);

    return {
      ...role,
      ...updatedData,
    };
  }

  /**
   * Delete role
   */
  async delete(id: string): Promise<void> {
    const role = await this.findById(id);
    if (!role) {
      throw new Error('Role não encontrada');
    }

    if (role.isSystem) {
      throw new Error('Não é possível deletar roles do sistema');
    }

    // Check if role is being used by users
    const usersSnapshot = await db.collection(COLLECTIONS.USERS)
      .where('roleId', '==', id)
      .limit(1)
      .get();

    if (!usersSnapshot.empty) {
      throw new Error('Não é possível deletar role que está sendo usada por usuários');
    }

    await this.collection.doc(id).delete();
  }

  /**
   * Get all available permissions
   */
  getAvailablePermissions(): Permission[] {
    return [
      'music.create',
      'music.read', 
      'music.update',
      'music.delete',
      'minister.create',
      'minister.read',
      'minister.update',
      'minister.delete',
      'setlist.create',
      'setlist.read',
      'setlist.update',
      'setlist.delete',
      'user.create',
      'user.read',
      'user.update',
      'user.delete',
      'admin.all'
    ];
  }

  /**
   * Check if user has permission
   */
  hasPermission(userPermissions: Permission[], requiredPermission: Permission): boolean {
    if (userPermissions.includes('admin.all')) {
      return true;
    }
    
    return userPermissions.includes(requiredPermission);
  }

  /**
   * Check if user has any of the permissions
   */
  hasAnyPermission(userPermissions: Permission[], requiredPermissions: Permission[]): boolean {
    if (userPermissions.includes('admin.all')) {
      return true;
    }
    
    return requiredPermissions.some(permission => userPermissions.includes(permission));
  }
}
