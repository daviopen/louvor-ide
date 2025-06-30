#!/bin/bash

# Script de deploy para Firebase Hosting
# Louvor IDE

echo "🚀 Iniciando deploy do Louvor IDE para Firebase Hosting..."

# Verificar se o Firebase CLI está instalado
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI não encontrado. Instalando..."
    npm install -g firebase-tools
fi

# Verificar se está logado no Firebase
if ! firebase projects:list &> /dev/null; then
    echo "❌ Não logado no Firebase. Execute: firebase login"
    exit 1
fi

# Verificar se está no diretório correto
if [ ! -f "firebase.json" ]; then
    echo "❌ Arquivo firebase.json não encontrado. Execute no diretório raiz do projeto."
    exit 1
fi

echo "📦 Preparando arquivos para deploy..."

# Criar diretório temporário se necessário
# (não necessário neste caso, usando diretório atual)

echo "🔥 Fazendo deploy para Firebase Hosting..."

# Fazer o deploy
if firebase deploy --only hosting; then
    echo "✅ Deploy realizado com sucesso!"
    echo ""
    echo "🌐 Seu site está disponível em:"
    echo "   https://louvor-ide.web.app"
    echo "   https://louvor-ide.firebaseapp.com"
    echo ""
    echo "� Verificando se o site está online..."
    
    # Aguardar alguns segundos para propagação
    sleep 5
    
    # Testar conectividade
    if curl -s -o /dev/null -w "%{http_code}" https://louvor-ide.web.app | grep -q "200"; then
        echo "✅ Site está online e respondendo!"
    else
        echo "⚠️  Site pode estar propagando... Tente novamente em alguns minutos."
    fi
    
    echo ""
    echo "📊 Comandos úteis:"
    echo "   firebase hosting:channel:list  - Ver canais de hosting"
    echo "   firebase hosting:sites:list    - Ver sites hospedados"
    echo "   firebase hosting:clone         - Clonar para nova versão"
    
else
    echo "❌ Erro durante o deploy"
    exit 1
fi
