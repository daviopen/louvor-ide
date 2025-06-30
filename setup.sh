#!/bin/bash

# 🚀 Setup Script para Louvor IDE
# Este script configura o ambiente completo do projeto

set -e  # Sair se qualquer comando falhar

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🎵 Louvor IDE - Setup Automático${NC}"
echo ""

# Verificar se está no diretório correto
if [ ! -f "index.html" ] || [ ! -f "firebase.json" ]; then
    echo -e "${RED}❌ Execute este script no diretório raiz do projeto Louvor IDE${NC}"
    exit 1
fi

echo -e "${BLUE}📋 Verificando dependências...${NC}"

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js não encontrado. Instale Node.js 20+ primeiro.${NC}"
    exit 1
fi

NODE_VERSION=$(node --version)
echo -e "${GREEN}✅ Node.js $NODE_VERSION${NC}"

# Verificar npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm não encontrado${NC}"
    exit 1
fi

NPM_VERSION=$(npm --version)
echo -e "${GREEN}✅ npm $NPM_VERSION${NC}"

# Instalar Firebase CLI se necessário
echo -e "${BLUE}🔥 Configurando Firebase CLI...${NC}"
if ! command -v firebase &> /dev/null; then
    echo -e "${YELLOW}📥 Instalando Firebase CLI...${NC}"
    npm install -g firebase-tools
else
    FIREBASE_VERSION=$(firebase --version)
    echo -e "${GREEN}✅ Firebase CLI já instalado ($FIREBASE_VERSION)${NC}"
fi

# Verificar login no Firebase
echo -e "${BLUE}🔐 Verificando autenticação Firebase...${NC}"
if ! firebase projects:list &> /dev/null; then
    echo -e "${YELLOW}⚠️  Não logado no Firebase${NC}"
    echo -e "${BLUE}🔑 Fazendo login no Firebase...${NC}"
    firebase login
else
    echo -e "${GREEN}✅ Firebase autenticado${NC}"
fi

# Verificar projeto Firebase
echo -e "${BLUE}📊 Verificando projeto Firebase...${NC}"
if firebase projects:list | grep -q "louvor-ide"; then
    echo -e "${GREEN}✅ Projeto 'louvor-ide' encontrado${NC}"
else
    echo -e "${RED}❌ Projeto 'louvor-ide' não encontrado${NC}"
    echo -e "${YELLOW}💡 Você precisará:${NC}"
    echo "   1. Criar o projeto no Firebase Console"
    echo "   2. Atualizar .firebaserc com o ID correto"
    echo "   3. Executar: firebase use --add"
fi

# Tornar scripts executáveis
echo -e "${BLUE}🔧 Configurando permissões...${NC}"
chmod +x deploy.sh
chmod +x check-status.sh
chmod +x setup.sh

echo -e "${GREEN}✅ Permissões configuradas${NC}"

# Teste de conectividade
echo -e "${BLUE}🌐 Testando Firebase Hosting...${NC}"
if firebase hosting:sites:list &> /dev/null; then
    echo -e "${GREEN}✅ Firebase Hosting acessível${NC}"
else
    echo -e "${YELLOW}⚠️  Problemas com Firebase Hosting${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Setup concluído com sucesso!${NC}"
echo ""
echo -e "${BLUE}📋 Próximos passos:${NC}"
echo ""
echo -e "  ${GREEN}make dev${NC}     - Servidor local (http://localhost:5000)"
echo -e "  ${GREEN}make deploy${NC}  - Deploy para produção"
echo -e "  ${GREEN}make status${NC}  - Verificar status do site"
echo -e "  ${GREEN}make help${NC}    - Ver todos os comandos"
echo ""
echo -e "${BLUE}🔗 URLs importantes:${NC}"
echo "  Local:      http://localhost:5000"
echo "  Produção:   https://louvor-ide.web.app"
echo "  Firebase:   https://console.firebase.google.com/project/louvor-ide"
echo ""

# Oferecer iniciar servidor local
read -p "🚀 Deseja iniciar o servidor local agora? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}🔥 Iniciando servidor local...${NC}"
    make dev
fi
