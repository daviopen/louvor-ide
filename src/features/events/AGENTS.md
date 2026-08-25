# Events — AGENTS.md

Complementa o `/AGENTS.md` para eventos.

## Objetivo
Gerenciar eventos ministeriais e coordenar a criação/atualização das estruturas vinculadas de escala e setlist.

## Entidades e DTOs
- `Event`: `id`, `name`, `date`, `time?`, `description?`, `location?`, `theme?`, `status`, timestamps.
- Status: `PLANNED`, `CONFIRMED`, `CANCELLED`, `COMPLETED`.
- DTOs devem separar criação, edição e transição de status quando necessário.

## Regras e validações
- Nome e data obrigatórios.
- Criar evento deve garantir uma única escala e estrutura de setlist vinculadas, de forma idempotente.
- Mudança de data/hora deve atualizar referências dependentes conforme o modelo adotado.
- Cancelamento deve refletir em escala/setlist sem apagar histórico.
- Evento concluído permanece disponível para histórico.

## Permissões e rotas
- Leitura e edição seguem permissão do módulo Eventos.
- Operações que afetam escala/setlist devem validar também regras dos domínios envolvidos.
- Rotas sugeridas: `/events`, `/events/:id`.

## Services / Repositories / Components
- `EventService` coordena EventRepository + Schedule/Setlist Services, usando transação/batch quando necessário.
- Repository centraliza `events`.
- UI: lista/calendário, formulário, status e confirmações para cancelamento.

## Collections
- `events`
- `schedules`
- `setlists`
- `auditLogs`

## Segurança e LGPD
- Não confiar em IDs relacionados fornecidos pela UI sem validação.
- Operações multi-entidade devem evitar estados parcialmente persistidos.
- Alterações relevantes de status devem ser auditáveis.

## Testes
- criação gera vínculos uma única vez;
- repetição é idempotente;
- mudança de data/hora mantém consistência;
- cancelamento preserva histórico e reflete nos vínculos;
- permissões de leitura/edição são respeitadas.