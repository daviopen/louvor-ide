# Segurança — IDE Music

## Modelo de confiança

- Firebase Authentication é a fonte canônica de identidade.
- Google e e-mail/senha são os provedores aceitos.
- O frontend nunca é a autoridade final de acesso; toda leitura/escrita protegida é validada em `firestore.rules`.
- Senhas, credentials e ID tokens não são persistidos no Firestore ou `localStorage`.

## Papéis administrativos

O sistema reconhece `MEMBER`, `ADMIN` e `SUPER_ADMIN` no perfil `users/{uid}`. Custom Claims `admin`, `superAdmin` e `role` também são aceitas pelas Rules para cenários em que a administração de identidade migre para backend/Cloud Functions.

O bootstrap inicial de `davitads@gmail.com` como `SUPER_ADMIN` existe somente nas Firestore Rules. O endereço não é utilizado pelo JavaScript da aplicação como fonte de autorização. Depois do bootstrap, outros administradores podem ser gerenciados por um administrador autorizado sem depender de e-mail hardcoded no frontend.

## Menor privilégio e compatibilidade

Collections administrativas (`users`, `permissions`, `ministryFunctions` e `auditLogs`) possuem políticas específicas. Collections operacionais usam os níveis `NONE`, `READ` e `EDIT` da collection `permissions`.

Durante a migração do legado, `songs` e `setlists` mantêm o acesso operacional padrão para usuários autenticados/ativos, porque a aplicação atual ainda depende desses fluxos antes da entrega da matriz de permissões do Roadmap 13. Uma permissão explícita continua tendo precedência para os módulos já migrados. Esse fallback deve ser removido quando a matriz de permissões estiver populada para todos os usuários.

## Usuário inativo e sessão

- Firebase Auth desabilitado é tratado pelo fluxo de autenticação (`auth/user-disabled`).
- Quando existe `users/{uid}`, `active=false` bloqueia as Rules imediatamente.
- Logout chama `FirebaseAuth.signOut()` e redireciona para a tela de login.
- Rotas protegidas permanecem ocultas até a resolução de `onAuthStateChanged`.

## Operações críticas

No estado atual do produto não existe endpoint administrativo de servidor que necessite Cloud Functions para manter a segurança: alteração de autorização é protegida nas próprias Firestore Rules. Quando surgirem operações que exijam Firebase Admin SDK (por exemplo definir Custom Claims, criar/desabilitar contas ou rotinas privilegiadas em lote), elas devem ser implementadas em backend/Cloud Functions e nunca no cliente.

## Testes e CI/CD

`tests/firestore-rules.test.js` valida automaticamente o contrato de segurança das Rules, incluindo deny-by-default, bootstrap do Super Admin, Custom Claims, usuário inativo, permissões por módulo, proteção contra elevação e Audit Log append-only.

O pipeline deve validar as Rules, executar build/testes, publicar as Rules no projeto Firebase e somente depois publicar/validar o Hosting.
