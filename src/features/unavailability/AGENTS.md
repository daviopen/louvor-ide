# Unavailability — AGENTS.md

Complementa o `/AGENTS.md` para indisponibilidades.

## Objetivo
Registrar indisponibilidades por pessoa e impedir seleção normal em escalas quando houver conflito de data ou intervalo, recorrência semanal, horário/período ou evento.

## Entidades e DTOs
- `Unavailability`: `id`, `userId`, `date`, `endAt`, `recurrence?`, `period?`, `eventId?`, `note?`, `createdBy`, `updatedBy`, `createdAt`, `updatedAt`.
- `date` representa o início do primeiro dia em que a indisponibilidade pode valer.
- `endAt` representa o final da vigência. Quando o usuário não informa data de fim em um registro pontual, `endAt` deve ser o final do mesmo dia de `date`.
- A UI recebe `endDate?` como campo opcional e o Service converte para `endAt`, mantendo compatibilidade com os documentos existentes.
- `recurrence` é opcional. Quando presente, atualmente aceita `{ frequency: 'WEEKLY', weekdays: number[], openEnded: boolean }`, com `weekdays` no padrão JavaScript (`0=domingo` ... `6=sábado`).
- Recorrências semanais sem data final usam um horizonte técnico distante em `endAt`, mas a semântica de negócio continua sendo `openEnded: true`; a UI e a auditoria não devem exibir esse horizonte como uma data real de término.
- `period` aceita `MORNING`, `AFTERNOON`, `EVENING` ou `null` para dia inteiro e, em intervalos/recorrências, aplica-se a cada ocorrência coberta.
- DTOs de criação/edição devem validar escopo próprio vs. administrativo e limitar `note` a 240 caracteres.

## Regras e validações
- Data de início obrigatória e nunca anterior ao dia atual na criação/edição.
- Tipo padrão é indisponibilidade pontual/por intervalo; documentos legados sem `recurrence` continuam válidos.
- Data de fim opcional.
- Sem data de fim em registro pontual, a indisponibilidade vale somente para o dia inicial.
- Com data de fim em registro pontual, o intervalo é inclusivo entre início e fim.
- Recorrência semanal exige pelo menos um dia da semana selecionado.
- Recorrência semanal sem data de fim permanece ativa por prazo indeterminado (`openEnded: true`).
- Recorrência semanal com data de fim só conflita nos dias da semana selecionados, entre `date` e `endAt`, inclusive.
- Data de fim nunca pode ser anterior à data de início.
- Período, evento específico e observação são opcionais.
- Sem período, a indisponibilidade conflita com qualquer horário de cada ocorrência coberta.
- Sem `eventId`, a indisponibilidade conflita com qualquer evento compatível em cada ocorrência; dois `eventId` explícitos e diferentes não conflitam entre si.
- Usuário pode editar/excluir apenas indisponibilidade cuja vigência ainda não passou.
- Admin com `EDIT` em `unavailability` pode atuar por outra pessoa; `SUPER_ADMIN` possui essa capacidade por definição.
- `userId` não pode ser transferido na edição: para trocar a pessoa, excluir o registro futuro e criar outro.
- Exceção administrativa na escala exige confirmação explícita, permissão de edição de escalas e Audit Log.

## Permissões e rotas
- Usuário autenticado pode gerenciar as próprias indisponibilidades dentro das Rules quando possui acesso à rota do módulo.
- Gestão de terceiros exige `EDIT` em `unavailability` (ou `SUPER_ADMIN`).
- Rota atual: `/module.html?section=unavailability`, preservando o shell e o guard de permissões do menu principal.
- A listagem administrativa de pessoas é liberada nas Rules somente para quem pode editar indisponibilidades.

## Services / Repositories / Components
- `src/services/unavailability-service.js`: validação temporal, recorrência semanal, detecção de conflitos, autorização contextual, filtro de usuários disponíveis e exceção administrativa auditada.
- `src/repositories/unavailability-repository.js`: CRUD da collection, consultas por usuário, referências de usuários/eventos, permissão efetiva e Audit Log.
- `src/js/modules/unavailability-page.js`: composição e interação da página, incluindo tipo de indisponibilidade, dias da semana, data de fim opcional, calendário e layout mobile, sem acesso direto ao Firestore.
- `src/styles/unavailability.css`: calendário, lista, formulário e comportamento responsivo; controles adicionais da recorrência devem respeitar os mesmos tokens do Design System.
- A tela de Escalas deve usar `filterAvailableUsers` para a seleção normal e `validateScheduleSelection` para confirmar/auditar exceções. Não duplicar a regra de conflito na UI de escalas.

## Collections
- `unavailability`
- `events` para referência opcional quando a permissão do usuário permite consultar o catálogo
- `users` para gestão administrativa
- `permissions` para resolver `READ`/`EDIT`
- `auditLogs` para criação, alteração, exclusão e exceções administrativas

## Audit Log
Ações padronizadas:
- `UNAVAILABILITY_CREATED`
- `UNAVAILABILITY_UPDATED`
- `UNAVAILABILITY_DELETED`
- `UNAVAILABILITY_OVERRIDE_CONFIRMED`

O ator é sempre o usuário Firebase autenticado; para atuação administrativa, `details.targetUserId` identifica a pessoa afetada. O detalhe deve registrar `startDate`, `endDate`, `recurrence` e `weekdays` para preservar a vigência efetiva. Em recorrência aberta, `details.endDate` deve ser `null`.

## Segurança e LGPD
- Não permitir troca arbitrária de `userId` por usuário comum nem durante update.
- `createdBy` e `updatedBy` são vinculados ao `request.auth.uid` nas Rules.
- `endAt >= date` deve ser garantido pelas Firestore Rules.
- Edição/exclusão de registros encerrados é bloqueada também nas Rules com base em `endAt`.
- Observações devem evitar coleta de dados sensíveis desnecessários; a UI alerta o usuário e limita o campo a 240 caracteres.
- Frontend nunca substitui Rules/backend.

## Testes
- data de início obrigatória e bloqueio de data passada;
- data de fim opcional e rejeição de fim anterior ao início;
- registro sem fim vale apenas para o dia inicial;
- intervalo é inclusivo e marca todos os dias no calendário;
- recorrência semanal exige pelo menos um dia;
- recorrência semanal aberta e com término definido;
- sexta-feira recorrente conflita nas sextas e não conflita nos demais dias;
- recorrência respeita período e evento específico;
- conflito por intervalo/data/período/evento;
- usuário altera somente o próprio registro;
- edição/exclusão somente enquanto `endAt` não passou;
- admin registra para terceiro com ator/auditoria;
- indisponível é excluído da seleção normal de escala em qualquer ocorrência aplicável;
- exceção administrativa exige confirmação, `EDIT` em escalas e auditoria;
- página possui calendário, seleção de tipo, dias da semana, campos opcionais e layout mobile;
- Firestore Rules compilam no emulator e preservam as restrições acima.
