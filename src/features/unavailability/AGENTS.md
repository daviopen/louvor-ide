# Unavailability — AGENTS.md

Complementa o `/AGENTS.md` para indisponibilidades.

## Objetivo
Registrar indisponibilidades por pessoa e impedir seleção normal em escalas quando houver conflito de data, horário ou evento.

## Entidades e DTOs
- `Unavailability`: `id`, `userId`, `date`, `period?`, `eventId?`, `note?`, `createdBy`, `createdAt`, `updatedAt`.
- DTOs de criação/edição devem validar escopo próprio vs. administrativo.

## Regras e validações
- Data obrigatória.
- Período, evento específico e observação são opcionais.
- Usuário pode editar/excluir indisponibilidade futura própria.
- Admin pode atuar por outra pessoa com ator registrado.
- Conflito deve considerar data, horário/período e evento quando informados.
- Exceção administrativa em escala exige confirmação e auditoria.

## Permissões e rotas
- Usuário autenticado pode gerenciar as próprias indisponibilidades dentro das Rules.
- Gestão de terceiros exige permissão de edição administrativa/operacional.
- Rota sugerida: `/unavailability`.

## Services / Repositories / Components
- Service: validação temporal, conflito e autorização contextual.
- Repository: consultas por usuário, intervalo de datas e evento.
- UI: formulário, lista futura, calendário, filtros e estado vazio.

## Collections
- `unavailability`
- `events` para referência opcional
- `auditLogs` para atuação administrativa/exceções

## Segurança e LGPD
- Não permitir troca arbitrária de `userId` por usuário comum.
- Rules devem diferenciar registro próprio e gestão administrativa.
- Observações devem evitar coleta de dados sensíveis desnecessários.

## Testes
- data obrigatória;
- conflito por data/período/evento;
- usuário altera somente o próprio registro;
- admin registra para terceiro com ator;
- indisponível é excluído da seleção normal de escala.