# Migração de dados — P8

## Objetivo

Concluir a transição das estruturas históricas para as collections canônicas do IDE Music sem perda de dados, preservando IDs e referências.

## Inventário

Collections canônicas:

- `users`
- `ministryFunctions`
- `userFunctions`
- `permissions`
- `events`
- `unavailability`
- `schedules`
- `scheduleMembers`
- `setlists`
- `setlistSongs`
- `songs`
- `songMinisterKeys`
- `auditLogs`
- `lgpdConsents`

Aliases legados reconhecidos pelo migrador:

| Legado | Canônico |
| --- | --- |
| `musicas` | `songs` |
| `usuarios` | `users` |
| `funcoesMinisteriais` | `ministryFunctions` |
| `funcoesUsuarios` | `userFunctions` |
| `permissoes` | `permissions` |
| `indisponibilidades` | `unavailability` |
| `eventos` | `events` |
| `escalas` | `schedules` |
| `membrosEscala` | `scheduleMembers` |
| `repertorios` | `setlists` |

`setlistSongs`, `songMinisterKeys`, `auditLogs` e `lgpdConsents` já nasceram no modelo atual e não possuem alias legado conhecido no projeto.

## Estratégia

O script `src/scripts/migrate-legacy-data.cjs` segue as regras abaixo:

1. dry-run é o modo padrão;
2. IDs dos documentos são preservados;
3. documentos canônicos existentes nunca são sobrescritos;
4. a origem nunca é removida durante a migração;
5. cada execução `--apply` cria um manifesto em `_migrationRuns` contendo somente os documentos criados;
6. `--verify` compara contagens e verifica documentos faltantes/conflitantes;
7. `--rollback=<runId>` remove somente documentos criados pelo run informado.

Para músicas, os campos históricos são mantidos e também são preenchidos aliases canônicos (`title`, `artist`, `originalKey`, `theme`, `referenceLink`, `chord`, `lyrics`, `notes`).

## Execução

```bash
npm run migrate:dry-run
npm run migrate:apply
npm run migrate:verify
node src/scripts/migrate-legacy-data.cjs --rollback=<runId>
```

O workflow `.github/workflows/data-migration.yml` executa `--apply` em push para `main` e, em seguida, `--verify`. Também permite execução manual em `dry-run`, `apply` ou `verify`.

## Validação antes/depois

Para cada mapeamento o relatório contém:

- quantidade na origem;
- quantidade no destino;
- quantidade de documentos da origem que ainda não existem no destino;
- conflitos detectados.

A execução falha quando restar documento ausente ou conflito após `--apply`/`--verify`.

## Rollback

A migração não apaga a origem. Portanto há duas camadas de rollback:

1. a collection legada permanece intacta;
2. o manifesto `_migrationRuns/<runId>` permite remover somente os documentos criados naquele run.

A remoção definitiva de aliases/collections legadas só deve ocorrer depois de a aplicação estar lendo exclusivamente as collections canônicas e de existir evidência de produção sem regressão.

## Critério de encerramento

O item de migração pode ser considerado concluído quando:

- o workflow de migração em `main` terminar com sucesso;
- `--verify` retornar zero documentos faltantes e zero conflitos;
- os testes automatizados estiverem verdes;
- o deploy e os E2E de produção estiverem verdes.
