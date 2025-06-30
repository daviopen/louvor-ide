#!/bin/bash

# Script para carregar variáveis de ambiente do .env
# Para desenvolvimento local

if [ -f .env ]; then
    echo "🔧 Carregando variáveis de ambiente do .env..."
    export $(cat .env | grep -v '^#' | xargs)
    echo "✅ Variáveis carregadas:"
    echo "   VITE_FIREBASE_PROJECT_ID: $VITE_FIREBASE_PROJECT_ID"
    echo "   VITE_FIREBASE_AUTH_DOMAIN: $VITE_FIREBASE_AUTH_DOMAIN"
else
    echo "⚠️ Arquivo .env não encontrado"
    echo "💡 Copie .env.example para .env e configure suas credenciais"
fi
