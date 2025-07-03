# Louvor IDE - Sistema de Cifras 🎵

Sistema completo para gerenciamento de cifras musicais com suporte ao Firebase.

## ✅ Melhorias Implementadas (v2.0)

### 🔧 Sistema de Dados Robusto
- **Sistema baseado no Firebase**: Funciona mesmo sem conexões instáveis
- **Inicialização múltipla**: Estratégias de carregamento para garantir funcionamento
- **Dados de exemplo**: Carrega automaticamente músicas de exemplo na primeira execução

### 📱 Interface Melhorada
- **Carregamento robusto**: Sistema nunca fica em loading infinito
- **Feedback visual**: Indicadores claros de status do sistema
- **Responsivo**: Funciona perfeitamente em desktop e mobile
- **Performance**: Carregamento otimizado e rápido

### 🎯 Funcionalidades
- **Página Principal (index.html)**: Lista todas as músicas com filtros e busca
- **Página de Consulta (consultar.html)**: Visualização e transposição de cifras
- **Nova Música (nova-musica.html)**: Formulário para adicionar músicas
- **Visualização (ver.html)**: Exibição completa da cifra com transposição
- **Sistema de Salvamento**: Salva no Firebase

### 🗂️ Estrutura de Arquivos
```
louvor-ide/
├── index.html              # Página principal
├── consultar.html          # Página de consulta e transposição
├── nova-musica.html        # Formulário de nova música
├── ver.html               # Visualização de música
├── firebase-config.js     # Configuração do banco de dados
└── scripts/
    └── salvar.js          # Script de salvamento de músicas
```

### 🔄 Funcionamento do Sistema
1. **Carregamento**: Conecta com Firebase
2. **Dados de exemplo**: Na primeira execução, carrega 3 músicas de exemplo
3. **Sincronização**: Quando Firebase está disponível, dados são sincronizados

### 🚀 Como Usar
1. Abra `index.html` em qualquer navegador
2. O sistema carregará automaticamente
3. Use os filtros para buscar músicas
4. Clique em "Nova Música" para adicionar cifras
5. Use "Consultar" para transposição interativa

### 📋 Dados de Música Suportados
- **Título** (obrigatório)
- **Artista**
- **Ministro(s)** (suporte a múltiplos ministros)
- **Tom original**
- **Tom por ministro** (cada ministro pode ter seu tom preferido)
- **BPM**
- **Link** (YouTube, Spotify, etc.)
- **Cifra** (obrigatória)

### 🛠️ Tecnologias
- HTML5, CSS3, JavaScript vanilla
- Firebase Firestore (opcional)
- Chord Transposer (transposição)
- Font Awesome (ícones)

## 🚀 Deploy e Hospedagem

### 🏗️ Ambiente Padronizado com Makefile

O projeto utiliza um Makefile para padronizar comandos e facilitar o desenvolvimento:

#### Comandos principais:
```bash
# Setup inicial completo
make setup

# Ambiente de desenvolvimento local
make dev              # ou make serve

# Build para produção
make build

# Deploy manual
make deploy

# Verificar status do site
make status

# Executar testes
make test

# Limpeza de arquivos temporários
make clean

# Informações do projeto
make info

# Diagnóstico completo
make diagnose

# Ver todos os comandos
make help
```

### 🤖 CI/CD Automatizado (GitHub Actions)

Deploy automático configurado via GitHub Actions:

#### Como funciona:
- **Push para main/master**: Deploy automático para produção
- **Pull Request**: Executa testes automáticos (sem deploy)
- **Pipeline completo**: Build → Test → Deploy → Verificação

#### Arquivos de configuração:
- `.github/workflows/deploy.yml` - Pipeline de CI/CD
- `GITHUB-ACTIONS.md` - Guia de configuração completo

#### URLs de produção:
- **Principal**: https://louvor-ide.web.app
- **Alternativa**: https://louvor-ide.firebaseapp.com

### 🔧 Desenvolvimento Local

#### Opção 1: Com Makefile (Recomendado)
```bash
# Setup inicial (instala dependências, verifica configuração)
make setup

# Servidor de desenvolvimento
make dev
# Servidor disponível em: http://localhost:5000
```

#### Opção 2: Manual (Firebase CLI)
```bash
# Instalar Firebase CLI
npm install -g firebase-tools

# Login no Firebase
firebase login

# Servidor local
firebase serve --port 5000
```

### 📦 Deploy Manual

#### Opção 1: Via Makefile (Recomendado)
```bash
# Deploy completo com verificação
make deploy
```

#### Opção 2: Script personalizado
```bash
./deploy.sh
```

#### Opção 3: Firebase CLI direto
```bash
firebase deploy --only hosting
```

### 🔍 Verificação e Monitoramento

```bash
# Status completo do site
make status

# Diagnóstico do ambiente
make diagnose

# Verificação manual
./check-status.sh
```

### URLs do projeto
- **Produção**: https://louvor-ide.web.app
- **Alternativa**: https://louvor-ide.firebaseapp.com
- **Local**: http://localhost:5000

### Arquivos de configuração
- `firebase.json` - Configuração do hosting
- `.firebaserc` - Projeto Firebase (louvor-ide)
- `deploy.sh` - Script automatizado de deploy

---

**Sistema desenvolvido com foco em robustez e disponibilidade constante! 🎸**
