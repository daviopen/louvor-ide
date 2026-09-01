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
- Preservar seções naturais como `Intro:`, `Estrofe:`, `Pré-Refrão:`, `Ponte:`, `Refrão:`, `Instrumental:` e `Final:` e acordes inline/por sequência conforme entrada do usuário.
- Na importação assistida, a cifra preenchida no formulário deve ficar no **tom real/original da música**. Se a fonte usar capotraste ou uma forma diferente de acordes, essa informação pode ser usada internamente para calcular os acordes, mas **não deve aparecer como opção, cabeçalho ou instrução de capotraste na cifra final**.
- A cifra assistida deve ser **compacta e operacional**: uma ocorrência por parte musical, sem repetir refrão/pré-refrão apenas porque eles reaparecem na execução. Repetições idênticas de ciclos harmônicos devem ser condensadas.
- Em partes vocais, a cifra assistida deve manter uma **pequena pista de letra**, normalmente as **duas primeiras palavras da frase**, seguida dos acordes correspondentes. Exemplo estrutural: `Primeiras palavras - G  D  Em`.
- Se uma parte tiver até 5 acordes efetivos, ela pode ser resumida em uma única linha quando isso não apagar a relação entre a pista vocal e a harmonia.
- Se uma parte tiver mais de 5 acordes efetivos, dividir em várias linhas curtas, cada uma com a pista de aproximadamente duas palavras e os acordes correspondentes àquele trecho. Não transformar a seção inteira em uma única progressão quando houver mudanças harmônicas relevantes.
- Intro, Instrumental, Solo, Interlúdio e Final podem conter apenas acordes; preservar repetições que sejam relevantes para contagem ou forma musical.
- Quando uma mesma parte tiver uma variação harmônica real, preservar a variação sem duplicar toda a estrutura anterior.
- O campo `theme/tema` deve receber um tema central curto da música quando houver evidência suficiente.
- O campo `referenceUrl/link` deve priorizar o vídeo real da música referenciado pela fonte, preferencialmente YouTube; nunca salvar a própria URL da cifra como se fosse vídeo.
- Para importação por URL, a entrada recomendada e esperada na interface é o **link da música no Cifra Club**.
- Letra completa só deve ser preenchida automaticamente quando o conteúdo tiver sido fornecido diretamente pelo usuário ou quando houver autorização/licença adequada para reprodução. Não copiar letra completa de uma página remota apenas por URL.
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
- importação assistida mantém pistas vocais curtas de aproximadamente duas palavras vinculadas aos acordes;
- importação assistida elimina repetições estruturais sem perder variações harmônicas reais;
- importação assistida preenche tema quando houver evidência e tenta resolver o vídeo referenciado na fonte;
- interface informa que o input recomendado é o link do Cifra Club;
- filtros combinados e paginação são previsíveis.
