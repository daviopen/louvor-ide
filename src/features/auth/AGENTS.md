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
- Login autentica; autorização é resolvida separadamente por perfil e permissões.
- Uma sessão Firebase sem `users/{uid}` não é suficiente para acessar a aplicação.
- `users/{uid}.active` deve ser explicitamente `true`; perfil ausente ou inativo falha fechado.

## Permissões e rotas
- Rotas públicas: login e recuperação de senha.
- Rotas protegidas exigem sessão válida, `users/{uid}` existente e `active=true`.
- Auth não concede privilégio administrativo por e-mail ou função ministerial.
- `MEMBER`, `ADMIN` e `SUPER_ADMIN` são papéis de autorização do sistema, independentes de funções ministeriais.
- O bootstrap do primeiro `SUPER_ADMIN` pode existir exclusivamente nas Firestore Rules; o frontend não deve conter nem comparar o e-mail de bootstrap.
- Quando o perfil inicial ainda não existe, o frontend pode tentar criar um perfil `SUPER_ADMIN` sem conhecer a identidade privilegiada; a operação deve ser aceita exclusivamente pelas Rules para a identidade/claim de bootstrap e negada para qualquer outra conta.
- Usuário comum nunca pode criar/ativar o próprio perfil `MEMBER`; criação/ativação é operação administrativa.
- Custom Claims (`admin`, `superAdmin` ou `role`) podem complementar o perfil quando uma operação exigir backend/Admin SDK.
- Alterar papel, estado ativo ou permissões deve ser autorizado pelas Rules; nunca confiar em `localStorage`, DOM ou parâmetros da rota.

## Services / Repositories / Components
- Services: login, logout, recuperação, observação da sessão e resolução do perfil autorizado.
- Repositories/core: encapsular SDK Firebase Auth/Firestore; UI não chama SDK diretamente.
- Components: formulário de login, botão Google, recuperação, feedback de erro/loading.

## Collections
Auth não deve criar collection para credenciais. Perfil complementar pertence a `users`; consentimentos a `lgpdConsents`.

## Segurança e LGPD
- Não logar credenciais/tokens.
- Não usar `localStorage` como fonte de identidade/autorização.
- Minimizar dados de perfil copiados do provedor.
- Logout deve encerrar a sessão Firebase e limpar apenas estado local não sensível.
- `users/{uid}.active=false` deve bloquear acesso nas Firestore Rules e no gate da aplicação mesmo quando a sessão Firebase ainda existir.
- Perfil ausente deve bloquear os domínios protegidos; não usar fallback “qualquer autenticado”.
- `auditLogs` é append-only para o cliente; atualização/exclusão deve permanecer negada.
- Collections sem regra explícita devem permanecer negadas por padrão.

## Testes
- login Google/e-mail delegam ao adapter correto;
- logout limpa estado da aplicação;
- sessão expirada/desativada gera estado seguro;
- rota protegida não libera conteúdo antes da resolução da sessão e do perfil;
- perfil ausente/inativo é rejeitado;
- nenhuma senha/token é persistida;
- Rules negam collections desconhecidas e elevação indevida;
- Rules validam usuário ativo, papéis administrativos e permissões `READ`/`EDIT`;
- o e-mail inicial do Super Admin não aparece no JavaScript do frontend;
- E2E de produção cria uma conta temporária, confirma que ela não pode se autoativar nem ler dados protegidos, valida login/recuperação/Google pela UI e remove a conta ao final.
