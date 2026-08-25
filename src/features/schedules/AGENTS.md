# Schedules — AGENTS.md

Complementa o `/AGENTS.md` para escalas.

## Objetivo
Montar uma escala por evento, relacionando funções ministeriais e usuários ativos/disponíveis com prevenção de conflitos e histórico consistente.

## Entidades e DTOs
- `Schedule`: `id`, `eventId`, `status?`, timestamps.
- `ScheduleMember`: `id`, `scheduleId`, `userId`, `functionId`, metadados de exceção quando aplicável.
- DTOs devem separar adicionar membro, trocar usuário/função e registrar exceção administrativa.

## Regras e validações
- Uma escala por evento; geração idempotente.
- Funções são dinâmicas e não possuem limite estrutural fixo.
- Selecionar função antes do usuário.
- Usuário elegível deve estar ativo, possuir a função e estar disponível.
- Considerar indisponibilidades por data, horário e evento.
- Uma pessoa pode exercer múltiplas funções quando permitido pelo caso de uso.
- Duplicidades/conflitos devem gerar alerta; exceção administrativa requer confirmação e auditoria.
- Escala deve indicar estado completa/incompleta por critério definido pelo domínio, sem hardcode visual disperso.

## Permissões e rotas
- Leitura/edição seguem módulo Escalas.
- Exceções administrativas exigem privilégio de edição.
- Rotas sugeridas: `/schedules`, `/schedules/:id`.

## Services / Repositories / Components
- Service coordena usuários, funções, indisponibilidade e membros.
- Repositories: `schedules`, `scheduleMembers`; não consultar Firestore diretamente na UI.
- UI: autocomplete, avatar, badges, agrupamento, troca/remoção e UX específica mobile.

## Collections
- `schedules`
- `scheduleMembers`
- `events`
- `users`
- `userFunctions`
- `ministryFunctions`
- `unavailability`
- `auditLogs`

## Segurança e LGPD
- Validar server-side/Rules as operações permitidas quando aplicável.
- Não aceitar `userId/functionId` incompatíveis apenas porque vieram do cliente.
- Exceções devem registrar ator, motivo e contexto mínimo.

## Testes
- uma escala por evento e idempotência;
- elegibilidade por função/status/disponibilidade;
- conflitos e exceções;
- múltiplas funções quando permitido;
- histórico/filtros não alteram dados;
- usuário sem edição não modifica escala.