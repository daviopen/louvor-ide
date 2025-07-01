#!/bin/bash

# Script para verificar acordes e funcionalidade de transposição
echo "🎵 Verificando funcionalidade de transposição e acordes..."
echo "========================================================"

echo ""
echo "📋 Verificando carregamento da biblioteca ChordTransposer:"
echo ""

echo "1. Verificando setlist-view.html:"
grep -n "chord-transposer" "src/pages/setlist-view.html" || echo "   ❌ Biblioteca não encontrada"

echo ""
echo "2. Verificando ver.html:"
grep -n "chord-transposer" "src/pages/ver.html" || echo "   ❌ Biblioteca não encontrada"

echo ""
echo "3. Verificando consultar.html:"
grep -n "chord-transposer" "src/pages/consultar.html" || echo "   ❌ Biblioteca não encontrada"

echo ""
echo "4. Verificando teste-transposicao.html:"
grep -n "chord-transposer" "src/pages/teste-transposicao.html" || echo "   ❌ Biblioteca não encontrada"

echo ""
echo "📋 Verificando função de transposição:"
echo ""

echo "1. Função transpose em ver.html:"
grep -n "function transpose" "src/pages/ver.html" || echo "   ❌ Função não encontrada"

echo ""
echo "2. Função transposeCifra em setlist-view.html:"
grep -n "function transposeCifra" "src/pages/setlist-view.html" || echo "   ❌ Função não encontrada"

echo ""
echo "📋 Verificando botões de transposição:"
echo ""

echo "1. Botões em ver.html:"
grep -n "btn-transpose" "src/pages/ver.html" || echo "   ❌ Botões não encontrados"

echo ""
echo "📋 Verificando chamadas ChordTransposer:"
echo ""

echo "1. Uso do ChordTransposer em ver.html:"
grep -n "ChordTransposer" "src/pages/ver.html" | head -3

echo ""
echo "2. Uso do ChordTransposer em setlist-view.html:"
grep -n "ChordTransposer" "src/pages/setlist-view.html" | head -3

echo ""
echo "🔍 Verificando arquivos por acordes inválidos..."

# Lista de acordes inválidos que queremos evitar
invalid_chords=("C##" "D##" "E#" "F##" "G##" "A##" "B#" "Cb" "Dbb" "Ebb" "Fb" "Gbb" "Abb" "Bbb")

# Arquivos a verificar
files=(
  "src/pages/setlist-view.html"
  "src/pages/ver.html" 
  "src/pages/teste-transposicao.html"
  "src/js/modules/transpose-service.js"
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
else
  echo "✅ Todos os arquivos estão livres de acordes inválidos!"
fi

echo ""
echo "🔧 Para testar a transposição:"
echo "   1. Abra o arquivo teste-transposicao.html no navegador"
echo "   2. Abra o console do navegador (F12)"
echo "   3. Clique nos botões de transposição"
echo "   4. Verifique se há erros no console"
echo ""
echo "✅ Verificação concluída!"
  echo "  • Fallback para acorde original quando inválido"
  echo "  • Mapeamentos enarmônicos robustos"
  echo "  • Regex melhorada para detecção de acordes"
  exit 0
fi
