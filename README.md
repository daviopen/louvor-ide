# 🎵 Louvor IDE - Sistema de Cifras Moderno

Sistema completo para gerenciamento de cifras musicais com arquitetura moderna, suporte offline e transposição inteligente de acordes.

## 🏗️ Arquitetura Moderna

### Frontend - React + TypeScript + Vite
- **Framework**: React 18 com TypeScript
- **Build Tool**: Vite para desenvolvimento rápido
- **Styling**: Tailwind CSS para design moderno e responsivo
- **Routing**: React Router para navegação SPA
- **State Management**: React Hooks + Context API
- **Icons**: Lucide React
- **HTTP Client**: Axios

### Backend - Python + FastAPI
- **Framework**: FastAPI para APIs modernas e rápidas
- **Validação**: Pydantic para validação de dados
- **Documentação**: OpenAPI/Swagger automática
- **CORS**: Configurado para frontend
- **Transposição**: Algoritmos otimizados para acordes musicais

### Database - Firebase + LocalStorage
- **Primário**: Firebase Firestore para sincronização em nuvem
- **Offline**: LocalStorage para funcionamento offline
- **Híbrido**: Sincronização automática quando online

### Deploy
- **Frontend**: Firebase Hosting
- **Backend**: Docker + Cloud services (Render, Railway, etc.)
- **CI/CD**: GitHub Actions para deploy automatizado

## 🚀 Quick Start

### Pré-requisitos
```bash
# Verificar versões
node --version    # >= 18.0.0
pnpm --version    # >= 8.0.0
python3 --version # >= 3.11.0
uv --version      # >= 0.1.0

# Instalar gerenciadores modernos
npm install -g pnpm
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### Instalação Rápida
```bash
# 1. Clone o repositório
git clone https://github.com/seu-usuario/louvor-ide.git
cd louvor-ide

# 2. Setup inicial completo
make setup

# 3. Iniciar ambiente de desenvolvimento
make dev
```

### URLs de Desenvolvimento

- **Frontend**: <http://localhost:3000> (pnpm dev)
- **Backend API**: <http://localhost:8000> (uv run)
- **API Docs**: <http://localhost:8000/docs> (Swagger)
- **API Redoc**: <http://localhost:8000/redoc> (ReDoc)

## 📦 Comandos Disponíveis

### Setup e Instalação
```bash
make setup              # Configuração inicial completa
make install            # Instalar dependências (frontend + backend)
make install-frontend   # Instalar apenas frontend
make install-backend    # Instalar apenas backend
```

### Desenvolvimento
```bash
make dev                # Ambiente completo (frontend + backend)
make dev-frontend       # Apenas servidor frontend
make dev-backend        # Apenas servidor backend
```

### Build e Deploy
```bash
make build              # Build para produção
make deploy             # Deploy frontend para Firebase
make deploy-backend     # Build Docker do backend
make deploy-all         # Deploy completo
```

### Testes e Manutenção
```bash
make test               # Executar todos os testes
make test-frontend      # Testes do frontend
make test-backend       # Testes do backend
make clean              # Limpar arquivos temporários
make status             # Verificar status do projeto
```

## 📁 Estrutura do Projeto

```
louvor-ide/
├── frontend/                 # React + TypeScript + Vite
│   ├── src/
│   │   ├── components/      # Componentes React reutilizáveis
│   │   │   ├── layout/     # Layout principal, sidebar, header
│   │   │   ├── music/      # Componentes de música
│   │   │   └── common/     # Componentes comuns
│   │   ├── pages/          # Páginas da aplicação
│   │   ├── services/       # APIs e serviços
│   │   │   ├── firebase.ts # Configuração Firebase
│   │   │   ├── api.ts      # Cliente da API backend
│   │   │   └── database.ts # Serviço híbrido de dados
│   │   ├── types/          # Tipos TypeScript
│   │   ├── config/         # Configurações
│   │   └── index.css       # Styles com Tailwind
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
├── backend/                  # Python + FastAPI
│   ├── app/
│   │   ├── api/            # Rotas da API
│   │   ├── core/           # Configurações centrais
│   │   ├── models/         # Modelos Pydantic
│   │   └── services/       # Lógica de negócio
│   ├── main.py             # Aplicação principal
│   ├── requirements.txt    # Dependências Python
│   └── Dockerfile          # Container Docker
│
├── docs/                     # Documentação
├── tests/                    # Testes integrados
├── Makefile                  # Automação de tarefas
├── firebase.json            # Configuração Firebase
├── package.json             # Configuração raiz
└── README.md               # Este arquivo
```

## ✨ Funcionalidades

### Frontend (React)
- 📱 **Interface Responsiva**: Design moderno que funciona em desktop e mobile
- 🎵 **Lista de Músicas**: Visualização em cards com filtros e ordenação
- 🔍 **Busca Inteligente**: Pesquisa por título, artista, ministro ou tom
- 🎼 **Visualizador de Cifras**: Modal para visualização completa com transposição
- ⬆️⬇️ **Transposição em Tempo Real**: Botões para transpor acordes com feedback visual
- 👥 **Gestão de Ministros**: Controle de tons específicos por ministro
- 🔄 **Sincronização Automática**: Firebase + LocalStorage para funcionamento offline

### Backend (Python)
- 🎯 **API REST Moderna**: Endpoints para transposição e validação
- 🎼 **Algoritmo de Transposição**: Transposição inteligente de acordes complexos
- ✅ **Validação de Cifras**: Verificação automática de acordes válidos
- 📚 **Documentação Automática**: Swagger/OpenAPI gerada automaticamente
- 🔒 **CORS Configurado**: Pronto para integração com frontend
- 🐳 **Docker Ready**: Containerização para deploy fácil

## 🔌 API Endpoints

### Transposição
```
POST /api/v1/transpose
{
  "cifra": "[C]Amazing [Am]Grace...",
  "semitones": 2,
  "tom_original": "C"
}
```

### Validação
```
POST /api/v1/validate?cifra=[C]Amazing [Am]Grace
```

### Utilitários
```
GET /api/v1/keys          # Tons válidos
GET /api/v1/health        # Health check
POST /api/v1/transpose-key # Transpor apenas tom
```

## 🎨 Design System

### Cores
- **Primary**: Tons de azul (#0ea5e9)
- **Secondary**: Tons de roxo (#d946ef)
- **Success**: Verde para ações positivas
- **Warning**: Amarelo para avisos
- **Error**: Vermelho para erros

### Componentes
- **Cards**: Para exibição de músicas
- **Modals**: Para visualização detalhada
- **Buttons**: Primários, secundários e de ação
- **Forms**: Inputs e selects estilizados
- **Navigation**: Sidebar responsiva

## 🚀 Deploy

### Frontend (Firebase Hosting)
```bash
make build
make deploy
```

### Backend (Docker)
```bash
make deploy-backend

