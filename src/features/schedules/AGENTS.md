# Schedules — AGENTS.md

Complementa o `/AGENTS.md` para escalas.

## Objetivo
Montar uma escala por evento, relacionando funções ministeriais e usuários ativos/disponíveis com prevenção de conflitos e histórico consistente.

## Entidades e DTOs
- `Schedule`: `id`, `eventId`, `status`, `slots[{ id, functionId }]`, timestamps.
- `ScheduleMember`: `id`, `scheduleId`, `slotId`, `userId`, `functionId`, `active`, metadados de exceção quando aplicável.
- Exceção administrativa usa metadados mínimos como `exception.override` e `exception.reason`; nunca substitui a indisponibilidade original.
- DTOs devem separar adicionar/remover posição, adicionar/trocar/remover membro e registrar exceção administrativa.

## Regras e validações
- Uma escala por evento; geração idempotente e identificador derivado do evento quando aplicável.
- Funções/posições são dinâmicas, podem repetir a mesma função e não possuem limite estrutural fixo.
- Selecionar função antes do usuário.
- Usuário elegível deve estar ativo, possuir a função e estar disponível.
- Considerar indisponibilidades por data, horário/período e evento.
- Uma pessoa pode exercer múltiplas funções quando permitido pelo caso de uso.
- A mesma pessoa não deve ser duplicada na mesma função; conflitos devem gerar alerta.
- Exceção administrativa para indisponibilidade exige confirmação, motivo e auditoria.
- Remoções de integrantes devem preservar histórico por inativação (`active=false`) quando houver vínculo persistido.
- Escala é `COMPLETE` somente quando todas as posições configuradas possuem integrante ativo; caso contrário permanece `DRAFT`.

## Permissões e rotas
- Leitura/edição seguem módulo Escalas.
- Exceções administrativas exigem privilégio de edição.
- A área atual é acessada pelo módulo autenticado `module.html?section=schedules`; eventual rota dedicada deve preservar o mesmo contrato de domínio.

## Services / Repositories / Components
- Service coordena usuários, funções, indisponibilidade, conflitos, completude e membros.
- Repositories: `schedules`, `scheduleMembers`; não consultar Firestore diretamente na UI.
- UI: busca/autocomplete de pessoas elegíveis, avatar, badges, agrupamento, troca/remoção, fluxo explícito de exceção e UX específica mobile.
- A seleção normal nunca deve misturar indisponíveis; usuários indisponíveis só aparecem no fluxo administrativo de exceção.

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
- Não apagar indisponibilidade para viabilizar uma escala; preservar ambas as evidências.

## Testes
- uma escala por evento e idempotência;
- elegibilidade por função/status/disponibilidade;
- conflitos e exceções;
- múltiplas funções quando permitido e bloqueio de duplicidade na mesma função;
- completude baseada nas posições configuradas;
- histórico/filtros não alteram dados;
- usuário sem edição não modifica escala;
- seleção normal não expõe indisponíveis e fluxo de exceção exige confirmação/motivo;
- regressão de Eventos ao integrar a área de Escalas.
