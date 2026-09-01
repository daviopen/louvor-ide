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
- Na importação assistida, a cifra preenchida no formulário deve ficar no **tom real/original da música**. Se a fonte usar capotraste ou uma forma diferente de acordes, essa informação pode ser usada internamente para calcular os acordes, mas **não deve aparecer como opção, cabeçalho ou instrução de capotraste na cifra final**.
- A cifra assistida deve ser **compacta e operacional**: uma ocorrência por parte musical, sem repetir refrão/pré-refrão apenas porque eles reaparecem na execução. Repetições idênticas de ciclos harmônicos devem ser condensadas.
- A cifra assistida deve registrar **acordes**, não pequenos trechos de letra como `Tu és - Am7` ou `Grandes coisas - F9`. A letra pertence ao campo próprio de letra; a cifra deve priorizar progressões harmônicas legíveis.
- Quando uma mesma parte tiver uma variação harmônica real, preservar a variação sem duplicar toda a estrutura anterior.
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
- importação assistida converte forma/capotraste para o tom real sem exibir capotraste;
- importação assistida elimina repetições estruturais e trechos de letra da cifra;
- filtros combinados e paginação são previsíveis.