# Executar container
docker run -p 8000:8000 louvor-ide-api
```

### Variáveis de Ambiente

#### Frontend (.env)
```
VITE_API_URL=https://your-backend-url.com/api/v1
VITE_FIREBASE_API_KEY=your-firebase-key
```

#### Backend (.env)
```
ENVIRONMENT=production
DEBUG=False
ALLOWED_ORIGINS=https://louvor-ide.web.app,https://louvor-ide.firebaseapp.com
```

## 🧪 Testes

### Frontend (Vitest)
```bash
cd frontend
npm run test
```

### Backend (Pytest)
```bash
cd backend
python -m pytest
```

## 🔧 Desenvolvimento

### Adicionando Nova Página
1. Criar componente em `frontend/src/pages/`
2. Adicionar rota em `App.tsx`
3. Atualizar navegação em `Sidebar.tsx`

### Adicionando Nova API
1. Criar modelo em `backend/app/models/`
2. Adicionar rota em `backend/app/api/`
3. Implementar serviço em `backend/app/services/`

### Estilização
- Use classes Tailwind para styling consistente
- Componentes customizados definidos em `index.css`
- Ícones da biblioteca Lucide React

## 📱 Responsividade

- **Mobile First**: Design pensado primeiro para mobile
- **Breakpoints**: sm (640px), md (768px), lg (1024px), xl (1280px)
- **Sidebar**: Collapsa em mobile com overlay
- **Cards**: Grid responsivo que adapta às telas

## 🔄 Migração do v1.0

### Dados
- Estrutura Firebase mantida compatível
- LocalStorage migrado automaticamente
- Nenhuma perda de dados

### Funcionalidades
- ✅ Todas as funcionalidades do v1.0 mantidas
- ✅ Interface moderna e mais intuitiva
- ✅ Performance melhorada
- ✅ Melhor experiência mobile
- ✅ API backend para futuras integrações

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -am 'Add nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🎵 Sobre

Louvor IDE é um sistema completo para gerenciamento de cifras musicais, desenvolvido especificamente para ministérios de louvor e músicos que precisam de uma ferramenta rápida, confiável e moderna para organizar e transpor suas músicas.

### Principais Diferenciais
- **Transposição Inteligente**: Algoritmos otimizados para acordes complexos
- **Funcionamento Offline**: Não depende de internet para funcionar
- **Gestão de Ministros**: Controle individual de tons por músico
- **Interface Moderna**: Design limpo e intuitivo
- **Multiplataforma**: Funciona em qualquer dispositivo

---

**Desenvolvido com ❤️ para a comunidade de louvor**

---

## 🚀 Deploy Unificado (Frontend + Backend)

Agora o projeto está pronto para deploy com Firebase Functions!

### Como fazer o commit e deploy:

1. Adicione todos os arquivos:
   ```bash
   git add .
   ```
2. Faça o commit:
   ```bash
   git commit -m "feat: migração para Firebase Functions (deploy unificado)"
   ```
3. Faça o push para a branch desejada:
   ```bash
   git push origin refactory
   ```
4. O GitHub Actions fará o build e deploy automático!

### Como migrar rotas do backend:
- Copie as rotas e lógica de `backend-ts/src` para `functions/src/index.ts` ou crie arquivos separados e importe.
- Use o Express normalmente, mas lembre-se que tudo será executado como Function.

### Teste local:
```bash
pnpm install --filter functions...
cd functions
pnpm build
firebase emulators:start --only functions,hosting
```

Acesse:
- Frontend: http://localhost:5000
- Backend: http://localhost:5000/api/v1/hello

---
