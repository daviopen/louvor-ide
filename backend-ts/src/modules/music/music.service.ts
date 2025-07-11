import { db, COLLECTIONS } from '../../services/firebase';
import { Music, CreateMusicDto, UpdateMusicDto, SearchQuery, PaginatedResponse } from '../../types';

export class MusicService {
  private collection = db.collection(COLLECTIONS.MUSICS);

  async create(data: CreateMusicDto): Promise<Music> {
    try {
      const now = new Date();
      const musicData = {
        ...data,
        tomMinistro: data.ministros.reduce((acc, ministro) => {
          acc[ministro] = data.tom;
          return acc;
        }, {} as Record<string, string>),
        status: 'ativo' as const,
        createdAt: now,
        updatedAt: now,
      };

      const docRef = await this.collection.add(musicData);
      const doc = await docRef.get();
      
      return {
        id: doc.id,
        ...doc.data(),
      } as Music;
    } catch (error) {
      console.error('❌ Error creating music:', error);
      throw error;
    }
  }

  async findAll(query: SearchQuery): Promise<PaginatedResponse<Music>> {
    try {
      const {
        search,
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        ministro,
        tom,
      } = query;

      let firestoreQuery = this.collection
        .where('status', '==', 'ativo')
        .orderBy(sortBy, sortOrder);

      // Apply filters
      if (tom) {
        firestoreQuery = firestoreQuery.where('tom', '==', tom);
      }

      const snapshot = await firestoreQuery.get();
      let musics = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Music[];

      // Client-side filtering for complex queries
      if (search) {
        const searchLower = search.toLowerCase();
        musics = musics.filter(music =>
          music.titulo.toLowerCase().includes(searchLower) ||
          music.artista.toLowerCase().includes(searchLower) ||
          music.ministros.some(m => m.toLowerCase().includes(searchLower))
        );
      }

      if (ministro) {
        musics = musics.filter(music =>
          music.ministros.some(m => m.toLowerCase().includes(ministro.toLowerCase()))
        );
      }

      // Pagination
      const total = musics.length;
      const totalPages = Math.ceil(total / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedMusics = musics.slice(startIndex, endIndex);

      return {
        success: true,
        data: paginatedMusics,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      console.error('❌ Error fetching musics:', error);
      throw error;
    }
  }

  async findById(id: string): Promise<Music | null> {
    try {
      const doc = await this.collection.doc(id).get();
      
      if (!doc.exists) {
        return null;
      }

      return {
        id: doc.id,
        ...doc.data(),
      } as Music;
    } catch (error) {
      console.error('❌ Error fetching music by ID:', error);
      throw error;
    }
  }

  async update(id: string, data: UpdateMusicDto): Promise<Music | null> {
    try {
      const docRef = this.collection.doc(id);
      const doc = await docRef.get();

      if (!doc.exists) {
        return null;
      }

      // const updateData = {
      //   ...data,
      //   ...(data.ministros && {
      //     tomMinistro: data.ministros.reduce((acc, ministro) => {
      //       acc[ministro] = data.tom || 'C';
      //       return acc;
      //     }, {} as Record<string, string>)
      //   }),
      //   updatedAt: new Date(),
      // };
      const updateData: any = {
        ...data,
        updatedAt: new Date(),
      };

      if (data.ministros) {
        // use frontend-provided tomMinistro if available
        if ((data as any).tomMinistro) {
          updateData.tomMinistro = (data as any).tomMinistro;
        } else {
          updateData.tomMinistro = data.ministros.reduce((acc, ministro) => {
            acc[ministro] = data.tom || 'C';
            return acc;
          }, {} as Record<string, string>);
        }
      }

      await docRef.update(updateData);
      const updatedDoc = await docRef.get();

      return {
        id: updatedDoc.id,
        ...updatedDoc.data(),
      } as Music;
    } catch (error) {
      console.error('❌ Error updating music:', error);
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const docRef = this.collection.doc(id);
      const doc = await docRef.get();

      if (!doc.exists) {
        return false;
      }

      // Soft delete
      await docRef.update({
        status: 'inativo',
        updatedAt: new Date(),
      });

      return true;
    } catch (error) {
      console.error('❌ Error deleting music:', error);
      throw error;
    }
  }

  async getUniqueMinistros(): Promise<string[]> {
    try {
      const snapshot = await this.collection
        .where('status', '==', 'ativo')
        .get();

      const ministrosSet = new Set<string>();
      
      snapshot.docs.forEach(doc => {
        const music = doc.data() as Music;
        if (music.ministros && Array.isArray(music.ministros)) {
          music.ministros.forEach(ministro => {
            if (ministro && ministro.trim()) {
              ministrosSet.add(ministro.trim());
            }
          });
        }
      });

      return Array.from(ministrosSet).sort();
    } catch (error) {
      console.error('❌ Error fetching unique ministros:', error);
      throw error;
    }
  }

  async getUniqueArtistas(): Promise<string[]> {
    try {
      const snapshot = await this.collection
        .where('status', '==', 'ativo')
        .get();

      const artistasSet = new Set<string>();
      
      snapshot.docs.forEach(doc => {
        const music = doc.data() as Music;
        if (music.artista && music.artista.trim()) {
          artistasSet.add(music.artista.trim());
        }
      });

      return Array.from(artistasSet).sort();
    } catch (error) {
      console.error('❌ Error fetching unique artistas:', error);
      throw error;
    }
  }
}
