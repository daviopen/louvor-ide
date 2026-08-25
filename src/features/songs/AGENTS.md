# Songs — AGENTS.md

Complementa o `/AGENTS.md` para biblioteca de músicas.

## Objetivo
Cadastrar, consultar e editar músicas, cifras, letras, temas e tons preferidos por ministro, preservando o padrão natural de cifra do IDE Music.

## Entidades e DTOs
- `Song`: `id`, `name`, `artist`, `originalKey`, `theme?`, `referenceUrl?`, `chordSheet?`, `lyrics?`, `notes?`, timestamps.
- `SongMinisterKey`: `songId`, `ministerUserId`, `preferredKey`.
- DTOs devem separar criação/edição da música e manutenção de tons por ministro.

## Regras e validações
- Nome, artista e tom original conforme regras do formulário.
- Cifra deve permanecer em texto simples no formato usado pela equipe; não exigir tags como `[VERSO]` nem HTML.
- Preservar seções naturais como `Intro:`, `Estrofe:`, `Ponte:` e `Refrão:` e acordes inline/por sequência conforme entrada do usuário.
- Apenas usuários que possuem função Ministro podem ser associados como ministros da música.
- Permitir vários ministros, sem duplicar o mesmo ministro na mesma música.
- `preferredKey` é preferência permanente; tom de execução pertence ao Setlist.
- Busca/filtros combinados devem ser tratados por Service/Repository, não por lógica duplicada na UI.

## Permissões e rotas
- Consulta exige leitura no módulo Músicas.
- Criar/editar exige edição.
- Rotas sugeridas: `/songs`, `/songs/new`, `/songs/:id/edit`, `/songs/:id`.

## Services / Repositories / Components
- Service valida dados, vínculos de ministros e normalização de filtros.
- Repositories: `songs`, `songMinisterKeys`.
- UI: busca, filtros, paginação, formulário, editor de cifra/letra e visualização responsiva.

## Collections
- `songs`
- `songMinisterKeys`
- `users`
- `userFunctions`
- `ministryFunctions`

## Segurança e direitos autorais
- Sanitizar conteúdo antes de renderização; não usar `innerHTML` não confiável.
- Validar URLs opcionais.
- Letras/cifras completas devem observar a documentação de direitos autorais do produto.

## Testes
- criação/edição valida campos;
- ministro precisa possuir função Ministro;
- ministro duplicado é rejeitado;
- preferredKey é independente do executionKey;
- parser/renderização preserva o formato oficial de cifra;
- filtros combinados e paginação são previsíveis.