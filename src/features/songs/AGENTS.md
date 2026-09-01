# Songs — AGENTS.md

Complementa o `/AGENTS.md` para biblioteca de músicas.

## Objetivo
Cadastrar, consultar e editar músicas, cifras, letras, temas e tons preferidos por ministro, preservando o padrão natural de cifra do IDE Music.

## Entidades e DTOs
- `Song`: `id`, `name`, `artist`, `originalKey`, `theme?`, `referenceUrl?`, `chordSheet?`, `lyrics?`, `notes?`, timestamps.
- `SongMinisterKey`: `songId`, `ministerUserId`, `preferredKey`.
- DTOs devem separar criação/edição da música e manutenção de tons por ministro.
- `tom` permanece alias retrocompatível de `originalKey` enquanto houver documentos legados.
- `preferredKey` pertence ao ministro/música; tom de execução pertence ao Setlist.

## Regras e validações
- Nome, artista e tom original conforme regras do formulário.
- Cifra deve permanecer em texto simples no formato usado pela equipe; não exigir tags como `[VERSO]` nem HTML.
- Preservar seções naturais como `Intro:`, `Estrofe:`, `Ponte:` e `Refrão:` e acordes inline/por sequência conforme entrada do usuário.
- Apenas usuários que possuem função Ministro podem ser associados como ministros da música.
- Permitir vários ministros, sem duplicar o mesmo ministro na mesma música.
- `preferredKey` é preferência permanente; tom de execução pertence ao Setlist.
- Busca/filtros combinados devem ser tratados por Service/Repository, não por lógica duplicada na UI.

## Importação assistida por IA
- `Cadastro manual` continua sendo o fluxo padrão e sempre deve funcionar independentemente da IA.
- `Importar com IA` usa o mesmo formulário, validação e Repository do cadastro manual.
- O provider de IA jamais persiste música; somente devolve sugestão normalizada.
- Nunca salvar automaticamente resposta de IA. O usuário precisa revisar o formulário e acionar `Salvar música`.
- Integração do MVP deve permanecer client-side, sem Cloud Functions ou servidor dedicado.
- Abstração obrigatória: `MusicAIProvider`; implementação principal: Firebase AI Logic com Gemini Developer API.
- Firebase App Check deve proteger as chamadas de IA; não expor secret key, service account ou credencial privada.
- Structured Output possui versão explícita e passa por normalização local antes de preencher o formulário.
- Campos ausentes ficam vazios; é proibido inventar nome, artista, tom, BPM, compasso, vídeo, cifra ou letra.
- BPM válido: 30 a 300. Tom original deve passar pelo normalizador musical.
- URL externa é somente tentativa de enriquecimento por recurso oficial do provider (`URL Context`). Não criar scraper/crawler próprio nem contornar login/paywall/bloqueios.
- Quando URL falhar e houver texto colado, usar texto como fallback. Em qualquer erro/quota/timeout, permitir continuar manualmente.
- Não implementar Tap Tempo.
- Tentativas de IA podem ser auditadas somente com metadados mínimos; não registrar prompt, cifra, letra ou texto colado no Audit Log técnico.
- CI/E2E deve usar provider mockado para não consumir quota Gemini.

## Permissões e rotas
- Consulta exige leitura no módulo Músicas.
- Criar/editar exige edição.
- Importação assistida exige usuário autenticado, ativo e `songs=EDIT` ou SUPER_ADMIN.
- Rotas sugeridas: `/songs`, `/songs/new`, `/songs/:id/edit`, `/songs/:id`.

## Services / Repositories / Components
- Service valida dados, vínculos de ministros e normalização de filtros.
- Repositories: `songs`, `songMinisterKeys`.
- `MusicAIProvider` fica em Service e não acessa Repository/Firestore.
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
- Conteúdo obtido por URL Context não implica autorização para reprodução/armazenamento.

## Testes
- criação/edição valida campos;
- ministro precisa possuir função Ministro;
- ministro duplicado é rejeitado;
- preferredKey é independente do executionKey;
- parser/renderização preserva o formato oficial de cifra;
- filtros combinados e paginação são previsíveis;
- schema/parser da IA cobre seções, tons, BPM, YouTube, parcial/malformado e fallback;
- fluxo assistido prova que análise não salva automaticamente;
- E2E usa `MockMusicAIProvider`/injeção equivalente.
