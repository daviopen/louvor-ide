import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy,
  type DocumentData 
} from 'firebase/firestore';
import { db } from './firebase';
import type { Music, MusicFormData } from '../types/music';

export class DatabaseService {
  private static readonly COLLECTION_NAME = 'musicas';

  // Example data for initial setup
  private static getExampleData(): Omit<Music, 'id'>[] {
    return [
      {
        titulo: 'Quão Grande é o Meu Deus',
        artista: 'Chris Tomlin',
        ministro: 'João Silva, Maria Santos',
        ministros: ['João Silva', 'Maria Santos'],
        tom: 'G',
        tomMinistro: { 'João Silva': 'G', 'Maria Santos': 'A' },
        bpm: 120,
        link: 'https://www.youtube.com/watch?v=cJtYTrUNFQw',
        cifra: '[G]Quão grande [D]é o meu [Em]Deus\n[C]Cantarei quão [G]grande é o meu [D]Deus\n[G]E todos [D]verão quão [Em]grande\nQuão [C]grande é o meu [G]Deus',
        status: 'ativo' as const,
        timestamp: Date.now() - 86400000,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        criadoEm: new Date(Date.now() - 86400000)
      },
      {
        titulo: 'Reckless Love',
        artista: 'Cory Asbury',
        ministro: 'Maria Santos',
        ministros: ['Maria Santos'],
        tom: 'C',
        tomMinistro: { 'Maria Santos': 'C' },
        bpm: 140,
        link: 'https://www.youtube.com/watch?v=Sc6SSHuZvQE',
        cifra: '[C]Before I spoke a word, You were [Am]singing over me\n[F]You have been so, so [G]good to me\n[C]Before I took a breath, You [Am]breathed Your life in me\n[F]You have been so, so [G]kind to me',
        status: 'ativo' as const,
        timestamp: Date.now() - 172800000,
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        criadoEm: new Date(Date.now() - 172800000)
      },
      {
        titulo: 'Oceanos',
        artista: 'Hillsong United',
        ministro: 'Pedro Lima, Ana Costa',
        ministros: ['Pedro Lima', 'Ana Costa'],
        tom: 'D',
        tomMinistro: { 'Pedro Lima': 'D', 'Ana Costa': 'E' },
        bpm: 80,
        link: 'https://www.youtube.com/watch?v=dy9nwe9_xzw',
        cifra: '[D]Chama-me sobre as [A]águas\n[Bm]Onde os meus pés podem [G]falhar\n[D]E ali Te encontro no [A]mistério\n[Bm]Em oceanos [G]caminharei',
        status: 'ativo' as const,
        timestamp: Date.now() - 259200000,
        createdAt: new Date(Date.now() - 259200000).toISOString(),
        criadoEm: new Date(Date.now() - 259200000)
      }
    ];
  }

  // Initialize Firebase with example data if empty
  static async initializeFirebase(): Promise<void> {
    try {
      console.log('🔥 Verificando dados no Firebase...');
      
      const existingData = await this.getFirebaseMusic();
      
      if (existingData.length === 0) {
        console.log('📝 Inicializando dados de exemplo no Firebase...');
        const exampleData = this.getExampleData();
        
        for (const music of exampleData) {
          await addDoc(collection(db, this.COLLECTION_NAME), music);
        }
        
        console.log(`✅ ${exampleData.length} músicas de exemplo salvas no Firebase`);
      } else {
        console.log(`✅ ${existingData.length} músicas já existem no Firebase`);
      }
    } catch (error) {
      console.error('❌ Erro ao inicializar Firebase:', error);
      throw error;
    }
  }

