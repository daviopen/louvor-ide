#!/bin/bash

# Script para verificar o status do Louvor IDE no Firebase Hosting

echo "🔍 Verificando status do Louvor IDE..."

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# URLs do projeto
MAIN_URL="https://louvor-ide.web.app"
ALT_URL="https://louvor-ide.firebaseapp.com"

echo -e "${BLUE}📡 Testando conectividade...${NC}"

# Função para testar URL
test_url() {
    local url=$1
    local name=$2
    
    echo -n "   $name: "
    
    # Teste HTTP
    http_code=$(curl -s -o /dev/null -w "%{http_code}" "$url" --max-time 10)
    
    if [ "$http_code" = "200" ]; then
        echo -e "${GREEN}✅ Online (HTTP $http_code)${NC}"
        return 0
    elif [ "$http_code" = "000" ]; then
        echo -e "${RED}❌ Sem resposta (timeout/DNS)${NC}"
        return 1
    else
        echo -e "${YELLOW}⚠️  HTTP $http_code${NC}"
        return 1
    fi
}

# Testar URLs
test_url "$MAIN_URL" "URL Principal"
test_url "$ALT_URL" "URL Alternativa"

echo ""
echo -e "${BLUE}🔥 Status do Firebase Hosting:${NC}"

# Verificar se está logado no Firebase
if firebase projects:list &> /dev/null; then
    echo "   Firebase CLI: ✅ Logado"
    
    # Listar releases recentes
    echo ""
    echo -e "${BLUE}📊 Últimos deploys:${NC}"
    firebase hosting:releases:list --limit 5 2>/dev/null || echo "   Não foi possível obter histórico de releases"
    
    echo ""
    echo -e "${BLUE}🌐 Sites configurados:${NC}"
    firebase hosting:sites:list 2>/dev/null || echo "   Não foi possível obter lista de sites"
    
else
    echo "   Firebase CLI: ❌ Não logado (execute: firebase login)"
fi

echo ""
echo -e "${BLUE}💡 Como verificar manualmente:${NC}"
echo "   1. Abra no navegador: $MAIN_URL"
echo "   2. Console Firebase: https://console.firebase.google.com/project/louvor-ide/hosting"
echo "   3. Firebase CLI: firebase hosting:channel:list"
echo "   4. Teste local: firebase serve --port 5000"

echo ""
echo -e "${BLUE}🔧 Solução de problemas:${NC}"
echo "   • Se não carregar: aguarde 5-10 minutos (propagação DNS)"
echo "   • Se erro 404: verifique firebase.json"
echo "   • Para redeploy: ./deploy.sh"
echo "   • Para logs: firebase functions:log (se houver functions)"
