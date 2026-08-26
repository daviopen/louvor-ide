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

## Resultado em produção — 26/08/2026

A execução `migration_2026-08-26T19-33-25-743Z_9095d806` terminou com sucesso.

- `musicas`: 119 documentos de origem;
- `songs`: 119 documentos após a migração;
- documentos criados: 119;
- documentos faltantes: 0;
- conflitos: 0;
- `usuarios`, `funcoesMinisteriais`, `funcoesUsuarios`, `permissoes`, `indisponibilidades`, `eventos`, `escalas`, `membrosEscala` e `repertorios`: nenhuma origem legada restante a migrar;
- a verificação independente `--verify` também retornou sucesso.

## Validação antes/depois

Para cada mapeamento o relatório contém:

- quantidade na origem;
- quantidade no destino;
- quantidade de documentos da origem que ainda não existem no destino;
- conflitos detectados.

A execução falha quando restar documento ausente ou conflito após `--apply`/`--verify`.

## Limpeza pós-migração

Depois do cutover do runtime para `songs`, o script `src/scripts/cleanup-legacy-data.cjs` trata a remoção de `musicas`.

A limpeza automática só é executada depois de o workflow de deploy em `main` terminar com sucesso. Antes de apagar qualquer documento, o script:

1. confirma que todos os IDs de `musicas` existem em `songs`;
2. arquiva cada documento em `_legacyArchives/musicas/documents`;
3. valida o arquivo;
4. remove a origem em batches;
5. confirma que `musicas` ficou vazia e que `songs` preserva a cobertura.

O modo `--restore-musicas` recompõe a collection legada a partir do arquivo, caso seja necessário rollback operacional.

## Rollback

Antes da limpeza definitiva, o manifesto `_migrationRuns/<runId>` permite remover somente os documentos canônicos criados pelo run de migração. Depois da limpeza, `_legacyArchives/musicas/documents` mantém uma cópia restaurável dos documentos históricos.

## Critério de encerramento

O item de migração pode ser considerado concluído quando:

- o workflow de migração em `main` terminar com sucesso;
- `--verify` retornar zero documentos faltantes e zero conflitos;
- os testes automatizados estiverem verdes;
- o deploy pós-cutover estiver verde;
- o workflow de limpeza confirmar arquivo e remoção da collection legada;
- os E2E de produção relevantes estiverem verdes.
