# Setlists — AGENTS.md

Complementa o `/AGENTS.md` para setlists.

## Objetivo
Gerenciar repertório por evento/escala, ordem das músicas, ministro por música, tom de execução, dress code, histórico e visualização de cifra/letra para ensaio e palco.

## Entidades e DTOs
- `Setlist`: `id`, `eventId`, `scheduleId`, `dressCodeColors?`, timestamps.
- `SetlistSong`: `id`, `setlistId`, `songId`, `order`, `ministerUserId?`, `executionKey?`, `note?`, `transition?`.
- DTOs devem distinguir inclusão, reordenação, edição da execução e dress code.

## Regras e validações
- Uma estrutura de setlist por escala/evento conforme vínculo definido pelo domínio.
- Somente pessoas escaladas como Ministro podem ser selecionadas como ministro do Setlist.
- Ordem deve ser persistida explicitamente e sem duplicação.
- Tom de execução pode sobrescrever a sugestão sem alterar o `preferredKey` permanente.
- A transposição feita na visualização é temporária e nunca persiste alteração no tom original ou no tom de execução.
- Dress code aceita 0 a 3 cores hexadecimais válidas.
- A visão `Próximos` contém Setlists cuja data ainda não passou e que não estejam concluídos/cancelados.
- A visão `Histórico` contém Setlists com data anterior ao dia atual ou status `COMPLETED`/`CANCELLED`.
- Setlists abertos a partir do Histórico devem usar fluxo somente leitura; qualquer exceção administrativa futura precisa ser explícita, autorizada e auditada.
- Filtros do Histórico podem ser combinados por data/período, evento, ministro, música e tema.
- Listagens históricas devem ser paginadas e manter ordenação da ocorrência mais recente para a mais antiga.

## Visualização de cifra e letra
- `setlist-view.html` deve manter alternância rápida entre cifra e letra, tom atual visível, transposição temporária, navegação anterior/próxima e controle de fonte.
- Modo palco deve reduzir distrações, priorizar alto contraste e funcionar em desktop e celular.
- Navegação por teclado deve permitir anterior/próxima e alternância cifra/letra sem comprometer inputs existentes.
- Ausência de cifra ou letra deve resultar em empty state explícito, nunca em erro de renderização.
- O tom salvo na execução é a referência inicial da visualização.

## Permissões e rotas
- Leitura/edição seguem módulo Setlists.
- Histórico respeita permissão de leitura e não deve expor controles de alteração.
- Rotas atuais: `setlists.html?view=upcoming`, `setlists.html?view=history`, `setlist.html?id=:id` para edição autorizada e `setlist-view.html?id=:id` para leitura/execução.

## Services / Repositories / Components
- Service coordena setlist, músicas, escala e tons preferidos.
- `setlist-history-service.js` concentra classificação próximos/histórico, normalização de dados, filtros e paginação sem dependência de DOM/Firestore.
- `setlist-performance-view.js` concentra estado e comportamento da visualização de cifra/letra, sem persistir transposição de apresentação.
- Repositories: `setlists`, `setlistSongs`.
- UI: lista ordenável/drag-and-drop acessível, seletor de ministro/tom, dress code, cifra/letra e modo palco.

## Collections
- `setlists`
- `setlistSongs`
- `schedules`
- `scheduleMembers`
- `songs`
- `songMinisterKeys`
- Compatibilidade legada atual: a biblioteca de músicas ainda pode ser lida de `musicas` enquanto a migração para `songs` não estiver concluída.

## Segurança e direitos autorais
- Validar vínculos por IDs antes de persistir.
- Não permitir ministro não escalado via payload manipulado.
- Histórico não deve oferecer mutações apenas por manipulação de query string ou UI.
- Letras/cifras completas devem seguir `docs/MUSIC-CONTENT-COPYRIGHT.md`.
- Não importar automaticamente letras completas de terceiros sem base de uso/licença aplicável.
- A visualização deve escapar conteúdo inserido em HTML; letra deve ser tratada como texto.

## Testes
- ministro elegível somente se escalado na função correta;
- reordenação preserva sequência única;
- tom da execução não altera preferência permanente;
- transposição de visualização não persiste alterações;
- alternância cifra/letra e navegação anterior/próxima;
- fonte respeita limites e modo palco mantém layout responsivo/alto contraste;
- dress code valida 0–3 cores/hex;
- classificação por data/status separa próximos e histórico;
- filtros históricos combinados funcionam para período/evento/ministro/música/tema;
- paginação histórica preserva limites e ordenação;
- histórico respeita modo de leitura.
