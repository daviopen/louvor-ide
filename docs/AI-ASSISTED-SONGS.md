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
5. Disponibilize o site key público ao runtime como `window.ENV.VITE_FIREBASE_APPCHECK_SITE_KEY` ou `window.FIREBASE_APPCHECK_SITE_KEY`.

Se o App Check/site key ou a IA estiverem indisponíveis, a tela não bloqueia o usuário: o cadastro manual permanece utilizável.

## Modelo e contrato

- Provider abstrato: `src/services/music-ai-provider.js`.
- Provider Firebase: `src/services/firebase-music-ai-provider.js`.
- Structured Output versionado: `src/services/music-ai-schema.js`.
- Schema atual: `1.0.0`.
- Modelo padrão: `gemini-3.6-flash`.
- O modelo pode ser sobrescrito no runtime por `window.ENV.VITE_FIREBASE_AI_MODEL`.

Campos automáticos relevantes:

- `originalKey` + legado `tom` para retrocompatibilidade;
- `bpm`, `bpmSource`;
- `timeSignature`;
- `sourceUrl`, `sourceProvider`, `sourceType`, `importedAt`;
- `video.provider`, `video.url`, `video.videoId`;
- `fieldProvenance`;
- `aiProvider`, `aiModel`, `aiSchemaVersion`;
- `importMethod` (`manual` ou `ai-assisted`).

`preferredKey` continua em `songMinisterKeys`. O tom de execução continua pertencendo ao Setlist, não à música.

## URL de cifra

O fluxo pode tentar enriquecer a análise usando URL Context do Firebase AI Logic quando a URL for publicamente acessível. Não existe scraping próprio, proxy ou tentativa de contornar paywall, login, robots ou bloqueios do site. Se a URL falhar, o texto colado é o fallback imediato.

## Limites e confiabilidade

O cliente possui:

- prevenção de requisições duplicadas idênticas em curto intervalo;
- limite local de requisições em janela de tempo;
- timeout do SDK;
- tratamento de quota, App Check, timeout e resposta inválida;
- normalização de tom, BPM, compasso e YouTube;
- campos não identificados permanecem vazios;
- nenhum autosave da sugestão.

Rate limit de cliente melhora UX, mas não substitui proteção de infraestrutura; App Check e as cotas do Firebase/Gemini são a barreira efetiva contra abuso sem backend dedicado.

## Testes

`tests/music-ai-import.test.js` cobre:

- parser/schema;
- tons válidos e inválidos;
- BPM plausível;
- URLs do YouTube;
- respostas parciais;
- provider mockado;
- validação/fallback manual.

O ROADMAP P2 só deve ser marcado como concluído depois do Definition of Done: testes, Actions, validação desktop/mobile, temas, acessibilidade e validação da aplicação publicada.
