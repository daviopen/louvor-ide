# Observabilidade, erros e logs — IDE Music

## Objetivo

O IDE Music usa um padrão transversal para diagnóstico técnico sem expor detalhes internos ou dados sensíveis ao usuário.

## Logging estruturado

O módulo `src/js/modules/observability.js` publica `window.MusicIdeObservability` com os níveis `debug`, `info`, `warn`, `error` e `critical`.

Cada registro possui, no mínimo:

- `timestamp` em ISO-8601;
- `level`;
- `event` com nome estável e pesquisável;
- `message`;
- `correlationId`;
- `context` sanitizado;
- `error` normalizado, quando aplicável.

Evite `console.log` direto em código novo. Use o módulo de observabilidade para eventos com finalidade operacional.

## Correlation ID

Cada log recebe um `correlationId`. Operações que atravessam múltiplas camadas devem reutilizar o mesmo identificador sempre que possível para permitir correlação entre eventos.

`MusicIdeObservability.createCorrelationId()` gera um identificador com `crypto.randomUUID()` quando disponível e usa fallback seguro para navegadores compatíveis com o projeto.

## Dados sensíveis

A sanitização é recursiva e mascara chaves relacionadas a credenciais, incluindo senhas, tokens, authorization headers, cookies, session data, API keys e private keys.

Mesmo com sanitização automática, a regra continua sendo **não enviar dados sensíveis desnecessários para logs**.

## Mensagem ao usuário x detalhe técnico

`AppError` mantém:

- `message` / `userMessage`: texto seguro e compreensível para a UI;
- `technicalMessage`: detalhe técnico reservado ao diagnóstico;
- `code`: código estável;
- `correlationId`: identificador de rastreio quando disponível;
- `cause` / `details`: contexto técnico controlado.

Ao converter erro desconhecido com `AppError.from`, a mensagem original da exceção não deve ser reutilizada automaticamente na UI.

`MusicIdeObservability.userFacingError()` também devolve mensagem segura, código e correlation ID sem reaproveitar a mensagem técnica bruta por padrão.

## Falhas críticas

O módulo instala handlers globais para:

- `window.error`;
- `unhandledrejection`.

Falhas capturadas são:

1. normalizadas e sanitizadas;
2. registradas como nível `critical`;
3. mantidas em buffer efêmero de no máximo 25 registros em `window.__musicIdeCriticalErrors` para diagnóstico da sessão;
4. emitidas no evento `musicIdeCriticalError`;
5. enviadas a um endpoint HTTPS opcional quando `window.MUSIC_IDE_MONITORING_ENDPOINT` estiver configurado.

O envio usa `navigator.sendBeacon` quando disponível e `fetch(..., { keepalive: true, credentials: 'omit' })` como fallback. Nenhum endpoint é obrigatório para o funcionamento da aplicação.

## Integração

O `app-shell.js` carrega observabilidade antes da montagem do shell nas páginas principais. A tela de login também carrega o módulo diretamente para cobrir falhas de autenticação antes da criação da sessão.

## Testes

`tests/observability.test.js` cobre:

- estrutura dos logs;
- geração de correlation ID;
- sanitização recursiva;
- separação entre mensagem amigável e detalhe técnico;
- captura de falhas globais;
- bootstrap no shell.
