# Unavailability — AGENTS.md

Complementa o `/AGENTS.md` para indisponibilidades.

## Objetivo
Registrar indisponibilidades por pessoa e impedir seleção normal em escalas quando houver conflito de data ou intervalo, horário/período ou evento.

## Entidades e DTOs
- `Unavailability`: `id`, `userId`, `date`, `endAt`, `period?`, `eventId?`, `note?`, `createdBy`, `updatedBy`, `createdAt`, `updatedAt`.
- `date` representa o início do primeiro dia indisponível.
- `endAt` representa o final do último dia indisponível. Quando o usuário não informa data de fim, `endAt` deve ser o final do mesmo dia de `date`.
- A UI recebe `endDate?` como campo opcional e o Service converte para `endAt`, mantendo compatibilidade com os documentos existentes.
- `period` aceita `MORNING`, `AFTERNOON`, `EVENING` ou `null` para dia inteiro e, em intervalos, aplica-se a cada dia coberto.
- DTOs de criação/edição devem validar escopo próprio vs. administrativo e limitar `note` a 240 caracteres.

## Regras e validações
- Data de início obrigatória e nunca anterior ao dia atual na criação/edição.
- Data de fim opcional.
- Sem data de fim, a indisponibilidade vale somente para o dia inicial.
- Com data de fim, o intervalo é inclusivo entre início e fim.
- Data de fim nunca pode ser anterior à data de início.
- Período, evento específico e observação são opcionais.
- Sem período, a indisponibilidade conflita com qualquer horário de cada dia coberto.
- Sem `eventId`, a indisponibilidade conflita com qualquer evento compatível em qualquer dia coberto; dois `eventId` explícitos e diferentes não conflitam entre si.
- Usuário pode editar/excluir apenas indisponibilidade cujo `endAt` ainda não passou.
- Admin com `EDIT` em `unavailability` pode atuar por outra pessoa; `SUPER_ADMIN` possui essa capacidade por definição.
- `userId` não pode ser transferido na edição: para trocar a pessoa, excluir o registro futuro e criar outro.
- Exceção administrativa na escala exige confirmação explícita, permissão de edição de escalas e Audit Log.

## Permissões e rotas
- Usuário autenticado pode gerenciar as próprias indisponibilidades dentro das Rules quando possui acesso à rota do módulo.
- Gestão de terceiros exige `EDIT` em `unavailability` (ou `SUPER_ADMIN`).
- Rota atual: `/module.html?section=unavailability`, preservando o shell e o guard de permissões do menu principal.
- A listagem administrativa de pessoas é liberada nas Rules somente para quem pode editar indisponibilidades.

## Services / Repositories / Components
- `src/services/unavailability-service.js`: validação temporal e de intervalo, detecção de conflitos, autorização contextual, filtro de usuários disponíveis e exceção administrativa auditada.
- `src/repositories/unavailability-repository.js`: CRUD da collection, consultas por usuário, referências de usuários/eventos, permissão efetiva e Audit Log.
- `src/js/modules/unavailability-page.js`: composição e interação da página, incluindo data de fim opcional, sem acesso direto ao Firestore.
- `src/styles/unavailability.css`: calendário, lista, formulário e comportamento responsivo.
- A futura tela de Escalas deve usar `filterAvailableUsers` para a seleção normal e `validateScheduleSelection` para confirmar/auditar exceções. Não duplicar a regra de conflito na UI de escalas.

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

O ator é sempre o usuário Firebase autenticado; para atuação administrativa, `details.targetUserId` identifica a pessoa afetada. O detalhe deve registrar `startDate` e `endDate` para preservar o período efetivo da indisponibilidade.

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
- conflito por intervalo/data/período/evento;
- usuário altera somente o próprio registro;
- edição/exclusão somente enquanto `endAt` não passou;
- admin registra para terceiro com ator/auditoria;
- indisponível é excluído da seleção normal de escala em qualquer dia do intervalo;
- exceção administrativa exige confirmação, `EDIT` em escalas e auditoria;
- página possui calendário, campos opcionais e layout mobile;
- Firestore Rules compilam no emulator e preservam as restrições acima.
