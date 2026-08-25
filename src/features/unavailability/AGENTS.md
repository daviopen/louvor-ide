# Unavailability — AGENTS.md

Complementa o `/AGENTS.md` para indisponibilidades.

## Objetivo
Registrar indisponibilidades por pessoa e impedir seleção normal em escalas quando houver conflito de data, horário/período ou evento.

## Entidades e DTOs
- `Unavailability`: `id`, `userId`, `date`, `endAt`, `period?`, `eventId?`, `note?`, `createdBy`, `updatedBy`, `createdAt`, `updatedAt`.
- `date` representa o início do dia indisponível e `endAt` o final desse mesmo dia para permitir proteção temporal nas Firestore Rules.
- `period` aceita `MORNING`, `AFTERNOON`, `EVENING` ou `null` para dia inteiro.
- DTOs de criação/edição devem validar escopo próprio vs. administrativo e limitar `note` a 240 caracteres.

## Regras e validações
- Data obrigatória e nunca anterior ao dia atual na criação/edição.
- Período, evento específico e observação são opcionais.
- Sem período, a indisponibilidade conflita com qualquer horário da data.
- Sem `eventId`, a indisponibilidade conflita com qualquer evento compatível na data; dois `eventId` explícitos e diferentes não conflitam entre si.
- Usuário pode editar/excluir apenas indisponibilidade futura própria.
- Admin com `EDIT` em `unavailability` pode atuar por outra pessoa; `SUPER_ADMIN` possui essa capacidade por definição.
- `userId` não pode ser transferido na edição: para trocar a pessoa, excluir o registro futuro e criar outro.
- Exceção administrativa na escala exige confirmação explícita, permissão de edição de escalas e Audit Log.

## Permissões e rotas
- Usuário autenticado pode gerenciar as próprias indisponibilidades dentro das Rules quando possui acesso à rota do módulo.
- Gestão de terceiros exige `EDIT` em `unavailability` (ou `SUPER_ADMIN`).
- Rota atual: `/module.html?section=unavailability`, preservando o shell e o guard de permissões do menu principal.
- A listagem administrativa de pessoas é liberada nas Rules somente para quem pode editar indisponibilidades.

## Services / Repositories / Components
- `src/services/unavailability-service.js`: validação temporal, detecção de conflitos, autorização contextual, filtro de usuários disponíveis e exceção administrativa auditada.
- `src/repositories/unavailability-repository.js`: CRUD da collection, consultas por usuário, referências de usuários/eventos, permissão efetiva e Audit Log.
- `src/js/modules/unavailability-page.js`: composição e interação da página, sem acesso direto ao Firestore.
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

O ator é sempre o usuário Firebase autenticado; para atuação administrativa, `details.targetUserId` identifica a pessoa afetada.

## Segurança e LGPD
- Não permitir troca arbitrária de `userId` por usuário comum nem durante update.
- `createdBy` e `updatedBy` são vinculados ao `request.auth.uid` nas Rules.
- Edição/exclusão de registros passados é bloqueada também nas Rules com base em `endAt`.
- Observações devem evitar coleta de dados sensíveis desnecessários; a UI alerta o usuário e limita o campo a 240 caracteres.
- Frontend nunca substitui Rules/backend.

## Testes
- data obrigatória e bloqueio de data passada;
- conflito por data/período/evento;
- usuário altera somente o próprio registro;
- edição/exclusão somente futura;
- admin registra para terceiro com ator/auditoria;
- indisponível é excluído da seleção normal de escala;
- exceção administrativa exige confirmação, `EDIT` em escalas e auditoria;
- página possui calendário, campos opcionais e layout mobile;
- Firestore Rules compilam no emulator e preservam as restrições acima.
