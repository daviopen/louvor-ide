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
- Histórico é somente leitura quando o evento estiver concluído, salvo fluxo administrativo explícito.

## Permissões e rotas
- Leitura/edição seguem módulo Setlists.
- Histórico respeita leitura; alteração de evento concluído exige regra explícita.
- Rotas sugeridas: `/setlists/upcoming`, `/setlists/history`, `/setlists/:id`.

## Services / Repositories / Components
- Service coordena setlist, músicas, escala e tons preferidos.
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
- Letras/cifras completas devem seguir a política/documentação de direitos autorais do produto.

## Testes
- ministro elegível somente se escalado na função correta;
- reordenação preserva sequência única;
- tom da execução não altera preferência permanente;
- dress code valida 0–3 cores/hex;
- histórico respeita modo de leitura.