# Firebase Actions Safety

Este documento define a política de uso do Firebase pelos GitHub Actions do IDE Music.

## Workflows permanentes

A automação do repositório é deliberadamente mínima:

- `.github/workflows/tests.yml` — validação de código e build;
- `.github/workflows/deploy.yml` — publicação em produção;
- `.github/workflows/notifications.yml` — processamento da fila de notificações.

Migrações, backfills, cleanup, reconciliações e auditorias não ficam expostos como workflows permanentes.

## Tests

`Tests` executa em `pull_request` e `push` para `main`.

Pode executar:

- lint;
- testes unitários e de integração;
- build;
- testes de Firestore Rules usando Firebase Emulator;
- verificações estáticas de segurança do repositório.

Não pode usar o Firestore/Auth de produção como ambiente de teste.

## Deploy

`Deploy` pode ser acionado manualmente ou automaticamente após `Tests` concluir com sucesso em `main`.

Pode:

- construir o artefato;
- publicar Firestore Rules;
- publicar Firebase Hosting;
- executar smoke test estático de páginas e assets públicos.

Não pode:

- criar usuários;
- autenticar usuários de teste;
- persistir fixtures;
- executar E2E mutável;
- executar migrações, cleanup ou backfills.

## Notifications

`Notifications` é uma exceção operacional explícita: faz parte do runtime do IDE Music e acessa produção para entregar notificações.

Regras obrigatórias:

- agenda a cada 10 minutos e permite `workflow_dispatch`;
- usa concorrência única `notification-outbox-production`;
- processa no máximo 25 itens por ciclo;
- limita tentativas e recupera locks antigos;
- acessa apenas a fila e os documentos necessários aos destinatários;
- usa a service account de produção somente nesse job;
- não executa E2E, migração ou varredura global;
- a chave VAPID pública só é atualizada quando necessário;
- a chave privada VAPID permanece em `notificationSecrets/webPush`.

## Operações administrativas

Scripts de migração, backfill, cleanup, reconciliação e auditoria continuam versionados quando forem úteis, mas devem ser executados manualmente em ambiente controlado.

Antes de qualquer execução contra produção:

1. revisar o diff e o script;
2. estimar leituras, gravações e exclusões;
3. usar dry-run quando disponível;
4. confirmar explicitamente qualquer operação mutável;
5. garantir que a operação não esteja acoplada a `Tests` ou `Deploy`.

## Custo e consumo

`Tests` deve usar Emulator e recursos locais sempre que possível. `Deploy` deve evitar repetir testes já executados. `Notifications` deve permanecer limitado por lote e frequência.

A criação de um quarto workflow permanente exige justificativa operacional clara.
