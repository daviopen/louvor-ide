# Permissions — AGENTS.md

Complementa o `/AGENTS.md` para autorização do sistema.

## Objetivo
Controlar acesso por módulo e nível, separado de funções ministeriais, com menor privilégio e proteção também fora do frontend.

## Entidades e DTOs
- Níveis: `NONE`, `READ`, `EDIT`.
- Módulos: Dashboard, Users, Permissions, Unavailability, Events, Schedules, Setlists, Songs, Audit.
- `PermissionDTO`: `userId`, módulo, nível.
- Alterações em lote devem possuir preview/diff antes da persistência.

## Regras e validações
- `EDIT` implica leitura funcional do módulo.
- `NONE` bloqueia menu, rota e dados protegidos.
- Função ministerial nunca concede permissão automaticamente.
- `SUPER_ADMIN` é autorização sistêmica e não deve depender de e-mail hardcoded no frontend.
- Impedir autoelevação e remoção acidental do último mecanismo administrativo quando aplicável.

## Permissões e rotas
- `/permissions` exige leitura administrativa; alterações exigem edição administrativa.
- Guard de rota é UX/defesa adicional, não substitui Rules/backend.

## Services / Repositories / Components
- Service resolve permissões efetivas e valida mudanças.
- Repository encapsula `permissions` e leitura de claims quando aplicável.
- UI: matriz por usuário/módulo, estados Sem acesso/Leitura/Edição, preview e confirmação.

## Collections
- `permissions`
- `users` para status/identidade referencial
- `auditLogs` para alterações administrativas

## Segurança e LGPD
- Firestore Rules devem bloquear leitura/escrita independente da UI.
- Operações de elevação de privilégio podem exigir backend/Custom Claims.
- Não confiar em valores de permissão fornecidos pelo cliente sem validação confiável.

## Testes
- resolução de NONE/READ/EDIT;
- menu e rota respeitam permissão;
- escrita é negada a READ;
- payload não promove usuário indevidamente;
- mudanças administrativas geram auditoria.