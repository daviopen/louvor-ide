# Músicas assistidas por IA — MVP client-side

## Arquitetura

O fluxo P2 não adiciona backend, Cloud Functions ou servidor dedicado.

`song-form -> MusicAIService -> MusicAIProvider -> FirebaseMusicAIProvider -> Firebase AI Logic -> Gemini Developer API`

A resposta da IA nunca é persistida automaticamente. Ela apenas preenche o formulário existente; o usuário revisa, edita e confirma pelo mesmo botão `Salvar música` usado no cadastro manual.

## Segurança

- Firebase Authentication continua sendo a identidade da aplicação.
- O acesso ao formulário continua sujeito às permissões existentes do módulo Músicas.
- Firebase AI Logic é chamado diretamente pelo SDK oficial no navegador.
- Nenhuma API key privada do Gemini é adicionada ao frontend.
- Firebase App Check deve permanecer enforced para Firebase AI Logic em produção.
- O site key do reCAPTCHA Enterprise usado pelo App Check é uma configuração pública de cliente, não uma chave privada.
- Para desenvolvimento local, use o debug provider/token do App Check conforme a documentação oficial do Firebase; não desabilite o enforcement em produção.

## Configuração externa necessária

Antes de validar em produção:

1. No Firebase Console, habilite `Firebase AI Logic` para o projeto.
2. Selecione `Gemini Developer API` como backend do Gemini para priorizar a opção compatível com free tier quando disponível.
3. Registre o app Web no App Check com reCAPTCHA Enterprise.
4. Mantenha App Check enforced para Firebase AI Logic.
5. Configure o site key público em `src/js/ai-public-config.js`, no campo `appCheckSiteKey`.

O provider também aceita configuração de modelo por `window.ENV.VITE_FIREBASE_AI_MODEL`, mas o site key de produção é mantido explicitamente no arquivo público de configuração do cliente.

Se o App Check/site key ou a IA estiverem indisponíveis, a tela não bloqueia o usuário: o cadastro manual permanece utilizável.

## Modelo e contrato

- Provider abstrato: `src/services/music-ai-provider.js`.
- Provider Firebase: `src/services/firebase-music-ai-provider.js`.
- Structured Output versionado: `src/services/music-ai-schema.js`.
- Schema atual: `1.0.0`.
- Modelo padrão: `gemini-3.7-flash`.
- O modelo pode ser sobrescrito no runtime por `window.ENV.VITE_FIREBASE_AI_MODEL`.

Campos automáticos relevantes:

- `originalKey` + legado `tom` para retrocompatibilidade;
- `bpm`, `bpmSource`;
- `timeSignature`;
- `sourceUrl`, `sourceProvider`, `sourceType`, `importedAt`;
- `video.provider`, `video.url`, `video.videoId`;
- `chordSourceUrl`, `chordSourceProvider` quando uma cifra externa é confirmada;
- `fieldProvenance`;
- `aiProvider`, `aiModel`, `aiSchemaVersion`;
- `importMethod` (`manual` ou `ai-assisted`).

`preferredKey` continua em `songMinisterKeys`. O tom de execução continua pertencendo ao Setlist, não à música.

## Entrada única e estratégias

A interface possui um único campo, mas o provider não trata todas as entradas do mesmo modo:

- **Nome + artista**: modelo estruturado simples, sem URL Context, reduzindo latência e evitando timeout desnecessário.
- **Cifra/texto colado**: modelo estruturado simples. Quando a IA não separar a letra, o frontend consegue derivá-la do próprio conteúdo fornecido pelo usuário removendo linhas formadas apenas por acordes.
- **Link do YouTube**: o vídeo é enviado como entrada multimodal (`fileData`) para Video Understanding. O próprio vídeo é usado para identificar nome, artista, tom, BPM e estrutura harmônica. Quando nome e artista são identificados, o sistema gera endereços canônicos de fontes conhecidas de cifra (primeiro Cifra Club e depois Banana Cifras), tenta recuperá-los com URL Context, valida que a página realmente foi recuperada e que corresponde à mesma música, e então usa a cifra confirmada para enriquecer a análise do vídeo. O link do YouTube continua sendo a referência principal.
- **Link de cifra/fonte**: usa URL Context apenas para a página informada. Cifra Club pode receber uma segunda leitura curta e focada no vídeo incorporado. Se Cifra Club ou Banana Cifras não puderem ser lidos, o sistema tenta inferir nome e artista a partir da própria URL e faz um fallback sem URL Context.

