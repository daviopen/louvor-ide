import { db, COLLECTIONS } from '../../services/firebase';
import { Setlist, CreateSetlistDto, UpdateSetlistDto, PaginatedResponse, SearchQuery } from '../../types';

export class SetlistService {
  private readonly collection = db.collection(COLLECTIONS.SETLISTS);

  /**
   * Create a new setlist
   */
  async create(data: CreateSetlistDto): Promise<Setlist> {
    const now = new Date();
    const setlistData = {
      ...data,
      status: 'planejada' as const,
      createdAt: now,
      updatedAt: now,
      musicas: (data.musicas ?? []).map(m => ({
        musicId: m.musicId,
        ordem: m.ordem,
        tom: m.tom,
        observacoes: m.observacoes
      }))
    };

    const docRef = await this.collection.add(setlistData);
    return {
      id: docRef.id,
      ...setlistData,
    };
  }

  /**
   * Get all setlists with pagination and search
   */
  async findAll(query: SearchQuery): Promise<PaginatedResponse<Setlist>> {
    const {
      page = 1,
      limit = 10,
      search,
      sortBy = 'data',
      sortOrder = 'desc',
    } = query;

    let queryBuilder = this.collection.orderBy(sortBy, sortOrder);

    const snapshot = await queryBuilder.get();
    let setlists = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      data: doc.data().data?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as Setlist[];

    // Apply search filter
    if (search) {
      const searchTerm = search.toLowerCase();
      setlists = setlists.filter(setlist =>
        setlist.titulo.toLowerCase().includes(searchTerm) ||
        (setlist.local && setlist.local.toLowerCase().includes(searchTerm)) ||
        setlist.responsavel.toLowerCase().includes(searchTerm) ||
        setlist.status.toLowerCase().includes(searchTerm) ||
        (setlist.tags && setlist.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
      );
    }

    // Apply pagination
    const total = setlists.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedSetlists = setlists.slice(startIndex, endIndex);

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      data: paginatedSetlists,
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
   * Get setlist by ID
   */
  async findById(id: string): Promise<Setlist | null> {
    const doc = await this.collection.doc(id).get();
    
    if (!doc.exists) {
      return null;
    }

    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      data: data?.data?.toDate(),
      createdAt: data?.createdAt?.toDate(),
      updatedAt: data?.updatedAt?.toDate(),
    } as Setlist;
  }

  /**
   * Update setlist
   */
  async update(id: string, data: UpdateSetlistDto): Promise<Setlist | null> {
    const setlistRef = this.collection.doc(id);
    const setlistDoc = await setlistRef.get();

    if (!setlistDoc.exists) {
      return null;
    }

    const updateData = {
      ...data,
      updatedAt: new Date(),
    };

    await setlistRef.update(updateData);

    const updatedDoc = await setlistRef.get();
    const updatedData = updatedDoc.data();

    return {
      id: updatedDoc.id,
      ...updatedData,
      data: updatedData?.data?.toDate(),
      createdAt: updatedData?.createdAt?.toDate(),
      updatedAt: updatedData?.updatedAt?.toDate(),
    } as Setlist;
  }

  /**
   * Delete setlist
   */
  async delete(id: string): Promise<boolean> {
    const setlistRef = this.collection.doc(id);
    const setlistDoc = await setlistRef.get();

    if (!setlistDoc.exists) {
      return false;
    }

    await setlistRef.delete();
    return true;
  }

  /**
   * Get setlists by status
   */
  async findByStatus(status: 'planejada' | 'em_andamento' | 'finalizada' | 'cancelada'): Promise<Setlist[]> {
    const snapshot = await this.collection
      .where('status', '==', status)
      .orderBy('data', 'desc')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      data: doc.data().data?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as Setlist[];
  }

  /**
   * Get setlists by responsible minister
   */
  async findByResponsavel(responsavel: string): Promise<Setlist[]> {
    const snapshot = await this.collection
      .where('responsavel', '==', responsavel)
      .orderBy('data', 'desc')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      data: doc.data().data?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as Setlist[];
  }

  /**
   * Get setlists by date range
   */
  async findByDateRange(startDate: Date, endDate: Date): Promise<Setlist[]> {
    const snapshot = await this.collection
      .where('data', '>=', startDate)
      .where('data', '<=', endDate)
      .orderBy('data', 'asc')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      data: doc.data().data?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as Setlist[];
  }

  /**
   * Update setlist status
   */
  async updateStatus(id: string, status: 'planejada' | 'em_andamento' | 'finalizada' | 'cancelada'): Promise<boolean> {
    const setlistRef = this.collection.doc(id);
    const setlistDoc = await setlistRef.get();

    if (!setlistDoc.exists) {
      return false;
    }

    await setlistRef.update({
      status,
      updatedAt: new Date(),
    });

    return true;
  }

  /**
   * Get setlists statistics
   */
  async getStats(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    thisMonth: number;
    nextMonth: number;
    avgMusicsPerSetlist: number;
  }> {
    const snapshot = await this.collection.get();
    
    let total = 0;
    let totalMusics = 0;
    const byStatus: Record<string, number> = {};

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextMonthEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0);

    let thisMonth = 0;
    let nextMonth = 0;

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      total++;

      // Count by status
      if (data.status) {
        byStatus[data.status] = (byStatus[data.status] || 0) + 1;
      }

      // Count musics
      if (data.musicas && Array.isArray(data.musicas)) {
        totalMusics += data.musicas.length;
      }

      // Count by month
      if (data.data) {
        const setlistDate = data.data.toDate();
        
        if (setlistDate >= thisMonthStart && setlistDate <= thisMonthEnd) {
          thisMonth++;
        }
        
        if (setlistDate >= nextMonthStart && setlistDate <= nextMonthEnd) {
          nextMonth++;
        }
      }
    });

    return {
      total,
      byStatus,
      thisMonth,
      nextMonth,
      avgMusicsPerSetlist: total > 0 ? Math.round((totalMusics / total) * 100) / 100 : 0,
    };
  }
}
