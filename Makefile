# Makefile para Louvor IDE - Arquitetura Moderna
# Frontend: React + Vite + TypeScript (pnpm)
# Backend: TypeScript + Express (pnpm)

# Variáveis
PROJECT_NAME = louvor-ide
FRONTEND_DIR = frontend
BACKEND_DIR = backend-ts
TESTS_DIR = tests
FIREBASE_PROJECT = louvor-ide
FRONTEND_PORT = 3000
BACKEND_PORT = 8001

# Gerenciadores de pacotes
NPM_CMD = pnpm

# Cores para output
RED = \033[0;31m
GREEN = \033[0;32m
YELLOW = \033[1;33m
BLUE = \033[0;34m
PURPLE = \033[0;35m
NC = \033[0m # No Color

.PHONY: help install setup dev dev-frontend dev-backend build build-frontend build-backend deploy clean test test-frontend test-backend test-e2e test-coverage test-watch test-unit test-integration test-setup status check-deps

# Target padrão
all: help

## 📋 Ajuda
help:
	@echo ""
	@echo "$(BLUE)🎵 Louvor IDE - Sistema de Cifras Moderno$(NC)"
	@echo "$(PURPLE)Frontend: React + Vite + pnpm | Backend: TypeScript + Express + pnpm$(NC)"
	@echo ""
	@echo "$(YELLOW)🏗️  Setup e Instalação:$(NC)"
	@echo "  $(GREEN)make setup$(NC)           - Configuração inicial completa (frontend + backend + testes)"
	@echo "  $(GREEN)make install$(NC)         - Instalar dependências (pnpm)"
	@echo "  $(GREEN)make install-frontend$(NC) - Instalar dependências do frontend (pnpm)"
	@echo "  $(GREEN)make install-backend$(NC)  - Instalar dependências do backend (pnpm)"
	@echo "  $(GREEN)make install-tests$(NC)    - Instalar dependências de teste"
	@echo ""
	@echo "$(YELLOW)🚀 Desenvolvimento:$(NC)"
	@echo "  $(GREEN)make dev$(NC)             - Ambiente de desenvolvimento (frontend + backend)"
	@echo "  $(GREEN)make dev-frontend$(NC)    - Servidor de desenvolvimento do frontend (pnpm)"
	@echo "  $(GREEN)make dev-backend$(NC)     - Servidor de desenvolvimento do backend (pnpm)"
	@echo ""
	@echo "$(YELLOW)📦 Build e Deploy:$(NC)"
	@echo "  $(GREEN)make build$(NC)           - Build para produção (frontend + backend)"
	@echo "  $(GREEN)make build-frontend$(NC)  - Build do frontend"
	@echo "  $(GREEN)make build-backend$(NC)   - Build do backend"
	@echo "  $(GREEN)make deploy$(NC)          - Deploy para Firebase Hosting"
	@echo ""
	@echo "$(YELLOW)🧪 Testes e Qualidade:$(NC)"
	@echo "  $(GREEN)make test$(NC)            - Executar todos os testes"
	@echo "  $(GREEN)make test-frontend$(NC)   - Executar testes do frontend (Vitest)"
	@echo "  $(GREEN)make test-backend$(NC)    - Executar testes do backend (Jest)"
	@echo "  $(GREEN)make test-e2e$(NC)        - Executar testes E2E (Playwright)"
	@echo "  $(GREEN)make test-coverage$(NC)   - Executar testes com cobertura"
	@echo "  $(GREEN)make test-watch$(NC)      - Executar testes em modo watch"
	@echo "  $(GREEN)make clean$(NC)           - Limpar arquivos temporários"
	@echo "  $(GREEN)make status$(NC)          - Verificar status do projeto"
	@echo ""
	@echo "$(YELLOW)URLs:$(NC)"
	@echo "  Frontend:    http://localhost:$(FRONTEND_PORT) (pnpm dev)"
	@echo "  Backend:     http://localhost:$(BACKEND_PORT) (pnpm dev)"
	@echo "  API Docs:    http://localhost:$(BACKEND_PORT)/docs (Swagger)"
	@echo "  Produção:    https://$(FIREBASE_PROJECT).web.app"
	@echo ""
	@echo "$(YELLOW)💡 Comandos Principais:$(NC)"
	@echo "  $(GREEN)make start$(NC)          - Setup completo + início do ambiente dev"
	@echo "  $(GREEN)make dev$(NC)            - Frontend + backend TypeScript"
	@echo ""
	@echo "$(YELLOW)💡 Requisitos:$(NC)"
	@echo "  Node.js 18+ | pnpm"
	@echo "  Instalar: $(GREEN)npm install -g pnpm$(NC)"
	@echo ""

## 🏗️ Setup inicial completo
setup: check-deps install
	@echo "$(GREEN)✅ Setup completo do Louvor IDE$(NC)"

## 📦 Verificar dependências do sistema
check-deps:
	@echo "$(BLUE)🔍 Verificando dependências do sistema...$(NC)"
	@command -v node >/dev/null 2>&1 || { echo "$(RED)❌ Node.js não encontrado. Instale Node.js 18+$(NC)"; exit 1; }
	@command -v pnpm >/dev/null 2>&1 || { echo "$(RED)❌ pnpm não encontrado. Execute: npm install -g pnpm$(NC)"; exit 1; }
	@echo "$(GREEN)✅ Dependências do sistema verificadas$(NC)"

## 📦 Instalar todas as dependências
install: install-frontend install-backend install-tests

## 📦 Instalar dependências do frontend
install-frontend:
	@echo "$(BLUE)📦 Instalando dependências do frontend com pnpm...$(NC)"
	@cd $(FRONTEND_DIR) && $(NPM_CMD) install
	@echo "$(GREEN)✅ Dependências do frontend instaladas$(NC)"

## 📦 Instalar dependências do backend
install-backend:
	@echo "$(BLUE)📦 Instalando dependências do backend com pnpm...$(NC)"
	@cd $(BACKEND_DIR) && $(NPM_CMD) install
	@echo "$(GREEN)✅ Dependências do backend instaladas$(NC)"

## 📦 Instalar dependências de teste
install-tests:
	@echo "$(BLUE)📦 Instalando dependências de teste com pnpm...$(NC)"
	@cd $(TESTS_DIR) && $(NPM_CMD) install
	@echo "$(GREEN)✅ Dependências de teste instaladas$(NC)"

## 🚀 Ambiente de desenvolvimento (frontend + backend)
dev:
	@$(MAKE) stop || true
	@echo "$(BLUE)🚀 Iniciando ambiente de desenvolvimento...$(NC)"
	@echo "$(YELLOW)Frontend: http://localhost:$(FRONTEND_PORT)$(NC)"
	@echo "$(YELLOW)Backend:  http://localhost:$(BACKEND_PORT)$(NC)"
	@echo "$(YELLOW)API Docs: http://localhost:$(BACKEND_PORT)/docs$(NC)"
	@echo ""
	@echo "$(YELLOW)Pressione Ctrl+C para parar os servidores$(NC)"
	@$(MAKE) -j2 dev-frontend-silent dev-backend-silent

## 🚀 Servidor de desenvolvimento do frontend
dev-frontend:
	@echo "$(BLUE)🚀 Iniciando servidor do frontend com pnpm...$(NC)"
	@cd $(FRONTEND_DIR) && $(NPM_CMD) run dev

dev-frontend-silent:
	@cd $(FRONTEND_DIR) && $(NPM_CMD) run dev

## 🚀 Servidor de desenvolvimento do backend
dev-backend:
	@echo "$(BLUE)🚀 Iniciando servidor do backend com pnpm...$(NC)"
	@cd $(BACKEND_DIR) && $(NPM_CMD) run dev

dev-backend-silent:
	@cd $(BACKEND_DIR) && $(NPM_CMD) run dev

## 📦 Build para produção
build: build-frontend build-backend
	@echo "$(GREEN)✅ Build completo$(NC)"

## 📦 Build do frontend
build-frontend:
	@echo "$(BLUE)📦 Fazendo build do frontend com pnpm...$(NC)"
	@cd $(FRONTEND_DIR) && $(NPM_CMD) run build
	@echo "$(GREEN)✅ Build do frontend concluído$(NC)"

## 📦 Build do backend
build-backend:
	@echo "$(BLUE)📦 Fazendo build do backend com pnpm...$(NC)"
	@cd $(BACKEND_DIR) && $(NPM_CMD) run build
	@echo "$(GREEN)✅ Build do backend concluído$(NC)"

## 🚀 Deploy para produção
deploy: build-frontend
	@echo "$(BLUE)🚀 Fazendo deploy para Firebase Hosting...$(NC)"
	@command -v firebase >/dev/null 2>&1 || { echo "$(RED)❌ Firebase CLI não encontrado. Execute: pnpm install -g firebase-tools$(NC)"; exit 1; }
	@cp -r $(FRONTEND_DIR)/dist/* ./src/ 2>/dev/null || echo "$(YELLOW)⚠️  Copiando arquivos de build...$(NC)"
	@firebase deploy --only hosting
	@echo "$(GREEN)✅ Deploy concluído: https://$(FIREBASE_PROJECT).web.app$(NC)"

## 🧪 Executar todos os testes
test: test-frontend test-backend test-e2e
	@echo "$(GREEN)✅ Todos os testes executados$(NC)"

## 🧪 Testes do frontend (Vitest)
test-frontend:
	@echo "$(BLUE)🧪 Executando testes do frontend (Vitest) com pnpm...$(NC)"
	@cd $(TESTS_DIR) && $(NPM_CMD) install >/dev/null 2>&1 || true
	@cd $(TESTS_DIR) && $(NPM_CMD) run test

## 🧪 Testes do backend (Jest)
test-backend:
	@echo "$(BLUE)🧪 Executando testes do backend (Jest) com pnpm...$(NC)"
	@cd $(BACKEND_DIR) && $(NPM_CMD) run test

## 🧪 Testes E2E (Playwright)
test-e2e:
	@echo "$(BLUE)🧪 Executando testes E2E (Playwright) com pnpm...$(NC)"
	@cd $(TESTS_DIR) && $(NPM_CMD) install >/dev/null 2>&1 || true
	@cd $(TESTS_DIR) && $(NPM_CMD) exec playwright install --with-deps >/dev/null 2>&1 || true
	@cd $(TESTS_DIR) && $(NPM_CMD) run test:e2e

## 🧪 Testes com cobertura
test-coverage:
	@echo "$(BLUE)🧪 Executando testes com cobertura...$(NC)"
	@cd $(TESTS_DIR) && $(NPM_CMD) run test:coverage
	@cd $(BACKEND_DIR) && $(NPM_CMD) run test:coverage

## 🧪 Testes em modo watch
test-watch:
	@echo "$(BLUE)🧪 Executando testes em modo watch...$(NC)"
	@cd $(TESTS_DIR) && $(NPM_CMD) run test:watch

## 🧪 Testes unitários apenas
test-unit:
	@echo "$(BLUE)🧪 Executando testes unitários...$(NC)"
	@cd $(TESTS_DIR) && $(NPM_CMD) run test -- --reporter=verbose
	@cd $(BACKEND_DIR) && $(NPM_CMD) run test:unit

## 🧪 Testes de integração apenas
test-integration:
	@echo "$(BLUE)🧪 Executando testes de integração...$(NC)"
	@cd $(BACKEND_DIR) && $(NPM_CMD) run test:integration

## 🧪 Instalar dependências de teste
test-setup:
	@echo "$(BLUE)🧪 Instalando dependências de teste...$(NC)"
	@cd $(TESTS_DIR) && $(NPM_CMD) install
	@cd $(BACKEND_DIR) && $(NPM_CMD) install
	@cd $(TESTS_DIR) && $(NPM_CMD) exec playwright install --with-deps
	@echo "$(GREEN)✅ Dependências de teste instaladas$(NC)"

## 🧹 Limpar arquivos temporários
clean:
	@echo "$(BLUE)🧹 Limpando arquivos temporários...$(NC)"
	@cd $(FRONTEND_DIR) && rm -rf node_modules dist .turbo pnpm-lock.yaml 2>/dev/null || true
	@cd $(BACKEND_DIR) && rm -rf node_modules dist .turbo pnpm-lock.yaml 2>/dev/null || true
	@cd $(TESTS_DIR) && rm -rf node_modules pnpm-lock.yaml 2>/dev/null || true
	@rm -rf node_modules pnpm-lock.yaml dist build *.log 2>/dev/null || true
	@echo "$(GREEN)✅ Limpeza concluída$(NC)"

## 📊 Status do projeto
status:
	@echo "$(BLUE)📊 Status do Louvor IDE$(NC)"
	@echo ""
	@echo "$(YELLOW)Frontend (React + Vite + pnpm):$(NC)"
	@if [ -d "$(FRONTEND_DIR)/node_modules" ]; then \
		echo "  $(GREEN)✅ Dependências instaladas$(NC)"; \
	else \
		echo "  $(RED)❌ Dependências não instaladas$(NC)"; \
	fi
	@if [ -f "$(FRONTEND_DIR)/package.json" ]; then \
		echo "  $(GREEN)✅ Projeto configurado$(NC)"; \
	else \
		echo "  $(RED)❌ Projeto não configurado$(NC)"; \
	fi
	@echo ""
	@echo "$(YELLOW)Backend (TypeScript + Express + pnpm):$(NC)"
	@if [ -d "$(BACKEND_DIR)/node_modules" ]; then \
		echo "  $(GREEN)✅ Dependências instaladas$(NC)"; \
	else \
		echo "  $(RED)❌ Dependências não instaladas$(NC)"; \
	fi
	@if [ -f "$(BACKEND_DIR)/src/index.ts" ]; then \
		echo "  $(GREEN)✅ API configurada$(NC)"; \
	else \
		echo "  $(RED)❌ API não configurada$(NC)"; \
	fi
	@echo ""
	@echo "$(YELLOW)Testes (pnpm):$(NC)"
	@if [ -d "$(TESTS_DIR)/node_modules" ]; then \
		echo "  $(GREEN)✅ Dependências de teste instaladas$(NC)"; \
	else \
		echo "  $(RED)❌ Dependências de teste não instaladas$(NC)"; \
	fi
	@echo ""
	@echo "$(YELLOW)Serviços disponíveis:$(NC)"
	@curl -s http://localhost:$(FRONTEND_PORT) >/dev/null 2>&1 && echo "  $(GREEN)✅ Frontend rodando em http://localhost:$(FRONTEND_PORT)$(NC)" || echo "  $(RED)❌ Frontend não está rodando$(NC)"
	@curl -s http://localhost:$(BACKEND_PORT)/health >/dev/null 2>&1 && echo "  $(GREEN)✅ Backend rodando em http://localhost:$(BACKEND_PORT)$(NC)" || echo "  $(RED)❌ Backend não está rodando$(NC)"

## 🎯 Instalação rápida para desenvolvimento
quick-start: check-deps install
	@echo "$(GREEN)🎯 Instalação rápida concluída!$(NC)"
	@echo "$(YELLOW)Execute 'make dev' para iniciar o ambiente de desenvolvimento$(NC)"

## 🚀 Setup inicial e início do ambiente de desenvolvimento
start: check-deps install dev
	@echo "$(GREEN)🚀 Ambiente iniciado com sucesso!$(NC)"

## 🔄 Reiniciar ambiente de desenvolvimento
restart: 
	@$(MAKE) clean
	@$(MAKE) install
	@$(MAKE) dev

## 📝 Logs dos serviços
logs-frontend:
	@echo "$(BLUE)📝 Logs do frontend (últimas 50 linhas)$(NC)"
	@tail -f $(FRONTEND_DIR)/*.log 2>/dev/null || echo "$(YELLOW)Nenhum log encontrado$(NC)"

logs-backend:
	@echo "$(BLUE)📝 Logs do backend (últimas 50 linhas)$(NC)"
	@tail -f $(BACKEND_DIR)/*.log 2>/dev/null || echo "$(YELLOW)Nenhum log encontrado$(NC)"

## 🔧 Utilitários de desenvolvimento
format-frontend:
	@echo "$(BLUE)🔧 Formatando código do frontend...$(NC)"
	@cd $(FRONTEND_DIR) && $(NPM_CMD) run format 2>/dev/null || echo "$(YELLOW)Script de formatação não configurado$(NC)"

format-backend:
	@echo "$(BLUE)🔧 Formatando código do backend...$(NC)"
	@cd $(BACKEND_DIR) && $(NPM_CMD) run format 2>/dev/null || echo "$(YELLOW)Script de formatação não configurado$(NC)"

lint-frontend:
	@echo "$(BLUE)🔧 Executando lint do frontend...$(NC)"
	@cd $(FRONTEND_DIR) && $(NPM_CMD) run lint 2>/dev/null || echo "$(YELLOW)Script de lint não configurado$(NC)"

lint-backend:
	@echo "$(BLUE)🔧 Executando lint do backend...$(NC)"
	@cd $(BACKEND_DIR) && $(NPM_CMD) run lint 2>/dev/null || echo "$(YELLOW)Script de lint não configurado$(NC)"

## 🔧 Utilitários adicionais

## 🔍 Verificar se as portas estão sendo usadas
check-ports:
	@echo "$(BLUE)🔍 Verificando portas...$(NC)"
	@echo "$(YELLOW)Porta $(FRONTEND_PORT) (Frontend):$(NC)"
	@lsof -i :$(FRONTEND_PORT) || echo "  $(GREEN)✅ Porta livre$(NC)"
	@echo "$(YELLOW)Porta $(BACKEND_PORT) (Backend):$(NC)"
	@lsof -i :$(BACKEND_PORT) || echo "  $(GREEN)✅ Porta livre$(NC)"

## 🛑 Parar todos os serviços
stop:
	@echo "$(BLUE)🛑 Parando todos os serviços...$(NC)"
	@pkill -f "vite" 2>/dev/null || true
	@pkill -f "tsx.*index.ts" 2>/dev/null || true
	@pkill -f "pnpm.*dev" 2>/dev/null || true
	@echo "$(GREEN)✅ Serviços parados$(NC)"

## 🔄 Reiniciar apenas os serviços (sem reinstalar)
restart-services: 
	@$(MAKE) stop || true
	@$(MAKE) dev
	@echo "$(GREEN)🔄 Serviços reiniciados$(NC)"

## 📱 Abrir todas as URLs no navegador
open-urls:
	@echo "$(BLUE)📱 Abrindo URLs no navegador...$(NC)"
	@command -v xdg-open >/dev/null 2>&1 && xdg-open http://localhost:$(FRONTEND_PORT) || echo "$(YELLOW)Comando xdg-open não encontrado$(NC)"
	@sleep 1
	@command -v xdg-open >/dev/null 2>&1 && xdg-open http://localhost:$(BACKEND_PORT)/docs || echo "$(YELLOW)Comando xdg-open não encontrado$(NC)"
