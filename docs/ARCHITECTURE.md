# Arquitetura — IDE Music

## Decisão

A evolução será incremental, preservando as páginas atuais enquanto a aplicação migra de `src/js/modules` e `src/js/pages` para uma arquitetura modular por domínio.

Nesta fase o projeto permanece em JavaScript com contratos JSDoc. A adoção imediata de TypeScript exigiria alterar build, imports e deploy sem benefício proporcional neste momento. A estrutura criada é compatível com uma migração futura por feature.

## Camadas

- `core`: erros, estados assíncronos e contratos transversais.
- `components`: UI reutilizável, sem acesso direto à persistência.
- `features`: composição por domínio funcional.
- `services`: regras de negócio/casos de uso.
- `repositories`: acesso a Firestore/localStorage. É a fronteira de persistência.
- `models`: contratos das entidades.
- `dtos`: normalização de entrada/saída entre UI e domínio.
- `routes`: rotas, navegação e metadados de acesso.
- `utils`: funções puras e utilitários genéricos.
- `styles`: tokens, temas e estilos compartilhados.
- `constants`: nomes e valores canônicos.
- `tests`: contratos/testes próximos da aplicação; a suíte executável permanece em `/tests` durante a transição.

## Fluxo obrigatório

`Page/Component -> Service -> Repository -> Database/Firebase`

Uma Page ou Component não deve acessar `firebase`, `firestore`, `window.db` ou `db.collection(...)` diretamente. Services devem depender de repositories e concentrar validações/regras de negócio. Repositories encapsulam a tecnologia de persistência.

## Estado de UI

Operações assíncronas usam os estados canônicos `idle`, `loading`, `success`, `empty` e `error`, definidos em `src/core/ui-state.js`. Confirmações destrutivas ou administrativas devem usar o contrato `confirmAction` até que o Design System forneça `ConfirmDialog`.

## Erros

Erros de domínio/aplicação devem ser normalizados com `AppError`, contendo `code`, `message`, `details` e `cause` quando aplicável. A UI decide como apresentar a mensagem; repositories e services não devem manipular DOM.

## Migração iniciada

O domínio de músicas é o primeiro exemplo da nova fronteira: `MusicService` não acessa mais `db.collection('musicas')`; ele delega persistência a `MusicRepository`. A collection é centralizada em `src/constants/collections.js`.

## Compatibilidade

Arquivos legados não serão movidos em massa. Cada feature será migrada quando houver cobertura suficiente, mantendo URLs e scripts existentes enquanto necessário. Isso evita regressões nas telas já publicadas.

## Regras para novas implementações

1. Novo acesso a dados deve nascer em repository.
2. Nova regra de negócio deve nascer em service/feature, não em evento DOM.
3. Novos contratos de dados devem ter JSDoc em model/DTO.
4. Strings de collections devem vir de `constants/collections.js`.
5. Estados de carregamento/erro/empty devem usar o contrato comum.
6. Segurança nunca deve depender apenas de menu, rota ou frontend.
