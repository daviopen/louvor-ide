# Músicas assistidas por IA — MVP client-side

## Objetivo

O fluxo `Importar com IA` auxilia o preenchimento do mesmo formulário de músicas já usado pelo cadastro manual. A IA **nunca persiste uma música automaticamente**: o usuário recebe sugestões, revisa/edita os campos e somente então usa `Salvar música`.

## Arquitetura sem backend adicional

Fluxo:

`song-form -> MusicAIProvider -> Firebase AI Logic -> Gemini Developer API`

Não há Cloud Functions, API própria ou servidor dedicado no MVP.

- `src/services/music-ai-provider.js` define `MusicAIProvider`, `FirebaseMusicAIProvider` e `MockMusicAIProvider`.
- `src/services/music-ai-contract.js` define o schema versionado, validação e normalização.
- `src/js/pages/song-form.js` controla UX, autorização, revisão e persistência pelo repository existente.
- O provider não acessa Firestore e não salva músicas.
- O mesmo `musicRepository` permanece responsável pela persistência final.

## Firebase AI Logic e modelo

O provider usa o SDK Web modular do Firebase AI Logic carregado pela CDN oficial e o `Gemini Developer API`.

Modelo padrão do código:

`gemini-3.5-flash-lite`

O modelo pode ser alterado por `VITE_FIREBASE_AI_MODEL` sem mudar o contrato da aplicação. Priorizar um modelo compatível com a cota gratuita/baixo custo enquanto essa opção estiver disponível no provedor.

## App Check

A chamada client-side deve permanecer protegida por Firebase App Check com reCAPTCHA Enterprise.

Configuração necessária no console Firebase/Google Cloud:

1. Habilitar/configurar Firebase AI Logic para o projeto `louvor-ide` usando Gemini Developer API.
2. Registrar o Web App no App Check.
3. Criar/associar uma **site key pública** reCAPTCHA Enterprise baseada em score para os domínios do IDE Music.
4. Manter enforcement do App Check para Firebase AI Logic.
5. Configurar `VITE_FIREBASE_APPCHECK_SITE_KEY` no ambiente de build/GitHub Actions.
6. Para desenvolvimento em `localhost`, o código habilita o debug provider; registrar no console apenas o token de debug exibido pelo SDK quando necessário.

A site key é pública. **Nunca** adicionar secret key de reCAPTCHA, service account, token privado ou chave de servidor ao frontend.

## Entradas

O usuário pode fornecer:

- cifra/texto colado;
- URL pública de cifra/fonte;
- URL de YouTube;
- BPM manual.

A URL é processada somente pela ferramenta `URL Context` suportada pelo Firebase AI Logic. O projeto não implementa crawler/scraper próprio e não tenta contornar login, paywall ou bloqueios. Quando a URL falha e existe texto colado, o provider repete a análise apenas com o texto. Em qualquer falha, o cadastro manual continua disponível.

Não há Tap Tempo.

## Structured Output

Versão atual: `1.0.0`.

Campos que podem ser sugeridos:

- título;
- artista;
- `originalKey`;
- cifra;
- letra;
- compasso;
- BPM;
- vídeo de referência (`provider`, `url`, `videoId`);
- seções (`intro`, `verse`, `pre_chorus`, `chorus`, `bridge`, `instrumental`, `outro`);
- proveniência por campo;
- warnings.

Campos ausentes permanecem vazios. O normalizador rejeita tom inválido, BPM fora de `30..300`, compasso inválido e URL de YouTube incompatível.

## Modelo de dados e retrocompatibilidade

Para novas gravações:

- `originalKey` é o tom original canônico;
- `tom` continua sendo salvo como alias retrocompatível;
- `preferredKey` continua em `songMinisterKeys`, por ministro;
- tom de execução pertence ao Setlist e não é persistido como preferência da música;
- `sourceUrl`, `sourceProvider`, `sourceType` e `importedAt` são gravados somente quando o fluxo assistido foi efetivamente usado;
- `video` guarda provider/URL/videoId;
- `bpmSource` diferencia `manual` e `ai`;
- `aiImport` contém somente metadados técnicos de schema/provider/modelo/fallback/warnings, sem prompt, cifra ou letra.

Músicas antigas continuam legíveis por `tom`, `link`, `cifra`, `letra` e aliases já suportados pelo formulário/repository.

## Segurança e autorização

O botão de análise exige:

- Firebase Auth ativo;
- perfil provisionado e ativo;
- `SUPER_ADMIN` ou permissão `songs=EDIT`.

O provider implementa deduplicação de requisições simultâneas, cooldown curto para payload idêntico, timeout e classificação de quota/App Check/indisponibilidade.

Como o MVP não possui backend, o cooldown no navegador é uma proteção de UX e não deve ser tratado como rate limit autoritativo. A proteção efetiva contra clientes não autorizados é App Check + controles/quota do Firebase AI Logic.

## Auditoria

As tentativas registram apenas metadados mínimos:

- provider/modelo;
- schema;
- sucesso/falha;
- código de erro;
- tipo de fonte;
- existência de texto/URL;
- uso de fallback;
- quantidade de warnings.

O audit log técnico de IA não armazena o texto colado, prompt, cifra ou letra. Ao salvar a música, `SONG_CREATED`/`SONG_UPDATED` registra se o fluxo foi `manual` ou `ai_assisted`.

## Testes

- `tests/music-ai-contract.test.js`: schema, tons, BPM, compasso, YouTube, seções, parcial/malformado e proveniência.
- `tests/music-ai-integration.test.js`: provider client-side, App Check, URL Context, autorização, fallback, não-auto-save e responsividade.
- `MockMusicAIProvider`/`window.__MUSIC_AI_PROVIDER__`: ponto de injeção para E2E sem consumir Gemini no CI.

## Direitos autorais

O fluxo deve continuar seguindo `docs/MUSIC-CONTENT-COPYRIGHT.md`. URL Context não autoriza reproduzir ou armazenar conteúdo que a equipe não tenha direito de usar. Não adicionar mecanismos para contornar restrições de fonte.
