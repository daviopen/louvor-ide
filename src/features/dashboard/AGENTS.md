# Dashboard — AGENTS.md

## Objetivo

O Dashboard é o read model operacional inicial do IDE Music. Ele deve resumir somente informações necessárias para a rotina imediata do usuário autenticado, sem replicar regras de domínio das telas de Eventos, Escalas, Setlists ou Indisponibilidades.

## Arquitetura

Fluxo obrigatório:

`index.html -> dashboard-page.js -> DashboardService -> DashboardRepository -> Firestore`

- A página renderiza, trata estados visuais e navegação.
- `DashboardService` decide o que é futuro, pendente, incompleto e quais indicadores administrativos devem existir.
- `DashboardRepository` é o único ponto de leitura Firestore específico do Dashboard.
- Não adicionar consultas Firestore diretamente em `index.html` ou `dashboard-page.js`.

## Dados e regras

O Dashboard pode consumir:

- `users`: somente o perfil do usuário autenticado;
- `events`: agenda futura necessária ao painel;
- `schedules`: escalas futuras;
- `scheduleMembers`: contagem de integrantes ativos nas escalas exibidas;
- `setlists`: identificação de setlists futuros pendentes;
- `unavailability`: somente registros do próprio usuário no Dashboard.

Regras de apresentação:

- Evento futuro: status `PLANNED` ou `CONFIRMED` e data de hoje em diante.
- Escala futura: status `DRAFT` ou `COMPLETE`, vinculada a data futura.
- Setlist pendente: status `DRAFT`, vinculado a data futura.
- Indisponibilidade próxima: registro do usuário autenticado cujo fim/data ainda não passou.
- Registros são ordenados cronologicamente.
- Indicadores administrativos aparecem somente para perfil `ADMIN` ou `SUPER_ADMIN`.
- Ações rápidas devem respeitar as permissões efetivas do perfil; ação de edição não pode ser exibida para quem possui somente leitura.

## Segurança e privacidade

A permissão `dashboard` pode habilitar leitura das collections operacionais estritamente necessárias ao painel, mas não concede edição em nenhum domínio.

Indisponibilidades são dados pessoais operacionais: o Dashboard consulta apenas `where('userId', '==', request.auth.uid)`. Não ampliar a leitura global de indisponibilidades apenas para alimentar indicadores.

O Dashboard não deve ler senhas, tokens, consentimentos, Audit Logs ou dados administrativos de outros usuários.

## UX e acessibilidade

- Suportar tema claro/escuro apenas via tokens oficiais.
- Layout deve funcionar em desktop e mobile.
- Listas precisam de empty state explícito.
- Loading e erro devem usar região `aria-live`.
- Links e ações precisam de foco visível e alvo de toque adequado.
- Conteúdo vindo do Firestore deve ser inserido com `textContent`/DOM seguro, nunca interpolado em `innerHTML` sem sanitização.

## Testes

Alterações no Dashboard devem cobrir, conforme aplicável:

- filtro de registros passados/cancelados;
- ordenação cronológica;
- cálculo de integrantes ativos;
- setlists pendentes;
- indisponibilidade do próprio usuário;
- indicadores `ADMIN`/`SUPER_ADMIN` versus `MEMBER`;
- scoping da query de indisponibilidade;
- presença das seções no `index.html`;
- responsividade e ausência de cores hexadecimais fora dos tokens;
- Firestore Rules para dependências de leitura do módulo `dashboard`.
