# AGENTS.md — GitHub Actions e custo de validação

Estas regras complementam o `AGENTS.md` raiz e são obrigatórias para qualquer alteração em `.github/`.

## Objetivo

O pipeline deve proteger a qualidade do IDE Music sem transformar cada alteração em uma bateria de testes contra o Firebase de produção. Cloud Firestore, Firebase Authentication e navegação E2E de produção são recursos operacionais e não devem ser consumidos automaticamente a cada push/deploy.

## Pipeline automático permitido

1. `✅ Quality Gate` pode executar em `push`/`pull_request` e deve concentrar lint, testes unitários, testes de integração, build e Firestore Security Rules.
2. Testes de Firestore executados automaticamente devem usar **Firebase Emulator** (`demo-louvor-ide` ou equivalente), nunca o projeto `louvor-ide` real.
3. O deploy automático só deve ocorrer após `✅ Quality Gate` concluído com sucesso na branch `main`/`master`.
4. O pós-deploy automático deve ser apenas um **smoke test estático e barato**: HTTP 200 de poucas páginas/assets públicos. Não autenticar usuário, não navegar pelo sistema, não criar dados e não consultar Firestore.
5. Não duplicar `npm test`, testes de Rules e auditorias completas no workflow de deploy quando eles já foram executados no Quality Gate.

## Workflows de produção exclusivamente manuais

Os workflows abaixo operam sobre a aplicação/banco reais ou fazem navegação extensa e, por isso, devem permanecer somente com `workflow_dispatch`:

- `production-e2e.yml` — validação funcional da aplicação publicada;
- `full-system-playwright-e2e.yml` — simulação completa Playwright;
- `visual-audit.yml` — auditoria visual desktop/mobile e temas;
- `auth-account-linking.yml` — reconciliação de identidades Firebase Auth;
- `setlist-production-e2e.yml` — validação específica do Setlist publicado;
- `legacy-data-cleanup.yml` — limpeza/restauração de dados legados;
- `data-migration.yml` — migração/verificação de dados;
- `schedule-template-backfill.yml` — backfill de templates nas escalas.

É proibido adicionar `push`, `pull_request`, `workflow_run` ou `schedule/cron` a esses workflows sem uma solicitação explícita do responsável pelo projeto.

## Operações administrativas e migrações

- Reconciliações de Auth, backfills, migrações, limpezas e provisionamentos de usuários/dados reais devem ser **manuais e intencionais**.
- Essas operações não podem ser acopladas ao deploy.
- Antes de qualquer script com `firebase-admin` ser adicionado a um workflow automático, avaliar quantas leituras, gravações e exclusões ele pode gerar. O padrão é não permitir acesso ao banco real.
- Consultas globais como `db.collection(...).get()` em produção não devem rodar automaticamente.

## Testes E2E em produção

- E2E de produção é ferramenta de diagnóstico/aceite, não gate de cada deploy.
- Deve ser acionado manualmente quando houver necessidade de validar uma mudança importante ou investigar regressão.
- Quando criar dados temporários, o teste deve removê-los no `finally`/cleanup.
- Evitar crawlers de todas as rotas quando uma validação direcionada resolver o problema.
- Para CI recorrente, preferir emulator, fixtures locais e mocks controlados.

## Regra para pós-deploy

O pós-deploy automático pode verificar disponibilidade do Hosting, mas não deve:

- fazer login;
- criar usuário Firebase Auth;
- criar/editar/excluir documentos;
- listar collections;
- abrir todas as páginas com Playwright;
- executar auditoria visual completa;
- reconciliar identidades;
- executar migrações, limpezas ou backfills.

Se uma dessas verificações for necessária, usar o workflow manual apropriado.

## Controle de custo

Ao alterar Actions, considerar explicitamente o custo em:

- leituras/gravações/exclusões do Firestore;
- operações de Firebase Auth;
- minutos do GitHub Actions;
- downloads do Firebase Hosting;
- repetição desnecessária entre workflows.

A regra de engenharia é: **validação barata e isolada automaticamente; validação onerosa de produção somente sob demanda**.
