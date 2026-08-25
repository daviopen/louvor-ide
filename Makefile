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
	@rm -rf js/ css/ styles/ scripts/ config/ models/ repositories/ services/ constants/ 2>/dev/null || true
	@echo "$(YELLOW)📁 Copiando arquivos do src para a raiz...$(NC)"
	@cp -r src/pages/* ./ 2>/dev/null || true
	@cp -r src/js ./ 2>/dev/null || true
	@cp -r src/css ./ 2>/dev/null || true
	@cp -r src/styles ./ 2>/dev/null || true
	@cp -r src/scripts ./ 2>/dev/null || true
	@cp -r src/config ./ 2>/dev/null || true
	@cp -r src/models ./ 2>/dev/null || true
	@cp -r src/repositories ./ 2>/dev/null || true
	@cp -r src/services ./ 2>/dev/null || true
	@cp -r src/constants ./ 2>/dev/null || true
	@echo "$(YELLOW)🔧 Processando variáveis de ambiente...$(NC)"
	@if [ "$$GITHUB_ACTIONS" = "true" ]; then \
		echo "$(BLUE)🤖 Executando no GitHub Actions - usando variables/secrets$(NC)"; \
		if [ -z "$$VITE_FIREBASE_API_KEY" ] || [ -z "$$VITE_FIREBASE_PROJECT_ID" ]; then \
			echo "$(RED)❌ Variáveis de ambiente do GitHub não encontradas$(NC)"; \
			echo "$(YELLOW)💡 Configure as secrets/variables no GitHub$(NC)"; \
			exit 1; \
		fi; \
	else \
		echo "$(BLUE)💻 Executando localmente - carregando .env$(NC)"; \
		if [ ! -f ".env" ]; then \
			echo "$(RED)❌ Arquivo .env não encontrado$(NC)"; \
			echo "$(YELLOW)💡 Copie .env.example para .env e configure suas credenciais$(NC)"; \
			exit 1; \
		fi; \
		export $$(cat .env | grep -v '^#' | xargs); \
	fi && \
	mkdir -p js && \
	echo "// ARQUIVO GERADO AUTOMATICAMENTE - NÃO EDITAR" > js/env-config.js && \
	echo "window.ENV = {" >> js/env-config.js && \
	echo "    VITE_FIREBASE_API_KEY: '$${VITE_FIREBASE_API_KEY}'," >> js/env-config.js && \
	echo "    VITE_FIREBASE_AUTH_DOMAIN: '$${VITE_FIREBASE_AUTH_DOMAIN}'," >> js/env-config.js && \
	echo "    VITE_FIREBASE_PROJECT_ID: '$${VITE_FIREBASE_PROJECT_ID}'," >> js/env-config.js && \
	echo "    VITE_FIREBASE_STORAGE_BUCKET: '$${VITE_FIREBASE_STORAGE_BUCKET}'," >> js/env-config.js && \
	echo "    VITE_FIREBASE_MESSAGING_SENDER_ID: '$${VITE_FIREBASE_MESSAGING_SENDER_ID}'," >> js/env-config.js && \
	echo "    VITE_FIREBASE_APP_ID: '$${VITE_FIREBASE_APP_ID}'," >> js/env-config.js && \
	echo "    VITE_FIREBASE_MEASUREMENT_ID: '$${VITE_FIREBASE_MEASUREMENT_ID}'" >> js/env-config.js && \
	echo "};" >> js/env-config.js
	@echo "$(GREEN)✅ Arquivo env-config.js criado$(NC)"
	@echo "$(YELLOW)🔗 Adicionando referências ao env-config.js nos arquivos HTML...$(NC)"
	@for html_file in *.html; do \
		if [ -f "$$html_file" ]; then \
			if ! grep -q "js/env-config.js" "$$html_file"; then \
				if grep -q "firebase-app.js" "$$html_file"; then \
					sed -i 's|<script src=".*firebase-config.js"></script>|<script src="js/env-config.js"></script>\n  &|' "$$html_file"; \
					echo "$(GREEN)  ✅ Atualizado: $$html_file$(NC)"; \
				fi; \
			fi; \
		fi; \
	done
	@echo "$(GREEN)✅ Arquivos copiados e variáveis processadas$(NC)"
	@echo "$(BLUE)📋 Arquivos para deploy:$(NC)"
	@ls -la *.html *.js *.css 2>/dev/null || echo "$(YELLOW)⚠️  Alguns arquivos podem não existir$(NC)"
	@if [ -d "js/" ]; then echo "$(GREEN)✅ Diretório js/$(NC)"; fi
	@if [ -d "css/" ]; then echo "$(GREEN)✅ Diretório css/$(NC)"; fi
	@if [ -d "styles/" ]; then echo "$(GREEN)✅ Diretório styles/$(NC)"; fi
	@if [ -d "scripts/" ]; then echo "$(GREEN)✅ Diretório scripts/$(NC)"; fi
	@if [ -d "models/" ]; then echo "$(GREEN)✅ Diretório models/$(NC)"; fi
	@if [ -d "repositories/" ]; then echo "$(GREEN)✅ Diretório repositories/$(NC)"; fi
	@if [ -d "services/" ]; then echo "$(GREEN)✅ Diretório services/$(NC)"; fi
	@if [ -d "constants/" ]; then echo "$(GREEN)✅ Diretório constants/$(NC)"; fi

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
	@test -f src/pages/index.html || { echo "$(RED)❌ src/pages/index.html não encontrado$(NC)"; exit 1; }
	@test -f firebase.json || { echo "$(RED)❌ firebase.json não encontrado$(NC)"; exit 1; }
	@test -f .firebaserc || { echo "$(RED)❌ .firebaserc não encontrado$(NC)"; exit 1; }
	@if [ -f index.html ]; then \
		test -f styles/tokens.css || { echo "$(RED)❌ styles/tokens.css ausente no build$(NC)"; exit 1; }; \
		test -f styles/design-system.css || { echo "$(RED)❌ styles/design-system.css ausente no build$(NC)"; exit 1; }; \
		test -f models/data-model.js || { echo "$(RED)❌ models/data-model.js ausente no build$(NC)"; exit 1; }; \
		test -f repositories/domain-repositories.js || { echo "$(RED)❌ repositories/domain-repositories.js ausente no build$(NC)"; exit 1; }; \
		test -f services/ministry-functions-service.js || { echo "$(RED)❌ services/ministry-functions-service.js ausente no build$(NC)"; exit 1; }; \
		test -f constants/collections.js || { echo "$(RED)❌ constants/collections.js ausente no build$(NC)"; exit 1; }; \
	fi
	@echo "$(GREEN)✅ Estrutura de arquivos OK$(NC)"
	@echo "$(YELLOW)🎼 Testando transposição de acordes...$(NC)"
	@node --test tests/*.test.js
	@echo "$(GREEN)✅ Testes concluídos$(NC)"

## 🧹 Limpeza
clean:
	@echo "$(BLUE)🧹 Limpando arquivos temporários...$(NC)"
	@rm -rf .firebase/
	@rm -f firebase-debug.log
	@rm -f firebase-debug.*.log
	@echo "$(YELLOW)🗑️ Limpando arquivos copiados do build...$(NC)"
	@rm -f *.html 2>/dev/null || true
	@rm -rf js/ css/ styles/ scripts/ config/ models/ repositories/ services/ constants/ 2>/dev/null || true
	@rm -f env-config.js 2>/dev/null || true
	@echo "$(GREEN)✅ Limpeza concluída$(NC)"

## 🏗️ Build limpo (limpa antes de construir)
clean-build: clean build

## 📊 Informações do Projeto
info:
	@echo ""
	@echo "$(BLUE)📊 Informações do Projeto$(NC)"
	@echo "$(YELLOW)Projeto:$(NC) $(PROJECT_NAME)"
	@echo "$(YELLOW)Firebase:$(NC) $(FIREBASE_PROJECT)"
	@echo "$(YELLOW)Node.js:$(NC) $(NODE_VERSION)"
	@echo "$(YELLOW)Porta Local:$(NC) $(LOCAL_PORT)"
	@echo ""
