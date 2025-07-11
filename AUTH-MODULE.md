# Módulo de Autenticação - Louvor IDE

Este documento descreve o módulo completo de autenticação implementado no Louvor IDE, incluindo backend e frontend.

## Visão Geral

O módulo de autenticação utiliza Firebase Authentication para gerenciar usuários e implementa um sistema de roles (permissões) no backend. O sistema suporta três tipos de usuários:

- **Admin**: Acesso total ao sistema, pode gerenciar usuários e permissões
- **Minister**: Pode criar e editar músicas e ministros 
- **User**: Acesso básico, pode visualizar conteúdo

## Estrutura do Backend

### Arquivos Criados

```
backend-ts/src/modules/auth/
├── auth.service.ts      # Lógica de negócio da autenticação
├── auth.controller.ts   # Controladores das rotas de autenticação
├── auth.middleware.ts   # Middlewares de autenticação e autorização
└── auth.routes.ts       # Definição das rotas de autenticação
```

### Serviços Implementados

#### AuthService (`auth.service.ts`)
- `verifyToken()`: Verifica e decodifica tokens JWT do Firebase
- `getUserByUid()`: Busca informações completas do usuário
- `createOrUpdateUser()`: Cria ou atualiza dados do usuário no Firestore
- `setUserRole()`: Define a role de um usuário
- `listUsers()`: Lista todos os usuários (apenas admins)
- `deleteUser()`: Remove um usuário do sistema
- `createCustomToken()`: Cria tokens personalizados (desenvolvimento)

#### Middlewares (`auth.middleware.ts`)
- `requireAuth`: Verifica se o usuário está autenticado
- `requireRole`: Verifica se o usuário tem uma role específica
- `optionalAuth`: Autenticação opcional (não falha se não houver token)

### API Endpoints

| Método | Endpoint | Descrição | Autenticação | Roles |
|--------|----------|-----------|--------------|-------|
| GET | `/auth/me` | Informações do usuário logado | Obrigatória | Todas |
| PUT | `/auth/profile` | Atualizar perfil | Obrigatória | Todas |
| GET | `/auth/users` | Listar usuários | Obrigatória | Admin |
| PUT | `/auth/users/role` | Definir role do usuário | Obrigatória | Admin |
| DELETE | `/auth/users/:userId` | Remover usuário | Obrigatória | Admin |
| POST | `/auth/custom-token` | Criar token personalizado | - | Dev only |

### Proteção de Rotas Existentes

As rotas existentes foram protegidas com os middlewares apropriados:

- **Músicas**: GET (opcional), POST/PUT/DELETE (obrigatória)
- **Ministros**: GET (opcional), POST/PUT (admin/minister), DELETE (admin)

## Estrutura do Frontend

### Arquivos Criados

```
frontend/src/
├── types/auth.ts                    # Tipos TypeScript para autenticação
├── services/auth.ts                 # Serviços de autenticação Firebase
├── contexts/AuthContext.tsx         # Context Provider para estado global
├── hooks/useApi.ts                  # Hook para requisições autenticadas
├── components/auth/
│   ├── ProtectedRoute.tsx          # Componente para rotas protegidas
│   └── UserMenu.tsx                # Menu dropdown do usuário
└── pages/
    ├── LoginPage.tsx               # Página de login
    ├── RegisterPage.tsx            # Página de registro
    └── ForgotPasswordPage.tsx      # Página de recuperação de senha
```

### Funcionalidades Implementadas

#### Autenticação
- Login com email e senha
- Registro de novos usuários
- Recuperação de senha por email
- Logout seguro
- Persistência de sessão

#### Autorização
- Sistema de roles (admin/minister/user)
- Proteção de rotas baseada em roles
- Verificação de permissões em tempo real

#### Interface do Usuário
- Páginas responsivas para login/registro
- Menu de usuário com informações e logout
- Feedback visual para estados de loading/erro
- Validação de formulários

## Integração com Componentes Existentes

### App.tsx
- Adicionado `AuthProvider` envolvendo toda a aplicação
- Rotas de autenticação públicas (`/login`, `/register`, `/forgot-password`)
- Proteção de rotas sensíveis com `ProtectedRoute`

### Layout/Header
- Substituído menu de usuário simples pelo componente `UserMenu`
- Exibe informações do usuário logado
- Opções de logout e gerenciamento de perfil

### Rotas Protegidas
- Adicionar/editar músicas: requer autenticação
- Gerenciar ministros: requer role admin/minister
- Visualização: opcional (funciona sem login)

## Configuração

### Variáveis de Ambiente

Adicione ao arquivo `.env`:

```bash
# Configuração da API Backend
VITE_API_URL=http://localhost:8001/api/v1
```

### Firebase
O sistema utiliza as configurações existentes do Firebase definidas em `src/config/constants.ts`.

## Uso

### Login
1. Acesse `/login`
2. Digite email e senha
3. Será redirecionado para a página anterior ou home

### Registro
1. Acesse `/register`
2. Preencha nome, email e senha
3. Conta será criada automaticamente
4. Redirecionamento automático após sucesso

### Gerenciamento de Usuários (Admin)
1. Faça login como admin
2. Acesse o menu do usuário
3. Vá para "Administração"
4. Gerencie roles e usuários

## Segurança

### Backend
- Verificação de tokens Firebase em todas as rotas protegidas
- Validação de roles no servidor
- Proteção contra ataques de autorização

### Frontend
- Tokens armazenados de forma segura pelo Firebase
- Validação de permissões antes de renderizar componentes
- Redirecionamento automático em caso de tokens expirados

## Middleware de Rotas

### Uso nos Controllers
```typescript
// Rota que requer autenticação
router.get('/protected', requireAuth, controller.method);

// Rota que requer role específica
router.post('/admin-only', requireAuth, requireRole('admin'), controller.method);

// Rota com autenticação opcional
router.get('/public', optionalAuth, controller.method);
```

### Uso no Frontend
```tsx
// Rota protegida simples
<ProtectedRoute>
  <ComponenteProtegido />
</ProtectedRoute>

// Rota com roles específicas
<ProtectedRoute allowedRoles={['admin', 'minister']}>
  <ComponenteParaMinistros />
</ProtectedRoute>

// Rota pública (sem proteção)
<ComponentePublico />
```

## Próximos Passos

1. **Página de Perfil**: Implementar página para usuário editar dados
2. **Administração**: Criar painel admin para gerenciar usuários
3. **Auditoria**: Implementar logs de ações dos usuários
4. **Refresh Tokens**: Melhorar sistema de renovação de tokens
5. **OAuth**: Adicionar login com Google/Facebook
6. **2FA**: Implementar autenticação de dois fatores

## Troubleshooting

### Problemas Comuns

1. **Token Expirado**: O sistema automaticamente faz logout quando detecta tokens expirados
2. **Permissões**: Verifique se o usuário tem a role correta para acessar recursos
3. **CORS**: Certifique-se que o backend está configurado para aceitar requests do frontend
4. **Firebase**: Verifique se as credenciais do Firebase estão corretas no `.env`

### Debug

Para debugar problemas de autenticação:
1. Verifique o console do navegador para erros
2. Verifique os logs do backend
3. Confirme se o token está sendo enviado nas requisições
4. Verifique se o usuário tem a role adequada no Firestore
