#!/bin/bash

# Script para inicializar e executar todos os testes do Louvor IDE
# Ambiente moderno: pnpm + uv

set -e

echo "🧪 Inicializando ambiente de testes - Louvor IDE"
echo "===================================================="
echo "🔧 Usando pnpm (Node.js) + uv (Python)"
echo "===================================================="

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para imprimir com cor
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar se estamos no diretório correto
if [ ! -f "Makefile" ] || [ ! -d "tests" ]; then
    print_error "Execute este script no diretório raiz do projeto"
    exit 1
fi

# Verificar dependências do sistema
print_status "Verificando dependências do sistema..."
if ! command -v pnpm &> /dev/null; then
    print_error "pnpm não encontrado. Instale: npm install -g pnpm"
    exit 1
fi

if ! command -v uv &> /dev/null; then
    print_error "uv não encontrado. Instale: curl -LsSf https://astral.sh/uv/install.sh | sh"
    exit 1
fi

print_success "✅ pnpm e uv encontrados"

# 1. Instalar dependências de teste
print_status "Instalando dependências de teste..."
cd tests

# Instalar dependências Node.js para testes
if [ ! -d "node_modules" ]; then
    print_status "Instalando dependências Node.js com pnpm..."
    pnpm install
else
    print_success "Dependências Node.js já instaladas"
fi

# Instalar dependências Python para testes do backend
print_status "Instalando dependências Python com uv..."
cd ../backend
if [ -f "pyproject.toml" ]; then
    uv sync --group dev --quiet
    print_success "Dependências Python instaladas"
else
    print_warning "pyproject.toml não encontrado"
fi

cd ../tests

# Instalar Playwright browsers
print_status "Instalando browsers do Playwright..."
pnpm exec playwright install --with-deps > /dev/null 2>&1 || {
    print_warning "Falha ao instalar browsers do Playwright"
}

cd ..

# 2. Verificar se os serviços estão rodando
print_status "Verificando serviços..."

# Verificar frontend
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    print_success "Frontend rodando em http://localhost:3000"
    FRONTEND_RUNNING=true
else
    print_warning "Frontend não está rodando. Alguns testes E2E podem falhar."
    FRONTEND_RUNNING=false
fi

# Verificar backend
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    print_success "Backend rodando em http://localhost:8000"
    BACKEND_RUNNING=true
else
    print_warning "Backend não está rodando. Alguns testes de integração podem falhar."
    BACKEND_RUNNING=false
fi

# 3. Executar testes
echo ""
print_status "Executando suíte de testes..."
echo "=================================="

# Testes unitários do frontend
echo ""
print_status "1. Testes unitários do frontend (Vitest + pnpm)..."
cd tests
if pnpm run test > frontend_tests.log 2>&1; then
    print_success "✅ Testes do frontend passaram"
else
    print_error "❌ Alguns testes do frontend falharam"
    echo "Veja o log em tests/frontend_tests.log"
fi

# Testes do backend
echo ""
print_status "2. Testes do backend (Pytest + uv)..."
cd ../backend
if uv run python -m pytest ../tests/backend/ -v > ../tests/backend_tests.log 2>&1; then
    print_success "✅ Testes do backend passaram"
else
    print_error "❌ Alguns testes do backend falharam"
    echo "Veja o log em tests/backend_tests.log"
fi

cd ../tests

# Testes E2E (apenas se frontend estiver rodando)
echo ""
if [ "$FRONTEND_RUNNING" = true ]; then
    print_status "3. Testes E2E (Playwright + pnpm)..."
    if pnpm run test:e2e > e2e_tests.log 2>&1; then
        print_success "✅ Testes E2E passaram"
    else
        print_error "❌ Alguns testes E2E falharam"
        echo "Veja o log em tests/e2e_tests.log"
    fi
else
    print_warning "⏭️  Pulando testes E2E (frontend não está rodando)"
fi

cd ..

# 4. Relatório final
echo ""
echo "📊 RELATÓRIO FINAL"
echo "==================="

# Contar arquivos de teste
FRONTEND_TESTS=$(find tests/frontend -name "*.test.*" -o -name "*.spec.*" | wc -l)
BACKEND_TESTS=$(find tests/backend -name "test_*.py" | wc -l)
E2E_TESTS=$(find tests/e2e -name "*.spec.*" | wc -l)

echo "📁 Estrutura de testes:"
echo "   Frontend: $FRONTEND_TESTS arquivos de teste"
echo "   Backend:  $BACKEND_TESTS arquivos de teste"
echo "   E2E:      $E2E_TESTS arquivos de teste"

echo ""
echo "🎯 Cobertura de testes:"
echo "   ✅ Componentes React (MusicCard, HomePage, Layout)"
echo "   ✅ Serviços (transpose, database, api)"
echo "   ✅ APIs REST (health, transpose)"
echo "   ✅ Modelos Pydantic (validação)"
echo "   ✅ Serviços Python (transposição)"
echo "   ✅ Testes E2E (fluxo completo)"

echo ""
echo "🚀 Como executar testes:"
echo "   make test           - Todos os testes (pnpm + uv)"
echo "   make test-frontend  - Apenas frontend (pnpm + vitest)"
echo "   make test-backend   - Apenas backend (uv + pytest)"
echo "   make test-e2e       - Apenas E2E (pnpm + playwright)"
echo "   make test-coverage  - Com cobertura"
echo "   make test-watch     - Modo watch"

echo ""
print_success "🎉 Inicialização de testes concluída!"
print_success "🔧 Ambiente moderno: pnpm + uv configurado!"

if [ "$FRONTEND_RUNNING" = false ] || [ "$BACKEND_RUNNING" = false ]; then
    echo ""
    print_warning "💡 Para executar todos os testes, inicie os serviços:"
    echo "   make dev  # Em outro terminal (pnpm + uv)"
fi
