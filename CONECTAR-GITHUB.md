# 🔗 Conectar ao GitHub - Louvor IDE

## ✅ Git já configurado!

- ✅ Repositório inicializado
- ✅ Configurações locais: `daviopen` / `davitads@gmail.com`
- ✅ Branch principal: `main`
- ✅ Primeiro commit realizado

## 🚀 Próximos passos - Criar repositório no GitHub:

### 1. **Criar repositório no GitHub:**
1. Acesse: https://github.com/new
2. **Repository name:** `louvor-ide`
3. **Description:** `🎵 Sistema completo para gerenciamento de cifras musicais`
4. **Visibility:** ✅ **Public** (recomendado para CI/CD gratuito)
5. **❌ NÃO marque:** "Add a README file" (já temos)
6. **❌ NÃO marque:** "Add .gitignore" (já temos)
7. Clique em **"Create repository"**

### 2. **Adicionar chave SSH no GitHub:**

1. **Copie a chave pública:** 
   ```
   ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIJPHGm269WpQjQUEsS0wOIf87fAMt1Ovl3wG2ccVGmqZ davitads@gmail.com
   ```

2. **No GitHub:**
   - Vá para: `Settings` → `SSH and GPG keys`
   - Clique: `New SSH key`
   - **Title:** `Louvor IDE - WSL`
   - **Key:** Cole a chave pública acima
   - Clique: `Add SSH key`

### 3. **Conectar repositório local ao GitHub (SSH):**

```bash
# Adicionar remote do GitHub via SSH
git remote add origin git@github.com:daviopen/louvor-ide.git

# Fazer push inicial
git push -u origin main
```

### 3. **Configurar CI/CD (após push):**

No GitHub, configure o secret necessário:

1. **Vá para:** `Settings` → `Secrets and variables` → `Actions`
2. **Clique:** "New repository secret"
3. **Nome:** `FIREBASE_SERVICE_ACCOUNT_LOUVOR_IDE`
4. **Valor:** JSON da service account do Firebase (veja GITHUB-ACTIONS.md)

## 🎯 URLs finais:

- **Repositório:** https://github.com/daviopen/louvor-ide
- **Site:** https://louvor-ide.web.app
- **Actions:** https://github.com/daviopen/louvor-ide/actions

## 📋 Comandos prontos para copiar:

```bash
# Conectar ao GitHub
cd "/home/wsl/meus projetos/louvor-ide"
git remote add origin https://github.com/daviopen/louvor-ide.git
git push -u origin main
```

## 🔄 Workflow diário após setup:

```bash
# Fazer alterações no código...

# Commit e push
git add .
git commit -m "feat: descrição da alteração"
git push

# Deploy automático será acionado! 🚀
```

---

**🎵 Tudo pronto para o GitHub! 🚀**
