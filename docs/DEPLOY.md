# Deploy do Louvor IDE para Firebase Hosting

Este projeto está configurado para ser hospedado no Firebase Hosting.

## Configuração

Os arquivos de configuração já estão prontos:
- `firebase.json` - Configuração do hosting
- `.firebaserc` - Configuração do projeto Firebase

## Como fazer o deploy

### Método 1: Usando Firebase CLI (Recomendado)

1. **Instale o Firebase CLI** (se não tiver):
```bash
npm install -g firebase-tools
```

2. **Faça login no Firebase**:
```bash
firebase login
```

3. **Faça o deploy**:
```bash
firebase deploy --only hosting
```

### Método 2: Deploy manual via Console Firebase

1. Acesse o [Console Firebase](https://console.firebase.google.com/)
2. Selecione o projeto `louvor-ide`
3. Vá em "Hosting" no menu lateral
4. Clique em "Começar" ou "Deploy"
5. Faça upload dos arquivos do projeto

## Estrutura do projeto para Hosting

O projeto está configurado para usar o diretório raiz como público, ignorando:
- `firebase.json`
- `**/.*` (arquivos ocultos)
- `**/node_modules/**`
- `README.md`
- `clear-storage.js`
- `github-pages-config.js`
- `setup-github-pages.html`

## URLs após o deploy

Após o deploy, seu site estará disponível em:
- URL principal: `https://louvor-ide.web.app`
- URL alternativa: `https://louvor-ide.firebaseapp.com`

## Comandos úteis

- `firebase serve` - Testar localmente antes do deploy
- `firebase deploy --only hosting` - Deploy apenas do hosting
- `firebase hosting:disable` - Desabilitar hosting
- `firebase projects:list` - Listar projetos

## Configurações de cache

O projeto está configurado com cache otimizado:
- Arquivos JS/CSS: Cache de 1 ano (31536000 segundos)
- Outros arquivos: Cache padrão do Firebase
