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
- Exclusão física só é admitida para `PLANNED` sem integrantes na escala nem músicas no Setlist; nos demais casos usar cancelamento.

## Identidade dos vínculos e atomicidade
- Criação usa um `requestId` gerado pela UI apenas como chave de idempotência; a UI nunca fornece `scheduleId` ou `setlistId`.
- IDs persistidos são determinísticos: `event_<requestId>`, `schedule_<eventId>` e `setlist_<eventId>`.
- Evento, escala, Setlist e Audit Log são criados na mesma transação Firestore.
- Alterações de data, horário ou status são persistidas em batch com as referências vinculadas.
- Alterações apenas de nome, descrição, local e tema não precisam regravar escala/Setlist.

## Permissões e rotas
- Leitura e edição seguem permissão do módulo Eventos.
- Criar evento, excluir rascunho ou alterar data/horário/status exige `EDIT` em Eventos, Escalas e Setlists, porque a operação escreve nos três domínios.
- Edição apenas de metadados do evento exige `EDIT` em Eventos.
- Firestore Rules repetem as invariantes críticas e não confiam no frontend.
- Rotas atuais: `module.html?section=events` (equivalente funcional de `/events` na arquitetura estática atual).

## Services / Repositories / Components
- `EventService` concentra validações, permissões, transições de status e regras de histórico.
- `EventRepository` centraliza Firestore, transações/batches, dependências e Audit Log.
- `events-page.js` é apenas camada de UI/orquestração e não acessa `collection()` diretamente.
- UI: lista, busca/filtro por status, formulário, resumo por status e confirmações para cancelar/concluir/excluir.

## Collections
- `events`
- `schedules`
- `scheduleMembers` (somente para verificar dependência antes de exclusão física)
- `setlists`
- `setlistSongs` (somente para verificar dependência antes de exclusão física)
- `auditLogs`

## Segurança e LGPD
- Não confiar em IDs relacionados fornecidos pela UI sem validação.
- Operações multi-entidade devem evitar estados parcialmente persistidos.
- Alterações relevantes de status devem ser auditáveis.
- Campos livres possuem limites de tamanho e devem evitar dados pessoais/sensíveis desnecessários.

## Testes
- criação gera vínculos uma única vez;
- repetição é idempotente;
- mudança de data/hora mantém consistência;
- cancelamento preserva histórico e reflete nos vínculos;
- conclusão preserva histórico;
- exclusão física rejeita evento com dependências;
- permissões de leitura/edição e escrita vinculada são respeitadas;
- UI não acessa Firestore diretamente;
- Firestore Rules validam vínculo, status e imutabilidade final.
