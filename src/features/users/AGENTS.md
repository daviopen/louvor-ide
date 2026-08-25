# Users — AGENTS.md

Complementa o `/AGENTS.md` para gestão de usuários.

## Objetivo
Gerenciar perfis da aplicação, status ativo/inativo, funções ministeriais e metadados operacionais sem armazenar credenciais.

## Entidades e DTOs
- `User`: `id/uid`, `name`, `email`, `photoURL`, `active`, `createdAt`, `updatedAt`, `lastAccessAt?`.
- Relação N:N com funções via `userFunctions`.
- `CreateUserDTO` e `UpdateUserDTO` devem aceitar somente campos editáveis explicitamente.

## Regras e validações
- E-mail deve ser válido e normalizado.
- Usuário com histórico deve ser inativado, não excluído fisicamente.
- Uma pessoa pode possuir múltiplas funções ministeriais.
- Nunca armazenar ou exibir senha.
- Alterações administrativas relevantes geram Audit Log.

## Permissões e rotas
- Leitura: permissão de leitura no módulo Usuários.
- Criação/edição/inativação: permissão de edição.
- Usuário comum pode ler/editar somente os próprios campos permitidos quando previsto pelas Rules.
- Rota sugerida: `/users` e `/users/:id`.

## Services / Repositories / Components
- `UserService`: criação de perfil, edição segura, ativação/inativação, busca/filtros.
- `UserRepository`: `users` e consultas paginadas.
- Relações com funções devem passar pelo domínio `roles`/repositório apropriado.
- UI: lista, filtros, paginação, formulário, avatar, chips de função e status.

## Collections
- `users`
- `userFunctions`
- `auditLogs`

## Segurança e LGPD
- Minimizar campos pessoais.
- Impedir alteração de campos de autorização por payload arbitrário.
- Não permitir que edição de perfil eleve privilégios.
- Firestore Rules devem restringir campos e operações administrativas.

## Testes
- criação/edição validam campos permitidos;
- inativação preserva registro;
- filtros/paginação geram consultas previsíveis;
- usuário sem edição não altera terceiros;
- payload não consegue alterar permissões por meio de `users`.