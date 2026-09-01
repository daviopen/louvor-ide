# Events — AGENTS.md

Complementa o `/AGENTS.md` para eventos.

## Objetivo
Gerenciar eventos ministeriais e coordenar a criação/atualização das estruturas vinculadas de escala e setlist.

## Entidades e DTOs
- `Event`: `id`, `name`, `date`, `time?`, `description?`, `location?`, `theme?`, `status`, `scheduleId`, `setlistId`, timestamps e ator da alteração.
- Status: `PLANNED`, `CONFIRMED`, `CANCELLED`, `COMPLETED`.
- DTOs devem separar criação, edição e transição de status quando necessário.

## Regras e validações
- Nome e data obrigatórios.
- Criar evento deve garantir uma única escala e estrutura de setlist vinculadas, de forma idempotente.
- Mudança de data/hora deve atualizar referências dependentes conforme o modelo adotado.
- Cancelamento deve refletir em escala/setlist sem apagar histórico.
- Evento concluído permanece disponível para histórico.
- Eventos `CANCELLED` e `COMPLETED` são imutáveis no fluxo operacional.
- Exclusão física remove atomicamente o evento e suas estruturas vinculadas conforme o fluxo administrativo implementado, preservando Audit Log.

## Identidade dos vínculos e atomicidade
- Criação usa um `requestId` gerado pela UI apenas como chave de idempotência; a UI nunca fornece `scheduleId` ou `setlistId`.
- IDs persistidos são determinísticos: `event_<requestId>`, `schedule_<eventId>` e `setlist_<eventId>`.
- Evento, escala, Setlist e Audit Log são criados na mesma transação Firestore.
- Alterações de data, horário ou status são persistidas em batch com as referências vinculadas.
- Alterações apenas de nome, descrição, local e tema não precisam regravar escala/Setlist.

## Permissões e rotas
- Leitura e edição seguem permissão do módulo Eventos.
- `EDIT` em Eventos é suficiente para criar, editar, alterar data/horário/status e excluir eventos.
- O módulo Eventos é proprietário do ciclo de vida automático de sua escala e Setlist vinculados: a permissão de Eventos pode criar, sincronizar ou excluir apenas esses vínculos como parte da operação atômica do evento.
- Essa autorização vinculada não concede edição manual do módulo Escalas nem do módulo Setlists; essas operações continuam exigindo as permissões específicas dos respectivos módulos.
- Firestore Rules devem limitar as escritas automáticas de Eventos aos IDs determinísticos, campos de sincronização e cascatas vinculadas, sem abrir CRUD genérico nas coleções dependentes.
- Rotas atuais: `module.html?section=events` (equivalente funcional de `/events` na arquitetura estática atual).

## Services / Repositories / Components
- `EventService` concentra validações, permissões, transições de status e regras de histórico.
- `EventRepository` centraliza Firestore, transações/batches, dependências e Audit Log.
- `events-page.js` é apenas camada de UI/orquestração e não acessa `collection()` diretamente.
- UI: lista, busca/filtro por status, formulário, resumo por status e confirmações para cancelar/concluir/excluir.

## Collections
- `events`
- `schedules`
- `scheduleMembers`
- `setlists`
- `setlistSongs`
- `auditLogs`

## Segurança e LGPD
- Não confiar em IDs relacionados fornecidos pela UI sem validação.
- Operações multi-entidade devem evitar estados parcialmente persistidos.
- Permissão de Eventos só pode tocar dependências quando elas pertencem ao mesmo bundle determinístico do evento.
- Alterações relevantes de status devem ser auditáveis.
- Campos livres possuem limites de tamanho e devem evitar dados pessoais/sensíveis desnecessários.

## Testes
- criação gera vínculos uma única vez;
- repetição é idempotente;
- usuário com `EDIT` somente em Eventos consegue criar e sincronizar o bundle automático;
- usuário com `READ` em Eventos não consegue criar, editar ou excluir;
- mudança de data/hora mantém consistência;
- cancelamento preserva histórico e reflete nos vínculos;
- conclusão preserva histórico;
- exclusão física remove o bundle vinculado de forma controlada;
- edição manual de Escalas/Setlists continua bloqueada sem as permissões desses módulos;
- UI não acessa Firestore diretamente;
- Firestore Rules validam vínculo, status, campos sincronizados e imutabilidade final.
