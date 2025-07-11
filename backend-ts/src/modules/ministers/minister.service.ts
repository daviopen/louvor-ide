import { db, COLLECTIONS } from '../../services/firebase';
import { Minister, CreateMinisterDto, UpdateMinisterDto, PaginatedResponse, SearchQuery, Role } from '../../types';
import { RoleService } from '../roles/role.service';

export class MinisterService {
  private readonly collection = db.collection(COLLECTIONS.MINISTERS);
  private readonly roleService = new RoleService();

  /**
   * Create a new minister
   */
  async create(data: CreateMinisterDto): Promise<Minister> {
    const now = new Date();
    
    // Validate role if provided
    if (data.roleId) {
      const role = await this.roleService.findById(data.roleId);
      if (!role) {
        throw new Error('Role não encontrada');
      }
    }
    
    const ministerData = {
      ...data,
      status: 'ativo' as const,
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await this.collection.add(ministerData);
    
    let minister: Minister = {
      id: docRef.id,
      ...ministerData,
    };

    // Populate role if needed
    if (data.roleId) {
      const role = await this.roleService.findById(data.roleId);
      if (role) {
        minister = { ...minister, role };
      }
    }
    
    return minister;
  }

  /**
   * Get all ministers with pagination and search
   */
  async findAll(query: SearchQuery): Promise<PaginatedResponse<Minister>> {
    const {
      page = 1,
      limit = 10,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    // Remover orderBy para evitar necessidade de índice, filtrar apenas por status
    const queryBuilder = this.collection.where('status', '==', 'ativo');
    
    const snapshot = await queryBuilder.get();
    let ministers = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as Minister[];

    // Ordenação em memória
    ministers.sort((a, b) => {
      let aValue: any = a[sortBy as keyof Minister];
      let bValue: any = b[sortBy as keyof Minister];
      if (sortBy === 'createdAt' || sortBy === 'updatedAt') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      } else {
        aValue = (aValue?.toString().toLowerCase() as string) || '';
        bValue = (bValue?.toString().toLowerCase() as string) || '';
      }
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    // Apply search filter
    if (search) {
      const searchTerm = search.toString().toLowerCase();
      ministers = ministers.filter(minister =>
        minister.nome.toLowerCase().includes(searchTerm) ||
        (minister.email && minister.email.toLowerCase().includes(searchTerm)) ||
        minister.instrumento.some(inst => inst.toLowerCase().includes(searchTerm))
      );
    }

    // Apply pagination
    const total = ministers.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedMinisters = ministers.slice(startIndex, endIndex);

    // Populate roles
    const populatedMinisters = await this.populateRoles(paginatedMinisters);

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      data: populatedMinisters,
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
   * Get minister by ID
   */
  async findById(id: string): Promise<Minister | null> {
    const doc = await this.collection.doc(id).get();
    
    if (!doc.exists) {
      return null;
    }

    const data = doc.data();
    let minister: Minister = {
      id: doc.id,
      ...data,
      createdAt: data?.createdAt?.toDate(),
      updatedAt: data?.updatedAt?.toDate(),
    } as Minister;

    // Populate role if exists
    if (minister.roleId) {
      const role = await this.roleService.findById(minister.roleId);
      if (role) {
        minister.role = role;
      }
    }

    return minister;
  }

  /**
   * Update minister
   */
  async update(id: string, data: UpdateMinisterDto): Promise<Minister | null> {
    const ministerRef = this.collection.doc(id);
    const ministerDoc = await ministerRef.get();

    if (!ministerDoc.exists) {
      return null;
    }

    const updateData = {
      ...data,
      updatedAt: new Date(),
    };

    await ministerRef.update(updateData);

    const updatedDoc = await ministerRef.get();
    const updatedData = updatedDoc.data();

    return {
      id: updatedDoc.id,
      ...updatedData,
      createdAt: updatedData?.createdAt?.toDate(),
      updatedAt: updatedData?.updatedAt?.toDate(),
    } as Minister;
  }

  /**
   * Delete minister (soft delete)
   */
  async delete(id: string): Promise<boolean> {
    const ministerRef = this.collection.doc(id);
    const ministerDoc = await ministerRef.get();

    if (!ministerDoc.exists) {
      return false;
    }

    await ministerRef.update({
      status: 'inativo',
      updatedAt: new Date(),
    });

    return true;
  }

  /**
   * Get ministers by instrument
   */
  async findByInstrumento(instrumento: string): Promise<Minister[]> {
    const snapshot = await this.collection
      .where('status', '==', 'ativo')
      .where('instrumento', 'array-contains', instrumento)
      .orderBy('nome')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as Minister[];
  }

  /**
   * Get unique instruments
   */
  async getUniqueInstrumentos(): Promise<string[]> {
    const snapshot = await this.collection
      .where('status', '==', 'ativo')
      .get();

    const instrumentosSet = new Set<string>();

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.instrumento && Array.isArray(data.instrumento)) {
        data.instrumento.forEach((inst: string) => {
          if (inst && typeof inst === 'string') {
            instrumentosSet.add(inst.trim());
          }
        });
      }
    });

    return Array.from(instrumentosSet).sort();
  }

  /**
   * Get ministers statistics
   */
  async getStats(): Promise<{
    total: number;
    totalActive: number;
    totalInactive: number;
    byInstrument: Record<string, number>;
    byKey: Record<string, number>;
  }> {
    const snapshot = await this.collection.get();
    
    let total = 0;
    let totalActive = 0;
    let totalInactive = 0;
    const byInstrument: Record<string, number> = {};
    const byKey: Record<string, number> = {};

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      total++;

      if (data.status === 'ativo') {
        totalActive++;
        
        // Count by instrument
        if (data.instrumento && Array.isArray(data.instrumento)) {
          data.instrumento.forEach((inst: string) => {
            byInstrument[inst] = (byInstrument[inst] || 0) + 1;
          });
        }

        // Count by preferred key
        if (data.tomPreferido) {
          byKey[data.tomPreferido] = (byKey[data.tomPreferido] || 0) + 1;
        }
      } else {
        totalInactive++;
      }
    });

    return {
      total,
      totalActive,
      totalInactive,
      byInstrument,
      byKey,
    };
  }

  /**
   * Populate role information for ministers
   */
  private async populateRoles(ministers: Minister[]): Promise<Minister[]> {
    const populatedMinisters = [];
    
    for (const minister of ministers) {
      let populatedMinister = { ...minister };
      
      if (minister.roleId) {
        const role = await this.roleService.findById(minister.roleId);
        if (role) {
          populatedMinister.role = role;
        }
      }
      
      populatedMinisters.push(populatedMinister);
    }
    
    return populatedMinisters;
  }
}
