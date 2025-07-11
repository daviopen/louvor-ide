// @ts-nocheck
import express from 'express';
import cors from 'cors';
import admin from 'firebase-admin';

// Função utilitária para converter timestamps de forma segura
const safeToDate = (timestamp: any) => {
  if (!timestamp) return timestamp;
  if (typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  return timestamp;
};

// Interfaces para tipagem
interface MinisterData {
  id?: string;
  nome: string;
  email?: string;
  telefone?: string;
  instrumento?: string[];
  tomPreferido?: string;
  status: string;
  observacoes?: string;
  createdAt?: Date | admin.firestore.Timestamp;
  updatedAt?: Date | admin.firestore.Timestamp;
}

interface UserData {
  id?: string;
  uid?: string;
  nome: string;
  email: string;
  role: string;
  status: string;
  preferences?: {
    theme?: string;
    defaultKey?: string;
    notifications?: boolean;
    language?: string;
  };
  createdAt?: Date | admin.firestore.Timestamp;
  updatedAt?: Date | admin.firestore.Timestamp;
}

interface SetlistData {
  id?: string;
  titulo: string;
  data: Date | admin.firestore.Timestamp;
  local?: string;
  responsavel?: string;
  responsavelNome?: string;
  musicas?: Array<{
    musicId: string;
    ordem: number;
    tom?: string;
    observacoes?: string;
    music?: any;
  }>;
  status: string;
  observacoes?: string;
  tags?: string[];
  createdAt?: Date | admin.firestore.Timestamp;
  updatedAt?: Date | admin.firestore.Timestamp;
}

// Initialize Firebase Admin SDK
const initializeFirebase = () => {
  try {
    if (admin.apps.length === 0) {
      console.log('🔥 Inicializando Firebase Admin SDK...');
      
      // Tentar usar service account key se disponível
      const path = require('path');
      const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(__dirname, '..', 'serviceAccountKey.json');
      
      let config = {
        projectId: 'louvor-ide',
      };
      
      // Verificar se existe arquivo de service account
      try {
        const fs = require('fs');
        console.log(`🔍 Procurando service account em: ${serviceAccountPath}`);
        if (fs.existsSync(serviceAccountPath)) {
          console.log(`📄 Service account encontrada: ${serviceAccountPath}`);
          const serviceAccount = require(serviceAccountPath);
          console.log(`📧 Service account email: ${serviceAccount.client_email}`);
          config = {
            credential: admin.credential.cert(serviceAccount),
            projectId: serviceAccount.project_id || 'louvor-ide',
          };
          console.log('✅ Configuração com service account criada');
        } else {
          console.log(`❌ Service account não encontrada em: ${serviceAccountPath}`);
          console.log('🔑 Usando credenciais padrão do Firebase CLI');
        }
      } catch (err) {
        console.log('❌ Erro ao carregar service account:', err.message);
        console.log('🔑 Usando credenciais padrão do Firebase CLI (service account não encontrada)');
      }
      
      admin.initializeApp(config);
      console.log('✅ Firebase Admin SDK inicializado com sucesso');
    }
  } catch (error) {
    console.error('❌ Erro ao inicializar Firebase Admin SDK:', error);
    console.log('💡 Tentando inicializar sem credenciais explícitas...');
    
    try {
      // Fallback: try without explicit credentials
      admin.initializeApp({
        projectId: 'louvor-ide',
      });
      console.log('✅ Firebase Admin SDK inicializado (fallback)');
    } catch (fallbackError) {
      console.error('❌ Erro no fallback:', fallbackError);
      throw fallbackError;
    }
  }
};

// Initialize Firebase
initializeFirebase();

// Get Firestore instance
const db = admin.firestore();

// Collections
const COLLECTIONS = {
  MUSICS: 'musicas',
  MINISTERS: 'ministros', 
  USERS: 'usuarios',
  SETLISTS: 'setlists',
} as const;

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', async (req, res) => {
  try {
    // Test Firebase connection
    const testCollection = await db.collection('test').limit(1).get();
    
    res.json({
      success: true,
      message: 'Backend TypeScript funcionando!',
      timestamp: new Date().toISOString(),
      firebase: 'Conectado ao Firestore real',
      project: 'louvor-ide'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erro na conexão com Firebase',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// === CRUD MÚSICAS COM FIREBASE REAL ===

// GET /api/v1/music - Listar músicas
app.get('/api/v1/music', async (req, res) => {
  try {
    console.log('🎵 Buscando músicas no Firestore...');
    
    const { search, page = 1, limit = 10 } = req.query;
    
    // Query base - buscar músicas ativas ordenadas por data de criação
    let query = db.collection(COLLECTIONS.MUSICS)
      .where('status', '==', 'ativo')
      .orderBy('createdAt', 'desc');
    
    const snapshot = await query.get();
    
    let musics = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    }));
    
    // Aplicar filtro de busca se fornecido
    if (search) {
      const searchTerm = search.toString().toLowerCase();
      musics = musics.filter((music: any) =>
        music.titulo?.toLowerCase().includes(searchTerm) ||
        music.artista?.toLowerCase().includes(searchTerm) ||
        (music.ministros && music.ministros.some((m: string) => m.toLowerCase().includes(searchTerm))) ||
        music.tom?.toLowerCase().includes(searchTerm)
      );
    }
    
    // Aplicar paginação
    const startIndex = (Number(page) - 1) * Number(limit);
    const paginatedMusics = musics.slice(startIndex, startIndex + Number(limit));
    
    console.log(`✅ ${musics.length} músicas encontradas no Firestore`);
    
    res.json({
      success: true,
      data: paginatedMusics,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: musics.length,
        totalPages: Math.ceil(musics.length / Number(limit)),
        hasNext: startIndex + Number(limit) < musics.length,
        hasPrev: Number(page) > 1
      }
    });
  } catch (error) {
    console.error('❌ Erro ao buscar músicas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar músicas',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// GET /api/v1/music/:id - Buscar música por ID
// @ts-ignore
app.get('/api/v1/music/:id', async (req, res) => {
  try {
    console.log(`🎵 Buscando música ${req.params.id} no Firestore...`);
    
    const doc = await db.collection(COLLECTIONS.MUSICS).doc(req.params.id).get();
    
    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Música não encontrada'
      });
    }
    
    const data = doc.data();
    const music: any = {
      id: doc.id,
      ...data,
      createdAt: data?.createdAt?.toDate(),
      updatedAt: data?.updatedAt?.toDate(),
    };
    
    console.log(`✅ Música "${music.titulo}" encontrada`);
    
    res.json({
      success: true,
      data: music
    });
  } catch (error) {
    console.error('❌ Erro ao buscar música:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar música',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// POST /api/v1/music - Criar música
app.post('/api/v1/music', async (req, res) => {
  try {
    console.log('🎵 Criando nova música no Firestore...');
    
    const now = new Date();
    const musicData = {
      ...req.body,
      tomMinistro: req.body.ministros?.reduce((acc: any, ministro: string) => {
        acc[ministro] = req.body.tom;
        return acc;
      }, {}) || {},
      status: 'ativo',
      createdAt: now,
      updatedAt: now
    };
    
    const docRef = await db.collection(COLLECTIONS.MUSICS).add(musicData);
    
    const newMusic = {
      id: docRef.id,
      ...musicData
    };
    
    console.log(`✅ Música "${newMusic.titulo}" criada com ID: ${docRef.id}`);
    
    res.status(201).json({
      success: true,
      data: newMusic,
      message: 'Música criada com sucesso!'
    });
  } catch (error) {
    console.error('❌ Erro ao criar música:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao criar música',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// PUT /api/v1/music/:id - Atualizar música
// @ts-ignore
app.put('/api/v1/music/:id', async (req, res) => {
  try {
    console.log(`🎵 Atualizando música ${req.params.id} no Firestore...`);
    
    const musicRef = db.collection(COLLECTIONS.MUSICS).doc(req.params.id);
    const musicDoc = await musicRef.get();
    
    if (!musicDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Música não encontrada'
      });
    }
    
    const updateData = {
      ...req.body,
      ...(req.body.ministros && {
        tomMinistro: req.body.ministros.reduce((acc: any, ministro: string) => {
          acc[ministro] = req.body.tom || 'C';
          return acc;
        }, {})
      }),
      updatedAt: new Date()
    };
    
    await musicRef.update(updateData);
    
    // Buscar dados atualizados
    const updatedDoc = await musicRef.get();
    const updatedData = updatedDoc.data();
    
    const updatedMusic: any = {
      id: updatedDoc.id,
      ...updatedData,
      createdAt: updatedData?.createdAt?.toDate(),
      updatedAt: updatedData?.updatedAt?.toDate(),
    };
    
    console.log(`✅ Música "${updatedMusic.titulo}" atualizada`);
    
    res.json({
      success: true,
      data: updatedMusic,
      message: 'Música atualizada com sucesso!'
    });
  } catch (error) {
    console.error('❌ Erro ao atualizar música:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao atualizar música',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// DELETE /api/v1/music/:id - Deletar música (soft delete)
// @ts-ignore  
app.delete('/api/v1/music/:id', async (req, res) => {
  try {
    console.log(`🎵 Deletando música ${req.params.id} no Firestore...`);
    
    const musicRef = db.collection(COLLECTIONS.MUSICS).doc(req.params.id);
    const musicDoc = await musicRef.get();
    
    if (!musicDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Música não encontrada'
      });
    }
    
    // Soft delete - marcar como inativa
    await musicRef.update({
      status: 'inativo',
      updatedAt: new Date()
    });
    
    console.log(`✅ Música ${req.params.id} marcada como inativa`);
    
    res.json({
      success: true,
      message: 'Música deletada com sucesso!'
    });
  } catch (error) {
    console.error('❌ Erro ao deletar música:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao deletar música',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// GET /api/v1/music/ministers/unique - Ministros únicos
app.get('/api/v1/music/ministers/unique', async (req, res) => {
  try {
    console.log('👥 Buscando ministros únicos no Firestore...');
    
    const snapshot = await db.collection(COLLECTIONS.MUSICS)
      .where('status', '==', 'ativo')
      .get();
    
    const ministrosSet = new Set<string>();
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.ministros && Array.isArray(data.ministros)) {
        data.ministros.forEach((ministro: string) => {
          if (ministro && typeof ministro === 'string') {
            ministrosSet.add(ministro.trim());
          }
        });
      }
    });
    
    const ministros = Array.from(ministrosSet).sort();
    
    console.log(`✅ ${ministros.length} ministros únicos encontrados`);
    
    res.json({
      success: true,
      data: ministros
    });
  } catch (error) {
    console.error('❌ Erro ao buscar ministros únicos:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar ministros únicos',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// GET /api/v1/music/artists/unique - Artistas únicos
app.get('/api/v1/music/artists/unique', async (req, res) => {
  try {
    console.log('🎤 Buscando artistas únicos no Firestore...');
    
    const snapshot = await db.collection(COLLECTIONS.MUSICS)
      .where('status', '==', 'ativo')
      .get();
    
    const artistasSet = new Set<string>();
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.artista && typeof data.artista === 'string') {
        artistasSet.add(data.artista.trim());
      }
    });
    
    const artistas = Array.from(artistasSet).sort();
    
    console.log(`✅ ${artistas.length} artistas únicos encontrados`);
    
    res.json({
      success: true,
      data: artistas
    });
  } catch (error) {
    console.error('❌ Erro ao buscar artistas únicos:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar artistas únicos',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// === TRANSPOSIÇÃO ===
app.post('/api/v1/transpose', (req, res) => {
  try {
    const { cifra, semitones, tomOriginal } = req.body;
    
    // Algoritmo de transposição simples
    const transposeChord = (chord: string, semitones: number) => {
      const chords = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      const index = chords.indexOf(chord);
      if (index === -1) return chord;
      
      let newIndex = (index + semitones) % 12;
      if (newIndex < 0) newIndex += 12;
      
      return chords[newIndex];
    };
    
    // Transpor acordes na cifra
    const transposedCifra = cifra.replace(/\[([A-G]#?)\]/g, (match: string, chord: string) => {
      return `[${transposeChord(chord, semitones)}]`;
    });
    
    const tomFinal = tomOriginal ? transposeChord(tomOriginal, semitones) : undefined;
    
    res.json({
      success: true,
      data: {
        cifraOriginal: cifra,
        cifraTransposta: transposedCifra,
        tomOriginal,
        tomFinal,
        semitones
      }
    });
  } catch (error) {
    console.error('❌ Erro na transposição:', error);
    res.status(500).json({
      success: false,
      error: 'Erro na transposição',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// === CRUD MINISTROS COM FIREBASE REAL ===

// GET /api/v1/ministers - Listar ministros
app.get('/api/v1/ministers', async (req, res) => {
  try {
    console.log('👥 Buscando ministros no Firestore...');
    
    // Query simples sem orderBy para evitar necessidade de índice composto
    const snapshot = await db.collection(COLLECTIONS.MINISTERS)
      .where('status', '==', 'ativo')
      .get();
    
    let ministers = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: safeToDate(doc.data().createdAt),
      updatedAt: safeToDate(doc.data().updatedAt),
    }));
    
    // Ordenar no lado da aplicação
    ministers.sort((a, b) => {
      if (a.nome && b.nome) {
        return a.nome.localeCompare(b.nome);
      }
      return 0;
    });
    
    console.log(`✅ ${ministers.length} ministros encontrados`);
    res.json({ success: true, data: ministers });
  } catch (error) {
    console.error('❌ Erro ao buscar ministros:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar ministros',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// GET /api/v1/ministers/:id - Buscar ministro específico
app.get('/api/v1/ministers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`👥 Buscando ministro ${id} no Firestore...`);
    
    const doc = await db.collection(COLLECTIONS.MINISTERS).doc(id).get();
    
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Ministro não encontrado' });
    }
    
    const minister: any = {
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data()?.createdAt?.toDate(),
      updatedAt: doc.data()?.updatedAt?.toDate(),
    };
    
    console.log(`✅ Ministro ${minister.nome} encontrado`);
    res.json({ success: true, data: minister });
  } catch (error) {
    console.error('❌ Erro ao buscar ministro:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar ministro',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// POST /api/v1/ministers - Criar ministro
app.post('/api/v1/ministers', async (req, res) => {
  try {
    console.log('👥 Criando ministro no Firestore...');
    
    const ministerData = {
      ...req.body,
      status: 'ativo',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = await db.collection(COLLECTIONS.MINISTERS).add(ministerData);
    
    // Buscar o documento criado para retornar com timestamps convertidos
    const newDoc = await docRef.get();
    const minister: any = {
      id: newDoc.id,
      ...newDoc.data(),
      createdAt: newDoc.data()?.createdAt?.toDate(),
      updatedAt: newDoc.data()?.updatedAt?.toDate(),
    };
    
    console.log(`✅ Ministro ${minister.nome} criado com ID: ${docRef.id}`);
    res.status(201).json({ success: true, data: minister });
  } catch (error) {
    console.error('❌ Erro ao criar ministro:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao criar ministro',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// PUT /api/v1/ministers/:id - Atualizar ministro
app.put('/api/v1/ministers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`👥 Atualizando ministro ${id} no Firestore...`);
    
    const docRef = db.collection(COLLECTIONS.MINISTERS).doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Ministro não encontrado' });
    }
    
    const updateData = {
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await docRef.update(updateData);
    
    // Buscar o documento atualizado
    const updatedDoc = await docRef.get();
    const minister: any = {
      id: updatedDoc.id,
      ...updatedDoc.data(),
      createdAt: updatedDoc.data()?.createdAt?.toDate(),
      updatedAt: updatedDoc.data()?.updatedAt?.toDate(),
    };
    
    console.log(`✅ Ministro ${minister.nome} atualizado`);
    res.json({ success: true, data: minister });
  } catch (error) {
    console.error('❌ Erro ao atualizar ministro:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao atualizar ministro',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// DELETE /api/v1/ministers/:id - Deletar ministro (soft delete)
app.delete('/api/v1/ministers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`👥 Deletando ministro ${id} no Firestore...`);
    
    const docRef = db.collection(COLLECTIONS.MINISTERS).doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Ministro não encontrado' });
    }
    
    await docRef.update({
      status: 'inativo',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`✅ Ministro deletado (soft delete)`);
    res.json({ success: true, message: 'Ministro deletado com sucesso' });
  } catch (error) {
    console.error('❌ Erro ao deletar ministro:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao deletar ministro',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// === CRUD USUÁRIOS COM FIREBASE REAL ===

// GET /api/v1/users - Listar usuários
app.get('/api/v1/users', async (req, res) => {
  try {
    console.log('👤 Buscando usuários no Firestore...');
    
    // Query simples sem orderBy para evitar necessidade de índice composto
    const snapshot = await db.collection(COLLECTIONS.USERS)
      .where('status', '==', 'ativo')
      .get();
    
    let users = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: safeToDate(doc.data().createdAt),
      updatedAt: safeToDate(doc.data().updatedAt),
    }));
    
    // Ordenar no lado da aplicação
    users.sort((a, b) => {
      if (a.nome && b.nome) {
        return a.nome.localeCompare(b.nome);
      }
      return 0;
    });
    
    console.log(`✅ ${users.length} usuários encontrados`);
    res.json({ success: true, data: users });
  } catch (error) {
    console.error('❌ Erro ao buscar usuários:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar usuários',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// GET /api/v1/users/:id - Buscar usuário específico
app.get('/api/v1/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`👤 Buscando usuário ${id} no Firestore...`);
    
    const doc = await db.collection(COLLECTIONS.USERS).doc(id).get();
    
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
    }
    
    const user: any = {
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data()?.createdAt?.toDate(),
      updatedAt: doc.data()?.updatedAt?.toDate(),
    };
    
    console.log(`✅ Usuário ${user.nome} encontrado`);
    res.json({ success: true, data: user });
  } catch (error) {
    console.error('❌ Erro ao buscar usuário:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar usuário',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// POST /api/v1/users - Criar usuário
app.post('/api/v1/users', async (req, res) => {
  try {
    console.log('👤 Criando usuário no Firestore...');
    
    const userData = {
      ...req.body,
      status: 'ativo',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = await db.collection(COLLECTIONS.USERS).add(userData);
    
    // Buscar o documento criado
    const newDoc = await docRef.get();
    const user: any = {
      id: newDoc.id,
      ...newDoc.data(),
      createdAt: newDoc.data()?.createdAt?.toDate(),
      updatedAt: newDoc.data()?.updatedAt?.toDate(),
    };
    
    console.log(`✅ Usuário ${user.nome} criado com ID: ${docRef.id}`);
    res.status(201).json({ success: true, data: user });
  } catch (error) {
    console.error('❌ Erro ao criar usuário:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao criar usuário',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// PUT /api/v1/users/:id - Atualizar usuário
app.put('/api/v1/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`👤 Atualizando usuário ${id} no Firestore...`);
    
    const docRef = db.collection(COLLECTIONS.USERS).doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
    }
    
    const updateData = {
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await docRef.update(updateData);
    
    // Buscar o documento atualizado
    const updatedDoc = await docRef.get();
    const user: any = {
      id: updatedDoc.id,
      ...updatedDoc.data(),
      createdAt: updatedDoc.data()?.createdAt?.toDate(),
      updatedAt: updatedDoc.data()?.updatedAt?.toDate(),
    };
    
    console.log(`✅ Usuário ${user.nome} atualizado`);
    res.json({ success: true, data: user });
  } catch (error) {
    console.error('❌ Erro ao atualizar usuário:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao atualizar usuário',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// DELETE /api/v1/users/:id - Deletar usuário (soft delete)
app.delete('/api/v1/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`👤 Deletando usuário ${id} no Firestore...`);
    
    const docRef = db.collection(COLLECTIONS.USERS).doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
    }
    
    await docRef.update({
      status: 'inativo',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`✅ Usuário deletado (soft delete)`);
    res.json({ success: true, message: 'Usuário deletado com sucesso' });
  } catch (error) {
    console.error('❌ Erro ao deletar usuário:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao deletar usuário',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// === CRUD SETLISTS COM FIREBASE REAL ===

// GET /api/v1/setlists - Listar setlists
app.get('/api/v1/setlists', async (req, res) => {
  try {
    console.log('📋 Buscando setlists no Firestore...');
    
    const snapshot = await db.collection(COLLECTIONS.SETLISTS)
      .orderBy('data', 'desc')
      .get();
    
    const setlists = [];
    
    for (const doc of snapshot.docs) {
      const setlistData = doc.data();
      
      // Buscar nome do responsável se existir
      let responsavelNome = 'Não encontrado';
      if (setlistData.responsavel) {
        try {
          const ministerDoc = await db.collection(COLLECTIONS.MINISTERS).doc(setlistData.responsavel).get();
          if (ministerDoc.exists) {
            responsavelNome = ministerDoc.data()?.nome || 'Não encontrado';
          }
        } catch (err) {
          console.warn(`Erro ao buscar ministro ${setlistData.responsavel}:`, err);
        }
      }
      
      setlists.push({
        id: doc.id,
        ...setlistData,
        responsavelNome,
        data: safeToDate(setlistData.data),
        createdAt: safeToDate(setlistData.createdAt),
        updatedAt: safeToDate(setlistData.updatedAt),
      });
    }
    
    console.log(`✅ ${setlists.length} setlists encontradas`);
    res.json({ success: true, data: setlists });
  } catch (error) {
    console.error('❌ Erro ao buscar setlists:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar setlists',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// GET /api/v1/setlists/:id - Buscar setlist específica com dados enriquecidos
app.get('/api/v1/setlists/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📋 Buscando setlist ${id} no Firestore...`);
    
    const doc = await db.collection(COLLECTIONS.SETLISTS).doc(id).get();
    
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Setlist não encontrada' });
    }
    
    const setlistData = doc.data();
    
    // Buscar nome do responsável
    let responsavelNome = 'Não encontrado';
    if (setlistData?.responsavel) {
      try {
        const ministerDoc = await db.collection(COLLECTIONS.MINISTERS).doc(setlistData.responsavel).get();
        if (ministerDoc.exists) {
          responsavelNome = ministerDoc.data()?.nome || 'Não encontrado';
        }
      } catch (err) {
        console.warn(`Erro ao buscar ministro ${setlistData.responsavel}:`, err);
      }
    }
    
    // Buscar dados das músicas
    const enrichedMusicas = [];
    if (setlistData?.musicas && Array.isArray(setlistData.musicas)) {
      for (const item of setlistData.musicas) {
        try {
          const musicDoc = await db.collection(COLLECTIONS.MUSICS).doc(item.musicId).get();
          enrichedMusicas.push({
            ...item,
            music: musicDoc.exists ? { id: musicDoc.id, ...musicDoc.data() } : null
          });
        } catch (err) {
          console.warn(`Erro ao buscar música ${item.musicId}:`, err);
          enrichedMusicas.push({ ...item, music: null });
        }
      }
    }
    
    const enrichedSetlist: any = {
      id: doc.id,
      ...setlistData,
      responsavelNome,
      musicas: enrichedMusicas,
      data: safeToDate(setlistData?.data),
      createdAt: safeToDate(setlistData?.createdAt),
      updatedAt: safeToDate(setlistData?.updatedAt),
    };
    
    console.log(`✅ Setlist ${enrichedSetlist.titulo} encontrada`);
    res.json({ success: true, data: enrichedSetlist });
  } catch (error) {
    console.error('❌ Erro ao buscar setlist:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar setlist',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// POST /api/v1/setlists - Criar setlist
app.post('/api/v1/setlists', async (req, res) => {
  try {
    console.log('📋 Criando setlist no Firestore...');
    
    const setlistData = {
      ...req.body,
      status: req.body.status || 'planejada',
      data: req.body.data ? admin.firestore.Timestamp.fromDate(new Date(req.body.data)) : admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = await db.collection(COLLECTIONS.SETLISTS).add(setlistData);
    
    // Buscar o documento criado
    const newDoc = await docRef.get();
    const setlist: any = {
      id: newDoc.id,
      ...newDoc.data(),
      data: safeToDate(newDoc.data()?.data),
      createdAt: safeToDate(newDoc.data()?.createdAt),
      updatedAt: safeToDate(newDoc.data()?.updatedAt),
    };
    
    console.log(`✅ Setlist ${setlist.titulo} criada com ID: ${docRef.id}`);
    res.status(201).json({ success: true, data: setlist });
  } catch (error) {
    console.error('❌ Erro ao criar setlist:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao criar setlist',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// PUT /api/v1/setlists/:id - Atualizar setlist
app.put('/api/v1/setlists/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📋 Atualizando setlist ${id} no Firestore...`);
    
    const docRef = db.collection(COLLECTIONS.SETLISTS).doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Setlist não encontrada' });
    }
    
    const updateData = {
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Converter data se fornecida
    if (req.body.data) {
      updateData.data = admin.firestore.Timestamp.fromDate(new Date(req.body.data));
    }
    
    await docRef.update(updateData);
    
    // Buscar o documento atualizado
    const updatedDoc = await docRef.get();
    const setlist: any = {
      id: updatedDoc.id,
      ...updatedDoc.data(),
      data: safeToDate(updatedDoc.data()?.data),
      createdAt: safeToDate(updatedDoc.data()?.createdAt),
      updatedAt: safeToDate(updatedDoc.data()?.updatedAt),
    };
    
    console.log(`✅ Setlist ${setlist.titulo} atualizada`);
    res.json({ success: true, data: setlist });
  } catch (error) {
    console.error('❌ Erro ao atualizar setlist:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao atualizar setlist',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// DELETE /api/v1/setlists/:id - Deletar setlist (hard delete)
app.delete('/api/v1/setlists/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📋 Deletando setlist ${id} no Firestore...`);
    
    const docRef = db.collection(COLLECTIONS.SETLISTS).doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Setlist não encontrada' });
    }
    
    await docRef.delete();
    
    console.log(`✅ Setlist deletada (hard delete)`);
    res.json({ success: true, message: 'Setlist deletada com sucesso' });
  } catch (error) {
    console.error('❌ Erro ao deletar setlist:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao deletar setlist',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 ==========================================');
  console.log(`   LOUVOR IDE BACKEND - FIREBASE REAL`);
  console.log('🚀 ==========================================');
  console.log(`📍 Servidor: http://localhost:${PORT}`);
  console.log(`📚 Health: http://localhost:${PORT}/health`);
  console.log('');
  console.log('🔥 === FIREBASE FIRESTORE REAL ===');
  console.log(`   Projeto: louvor-ide`);
  console.log(`   Coleções: musicas, ministros, usuarios, setlists`);
  console.log('');
  console.log('🎵 === CRUD MÚSICAS (REAL) ===');
  console.log(`   GET    /api/v1/music              - Listar músicas`);
  console.log(`   GET    /api/v1/music/:id          - Buscar música`);
  console.log(`   POST   /api/v1/music              - Criar música`);
  console.log(`   PUT    /api/v1/music/:id          - Atualizar música`);
  console.log(`   DELETE /api/v1/music/:id          - Deletar música`);
  console.log(`   GET    /api/v1/music/ministers/unique - Ministros únicos`);
  console.log(`   GET    /api/v1/music/artists/unique  - Artistas únicos`);
  console.log('');
  console.log('👥 === CRUD MINISTROS (REAL) ===');
  console.log(`   GET    /api/v1/ministers          - Listar ministros`);
  console.log(`   GET    /api/v1/ministers/:id      - Buscar ministro`);
  console.log(`   POST   /api/v1/ministers          - Criar ministro`);
  console.log(`   PUT    /api/v1/ministers/:id      - Atualizar ministro`);
  console.log(`   DELETE /api/v1/ministers/:id      - Deletar ministro`);
  console.log('');
  console.log('👤 === CRUD USUÁRIOS (REAL) ===');
  console.log(`   GET    /api/v1/users              - Listar usuários`);
  console.log(`   GET    /api/v1/users/:id          - Buscar usuário`);
  console.log(`   POST   /api/v1/users              - Criar usuário`);
  console.log(`   PUT    /api/v1/users/:id          - Atualizar usuário`);
  console.log(`   DELETE /api/v1/users/:id          - Deletar usuário`);
  console.log('');
  console.log('📋 === CRUD SETLISTS (REAL) ===');
  console.log(`   GET    /api/v1/setlists           - Listar setlists`);
  console.log(`   GET    /api/v1/setlists/:id       - Buscar setlist`);
  console.log(`   POST   /api/v1/setlists           - Criar setlist`);
  console.log(`   PUT    /api/v1/setlists/:id       - Atualizar setlist`);
  console.log(`   DELETE /api/v1/setlists/:id       - Deletar setlist`);
  console.log('');
  console.log('🎼 === TRANSPOSIÇÃO ===');
  console.log(`   POST   /api/v1/transpose          - Transpor cifra`);
  console.log('');
  console.log('✅ TODOS OS CRUDs CONECTADOS AO FIRESTORE REAL!');
  console.log('✅ Dados persistentes na nuvem!');
  console.log('🚀 ==========================================');
});

export default app;
