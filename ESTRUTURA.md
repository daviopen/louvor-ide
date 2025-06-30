# 📁 Estrutura do Projeto Louvor IDE

## 🏗️ Estrutura Organizada

```
louvor-ide/
├── 📄 index.html              # Página principal (raiz para Firebase)
├── 📄 README.md               # Documentação principal
├── 📄 package.json            # Configuração Node.js
├── 📄 package-lock.json       # Lock de dependências
├── 📄 Makefile                # Comandos padronizados
├── 📄 .gitignore              # Arquivos ignorados pelo Git
├── 📄 .env                    # Variáveis de ambiente (local)
├── 📄 .env.example            # Template de variáveis
├── 📄 firebase.json           # Configuração Firebase Hosting
├── 📄 .firebaserc             # Projeto Firebase
├── 📁 src/                    # Código fonte
│   ├── 📁 pages/              # Páginas HTML
│   │   ├── 📄 index.html      # Página principal (fonte)
│   │   ├── 📄 consultar.html  # Página de consulta
│   │   ├── 📄 nova-musica.html # Adicionar música
│   │   └── 📄 ver.html        # Visualizar música
│   ├── 📁 config/             # Configurações
│   │   └── 📄 firebase-config.js # Config Firebase
│   ├── 📁 scripts/            # Scripts do sistema
│   │   ├── 📄 listar.js       # Listagem de músicas
│   │   ├── 📄 salvar.js       # Salvamento
│   │   └── 📄 *.js            # Outros scripts
│   └── 📁 js/                 # Módulos JavaScript
│       ├── 📁 modules/        # Módulos principais
│       └── 📁 pages/          # Scripts por página
├── 📁 docs/                   # Documentação
│   ├── 📄 README.md           # Documentação principal
│   ├── 📄 DESENVOLVIMENTO.md  # Guia de desenvolvimento
│   ├── 📄 GITHUB-ACTIONS.md   # Configuração CI/CD
│   ├── 📄 QUICK-START.md      # Início rápido
│   ├── 📄 CONECTAR-GITHUB.md  # Conectar ao GitHub
│   ├── 📄 DEPLOY.md           # Guia de deploy
│   └── 📄 VERIFICAR-DEPLOY.md # Verificação de deploy
├── 📁 infra/                  # Infraestrutura e DevOps
│   └── 📁 scripts/            # Scripts de infraestrutura
│       ├── 📜 setup.sh        # Setup inicial
│       ├── 📜 deploy.sh       # Deploy automático
│       ├── 📜 check-status.sh # Verificação de status
│       └── 📜 load-env.sh     # Carregar variáveis
└── 📁 .github/                # GitHub Actions
    └── 📁 workflows/          # Workflows CI/CD
        └── 📄 deploy.yml      # Pipeline de deploy
```

## 🎯 Benefícios da Nova Estrutura

### ✅ **Organização Clara**
- **src/**: Todo código fonte organizado
- **docs/**: Documentação separada e organizada
- **infra/**: Scripts de infraestrutura isolados
- **Raiz limpa**: Apenas arquivos essenciais

### 🔧 **Facilidade de Manutenção**
- Separação entre código e configuração
- Scripts de infra isolados
- Documentação centralizada
- Estrutura escalável

### 🚀 **Desenvolvimento Eficiente**
- Fácil localização de arquivos
- Separação de responsabilidades
- Estrutura profissional
- Compatível com Firebase Hosting

## 📋 Guia de Navegação

| Preciso de... | Vá para... |
|---------------|------------|
| **Desenvolver** | `src/` |
| **Documentar** | `docs/` |
| **Deploy** | `infra/scripts/` |
| **Configurar** | `src/config/` |
| **Ler sobre** | `docs/README.md` |

## 🔄 Comandos Continuam Iguais

```bash
make dev    # Desenvolvimento
make deploy # Deploy
make help   # Ver comandos
```

---

**🎵 Estrutura limpa e profissional! 🏗️**
