# Ativação do acesso no Firebase

O MUSIC.IDE oferece login com Google ou e-mail/senha, persistência da sessão, recuperação de senha, retorno à página solicitada e proteção das páginas principais. Não existe cadastro público: contas de e-mail/senha são criadas pela liderança no Firebase.

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

## 3. Habilitar e-mail/senha

Em **Authentication > Sign-in method**, habilite **E-mail/senha**. Para liberar uma pessoa, use **Authentication > Users > Add user**. Não habilite cadastro público na aplicação.

## 4. Publicar o código

O deploy do Hosting continua sendo realizado pelo GitHub Actions quando a mudança entra na branch `main`.

## 5. Publicar as regras do Firestore

Depois de confirmar que o login Google funciona no Hosting, publique as regras:

```bash
firebase deploy --only firestore:rules --project louvor-ide
```

As regras incluídas nesta entrega exigem autenticação por Google ou e-mail/senha para qualquer leitura ou escrita.

> Não publique as regras antes de habilitar o provedor e disponibilizar a tela de login, pois isso bloquearia a versão antiga da aplicação.

## Limite desta etapa

Qualquer conta Google consegue solicitar acesso ao aplicativo; por e-mail/senha, somente contas cadastradas no Firebase entram. A separação entre liderança (`admin`) e integrante (`member`) será adicionada junto ao módulo de equipe e indisponibilidades.