  // Get all music from Firebase only
  static async getAllMusic(): Promise<Music[]> {
    try {
      console.log('🔥 Iniciando busca de músicas no Firebase...');
      console.log('📊 Configuração Firebase ativa:', {
        projectId: 'louvor-ide',
        collection: this.COLLECTION_NAME
      });
      
      const firebaseMusics = await this.getFirebaseMusic();
      
      if (firebaseMusics.length === 0) {
        console.log('📝 Nenhuma música encontrada, inicializando dados de exemplo...');
        await this.initializeFirebase();
        const newMusics = await this.getFirebaseMusic();
        console.log(`✅ ${newMusics.length} músicas inicializadas e carregadas do Firebase`);
        return newMusics;
      }
      
      console.log(`✅ ${firebaseMusics.length} músicas carregadas do Firebase`);
      return firebaseMusics;
    } catch (error) {
      console.error('❌ Erro detalhado ao buscar músicas no Firebase:', {
        error: error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Se é um erro de permissão, dar uma dica específica
      if (error instanceof Error && error.message.includes('permission')) {
        throw new Error('❌ Erro de permissão no Firebase. Verifique as regras do Firestore.');
      }
      
      // Se é um erro de rede
      if (error instanceof Error && error.message.includes('network')) {
        throw new Error('❌ Erro de rede. Verifique sua conexão com a internet.');
      }
      
      throw new Error(`❌ Erro ao carregar músicas: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  // Get music from Firebase
  private static async getFirebaseMusic(): Promise<Music[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        orderBy('timestamp', 'desc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => {
        const data = doc.data() as DocumentData;
        return {
          id: doc.id,
          ...data,
          criadoEm: data.criadoEm?.toDate() || new Date(data.timestamp)
        } as Music;
      });
    } catch (error) {
      console.error('❌ Erro ao buscar dados do Firebase:', error);
      throw error;
    }
  }

  // Add new music to Firebase only
  static async addMusic(musicData: MusicFormData): Promise<Music> {
    const newMusic: Omit<Music, 'id'> = {
      ...musicData,
      ministro: musicData.ministros.join(', '),
      tomMinistro: musicData.ministros.reduce((acc, ministro) => {
        acc[ministro] = musicData.tom;
        return acc;
      }, {} as Record<string, string>),
      status: 'ativo',
      timestamp: Date.now(),
      createdAt: new Date().toISOString(),
      criadoEm: new Date()
    };

    try {
      console.log('🔥 Adicionando música no Firebase...');
      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), newMusic);
      const music: Music = { id: docRef.id, ...newMusic };
      
      console.log(`✅ Música "${music.titulo}" salva no Firebase com ID: ${music.id}`);
      return music;
    } catch (error) {
      console.error('❌ Erro ao salvar música no Firebase:', error);
      throw new Error('Erro ao salvar música no Firebase. Verifique sua conexão.');
    }
  }

  // Update music in Firebase only
  static async updateMusic(id: string, musicData: Partial<MusicFormData>): Promise<void> {
    const updateData: Partial<Music> = {
      ...musicData,
      ministro: musicData.ministros?.join(', '),
      tomMinistro: musicData.ministros?.reduce((acc, ministro) => {
        acc[ministro] = musicData.tom || 'C';
        return acc;
      }, {} as Record<string, string>)
    };

    try {
      console.log(`🔥 Atualizando música ${id} no Firebase...`);
      await updateDoc(doc(db, this.COLLECTION_NAME, id), updateData);
      console.log(`✅ Música ${id} atualizada no Firebase`);
    } catch (error) {
      console.error('❌ Erro ao atualizar música no Firebase:', error);
      throw new Error('Erro ao atualizar música no Firebase. Verifique sua conexão.');
    }
  }

  // Delete music from Firebase only
  static async deleteMusic(id: string): Promise<void> {
    try {
      console.log(`🔥 Deletando música ${id} do Firebase...`);
      await deleteDoc(doc(db, this.COLLECTION_NAME, id));
      console.log(`✅ Música ${id} deletada do Firebase`);
    } catch (error) {
      console.error('❌ Erro ao deletar música do Firebase:', error);
      throw new Error('Erro ao deletar música do Firebase. Verifique sua conexão.');
    }
  }

  // Search music in Firebase
  static async searchMusic(searchTerm: string): Promise<Music[]> {
    const allMusic = await this.getAllMusic();
    
    if (!searchTerm.trim()) return allMusic;
    
    const term = searchTerm.toLowerCase();
    return allMusic.filter(music =>
      music.titulo.toLowerCase().includes(term) ||
      music.artista.toLowerCase().includes(term) ||
      music.ministros.some(ministro => ministro.toLowerCase().includes(term)) ||
      music.tom.toLowerCase().includes(term)
    );
  }

  // Get unique ministers from Firebase
  static async getUniqueMinistros(): Promise<string[]> {
    const allMusic = await this.getAllMusic();
    const ministros = new Set<string>();
    
    allMusic.forEach(music => {
      // Verificar se ministros existe e é um array
      if (music.ministros && Array.isArray(music.ministros)) {
        music.ministros.forEach(ministro => {
          if (ministro && typeof ministro === 'string') {
            ministros.add(ministro);
          }
        });
      }
      // Fallback: se ministros não existir mas ministro existir, dividir por vírgula
      else if (music.ministro && typeof music.ministro === 'string') {
        music.ministro.split(',').forEach(ministro => {
          const cleanMinistro = ministro.trim();
          if (cleanMinistro) {
            ministros.add(cleanMinistro);
          }
        });
      }
    });
    
    return Array.from(ministros).sort();
  }

  // Get unique artists from Firebase
  static async getUniqueArtistas(): Promise<string[]> {
    const allMusic = await this.getAllMusic();
    const artistas = new Set<string>();
    
    allMusic.forEach(music => {
      // Verificar se artista existe e não é undefined/null
      if (music.artista && typeof music.artista === 'string' && music.artista.trim()) {
        artistas.add(music.artista.trim());
      }
    });
    
    return Array.from(artistas).sort();
  }
}

export default DatabaseService;
