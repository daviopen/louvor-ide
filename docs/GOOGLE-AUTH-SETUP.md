# Ativação do login Google no Firebase

O código do MUSIC.IDE já contém a tela de login, persistência da sessão, retorno à página solicitada e proteção das páginas principais. A ativação no projeto Firebase exige estes passos administrativos.

## 1. Habilitar o provedor Google

No Firebase Console do projeto `louvor-ide`:

1. Abra **Authentication**.
2. Entre em **Sign-in method**.
3. Selecione **Google**.
4. Ative o provedor.
5. Escolha o e-mail de suporte do projeto e salve.

## 2. Conferir domínios autorizados

Em **Authentication > Settings > Authorized domains**, confirme:

- `louvor-ide.web.app`
- `louvor-ide.firebaseapp.com`
- `localhost`, para testes locais

## 3. Publicar o código

O deploy do Hosting continua sendo realizado pelo GitHub Actions quando a mudança entra na branch `main`.

## 4. Publicar as regras do Firestore

Depois de confirmar que o login Google funciona no Hosting, publique as regras:

```bash
firebase deploy --only firestore:rules --project louvor-ide
```

As regras incluídas nesta entrega exigem uma conta autenticada pelo Google para qualquer leitura ou escrita.

> Não publique as regras antes de habilitar o provedor e disponibilizar a tela de login, pois isso bloquearia a versão antiga da aplicação.

## Limite desta etapa

Qualquer conta Google consegue solicitar acesso ao aplicativo. A separação entre liderança (`admin`) e integrante (`member`), com aprovação de membros, será adicionada junto ao módulo de equipe e indisponibilidades.
