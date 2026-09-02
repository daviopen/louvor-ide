# AGENTS.md — Repositories e custo Firestore

Estas regras complementam `AGENTS.md` e `src/AGENTS.md` para qualquer alteração em `src/repositories/`.

## Consultas

- Repository é a única camada que conhece a consulta Firestore concreta.
- Coleções de crescimento contínuo não podem ganhar novo `.get()` integral sem justificativa explícita.
- Listagens novas devem ser limitadas e, quando houver navegação por páginas, expor cursor do Firestore.
- Filtros disponíveis no banco devem ser aplicados antes do `.get()`, não somente em arrays depois da leitura.
- Para relações por IDs, consultar apenas IDs envolvidos no caso de uso; segmentar consultas `in` conforme o limite suportado pelo SDK.
- Evitar N+1. Quando várias entidades relacionadas são necessárias, preferir query em lote, cache de referência curto ou denormalização deliberada/documentada.

## Cache

- Cache de memória é permitido para dados de referência pouco mutáveis, normalmente com TTL entre 2 e 10 minutos.
- Dados de autorização hidratados pela sessão podem evitar leitura redundante na UI, mas Firestore Security Rules continuam sendo a autoridade final.
- Não persistir autorização em `localStorage` como fonte de verdade.
- Toda mutação de um dado cacheado deve invalidar ou atualizar o cache afetado quando a instância do Repository continuar viva.

## Listeners

- Não fazer `.get()` integral imediatamente antes de `onSnapshot` apenas para obter o estado inicial; o primeiro snapshot já fornece esse estado.
- Callback de listener não pode iniciar full scans auxiliares a cada atualização.
- Todo listener deve possuir caminho de unsubscribe no ciclo de vida da página.

## Compatibilidade

Métodos legados de full scan podem permanecer temporariamente quando remover imediatamente causaria regressão funcional. Código novo não deve chamá-los. Toda exceção deve indicar por comentário o motivo e o caminho de migração.

Consulte `docs/FIRESTORE_READ_BUDGET.md` para budgets e exceções controladas.