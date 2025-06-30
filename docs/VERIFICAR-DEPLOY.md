# 🔍 Como Verificar se o Deploy Subiu

## ✅ Maneiras de Verificar o Deploy

### 1. **Script de Verificação Automática**
```bash
./check-status.sh
```
- ✅ Testa conectividade HTTP
- ✅ Verifica status do Firebase
- ✅ Lista sites configurados
- ✅ Mostra dicas de solução de problemas

### 2. **Comandos Firebase CLI**

#### Status dos canais
```bash
firebase hosting:channel:list
```

#### Informações do projeto
```bash
firebase projects:list
firebase hosting:sites:list
```

### 3. **Testes de Conectividade Manual**

#### Teste rápido HTTP
```bash
curl -I https://louvor-ide.web.app
```
**Resposta esperada**: `HTTP/2 200`

#### Teste completo
```bash
curl -s https://louvor-ide.web.app | head -20
```
**Deve mostrar**: HTML do seu site

### 4. **Navegador**
Abra diretamente no navegador:
- **Principal**: https://louvor-ide.web.app
- **Alternativa**: https://louvor-ide.firebaseapp.com

### 5. **Console Firebase**
Acesse: https://console.firebase.google.com/project/louvor-ide/hosting

## 🚨 Sinais de Deploy Bem-Sucedido

### ✅ **Deploy OK**
- ✅ Comando `firebase deploy` termina com "Deploy complete!"
- ✅ Script mostra "Online (HTTP 200)"
- ✅ Site carrega no navegador
- ✅ `firebase hosting:channel:list` mostra release recente

### ❌ **Deploy com Problemas**
- ❌ HTTP 404: Arquivo não encontrado ou configuração incorreta
- ❌ HTTP 403: Problemas de permissão
- ❌ HTTP 500: Erro interno do servidor
- ❌ Timeout: Problemas de DNS ou conectividade

## 🔧 Solução de Problemas

### Se o site não carregar:

1. **Aguarde propagação** (5-10 minutos)
2. **Verifique arquivos**:
   ```bash
   ls -la index.html firebase.json
   ```
3. **Teste local**:
   ```bash
   firebase serve --port 5000
   ```
4. **Redeploy**:
   ```bash
   firebase deploy --only hosting
   ```

### Se erro 404:
- Verifique se `index.html` existe
- Confirme configuração do `firebase.json`
- Teste: `firebase serve` localmente

### Se erro de permissão:
- Verifique login: `firebase login`
- Confirme projeto: `firebase projects:list`

## 📊 Monitoramento Contínuo

### Status em tempo real
```bash
# Verificação rápida
curl -s -o /dev/null -w "%{http_code}" https://louvor-ide.web.app

# Verificação completa
./check-status.sh
```

### Logs e métricas
- **Console Firebase**: Estatísticas de uso
- **Chrome DevTools**: Performance e erros
- **Firebase CLI**: `firebase hosting:channel:list`

## 🎯 Resumo dos Comandos Essenciais

```bash
# Deploy
firebase deploy --only hosting

# Verificar status
./check-status.sh

# Teste rápido
curl -I https://louvor-ide.web.app

# Teste local
firebase serve --port 5000

# Informações do projeto
firebase hosting:sites:list
```

**✨ Seu site está online em: https://louvor-ide.web.app**
