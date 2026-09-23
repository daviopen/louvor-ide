# AGENTS.md — GitHub Actions e custo de validação

Estas regras complementam o `AGENTS.md` raiz e são obrigatórias para qualquer alteração em `.github/`.

## Estrutura oficial

O IDE Music mantém somente três workflows permanentes:

- `tests.yml` — lint, testes unitários e de integração, build, Firestore Rules no Emulator e verificações de segurança;
- `deploy.yml` — deploy de produção após `Tests` concluir com sucesso na branch `main`, com smoke test estático;
- `notifications.yml` — worker operacional de notificações, agendado e também acionável manualmente.

Não criar workflows adicionais permanentes sem necessidade operacional clara e aprovação explícita do responsável pelo projeto.

## Testes

- `Tests` pode executar em `push` e `pull_request` para `main`.
- Testes de Firestore devem usar Firebase Emulator (`demo-louvor-ide` ou equivalente), nunca o projeto `louvor-ide` real.
- O build faz parte de `Tests`; não criar workflow separado apenas para repetir o mesmo build.
- Testes E2E, auditorias visuais e validações extensas não devem executar automaticamente contra produção.

## Deploy

- `Deploy` só deve iniciar automaticamente após `Tests` concluir com sucesso em `main`.
- O deploy pode publicar Hosting e Firestore Rules.
- O pós-deploy deve ser um smoke test estático e barato.
- O pós-deploy não pode fazer login, criar usuários, criar/editar/excluir documentos, listar collections ou executar migrações/backfills.

## Notifications

`Notifications` é parte do runtime do IDE Music e pode acessar produção.

Regras obrigatórias:

- execução agendada a cada 10 minutos e `workflow_dispatch`;
- uma única execução concorrente;
- lote máximo de 25 itens;
- service account de produção apenas no job do worker;
- sem E2E, crawler, migração ou varredura global;
- chave privada VAPID nunca exposta no workflow ou frontend.

## Operações administrativas

Migrações, backfills, cleanup, reconciliações de Auth e auditorias permanecem como scripts no repositório, mas não como workflows permanentes.

Quando uma dessas operações for necessária:

- revisar o script e o impacto em produção;
- executar de forma manual e intencional em ambiente controlado;
- exigir confirmação explícita antes de qualquer escrita destrutiva;
- preferir dry-run;
- nunca acoplar a operação ao deploy automático.

## Controle de custo

Evitar:

- leituras/gravações desnecessárias no Firestore;
- operações de Firebase Auth em CI;
- workflows duplicados;
- builds repetidos sem necessidade;
- crawlers e E2E automáticos de produção.

A regra de engenharia é: validação barata e isolada automaticamente; operações de produção apenas quando necessárias.
