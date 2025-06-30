# 🚀 Guia Completo de Desenvolvimento - Louvor IDE

Este guia contém todas as informações necessárias para desenvolver, testar e fazer deploy do Louvor IDE.

## 🏁 Início Rápido

### 1. Setup Inicial (Primeira vez)

```bash
# Clone do repositório (se aplicável)
git clone <seu-repositorio>
cd louvor-ide

# Setup automático completo
./setup.sh
```

**O que o setup faz:**
- ✅ Verifica Node.js e npm
- ✅ Instala Firebase CLI
- ✅ Configura autenticação Firebase
- ✅ Verifica configurações do projeto
- ✅ Define permissões dos scripts

### 2. Desenvolvimento Local

```bash
# Servidor de desenvolvimento
make dev

# Ou usando npm
npm start
```

**Servidor local:** http://localhost:5000

### 3. Deploy para Produção

```bash
# Deploy manual
make deploy

# Verificar status
make status
```

## 📋 Comandos Disponíveis

### 🔧 Desenvolvimento

| Comando | Descrição | Equivalente npm |
|---------|-----------|-----------------|
| `make setup` | Configuração inicial completa | `npm run setup` |
| `make dev` | Servidor de desenvolvimento | `npm start` |
| `make serve` | Alias para `make dev` | `npm run serve` |
| `make build` | Preparar para produção | `npm run build` |
| `make test` | Executar testes | `npm test` |
| `make clean` | Limpar arquivos temporários | `npm run clean` |

### 🚀 Deploy e Produção

| Comando | Descrição |
|---------|-----------|
| `make deploy` | Deploy manual para Firebase |
| `make status` | Verificar status do site online |
| `./deploy.sh` | Script de deploy com verificação |
| `./check-status.sh` | Verificação detalhada do site |

### 📊 Informações e Diagnóstico

| Comando | Descrição |
|---------|-----------|
| `make info` | Informações do projeto |
| `make diagnose` | Diagnóstico completo |
| `make check-deps` | Verificar dependências |
| `make help` | Lista todos os comandos |

## 🤖 CI/CD Automático

### GitHub Actions (Configurado)

O projeto possui pipeline automático de CI/CD:

#### Triggers:
- **Push para main/master**: Deploy automático
- **Pull Request**: Testes automáticos (sem deploy)

#### Pipeline:
1. **Build e Teste**: Verifica código e executa testes
2. **Deploy**: Só em push para main/master
3. **Verificação**: Testa se o site está online
4. **Notificação**: Status do deploy

#### Arquivos:
- `.github/workflows/deploy.yml` - Pipeline principal
- `GITHUB-ACTIONS.md` - Guia de configuração completa

### Configuração de Secrets

Para o CI/CD funcionar, configure no GitHub:

1. **FIREBASE_SERVICE_ACCOUNT_LOUVOR_IDE**
   - Firebase Console → Settings → Service Accounts
   - Generate new private key
   - Cole o JSON completo no secret

2. **GITHUB_TOKEN** (automático)
   - Fornecido automaticamente pelo GitHub

## 🌐 URLs do Projeto

| Ambiente | URL |
|----------|-----|
| **Local** | http://localhost:5000 |
| **Produção** | https://louvor-ide.web.app |
| **Alternativa** | https://louvor-ide.firebaseapp.com |
| **Firebase Console** | https://console.firebase.google.com/project/louvor-ide |

## 📁 Estrutura do Projeto

```
louvor-ide/
├── 📄 index.html              # Página principal
├── 📄 consultar.html          # Consulta e transposição
├── 📄 nova-musica.html        # Adicionar música
├── 📄 ver.html               # Visualizar música
├── 📄 firebase-config.js     # Configuração do banco
├── 📁 js/                    # Módulos JavaScript
│   ├── 📁 modules/           # Serviços e utilitários
│   └── 📁 pages/             # Scripts das páginas
├── 📁 scripts/               # Scripts de salvamento
├── 📁 .github/workflows/     # CI/CD GitHub Actions
├── 🔧 Makefile               # Comandos padronizados
├── 🔧 package.json           # Configuração Node.js
├── 🔧 firebase.json          # Configuração Firebase
├── 🔧 .firebaserc            # Projeto Firebase
├── 📜 setup.sh               # Setup automático
├── 📜 deploy.sh              # Deploy automático
└── 📜 check-status.sh        # Verificação de status
```

## 🔄 Workflow de Desenvolvimento

### Desenvolvimento Local

1. **Setup inicial** (primeira vez):
   ```bash
   ./setup.sh
   ```

2. **Desenvolvimento diário**:
   ```bash
   make dev
   # Desenvolva no http://localhost:5000
   ```

3. **Testes**:
   ```bash
   make test
   ```

### Deploy

#### Automático (Recomendado)
```bash
git add .
git commit -m "feat: nova funcionalidade"
git push origin main
# Deploy automático via GitHub Actions
```

#### Manual
```bash
make deploy
```

### Verificação

```bash
# Status do site
make status

# Diagnóstico completo
make diagnose
```

## 🛠️ Troubleshooting

### Problemas Comuns

#### 1. Firebase CLI não encontrado
```bash
npm install -g firebase-tools
firebase login
```

#### 2. Projeto Firebase não encontrado
```bash
firebase projects:list
firebase use --add louvor-ide
```

#### 3. Permissões negadas
```bash
chmod +x setup.sh deploy.sh check-status.sh
```

#### 4. Site não carrega após deploy
```bash
make status
# Aguarde alguns minutos para propagação
```

### Comandos de Diagnóstico

```bash
# Verificar tudo
make diagnose

# Status detalhado
./check-status.sh

# Logs do Firebase
firebase hosting:sites:list
```

## 📚 Links Úteis

- [Firebase Console](https://console.firebase.google.com/project/louvor-ide)
- [Firebase Hosting Docs](https://firebase.google.com/docs/hosting)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Makefile Tutorial](https://makefiletutorial.com/)

## 🎯 Próximos Passos

Após configurar o ambiente:

1. **Configure os secrets** no GitHub (veja `GITHUB-ACTIONS.md`)
2. **Faça o primeiro push** para testar o CI/CD
3. **Personalize** o projeto conforme necessário
4. **Monitore** os deploys via GitHub Actions

---

**🎵 Louvor IDE - Sistema robusto e produção-ready! 🚀**
