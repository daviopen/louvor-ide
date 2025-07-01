#!/bin/bash

# Script para verificar se há acordes inválidos no código
echo "🔍 Verificando arquivos por acordes inválidos..."

# Lista de acordes inválidos que queremos evitar
invalid_chords=("C##" "D##" "E#" "F##" "G##" "A##" "B#" "Cb" "Dbb" "Ebb" "Fb" "Gbb" "Abb" "Bbb")

# Arquivos a verificar
files=(
  "src/pages/setlist-view.html"
  "src/pages/ver.html" 
  "src/pages/teste-transposicao.html"
  "src/js/modules/transpose-service.js"
  "teste-transposicao-simples.html"
  "teste-transposicao-setlist.html"
)

has_error=false

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "📄 Verificando: $file"
    
    for chord in "${invalid_chords[@]}"; do
      if grep -q "$chord" "$file"; then
        echo "  ❌ Encontrado acorde inválido '$chord' em $file"
        has_error=true
      fi
    done
    
    if ! $has_error; then
      echo "  ✅ Nenhum acorde inválido encontrado"
    fi
  else
    echo "  ⚠️ Arquivo não encontrado: $file"
  fi
done

echo ""
if $has_error; then
  echo "❌ Alguns arquivos ainda contêm acordes inválidos"
  exit 1
else
  echo "✅ Todos os arquivos estão livres de acordes inválidos!"
  echo ""
  echo "🎯 Resumo das correções aplicadas:"
  echo "  • Normalização de chaves de entrada"
  echo "  • Cálculo de steps usando caminho mais curto"
  echo "  • Verificação de acordes inválidos"
  echo "  • Fallback para acorde original quando inválido"
  echo "  • Mapeamentos enarmônicos robustos"
  echo "  • Regex melhorada para detecção de acordes"
  exit 0
fi
