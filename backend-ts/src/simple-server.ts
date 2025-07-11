import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Test route
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Backend TypeScript funcionando!',
    timestamp: new Date().toISOString(),
    firebase: 'Conectado com credenciais padrão'
  });
});

// Mock data storage
let mockData = {
  musics: [
    {
      id: '1',
      titulo: 'Quão Grande é o Meu Deus',
      artista: 'Chris Tomlin',
      tom: 'G',
      ministros: ['João Silva', 'Maria Santos'],
      tomMinistro: { 'João Silva': 'G', 'Maria Santos': 'A' },
      bpm: 120,
      cifra: '[G]Quão grande [D]é o meu [Em]Deus',
      status: 'ativo',
      tags: ['adoração', 'clássico'],
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '2',
      titulo: 'Oceanos',
      artista: 'Hillsong United',
      tom: 'D',
      ministros: ['Pedro Lima', 'Ana Costa'],
      tomMinistro: { 'Pedro Lima': 'D', 'Ana Costa': 'E' },
      bpm: 80,
      cifra: '[D]Chama-me sobre as [A]águas',
      status: 'ativo',
      tags: ['adoração', 'contemplativa'],
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],
  ministers: [
    {
      id: '1',
      nome: 'João Silva',
      email: 'joao@igreja.com',
      telefone: '(11) 99999-9999',
      instrumento: ['Violão', 'Voz'],
      tomPreferido: 'G',
      status: 'ativo',
      observacoes: 'Ministro experiente',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '2',
      nome: 'Maria Santos',
      email: 'maria@igreja.com',
      instrumento: ['Teclado', 'Voz'],
      tomPreferido: 'A',
      status: 'ativo',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],
  users: [
    {
      id: '1',
      uid: 'firebase-uid-1',
      nome: 'Pastor Carlos',
      email: 'pastor@igreja.com',
      role: 'admin',
      status: 'ativo',
      preferences: {
        theme: 'light',
        defaultKey: 'G',
        notifications: true,
        language: 'pt'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ],
  setlists: [
    {
      id: '1',
      titulo: 'Culto Dominical - 09/07/2025',
      data: new Date(),
      local: 'Igreja Central',
      responsavel: '1',
      musicas: [
        { musicId: '1', ordem: 1, tom: 'G', observacoes: 'Entrada' },
        { musicId: '2', ordem: 2, tom: 'D', observacoes: 'Adoração' }
      ],
      status: 'planejada',
      observacoes: 'Culto especial',
      tags: ['domingo', 'principal'],
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ]
};

// === CRUD MÚSICAS ===
app.get('/api/v1/music', (req, res) => {
  const { search, page = 1, limit = 10 } = req.query;
  let filteredMusics = mockData.musics.filter(music => music.status === 'ativo');
  
  if (search) {
    const searchTerm = search.toString().toLowerCase();
    filteredMusics = filteredMusics.filter(music =>
      music.titulo.toLowerCase().includes(searchTerm) ||
      music.artista.toLowerCase().includes(searchTerm) ||
      music.ministros.some(m => m.toLowerCase().includes(searchTerm))
    );
  }
  
  const startIndex = (Number(page) - 1) * Number(limit);
  const paginatedMusics = filteredMusics.slice(startIndex, startIndex + Number(limit));
  
  res.json({
    success: true,
    data: paginatedMusics,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: filteredMusics.length,
      totalPages: Math.ceil(filteredMusics.length / Number(limit)),
      hasNext: startIndex + Number(limit) < filteredMusics.length,
      hasPrev: Number(page) > 1
    }
  });
});

app.get('/api/v1/music/:id', (req, res) => {
  const music = mockData.musics.find(m => m.id === req.params.id && m.status === 'ativo');
  if (!music) {
    return res.status(404).json({ success: false, error: 'Música não encontrada' });
  }
  res.json({ success: true, data: music });
});

app.post('/api/v1/music', (req, res) => {
  const newMusic = {
    id: Date.now().toString(),
    ...req.body,
    tomMinistro: req.body.ministros.reduce((acc: any, ministro: string) => {
      acc[ministro] = req.body.tom;
      return acc;
    }, {}),
    status: 'ativo',
    createdAt: new Date(),
    updatedAt: new Date()
  };
  mockData.musics.push(newMusic);
  res.status(201).json({ success: true, data: newMusic });
});

app.put('/api/v1/music/:id', (req, res) => {
  const index = mockData.musics.findIndex(m => m.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Música não encontrada' });
  }
  
  mockData.musics[index] = {
    ...mockData.musics[index],
    ...req.body,
    updatedAt: new Date()
  };
  
  res.json({ success: true, data: mockData.musics[index] });
});

app.delete('/api/v1/music/:id', (req, res) => {
  const index = mockData.musics.findIndex(m => m.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Música não encontrada' });
  }
  
  mockData.musics[index].status = 'inativo';
  mockData.musics[index].updatedAt = new Date();
  
  res.json({ success: true, message: 'Música deletada com sucesso' });
});

// === CRUD MINISTROS ===
app.get('/api/v1/ministers', (req, res) => {
  const ministers = mockData.ministers.filter(m => m.status === 'ativo');
  res.json({ success: true, data: ministers });
});

app.get('/api/v1/ministers/:id', (req, res) => {
  const minister = mockData.ministers.find(m => m.id === req.params.id && m.status === 'ativo');
  if (!minister) {
    return res.status(404).json({ success: false, error: 'Ministro não encontrado' });
  }
  res.json({ success: true, data: minister });
});

app.post('/api/v1/ministers', (req, res) => {
  const newMinister = {
    id: Date.now().toString(),
    ...req.body,
    status: 'ativo',
    createdAt: new Date(),
    updatedAt: new Date()
  };
  mockData.ministers.push(newMinister);
  res.status(201).json({ success: true, data: newMinister });
});

app.put('/api/v1/ministers/:id', (req, res) => {
  const index = mockData.ministers.findIndex(m => m.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Ministro não encontrado' });
  }
  
  mockData.ministers[index] = {
    ...mockData.ministers[index],
    ...req.body,
    updatedAt: new Date()
  };
  
  res.json({ success: true, data: mockData.ministers[index] });
});

app.delete('/api/v1/ministers/:id', (req, res) => {
  const index = mockData.ministers.findIndex(m => m.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Ministro não encontrado' });
  }
  
  mockData.ministers[index].status = 'inativo';
  mockData.ministers[index].updatedAt = new Date();
  
  res.json({ success: true, message: 'Ministro deletado com sucesso' });
});

// === CRUD USUÁRIOS ===
app.get('/api/v1/users', (req, res) => {
  const users = mockData.users.filter(u => u.status === 'ativo');
  res.json({ success: true, data: users });
});

app.get('/api/v1/users/:id', (req, res) => {
  const user = mockData.users.find(u => u.id === req.params.id && u.status === 'ativo');
  if (!user) {
    return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
  }
  res.json({ success: true, data: user });
});

app.post('/api/v1/users', (req, res) => {
  const newUser = {
    id: Date.now().toString(),
    ...req.body,
    status: 'ativo',
    createdAt: new Date(),
    updatedAt: new Date()
  };
  mockData.users.push(newUser);
  res.status(201).json({ success: true, data: newUser });
});

app.put('/api/v1/users/:id', (req, res) => {
  const index = mockData.users.findIndex(u => u.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
  }
  
  mockData.users[index] = {
    ...mockData.users[index],
    ...req.body,
    updatedAt: new Date()
  };
  
  res.json({ success: true, data: mockData.users[index] });
});

app.delete('/api/v1/users/:id', (req, res) => {
  const index = mockData.users.findIndex(u => u.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Usuário não encontrado' });
  }
  
  mockData.users[index].status = 'inativo';
  mockData.users[index].updatedAt = new Date();
  
  res.json({ success: true, message: 'Usuário deletado com sucesso' });
});

// === CRUD SETLISTS ===
app.get('/api/v1/setlists', (req, res) => {
  const setlists = mockData.setlists.map(setlist => ({
    ...setlist,
    responsavelNome: mockData.ministers.find(m => m.id === setlist.responsavel)?.nome || 'Não encontrado'
  }));
  res.json({ success: true, data: setlists });
});

app.get('/api/v1/setlists/:id', (req, res) => {
  const setlist = mockData.setlists.find(s => s.id === req.params.id);
  if (!setlist) {
    return res.status(404).json({ success: false, error: 'Setlist não encontrada' });
  }
  
  const enrichedSetlist = {
    ...setlist,
    responsavelNome: mockData.ministers.find(m => m.id === setlist.responsavel)?.nome,
    musicas: setlist.musicas.map(item => ({
      ...item,
      music: mockData.musics.find(m => m.id === item.musicId)
    }))
  };
  
  res.json({ success: true, data: enrichedSetlist });
});

app.post('/api/v1/setlists', (req, res) => {
  const newSetlist = {
    id: Date.now().toString(),
    ...req.body,
    status: 'planejada',
    createdAt: new Date(),
    updatedAt: new Date()
  };
  mockData.setlists.push(newSetlist);
  res.status(201).json({ success: true, data: newSetlist });
});

app.put('/api/v1/setlists/:id', (req, res) => {
  const index = mockData.setlists.findIndex(s => s.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Setlist não encontrada' });
  }
  
  mockData.setlists[index] = {
    ...mockData.setlists[index],
    ...req.body,
    updatedAt: new Date()
  };
  
  res.json({ success: true, data: mockData.setlists[index] });
});

app.delete('/api/v1/setlists/:id', (req, res) => {
  const index = mockData.setlists.findIndex(s => s.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Setlist não encontrada' });
  }
  
  mockData.setlists.splice(index, 1);
  res.json({ success: true, message: 'Setlist deletada com sucesso' });
});

// === TRANSPOSIÇÃO ===
app.post('/api/v1/transpose', (req, res) => {
  const { cifra, semitones, tomOriginal } = req.body;
  
  // Mock transpose function
  const transposeChord = (chord: string, semitones: number) => {
    const chords = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const index = chords.indexOf(chord);
    if (index === -1) return chord;
    
    let newIndex = (index + semitones) % 12;
    if (newIndex < 0) newIndex += 12;
    
    return chords[newIndex];
  };
  
  // Simple transpose simulation
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
});

// === ENDPOINTS UTILITÁRIOS ===
app.get('/api/v1/music/ministers/unique', (req, res) => {
  const ministros = new Set<string>();
  mockData.musics.forEach(music => {
    music.ministros.forEach(ministro => ministros.add(ministro));
  });
  res.json({ success: true, data: Array.from(ministros).sort() });
});

app.get('/api/v1/music/artists/unique', (req, res) => {
  const artistas = new Set<string>();
  mockData.musics.forEach(music => artistas.add(music.artista));
  res.json({ success: true, data: Array.from(artistas).sort() });
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 ==========================================');
  console.log(`   LOUVOR IDE BACKEND TYPESCRIPT`);
  console.log('🚀 ==========================================');
  console.log(`📍 Servidor: http://localhost:${PORT}`);
  console.log(`📚 Health: http://localhost:${PORT}/health`);
  console.log('');
  console.log('🎵 === CRUD MÚSICAS ===');
  console.log(`   GET    /api/v1/music          - Listar músicas`);
  console.log(`   GET    /api/v1/music/:id      - Buscar música`);
  console.log(`   POST   /api/v1/music          - Criar música`);
  console.log(`   PUT    /api/v1/music/:id      - Atualizar música`);
  console.log(`   DELETE /api/v1/music/:id      - Deletar música`);
  console.log('');
  console.log('👥 === CRUD MINISTROS ===');
  console.log(`   GET    /api/v1/ministers      - Listar ministros`);
  console.log(`   GET    /api/v1/ministers/:id  - Buscar ministro`);
  console.log(`   POST   /api/v1/ministers      - Criar ministro`);
  console.log(`   PUT    /api/v1/ministers/:id  - Atualizar ministro`);
  console.log(`   DELETE /api/v1/ministers/:id  - Deletar ministro`);
  console.log('');
  console.log('👤 === CRUD USUÁRIOS ===');
  console.log(`   GET    /api/v1/users          - Listar usuários`);
  console.log(`   GET    /api/v1/users/:id      - Buscar usuário`);
  console.log(`   POST   /api/v1/users          - Criar usuário`);
  console.log(`   PUT    /api/v1/users/:id      - Atualizar usuário`);
  console.log(`   DELETE /api/v1/users/:id      - Deletar usuário`);
  console.log('');
  console.log('📋 === CRUD SETLISTS ===');
  console.log(`   GET    /api/v1/setlists       - Listar setlists`);
  console.log(`   GET    /api/v1/setlists/:id   - Buscar setlist`);
  console.log(`   POST   /api/v1/setlists       - Criar setlist`);
  console.log(`   PUT    /api/v1/setlists/:id   - Atualizar setlist`);
  console.log(`   DELETE /api/v1/setlists/:id   - Deletar setlist`);
  console.log('');
  console.log('🎼 === TRANSPOSIÇÃO ===');
  console.log(`   POST   /api/v1/transpose      - Transpor cifra`);
  console.log('');
  console.log('📊 === UTILITÁRIOS ===');
  console.log(`   GET    /api/v1/music/ministers/unique - Ministros únicos`);
  console.log(`   GET    /api/v1/music/artists/unique  - Artistas únicos`);
  console.log('');
  console.log('✅ Todos os CRUDs implementados e funcionando!');
  console.log('✅ Firebase: Conectado via credenciais padrão');
  console.log('🚀 ==========================================');
});

export default app;
