# Como Usar o Sistema de Autenticação

## Quick Start

### 1. Iniciar o Backend
```bash
cd backend-ts
npm run dev
```

### 2. Iniciar o Frontend
```bash
cd frontend
npm run dev
```

### 3. Criar Primeiro Usuário Admin

1. Acesse http://localhost:5173/register
2. Crie uma conta
3. No backend, execute no terminal:

```javascript
// Conectar ao Firebase Admin e definir como admin
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Definir usuário como admin
const uid = 'SEU_UID_AQUI'; // Pegar do Firebase Console
admin.auth().setCustomUserClaims(uid, { role: 'admin' });

// Ou usar a API (quando estiver funcionando)
// POST /api/v1/auth/users/role
// { "userId": "uid", "role": "admin" }
```

## Fluxos de Uso

### Login de Usuário
1. Usuário acessa `/login`
2. Insere email e senha
3. Sistema verifica no Firebase
4. Se válido, redireciona para página inicial
5. Menu de usuário mostra informações do usuário logado

### Proteção de Rotas
- **Visualizar músicas/ministros**: Acesso público
- **Adicionar/editar músicas**: Requer login
- **Gerenciar ministros**: Requer role admin ou minister
- **Deletar**: Apenas admins

### Sistema de Roles

**Admin (Administrador)**
- Acesso total ao sistema
- Pode gerenciar usuários e roles
- Pode deletar qualquer conteúdo

**Minister (Ministro)**
- Pode criar e editar músicas
- Pode gerenciar outros ministros
- Não pode deletar

**User (Usuário)**
- Pode visualizar conteúdo
- Acesso básico apenas

## Testando o Sistema

### 1. Teste de Registro
```bash
curl -X POST http://localhost:8001/api/v1/auth/custom-token \
-H "Content-Type: application/json" \
-d '{"uid": "test-user-123"}'
```

### 2. Teste de Autenticação
```bash
curl -X GET http://localhost:8001/api/v1/auth/me \
-H "Authorization: Bearer SEU_TOKEN_AQUI"
```

### 3. Teste de Proteção de Rotas
```bash
# Sem token (deve falhar)
curl -X POST http://localhost:8001/api/v1/music \
-H "Content-Type: application/json" \
-d '{"titulo": "Teste", "artista": "Teste"}'

# Com token (deve funcionar)
curl -X POST http://localhost:8001/api/v1/music \
-H "Authorization: Bearer SEU_TOKEN_AQUI" \
-H "Content-Type: application/json" \
-d '{"titulo": "Teste", "artista": "Teste"}'
```

## Debug

### Frontend
- Abrir DevTools → Console
- Verificar se token está sendo enviado
- Verificar erros de CORS
- Estado do contexto de autenticação está em `window.__REACT_DEVTOOLS_GLOBAL_HOOK__`

### Backend
- Verificar logs do servidor
- Testar endpoints diretamente
- Verificar se Firebase está configurado corretamente

## Próximos Passos para Desenvolvimento

1. **Implementar página de perfil do usuário**
2. **Criar painel administrativo**
3. **Adicionar logs de auditoria**
4. **Implementar recuperação de senha**
5. **Adicionar autenticação via Google/Facebook**
