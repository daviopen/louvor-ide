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
- `module.html?section=schedules` é a listagem/consulta das escalas.
- A edição deve abrir uma única escala por vez em `module.html?section=schedules&scheduleId=<id>`; não renderizar vários editores na mesma tela.

## Services / Repositories / Components
- Service coordena usuários, funções, indisponibilidade, conflitos, completude e membros.
- Repositories: `schedules`, `scheduleMembers`; não consultar Firestore diretamente na UI.
- Listagem: um card resumido por evento, status de completude, integrantes e ação `Editar escala`, mantendo filtros históricos.
- Editor: uma escala por tela, breadcrumb/voltar, posições por função, avatar, troca/remoção e adição de função.
- A seleção normal de pessoa deve usar um único campo pesquisável/autocomplete por função; não duplicar input de busca + select para a mesma ação.
- A seleção normal nunca deve misturar indisponíveis; usuários indisponíveis só aparecem no fluxo administrativo de exceção.
- UX deve ser específica para mobile e preservar hierarquia visual clara entre evento, função e pessoa.

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
- listagem separada do editor individual por `scheduleId`;
- histórico/filtros não alteram dados;
- usuário sem edição não modifica escala;
- seleção normal usa um único combobox pesquisável e não expõe indisponíveis;
- fluxo de exceção exige confirmação/motivo;
- regressão de Eventos ao integrar a área de Escalas.
