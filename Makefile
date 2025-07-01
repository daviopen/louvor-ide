# Makefile para Louvor IDE
# Sistema de Cifras Musicais

# Variáveis
PROJECT_NAME = louvor-ide
NODE_VERSION = 20
FIREBASE_PROJECT = louvor-ide
LOCAL_PORT = 5000

# Cores para output
RED = \033[0;31m
GREEN = \033[0;32m
YELLOW = \033[1;33m
BLUE = \033[0;34m
NC = \033[0m # No Color

.PHONY: help install setup dev serve build deploy clean test status check-deps

# Target padrão
all: help

## 📋 Ajuda
help:
	@echo ""
	@echo "$(BLUE)🎵 Louvor IDE - Sistema de Cifras$(NC)"
	@echo ""
	@echo "$(YELLOW)Comandos disponíveis:$(NC)"
	@echo ""
	@echo "  $(GREEN)make setup$(NC)       - Configuração inicial completa"
	@echo "  $(GREEN)make dev$(NC)         - Ambiente de desenvolvimento (com build)"
	@echo "  $(GREEN)make serve-fast$(NC)  - Servidor rápido (sem rebuild)"
	@echo "  $(GREEN)make build$(NC)       - Build para produção"
	@echo "  $(GREEN)make test$(NC)        - Executar testes"
	@echo "  $(GREEN)make deploy$(NC)      - Deploy para Firebase Hosting"
	@echo "  $(GREEN)make clean$(NC)       - Limpar arquivos temporários"
	@echo ""
	@echo "$(YELLOW)Desenvolvimento:$(NC)"
	@echo "  1. $(GREEN)make dev$(NC)        - Primeira execução (setup + build + servidor)"
	@echo "  2. $(GREEN)make serve-fast$(NC) - Execuções seguintes (apenas servidor)"
	@echo ""
	@echo "$(YELLOW)URLs:$(NC)"
	@echo "  Local:      http://localhost:$(LOCAL_PORT)"
	@echo "  Produção:   https://$(FIREBASE_PROJECT).web.app"
	@echo ""
	@echo "  $(GREEN)make serve$(NC)       - Servidor local (Firebase)"
	@echo "  $(GREEN)make build$(NC)       - Build para produção"
	@echo "  $(GREEN)make deploy$(NC)      - Deploy manual para Firebase"
	@echo "  $(GREEN)make test$(NC)        - Executar testes"
	@echo "  $(GREEN)make status$(NC)      - Verificar status do deploy"
	@echo "  $(GREEN)make clean$(NC)       - Limpar arquivos temporários"
	@echo ""
	@echo "$(YELLOW)Comandos de CI/CD:$(NC)"
	@echo ""
	@echo "  $(GREEN)make install$(NC)     - Instalar dependências"
	@echo "  $(GREEN)make check-deps$(NC)  - Verificar dependências"
	@echo ""

## 🔧 Verificar dependências
check-deps:
	@echo "$(BLUE)🔍 Verificando dependências...$(NC)"
	@command -v node >/dev/null 2>&1 || { echo "$(RED)❌ Node.js não encontrado$(NC)"; exit 1; }
	@command -v npm >/dev/null 2>&1 || { echo "$(RED)❌ npm não encontrado$(NC)"; exit 1; }
	@echo "$(GREEN)✅ Node.js $$(node --version)$(NC)"
	@echo "$(GREEN)✅ npm $$(npm --version)$(NC)"

## 📦 Instalar dependências
install: check-deps
	@echo "$(BLUE)📦 Instalando dependências...$(NC)"
	@if ! command -v firebase &> /dev/null; then \
		echo "$(YELLOW)📥 Instalando Firebase CLI...$(NC)"; \
		npm install -g firebase-tools; \
	else \
		echo "$(GREEN)✅ Firebase CLI já instalado$$(firebase --version)$(NC)"; \
	fi
	@echo "$(GREEN)✅ Dependências instaladas$(NC)"

## ⚙️ Configuração inicial completa
setup: install
	@echo "$(BLUE)⚙️ Configuração inicial do projeto...$(NC)"
	@if [ ! -f "firebase.json" ]; then \
		echo "$(RED)❌ firebase.json não encontrado$(NC)"; \
		exit 1; \
	fi
	@if [ ! -f ".firebaserc" ]; then \
		echo "$(RED)❌ .firebaserc não encontrado$(NC)"; \
		exit 1; \
	fi
	@echo "$(GREEN)✅ Configuração Firebase OK$(NC)"
	@if [ ! -f "index.html" ]; then \
		echo "$(RED)❌ index.html não encontrado$(NC)"; \
		exit 1; \
	fi
	@echo "$(GREEN)✅ Arquivos do projeto OK$(NC)"
	@echo "$(BLUE)🔧 Verificando login no Firebase...$(NC)"
	@if ! firebase projects:list &> /dev/null; then \
		echo "$(YELLOW)⚠️  Não logado no Firebase. Execute: firebase login$(NC)"; \
	else \
		echo "$(GREEN)✅ Firebase autenticado$(NC)"; \
	fi
	@echo "$(GREEN)🎉 Setup completo!$(NC)"

## ⚙️ Setup básico (sem verificar index.html)
setup-basic: install
	@echo "$(BLUE)⚙️ Configuração básica do projeto...$(NC)"
	@if [ ! -f "firebase.json" ]; then \
		echo "$(RED)❌ firebase.json não encontrado$(NC)"; \
		exit 1; \
	fi
	@if [ ! -f ".firebaserc" ]; then \
		echo "$(RED)❌ .firebaserc não encontrado$(NC)"; \
		exit 1; \
	fi
	@echo "$(GREEN)✅ Configuração Firebase OK$(NC)"
	@echo "$(BLUE)🔧 Verificando login no Firebase...$(NC)"
	@if ! firebase projects:list &> /dev/null; then \
		echo "$(YELLOW)⚠️  Não logado no Firebase. Execute: firebase login$(NC)"; \
	else \
		echo "$(GREEN)✅ Firebase autenticado$(NC)"; \
	fi
	@echo "$(GREEN)🎉 Setup básico completo!$(NC)"

## 🔥 Ambiente de desenvolvimento
dev: setup-basic build
	@echo "$(BLUE)🔥 Iniciando ambiente de desenvolvimento...$(NC)"
	@echo "$(YELLOW)📍 Servidor será iniciado em: http://localhost:$(LOCAL_PORT)$(NC)"
	@echo "$(YELLOW)💡 Pressione Ctrl+C para parar$(NC)"
	@echo ""
	@if ! firebase projects:list &> /dev/null; then \
		echo "$(YELLOW)⚠️  Firebase não autenticado. Executando sem autenticação...$(NC)"; \
		firebase serve --port $(LOCAL_PORT) --host 0.0.0.0; \
	else \
		firebase serve --port $(LOCAL_PORT) --host 0.0.0.0; \
	fi

## 🌐 Servidor local (alias para dev)
serve: dev

## 🚀 Servidor rápido (sem rebuild)
serve-fast:
	@echo "$(BLUE)🚀 Iniciando servidor rápido...$(NC)"
	@echo "$(YELLOW)📍 Servidor em: http://localhost:$(LOCAL_PORT)$(NC)"
	@echo "$(YELLOW)💡 Pressione Ctrl+C para parar$(NC)"
	@echo ""
	@if [ ! -f "index.html" ]; then \
		echo "$(YELLOW)⚠️  index.html não encontrado, executando build...$(NC)"; \
		$(MAKE) build; \
	fi
	firebase serve --port $(LOCAL_PORT) --host 0.0.0.0

## 🏗️ Build para produção
build:
	@echo "$(BLUE)🏗️ Preparando build para produção...$(NC)"
	@echo "$(YELLOW)🧹 Limpando arquivos antigos...$(NC)"
	@rm -f *.html 2>/dev/null || true
	@rm -rf js/ scripts/ config/ 2>/dev/null || true
	@echo "$(YELLOW)📁 Copiando arquivos do src para a raiz...$(NC)"
	@cp -r src/pages/* ./ 2>/dev/null || true
	@cp -r src/js ./ 2>/dev/null || true
	@cp -r src/scripts ./ 2>/dev/null || true
	@cp -r src/config ./ 2>/dev/null || true
	@echo "$(YELLOW)🔧 Processando variáveis de ambiente...$(NC)"
	@bash process-env.sh
	@echo "$(GREEN)✅ Arquivos copiados e variáveis processadas$(NC)"
	@echo "$(BLUE)📋 Arquivos para deploy:$(NC)"
	@ls -la *.html *.js *.css 2>/dev/null || echo "$(YELLOW)⚠️  Alguns arquivos podem não existir$(NC)"
	@if [ -d "js/" ]; then echo "$(GREEN)✅ Diretório js/$(NC)"; fi
	@if [ -d "scripts/" ]; then echo "$(GREEN)✅ Diretório scripts/$(NC)"; fi

## 🚀 Deploy manual
deploy: build
	@echo "$(BLUE)🚀 Iniciando deploy para Firebase Hosting...$(NC)"
	@if ! firebase projects:list &> /dev/null; then \
		echo "$(RED)❌ Não logado no Firebase. Execute: firebase login$(NC)"; \
		exit 1; \
	fi
	firebase deploy --only hosting
	@echo ""
	@echo "$(GREEN)🌐 Site disponível em:$(NC)"
	@echo "   https://$(FIREBASE_PROJECT).web.app"
	@echo "   https://$(FIREBASE_PROJECT).firebaseapp.com"
	@$(MAKE) status

## 🔍 Verificar status do deploy
status:
	@echo "$(BLUE)🔍 Verificando status do site...$(NC)"
	@./check-status.sh

## 🧪 Executar testes
test:
	@echo "$(BLUE)🧪 Executando testes...$(NC)"
	@echo "$(YELLOW)📋 Verificando estrutura de arquivos...$(NC)"
	@test -f index.html || { echo "$(RED)❌ index.html não encontrado$(NC)"; exit 1; }
	@test -f firebase.json || { echo "$(RED)❌ firebase.json não encontrado$(NC)"; exit 1; }
	@test -f .firebaserc || { echo "$(RED)❌ .firebaserc não encontrado$(NC)"; exit 1; }
	@echo "$(GREEN)✅ Estrutura de arquivos OK$(NC)"
	@echo "$(YELLOW)🌐 Testando conectividade local...$(NC)"
	@if command -v curl &> /dev/null; then \
		echo "$(GREEN)✅ curl disponível$(NC)"; \
	else \
		echo "$(YELLOW)⚠️  curl não disponível$(NC)"; \
	fi
	@echo "$(GREEN)✅ Testes básicos concluídos$(NC)"

## 🧹 Limpeza
clean:
	@echo "$(BLUE)🧹 Limpando arquivos temporários...$(NC)"
	@rm -rf .firebase/
	@rm -f firebase-debug.log
	@rm -f firebase-debug.*.log
	@echo "$(YELLOW)🗑️ Limpando arquivos copiados do build...$(NC)"
	@rm -f *.html 2>/dev/null || true
	@rm -rf js/ scripts/ config/ 2>/dev/null || true
	@rm -f env-config.js 2>/dev/null || true
	@echo "$(GREEN)✅ Limpeza concluída$(NC)"

## 🏗️ Build limpo (limpa antes de construir)
clean-build: clean build

## 📊 Informações do projeto
info:
	@echo "$(BLUE)📊 Informações do Projeto$(NC)"
	@echo ""
	@echo "$(YELLOW)Projeto:$(NC) $(PROJECT_NAME)"
	@echo "$(YELLOW)Node.js:$(NC) $(NODE_VERSION)"
	@echo "$(YELLOW)Firebase:$(NC) $(FIREBASE_PROJECT)"
	@echo "$(YELLOW)Porta Local:$(NC) $(LOCAL_PORT)"
	@echo ""
	@echo "$(BLUE)🌐 URLs:$(NC)"
	@echo "  Local:      http://localhost:$(LOCAL_PORT)"
	@echo "  Produção:   https://$(FIREBASE_PROJECT).web.app"
	@echo "  Alternativa: https://$(FIREBASE_PROJECT).firebaseapp.com"
	@echo ""

## 🔧 Diagnóstico completo
diagnose: check-deps info
	@echo "$(BLUE)🔧 Diagnóstico completo...$(NC)"
	@$(MAKE) test
	@if firebase projects:list &> /dev/null; then \
		echo "$(GREEN)✅ Firebase CLI funcionando$(NC)"; \
		firebase hosting:sites:list; \
	else \
		echo "$(YELLOW)⚠️  Firebase CLI não autenticado$(NC)"; \
	fi
