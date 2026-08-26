# Setlists — AGENTS.md

Complementa o `/AGENTS.md` para setlists.

## Objetivo
Gerenciar repertório por evento/escala, ordem das músicas, ministro por música, tom de execução, dress code e histórico.

## Entidades e DTOs
- `Setlist`: `id`, `eventId`, `scheduleId`, `dressCodeColors?`, timestamps.
- `SetlistSong`: `id`, `setlistId`, `songId`, `order`, `ministerUserId?`, `executionKey?`, `note?`, `transition?`.
- DTOs devem distinguir inclusão, reordenação, edição da execução e dress code.

## Regras e validações
- Uma estrutura de setlist por escala/evento conforme vínculo definido pelo domínio.
- Somente pessoas escaladas como Ministro podem ser selecionadas como ministro do Setlist.
- Ordem deve ser persistida explicitamente e sem duplicação.
- Tom de execução pode sobrescrever a sugestão sem alterar o `preferredKey` permanente.
- Dress code aceita 0 a 3 cores hexadecimais válidas.
- A visão `Próximos` contém Setlists cuja data ainda não passou e que não estejam concluídos/cancelados.
- A visão `Histórico` contém Setlists com data anterior ao dia atual ou status `COMPLETED`/`CANCELLED`.
- Setlists abertos a partir do Histórico devem usar fluxo somente leitura; qualquer exceção administrativa futura precisa ser explícita, autorizada e auditada.
- Filtros do Histórico podem ser combinados por data/período, evento, ministro, música e tema.
- Listagens históricas devem ser paginadas e manter ordenação da ocorrência mais recente para a mais antiga.

## Permissões e rotas
- Leitura/edição seguem módulo Setlists.
- Histórico respeita permissão de leitura e não deve expor controles de alteração.
- Rotas atuais: `setlists.html?view=upcoming`, `setlists.html?view=history`, `setlist.html?id=:id` para edição autorizada e `setlist-view.html?id=:id` para leitura histórica.

## Services / Repositories / Components
- Service coordena setlist, músicas, escala e tons preferidos.
- `setlist-history-service.js` concentra classificação próximos/histórico, normalização de dados, filtros e paginação sem dependência de DOM/Firestore.
- Repositories: `setlists`, `setlistSongs`.
- UI: lista ordenável/drag-and-drop acessível, seletor de ministro/tom, dress code, cifra/letra e modo palco.

## Collections
- `setlists`
- `setlistSongs`
- `schedules`
- `scheduleMembers`
- `songs`
- `songMinisterKeys`

## Segurança e direitos autorais
- Validar vínculos por IDs antes de persistir.
- Não permitir ministro não escalado via payload manipulado.
- Histórico não deve oferecer mutações apenas por manipulação de query string ou UI.
- Letras/cifras completas devem seguir a política/documentação de direitos autorais do produto.

## Testes
- ministro elegível somente se escalado na função correta;
- reordenação preserva sequência única;
- tom da execução não altera preferência permanente;
- dress code valida 0–3 cores/hex;
- classificação por data/status separa próximos e histórico;
- filtros históricos combinados funcionam para período/evento/ministro/música/tema;
- paginação histórica preserva limites e ordenação;
- histórico respeita modo de leitura.