Cada estratégia usa timeout próprio: consultas simples são mais curtas; análise de vídeo recebe uma janela maior.

### Fluxo YouTube → cifra

O fluxo automático é:

`YouTube -> identificar música/artista -> gerar candidatos de cifra -> confirmar acesso via URL Context -> validar identidade -> mesclar cifra + dados do vídeo`

A cifra externa tem preferência para `originalKey`, `chordSheet` e `sections`; o vídeo continua tendo preferência para BPM, compasso quando identificado e link de referência. Se nenhuma fonte externa puder ser confirmada, o cadastro não falha: permanece a estrutura harmônica extraída do próprio vídeo.

Para manter o projeto frontend-only e compatível com o plano atual sem faturamento, o fluxo **não ativa Grounding with Google Search**. Nos modelos Gemini 3.x esse recurso pode exigir billing. Em vez disso, a busca automática usa padrões conhecidos de URL das fontes suportadas e só aceita uma cifra quando o próprio URL Context informa recuperação bem-sucedida.

## URL de cifra

O fluxo pode tentar enriquecer a análise usando URL Context do Firebase AI Logic quando a URL for publicamente acessível. Não existe scraping próprio, proxy ou tentativa de contornar paywall, login, robots ou bloqueios do site.

URL Context lê apenas a URL fornecida e pode não enxergar conteúdo carregado dinamicamente no navegador. Por isso, localizar vídeos incorporados em sites de cifra e confirmar uma cifra externa continua sendo **best effort**. A validação usa `urlContextMetadata.urlMetadata` e exige status de recuperação bem-sucedida antes de aceitar o conteúdo como fonte.

## Letra da música

A letra completa só é preenchida automaticamente quando ela foi fornecida pelo próprio usuário no conteúdo colado. Para páginas remotas, o sistema não tenta copiar integralmente a letra de terceiros; os dados remotos são usados para identificação, tom e estrutura harmônica quando disponíveis.

## Limites e confiabilidade

O cliente possui:

- prevenção de requisições duplicadas idênticas em curto intervalo;
- limite local de requisições em janela de tempo;
- timeout específico por estratégia;
- tratamento de quota, App Check, timeout e resposta inválida;
- normalização de tom, BPM, compasso e YouTube;
- fallback por nome/artista inferido de URLs conhecidas de cifra;
- geração determinística de candidatos Cifra Club e Banana Cifras a partir de nome/artista;
- validação de recuperação do URL Context antes de aceitar uma cifra automática;
- validação de identidade para impedir que uma cifra de outra música seja mesclada;
- campos não identificados permanecem vazios;
- nenhum autosave da sugestão.

Rate limit de cliente melhora UX, mas não substitui proteção de infraestrutura; App Check e as cotas do Firebase/Gemini são a barreira efetiva contra abuso sem backend dedicado.

## Testes

`tests/music-ai-import.test.js` e `tests/music-ai-universal-input.test.js` cobrem:

- parser/schema;
- tons válidos e inválidos;
- BPM plausível;
- URLs do YouTube;
- classificação automática da entrada única;
- seleção de estratégia por tipo de entrada;
- fallback de identidade para Cifra Club e Banana Cifras;
- geração de candidatos de cifra a partir da música identificada no vídeo;
- validação de sucesso do URL Context;
- validação de identidade da cifra encontrada;
- merge de dados do vídeo com a cifra externa sem perder o link do YouTube;
- extração de letra do conteúdo colado pelo usuário;
- respostas parciais;
- provider mockado;
- validação/fallback manual.

O ROADMAP P2 só deve ser marcado como concluído depois do Definition of Done: testes, Actions, validação desktop/mobile, temas, acessibilidade e validação da aplicação publicada.
