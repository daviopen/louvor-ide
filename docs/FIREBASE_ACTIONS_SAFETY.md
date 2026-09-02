# Firebase Actions Safety

Este documento define a política de uso do Firebase pelos GitHub Actions do IDE Music.

## Regra principal

Produção (`louvor-ide`) não pode ser usada como ambiente de escrita por testes automatizados.

- CI de `pull_request`/`push`: somente testes locais, mocks e Firebase Emulator.
- Deploy: pode publicar Hosting e Firestore Rules, mas não executa E2E mutável.
- QA de produção: somente leitura, sem service account administrativa e sem criar/apagar fixtures.
- E2E que cria, altera ou apaga dados: somente em projeto Firebase separado de staging/teste.
- Migrações, backfills, cleanup e operações administrativas reais: somente `workflow_dispatch` e com confirmação explícita quando houver escrita.

## Produção read-only

`.github/workflows/production-e2e.yml` valida apenas páginas/assets públicos e configuração pública do Hosting. Ele não recebe `FIREBASE_SERVICE_ACCOUNT_LOUVOR_IDE` e não deve acessar Firestore/Auth de forma mutável.

## E2E mutável em staging

Os workflows abaixo são isolados de produção:

- `.github/workflows/full-system-playwright-e2e.yml`
- `.github/workflows/visual-audit.yml`

Configuração esperada no GitHub:

- Repository variable `E2E_BASE_URL`: URL publicada do ambiente de teste.
- Repository variable `E2E_FIREBASE_PROJECT_ID`: project id Firebase do ambiente de teste.
- Repository secret `FIREBASE_SERVICE_ACCOUNT_E2E`: service account exclusiva desse ambiente.

Os workflows abortam antes da autenticação quando detectam `louvor-ide`, `louvor-ide.web.app` ou `louvor-ide.firebaseapp.com`.

## Operações administrativas de produção

Workflows de migração, cleanup, reconciliação e backfill permanecem manuais. Operações mutáveis exigem o texto de confirmação:

`LOUVOR-IDE-PRODUCTION`

A confirmação reduz disparos acidentais, mas não substitui revisão do script/diff antes da execução.

## Custo e consumo

Leituras/escritas do Firestore e operações do Firebase Auth feitas por testes em staging ficam separadas do banco de produção. O `Quality Gate` usa o Firestore Emulator (`demo-louvor-ide`) e, portanto, não deve consumir operações de documentos do Firestore de produção.

## Ao criar um novo workflow

Antes de adicionar um Action que use Firebase:

1. determine se ele precisa apenas de Hosting estático, leitura ou escrita;
2. prefira Emulator para testes automatizados;
3. nunca forneça service account de produção a um teste que possa persistir dados;
4. se houver escrita de teste, use staging e bloqueie explicitamente o project id/URL de produção;
5. se for uma operação administrativa real, use somente `workflow_dispatch`, dry-run quando possível e confirmação explícita;
6. não encadeie E2E mutável ao deploy de produção.
