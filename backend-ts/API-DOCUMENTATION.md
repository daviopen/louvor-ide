# 🚀 API Backend TypeScript - Louvor IDE

## 📊 Status dos CRUDs Implementados

### ✅ **TODOS OS CRUDs ESTÃO FUNCIONANDO!**

| Módulo | Status | Endpoints | Descrição |
|--------|--------|-----------|-----------|
| 🎵 **Músicas** | ✅ Completo | 7 endpoints | CRUD + utilitários |
| 👥 **Ministros** | ✅ Completo | 5 endpoints | CRUD completo |
| 👤 **Usuários** | ✅ Completo | 5 endpoints | CRUD completo |
| 📋 **Setlists** | ✅ Completo | 5 endpoints | CRUD completo |
| 🎼 **Transposição** | ✅ Completo | 1 endpoint | Algoritmo musical |

---

## 🌐 Servidor

**Base URL:** `http://localhost:3001`

**Health Check:** `GET /health`

---

## 🎵 CRUD Músicas

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/v1/music` | Listar músicas (com paginação e busca) |
| `GET` | `/api/v1/music/:id` | Buscar música por ID |
| `POST` | `/api/v1/music` | Criar nova música |
| `PUT` | `/api/v1/music/:id` | Atualizar música |
| `DELETE` | `/api/v1/music/:id` | Deletar música (soft delete) |
| `GET` | `/api/v1/music/ministers/unique` | Ministros únicos |
| `GET` | `/api/v1/music/artists/unique` | Artistas únicos |

### Exemplo de Música:
```json
{
  "id": "1",
  "titulo": "Quão Grande é o Meu Deus",
  "artista": "Chris Tomlin",
  "tom": "G",
  "ministros": ["João Silva", "Maria Santos"],
  "tomMinistro": { "João Silva": "G", "Maria Santos": "A" },
  "bpm": 120,
  "cifra": "[G]Quão grande [D]é o meu [Em]Deus",
  "status": "ativo",
  "tags": ["adoração", "clássico"],
  "createdAt": "2025-07-09T...",
  "updatedAt": "2025-07-09T..."
}
```

---

## 👥 CRUD Ministros

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/v1/ministers` | Listar ministros |
| `GET` | `/api/v1/ministers/:id` | Buscar ministro por ID |
| `POST` | `/api/v1/ministers` | Criar novo ministro |
| `PUT` | `/api/v1/ministers/:id` | Atualizar ministro |
| `DELETE` | `/api/v1/ministers/:id` | Deletar ministro |

### Exemplo de Ministro:
```json
{
  "id": "1",
  "nome": "João Silva",
  "email": "joao@igreja.com",
  "telefone": "(11) 99999-9999",
  "instrumento": ["Violão", "Voz"],
  "tomPreferido": "G",
  "status": "ativo",
  "observacoes": "Ministro experiente",
  "createdAt": "2025-07-09T...",
  "updatedAt": "2025-07-09T..."
}
```

---

## 👤 CRUD Usuários

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/v1/users` | Listar usuários |
| `GET` | `/api/v1/users/:id` | Buscar usuário por ID |
| `POST` | `/api/v1/users` | Criar novo usuário |
| `PUT` | `/api/v1/users/:id` | Atualizar usuário |
| `DELETE` | `/api/v1/users/:id` | Deletar usuário |

### Exemplo de Usuário:
```json
{
  "id": "1",
  "uid": "firebase-uid-1",
  "nome": "Pastor Carlos",
  "email": "pastor@igreja.com",
  "role": "admin",
  "status": "ativo",
  "preferences": {
    "theme": "light",
    "defaultKey": "G",
    "notifications": true,
    "language": "pt"
  },
  "createdAt": "2025-07-09T...",
  "updatedAt": "2025-07-09T..."
}
```

---

## 📋 CRUD Setlists

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/v1/setlists` | Listar setlists |
| `GET` | `/api/v1/setlists/:id` | Buscar setlist por ID |
| `POST` | `/api/v1/setlists` | Criar nova setlist |
| `PUT` | `/api/v1/setlists/:id` | Atualizar setlist |
| `DELETE` | `/api/v1/setlists/:id` | Deletar setlist |

### Exemplo de Setlist:
```json
{
  "id": "1",
  "titulo": "Culto Dominical - 09/07/2025",
  "data": "2025-07-09T...",
  "local": "Igreja Central",
  "responsavel": "1",
  "musicas": [
    { "musicId": "1", "ordem": 1, "tom": "G", "observacoes": "Entrada" },
    { "musicId": "2", "ordem": 2, "tom": "D", "observacoes": "Adoração" }
  ],
  "status": "planejada",
  "observacoes": "Culto especial",
  "tags": ["domingo", "principal"],
  "createdAt": "2025-07-09T...",
  "updatedAt": "2025-07-09T..."
}
```

---

## 🎼 Transposição

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/api/v1/transpose` | Transpor cifra por semitons |

### Exemplo de Transposição:
```json
// Request
{
  "cifra": "[G]Quão grande [D]é o meu [Em]Deus",
  "semitones": 2,
  "tomOriginal": "G"
}

// Response
{
  "success": true,
  "data": {
    "cifraOriginal": "[G]Quão grande [D]é o meu [Em]Deus",
    "cifraTransposta": "[A]Quão grande [E]é o meu [F#m]Deus",
    "tomOriginal": "G",
    "tomFinal": "A",
    "semitones": 2
  }
}
```

---

## 🎯 Recursos Implementados

### ✅ **Arquitetura Completa:**
- **Express.js** + TypeScript
- **CORS** configurado
- **JSON parsing** middleware
- **Mock data** para desenvolvimento
- **Error handling** básico

### ✅ **Funcionalidades:**
- **Paginação** nas listagens
- **Busca** por texto nas músicas
- **Soft delete** para músicas/ministros/usuários
- **Relacionamentos** entre setlists e músicas
- **Transposição** musical com algoritmo
- **Validação** de dados básica
- **Timestamps** automáticos

### ✅ **Dados Mock:**
- **2 músicas** de exemplo
- **2 ministros** de exemplo
- **1 usuário** administrador
- **1 setlist** de exemplo

---

## 🚀 Como Testar

### 1. **Health Check:**
```bash
curl http://localhost:3001/health
```

### 2. **Listar Músicas:**
```bash
curl http://localhost:3001/api/v1/music
```

### 3. **Criar Música:**
```bash
curl -X POST http://localhost:3001/api/v1/music \
  -H "Content-Type: application/json" \
  -d '{
    "titulo": "Nova Música",
    "artista": "Artista Novo",
    "tom": "C",
    "cifra": "[C]Exemplo de cifra",
    "ministros": ["João Silva"],
    "bpm": 100
  }'
```

### 4. **Transpor Cifra:**
```bash
curl -X POST http://localhost:3001/api/v1/transpose \
  -H "Content-Type: application/json" \
  -d '{
    "cifra": "[G]Exemplo [D]cifra",
    "semitones": 2,
    "tomOriginal": "G"
  }'
```

---

## 🎉 **CONCLUSÃO**

### ✅ **MISSÃO CUMPRIDA!**

**Todos os 4 CRUDs principais foram implementados:**
- ✅ **Músicas** - 7 endpoints
- ✅ **Ministros** - 5 endpoints  
- ✅ **Usuários** - 5 endpoints
- ✅ **Setlists** - 5 endpoints
- ✅ **Transposição** - 1 endpoint especializado

**Total: 23 endpoints funcionais!**

O backend TypeScript está completo e funcionando em `http://localhost:3001` com suporte a Firebase, pnpm workspaces, e arquitetura moderna! 🚀
