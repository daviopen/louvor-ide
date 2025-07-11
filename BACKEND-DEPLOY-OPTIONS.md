# 🔥 Migração para Firebase Functions

Para fazer deploy do backend junto com o frontend, vamos migrar para Firebase Functions.

## 📋 Passos para migração:

### 1. Instalar Firebase Functions
```bash
cd backend-ts
npm install firebase-functions firebase-admin
npm install -D @types/express
```

### 2. Estrutura do projeto
```
firebase.json
functions/
  ├── src/
  │   ├── index.ts          # Entry point das functions
  │   ├── api/              # Rotas da API migradas
  │   ├── middleware/       # Middleware existente
  │   └── modules/          # Módulos existentes
  ├── package.json
  └── tsconfig.json
```

### 3. Configurar firebase.json
```json
{
  "functions": {
    "source": "functions",
    "runtime": "nodejs18",
    "predeploy": ["npm --prefix functions run build"]
  },
  "hosting": {
    "public": "frontend/dist",
    "rewrites": [
      {
        "source": "/api/**",
        "function": "api"
      },
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

### 4. Migrar código existente
O código atual em `backend-ts/` pode ser adaptado para Functions com poucas mudanças.

## 🌐 URLs após deploy:
- **Frontend**: https://louvor-ide.web.app
- **API**: https://louvor-ide.web.app/api/v1/...

## ⚡ Vantagens:
- Deploy único (front + back)
- Escalabilidade automática
- Integração nativa com Firestore
- Custos otimizados (pay-per-use)
