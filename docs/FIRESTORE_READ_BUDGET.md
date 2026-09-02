# Firestore Read Budget — IDE Music

Este documento define o orçamento operacional de leituras do Cloud Firestore para o IDE Music.

## Objetivo

O projeto deve permanecer confortável dentro da cota gratuita durante o uso normal, sem trocar confiabilidade por cache agressivo. As Firestore Security Rules continuam sendo a autoridade de autorização; cache é apenas otimização de leitura e UX.

## Budgets por abertura de tela

Os valores abaixo são metas de engenharia, não limites de segurança rígidos:

| Fluxo | Meta de documentos lidos |
| --- | ---: |
| Dashboard | <= 30 |
| Lista de escalas | <= 120 no legado; alvo <= 25 por página |
| Lista de músicas | <= 25 por página quando o catálogo suportar busca indexada |
| Lista de usuários | <= 25 por página |
| Eventos | <= 25 por página; janela legada máxima 150 |
| Setlists | <= 25 por página |
| Indisponibilidade | <= 25 por página; consulta própria sempre por userId |
| Auditoria | <= 100 por janela; máximo 250 |
| Visualizar escala | <= 60 |
| Editar escala | <= 100 enquanto usuários/funções forem catálogo de referência |

## Regras obrigatórias

1. Não criar novo `collection.get()` sem filtro/limite em coleção de crescimento contínuo.
2. Listagens novas devem usar `where`, `orderBy`, `limit` e cursor (`startAfter`) quando aplicável.
3. Paginação visual feita com `Array.slice()` depois de ler a coleção inteira não conta como paginação de Firestore.
4. Relações N:N devem ser consultadas pelos IDs relevantes da tela, com queries segmentadas quando necessário.
5. Dados de referência pequenos e pouco mutáveis podem usar cache em memória com TTL curto (2–10 minutos) e invalidação em mutação.
6. Perfil/permissões já hidratados pela sessão não devem ser relidos a cada navegação. As Rules continuam validando toda operação no servidor.
7. Listeners realtime devem ser usados somente quando a atualização imediata for requisito. Não combinar listener com uma leitura integral duplicada antes do primeiro snapshot.
8. Jobs agendados em produção devem consultar filas por estado e com `limit`; frequência deve refletir a necessidade do produto.
9. E2E mutável nunca pode apontar para `louvor-ide`; produção é validada somente por fluxos explicitamente read-only.
10. Toda exceção que precise de full scan deve ser documentada no código com motivo, teto esperado e plano de migração.

## Exceções atuais controladas

### Catálogo de músicas

O catálogo ainda permite filtros combinados por título/artista/tom/tema/ministro e mantém compatibilidade com campos históricos. Por isso a consulta principal ainda acompanha o catálogo completo. O hotspot N+1 foi removido: `songs`, `songMinisterKeys` e `users` passam a manter listeners incrementais independentes em vez de reler as duas relações a cada mudança de música.

A migração para paginação Firestore completa exige campos normalizados/indexáveis de busca e uma estratégia para filtros de ministro. Até essa migração, não reintroduzir leituras integrais adicionais no callback do listener.

### Catálogos de referência de escala/setlist

Usuários ativos, funções ministeriais e alguns vínculos ainda são necessários para seletores e validações. Esses dados usam cache curto ou queries segmentadas pelos usuários/escalas relevantes. Não usar `localStorage` como fonte de autorização.

## Observabilidade

Ao investigar aumento de cota:

- usar Firebase Console > Firestore > Uso e Query Insights;
- correlacionar horários de pico com deploys, navegação e Actions;
- inspecionar listeners que permanecem ativos durante troca de rota;
- procurar crescimento de coleções antes de aumentar limites;
- revisar este budget antes de optar por upgrade de plano.

## Notification Outbox

O worker de produção roda a cada 15 minutos e consulta apenas lotes limitados de `PENDING`/`PROCESSING`. Isso reduz o custo ocioso de 288 para 96 execuções por dia em comparação com polling de 5 minutos, preservando uma latência máxima aceitável para o modelo gratuito atual.
