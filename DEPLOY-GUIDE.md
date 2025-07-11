# 🚀 Configuração de Deploy - Firebase + GitHub Actions

Este documento explica como configurar o deploy automático do Louvor IDE no Firebase Hosting usando GitHub Actions.

## 📋 Pré-requisitos

1. **Projeto Firebase configurado**
   - Acesse [Firebase Console](https://console.firebase.google.com)
   - Crie ou acesse seu projeto `louvor-ide`
   - Ative o Firebase Hosting

2. **Firebase CLI instalado**
   ```bash
   npm install -g firebase-tools
   ```

3. **Repositório no GitHub**
   - Fork ou clone este repositório
   - Certifique-se de ter permissões de administrador

## 🔐 Configurando Secrets no GitHub

### 1. Obter Service Account Key

```bash
# 1. Faça login no Firebase
firebase login

# 2. Gere uma service account key
firebase init hosting:github
```

Ou manualmente:
1. Acesse [Firebase Console](https://console.firebase.google.com)
2. Vá em **Project Settings** > **Service Accounts**
3. Clique em **Generate New Private Key**
4. Salve o arquivo JSON

### 2. Configurar Secrets no GitHub

Acesse: `https://github.com/SEU-USUARIO/louvor-ide/settings/secrets/actions`

Adicione os seguintes secrets:

#### 🔑 Firebase Secrets
```
FIREBASE_SERVICE_ACCOUNT_LOUVOR_IDE
```
**Valor**: Cole todo o conteúdo do arquivo JSON da service account

#### 🔑 Firebase Config Secrets
```
VITE_FIREBASE_API_KEY=AIzaSyDilWbw9CETFiAi-hsrHhqK0ovwvpmK2V0
VITE_FIREBASE_AUTH_DOMAIN=louvor-ide.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=louvor-ide
VITE_FIREBASE_STORAGE_BUCKET=louvor-ide.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=742542004330
VITE_FIREBASE_APP_ID=1:742542004330:web:e9db92bb88ea06c5e77a13
VITE_FIREBASE_MEASUREMENT_ID=G-S6YHEVQE0G
```

#### 🔑 API URL Secret
```
VITE_API_URL=https://sua-api-backend.com/api/v1
```

### 3. Como obter as configurações do Firebase

1. Acesse [Firebase Console](https://console.firebase.google.com)
2. Selecione seu projeto
3. Vá em **Project Settings** (ícone de engrenagem)
4. Na aba **General**, role até **Your apps**
5. Clique no ícone da web (`</>`)
6. Copie as configurações do objeto `firebaseConfig`

## 🚀 Como funciona o Deploy

### Deploy Automático
- **Push para `main`**: Deploy LIVE em produção
- **Push para `refactory`**: Deploy de PREVIEW
- **Pull Request**: Apenas build e testes

### Processo de Deploy
1. **Build & Test**: Compila o projeto e executa testes
2. **Deploy**: Envia arquivos para Firebase Hosting
3. **Verification**: Testa se o site está online
4. **Notification**: Informa o status do deploy

## 🛠️ Deploy Manual

### Via GitHub Actions
1. Acesse a aba **Actions** no GitHub
2. Selecione o workflow **Deploy to Firebase Hosting**
3. Clique em **Run workflow**

### Via Linha de Comando
```bash
# 1. Build do projeto
make build

# 2. Deploy para Firebase
make deploy

# Ou manualmente:
cd frontend
pnpm build
firebase deploy --only hosting
```

## 🌐 URLs do Projeto

- **Produção**: https://louvor-ide.web.app
- **Alternativa**: https://louvor-ide.firebaseapp.com
- **Console**: https://console.firebase.google.com/project/louvor-ide

## 🔧 Troubleshooting

### ❌ Erro: "Service account key not found"
- Verifique se o secret `FIREBASE_SERVICE_ACCOUNT_LOUVOR_IDE` está configurado
- Certifique-se de que o JSON está completo e válido

### ❌ Erro: "Build failed"
- Verifique se todas as variáveis `VITE_*` estão configuradas
- Confirme se não há erros de TypeScript no código

### ❌ Erro: "Deploy permission denied"
- Verifique se a service account tem permissões de deploy
- Confirme se o projeto ID está correto (`louvor-ide`)

### ❌ Site não carrega após deploy
- Aguarde alguns minutos para propagação
- Verifique se o `firebase.json` aponta para `frontend/dist`
- Confirme se o build gerou os arquivos corretamente

## 📚 Links Úteis

- [Firebase Hosting Docs](https://firebase.google.com/docs/hosting)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Vite Build Guide](https://vitejs.dev/guide/build.html)

## 🆘 Suporte

Se encontrar problemas:
1. Verifique os logs no GitHub Actions
2. Confirme se todos os secrets estão configurados
3. Teste o build local com `make build`
4. Verifique se o Firebase CLI está atualizado
