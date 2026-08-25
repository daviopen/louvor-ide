# Modelo de dados — IDE Music

Versão atual do contrato: `DATA_MODEL_VERSION = 1`.

A fonte executável do contrato está em `src/models/data-model.js`. Os repositories canônicos ficam em `src/repositories/domain-repositories.js` e as regras de funções ministeriais em `src/services/ministry-functions-service.js`.

## Collections

| Collection | Finalidade | Referências principais |
| --- | --- | --- |
| `users` | Perfil mínimo ligado ao Firebase Auth | `uid` |
| `ministryFunctions` | Catálogo ordenável de funções ministeriais | — |
| `userFunctions` | Relação N:N Pessoa ↔ Função | `userId`, `functionId` |
| `permissions` | Nível de acesso por módulo | `userId` |
| `events` | Eventos/cultos | — |
| `unavailability` | Indisponibilidades | `userId`, `eventId?` |
| `schedules` | Escala vinculada a evento | `eventId` |
| `scheduleMembers` | Participações da escala | `scheduleId`, `userId`, `functionId` |
| `setlists` | Setlist do evento/escala | `eventId`, `scheduleId` |
| `setlistSongs` | Músicas e ordem de um setlist | `setlistId`, `songId`, `ministerUserId?` |
| `songs` | Biblioteca canônica de músicas | — |
| `songMinisterKeys` | Tom preferido por música/ministro | `songId`, `userId` |
| `auditLogs` | Trilha de auditoria append-only | `actorUserId` |
| `lgpdConsents` | Aceites versionados de documentos LGPD | `userId` |

## Relação Pessoa ↔ Função

`userFunctions` materializa a relação N:N. O ID é determinístico por `userId + functionId`, evitando duplicidade da mesma atribuição e permitindo que uma pessoa tenha várias funções e que uma função pertença a várias pessoas.

A remoção operacional do vínculo é uma inativação (`active: false`) para preservar histórico. Função ministerial não contém nível de permissão e não concede autorização do sistema.

## Funções iniciais

O seed idempotente cobre: Ministro, Back Vocal, Bateria, Baixo, Guitarra, Violão, Teclado, Sax e DM. O catálogo não é enum fechado: novas funções podem ser criadas, ordenadas e ativadas/inativadas.

## IDs determinísticos

Além de `userFunctions`, o mesmo padrão é utilizado para:

- `permissions`: `userId + module`;
- `songMinisterKeys`: `songId + userId`.

Isso torna `upsert` idempotente e evita documentos duplicados para relações naturalmente únicas.

## Timestamps

Repositories acrescentam `createdAt` e `updatedAt`. Valores `Date` enviados ao Firestore são convertidos pelo SDK para Timestamp. Datas/horas de domínio também devem ser persistidas como Timestamp quando os respectivos fluxos forem implementados.

## Segurança

Este item estabelece o modelo e a camada de persistência, mas **não substitui** o item 9 do roadmap. Autorização por permissão, Custom Claims, operações críticas em backend e Firestore Security Rules restritivas continuam pertencendo à etapa de Segurança.
