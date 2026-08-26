SHELL := /bin/bash

# Cores para output
RED := \033[0;31m
GREEN := \033[0;32m
YELLOW := \033[1;33m
BLUE := \033[0;34m
NC := \033[0m

# Configurações
NODE_VERSION := 18
LOCAL_PORT := 5000
FIREBASE_PROJECT := louvor-ide

.PHONY: help install setup setup-basic setup-firebase check-env dev serve serve-fast build deploy test clean lint status firebase-login firebase-project logs backup restore

help:
	@echo "$(BLUE)🎵 Louvor IDE - Comandos Disponíveis$(NC)"
	@echo ""
	@echo "$(GREEN)📦 Setup e Instalação:$(NC)"
	@echo "  make install        - Instalar dependências"
	@echo "  make setup          - Setup completo (Node.js + Firebase)"
	@echo "  make setup-basic    - Setup básico sem Firebase CLI"
	@echo "  make setup-firebase - Instalar e configurar Firebase CLI"
	@echo "  make check-env      - Verificar variáveis de ambiente"
	@echo ""
	@echo "$(GREEN)🔥 Desenvolvimento:$(NC)"
	@echo "  make dev            - Iniciar ambiente de desenvolvimento"
	@echo "  make serve          - Servidor local com Firebase"
	@echo "  make serve-fast     - Servidor rápido sem rebuild"
	@echo "  make build          - Build para produção"
	@echo "  make deploy         - Deploy para Firebase Hosting"
	@echo ""
	@echo "$(GREEN)🧪 Qualidade:$(NC)"
	@echo "  make test           - Executar testes"
	@echo "  make lint           - Verificar código"
	@echo "  make clean          - Limpar arquivos gerados"
	@echo ""
	@echo "$(GREEN)🔥 Firebase:$(NC)"
	@echo "  make firebase-login   - Login no Firebase"
	@echo "  make firebase-project - Selecionar projeto"
	@echo "  make status           - Status do projeto"
	@echo "  make logs             - Ver logs do Firebase"
	@echo ""
	@echo "$(GREEN)💾 Dados:$(NC)"
	@echo "  make backup         - Backup dos dados"
	@echo "  make restore        - Restaurar dados"

install:
	@echo "$(BLUE)📦 Instalando dependências...$(NC)"
	@if [ ! -f "package.json" ]; then \
		echo "$(RED)❌ package.json não encontrado$(NC)"; \
		exit 1; \
	fi
	npm install
	@echo "$(GREEN)✅ Dependências instaladas!$(NC)"

setup: setup-basic setup-firebase
	@echo "$(GREEN)🎉 Setup completo!$(NC)"

setup-basic:
	@echo "$(BLUE)🔧 Configurando ambiente básico...$(NC)"
	@if ! command -v node &> /dev/null; then \
		echo "$(RED)❌ Node.js não encontrado$(NC)"; \
		echo "$(YELLOW)💡 Instale Node.js >= $(NODE_VERSION): https://nodejs.org$(NC)"; \
		exit 1; \
	fi
	@NODE_VER=$$(node --version | cut -d'v' -f2 | cut -d'.' -f1); \
	if [ "$$NODE_VER" -lt "$(NODE_VERSION)" ]; then \
		echo "$(RED)❌ Node.js versão $$NODE_VER encontrada. Necessário >= $(NODE_VERSION)$(NC)"; \
		exit 1; \
	fi
	@echo "$(GREEN)✅ Node.js $$(node --version) encontrado$(NC)"
	@if [ ! -d "node_modules" ]; then \
		$(MAKE) install; \
	else \
		echo "$(GREEN)✅ Dependências já instaladas$(NC)"; \
	fi
	@if [ ! -f ".env" ]; then \
		if [ -f ".env.example" ]; then \
			cp .env.example .env; \
			echo "$(YELLOW)⚠️  Arquivo .env criado. Configure suas credenciais Firebase.$(NC)"; \
		else \
			echo "$(RED)❌ .env.example não encontrado$(NC)"; \
		fi; \
	else \
		echo "$(GREEN)✅ Arquivo .env encontrado$(NC)"; \
	fi
	@echo "$(GREEN)🎉 Setup básico completo!$(NC)"

setup-firebase:
	@echo "$(BLUE)🔥 Configurando Firebase CLI...$(NC)"
	@if ! command -v firebase &> /dev/null; then \
		echo "$(YELLOW)📦 Instalando Firebase CLI...$(NC)"; \
		npm install -g firebase-tools; \
	else \
		echo "$(GREEN)✅ Firebase CLI já instalado: $$(firebase --version)$(NC)"; \
	fi
	@echo "$(YELLOW)🔑 Verificando autenticação Firebase...$(NC)"
	@if firebase projects:list &> /dev/null; then \
		echo "$(GREEN)✅ Firebase autenticado$(NC)"; \
	else \
		echo "$(YELLOW)⚠️  Firebase não autenticado. Execute: make firebase-login$(NC)"; \
	fi

check-env:
	@echo "$(BLUE)🔍 Verificando variáveis de ambiente...$(NC)"
	@if [ ! -f ".env" ]; then \
		echo "$(RED)❌ Arquivo .env não encontrado$(NC)"; \
		exit 1; \
	fi
	@required_vars="VITE_FIREBASE_API_KEY VITE_FIREBASE_AUTH_DOMAIN VITE_FIREBASE_PROJECT_ID VITE_FIREBASE_STORAGE_BUCKET VITE_FIREBASE_MESSAGING_SENDER_ID VITE_FIREBASE_APP_ID"; \
	for var in $$required_vars; do \
		if ! grep -q "^$$var=" .env || [ -z "$$(grep "^$$var=" .env | cut -d'=' -f2-)" ]; then \
			echo "$(RED)❌ $$var não configurada$(NC)"; \
		else \
			echo "$(GREEN)✅ $$var configurada$(NC)"; \
		fi; \
	done

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
	@rm -rf js/ css/ styles/ scripts/ config/ models/ repositories/ services/ constants/ core/ 2>/dev/null || true
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
	@cp -r src/core ./ 2>/dev/null || true
	@test -f styles/tokens.css
	@test -f styles/design-system.css
	@test -f core/app-error.js
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
	@if [ -d "core/" ]; then echo "$(GREEN)✅ Diretório core/$(NC)"; fi

## 🚀 Deploy manual
deploy: build
	@echo "$(BLUE)🚀 Iniciando deploy para Firebase Hosting...$(NC)"
	firebase deploy --only hosting --project $(FIREBASE_PROJECT)
	@echo "$(GREEN)✅ Deploy concluído!$(NC)"

## 🧪 Executar testes
test:
	@echo "$(BLUE)🧪 Executando testes...$(NC)"
	npm test

## 🧹 Limpar arquivos gerados
clean:
	@echo "$(BLUE)🧹 Limpando arquivos gerados...$(NC)"
	@rm -f *.html 2>/dev/null || true
	@rm -rf js/ css/ styles/ scripts/ config/ models/ repositories/ services/ constants/ core/ 2>/dev/null || true
	@echo "$(GREEN)✅ Limpeza concluída!$(NC)"

## 🔍 Lint básico
lint:
	@echo "$(BLUE)🔍 Verificando sintaxe JavaScript...$(NC)"
	@find src -name '*.js' -type f -print0 | xargs -0 -n1 node --check
	@echo "$(GREEN)✅ Sintaxe JavaScript válida$(NC)"

## 🔥 Login Firebase
firebase-login:
	firebase login

## 🔥 Selecionar projeto Firebase
firebase-project:
	firebase use $(FIREBASE_PROJECT)

## 📊 Status
status:
	@echo "$(BLUE)📊 Status do projeto Louvor IDE$(NC)"
	@echo "Projeto Firebase: $(FIREBASE_PROJECT)"
	@echo "Branch Git: $$(git branch --show-current 2>/dev/null || echo 'n/a')"
	@echo "Commit: $$(git rev-parse --short HEAD 2>/dev/null || echo 'n/a')"

## 📜 Logs Firebase
logs:
	firebase functions:log --project $(FIREBASE_PROJECT)

## 💾 Backup
backup:
	@echo "$(BLUE)💾 Backup manual de dados deve usar o fluxo operacional documentado do projeto.$(NC)"

## ♻️ Restore
restore:
	@echo "$(YELLOW)♻️ Restore deve ser executado conforme procedimento operacional documentado.$(NC)"
