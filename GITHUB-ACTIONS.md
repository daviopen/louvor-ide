# 🔐 Configuração de Secrets do GitHub Actions

Este arquivo contém as instruções para configurar os secrets necessários para o deploy automático via GitHub Actions.

## 📋 Secrets Necessários

### 1. FIREBASE_SERVICE_ACCOUNT_LOUVOR_IDE

Este é o secret mais importante para o deploy funcionar.

#### Como configurar

1. **Acesse o Firebase Console:**

   ```url
   https://console.firebase.google.com/project/louvor-ide/settings/serviceaccounts/adminsdk
   ```

2. **Gere uma nova chave privada:**
   - Clique em "Gerar nova chave privada"
   - Baixe o arquivo JSON

3. **Configure no GitHub:**
   - Vá para as configurações do repositório no GitHub
   - Navigate: `Settings` → `Secrets and variables` → `Actions`
   - Clique em "New repository secret"
   - Nome: `FIREBASE_SERVICE_ACCOUNT_LOUVOR_IDE`
   - Valor: Cole todo o conteúdo do arquivo JSON baixado

### 2. GITHUB_TOKEN (Automático)

O `GITHUB_TOKEN` é automaticamente fornecido pelo GitHub Actions, não precisa ser configurado manualmente.

## 🚀 Como funciona o CI/CD

### Trigger do Deploy

- **Push para main/master:** Deploy automático para produção
- **Pull Request:** Apenas build e testes (sem deploy)

### Etapas do Pipeline

1. **Build e Teste:**
   - Checkout do código
   - Setup do Node.js 20
   - Instalação de dependências via Makefile
   - Execução de testes
   - Build do projeto

2. **Deploy (só em main/master):**
   - Checkout do código
   - Setup do ambiente
   - Build
   - Deploy para Firebase Hosting
   - Verificação pós-deploy

3. **Notificação:**
   - Status do deploy
   - URLs do site

## 🔧 Comandos Locais vs CI/CD

### Desenvolvimento Local

```bash
# Setup inicial
make setup

# Servidor de desenvolvimento
make dev

# Deploy manual
make deploy

# Verificar status
make status
```

### CI/CD Automático

- Push para main → Deploy automático
- Pull Request → Testes automáticos
- Logs completos no GitHub Actions

## 🛠️ Troubleshooting

### Se o deploy falhar

1. **Verificar secrets:**
   - `FIREBASE_SERVICE_ACCOUNT_LOUVOR_IDE` está configurado?
   - O JSON é válido?

2. **Verificar permissões:**
   - A service account tem permissão de deploy?
   - O projeto Firebase está ativo?

3. **Verificar logs:**
   - Acesse GitHub Actions → última execução
   - Verifique cada etapa

### Comandos de diagnóstico

```bash
# Localmente
make diagnose

# Verificar Firebase CLI
firebase projects:list

# Testar deploy manual
make deploy
```

## 📚 Links Úteis

- [Firebase Console](https://console.firebase.google.com/project/louvor-ide)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Firebase GitHub Action](https://github.com/marketplace/actions/deploy-to-firebase-hosting)

## 🎯 URLs de Produção

Após o deploy bem-sucedido, o site estará disponível em:

- **Principal:** <https://louvor-ide.web.app>
- **Alternativa:** <https://louvor-ide.firebaseapp.com>
