# Auth — AGENTS.md

Complementa o `/AGENTS.md` para autenticação e sessão.

## Objetivo
Centralizar entrada, recuperação e encerramento de sessão usando Firebase Authentication como fonte canônica de identidade.

## Entidades e DTOs
- Identidade Firebase: `uid`, `email`, `displayName`, `photoURL`, `emailVerified`.
- `AuthSessionDTO`: identidade autenticada + estado de carregamento; nunca incluir senha/token persistido.
- `LoginDTO`: somente dados transitórios necessários ao provedor escolhido.

## Regras e validações
- Suportar Google e e-mail/senha.
- Recuperação de senha deve usar fluxo nativo do Firebase Authentication.
- Nunca persistir senha, hash, credential ou ID token em Firestore/localStorage.
- Tratar usuário desativado, sessão expirada e falha de provedor com erro padronizado.
- Login autentica; autorização é resolvida separadamente por permissões.

## Permissões e rotas
- Rotas públicas: login e recuperação de senha.
- Rotas protegidas exigem sessão válida e usuário ativo.
- Auth não concede privilégio administrativo por e-mail ou função ministerial.

## Services / Repositories / Components
- Services: login, logout, recuperação e observação da sessão.
- Repositories/core: encapsular SDK Firebase Auth; UI não chama SDK diretamente.
- Components: formulário de login, botão Google, recuperação, feedback de erro/loading.

## Collections
Auth não deve criar collection para credenciais. Perfil complementar pertence a `users`; consentimentos a `lgpdConsents`.

## Segurança e LGPD
- Não logar credenciais/tokens.
- Não usar `localStorage` como fonte de identidade/autorização.
- Minimizar dados de perfil copiados do provedor.
- Logout deve encerrar a sessão Firebase e limpar apenas estado local não sensível.

## Testes
- login Google/e-mail delegam ao adapter correto;
- logout limpa estado da aplicação;
- sessão expirada/desativada gera estado seguro;
- rota protegida não libera conteúdo antes da resolução da sessão;
- nenhuma senha/token é persistida.