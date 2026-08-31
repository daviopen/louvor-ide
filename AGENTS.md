# AGENTS.md — IDE Music

Este arquivo define as regras obrigatórias de engenharia, arquitetura, segurança, UX, acessibilidade e qualidade para qualquer alteração no repositório `louvor-ide`.

O objetivo é permitir evolução incremental do IDE Music sem voltar a concentrar regras de negócio na interface, sem criar acessos inseguros ao Firebase, sem regressões de desktop/mobile e sem reintroduzir falhas já encontradas em auditorias de produção.

## 1. Propósito do produto

O IDE Music é a aplicação de apoio ao ministério de música para gerenciamento de usuários, funções ministeriais, indisponibilidades, eventos, escalas, setlists e biblioteca de músicas/cifras.

Princípios obrigatórios:

- UX deve funcionar bem em desktop, tablet e mobile.
- Acessibilidade e contraste não são opcionais.
- Firebase Authentication é a fonte de identidade.
- Autorização não pode existir somente no frontend.
- A matriz exibida na UI deve ser coerente com Firestore Security Rules.
- Função ministerial e permissão do sistema são conceitos independentes.
- Senhas, tokens e secrets nunca devem ser persistidos ou versionados.
- Regras de negócio não devem ficar espalhadas em componentes ou páginas.
- Dados pessoais devem seguir minimização, necessidade e rastreabilidade compatíveis com LGPD.
- Erro silencioso de console, overflow acidental e quebra em um breakpoint intermediário são bugs, não detalhes cosméticos.

## 2. Stack atual

- HTML5.
- CSS3.
- JavaScript vanilla.
- Firebase Authentication.
- Cloud Firestore.
- Firebase Hosting.
- Firebase CLI.
- Node.js >= 18.
- Testes automatizados com `node --test`.
- Playwright para validações E2E/produção quando aplicável.
- Makefile como interface preferencial para tarefas locais.

Não introduzir framework, bundler ou migração ampla de tecnologia sem decisão arquitetural explícita.

## 3. Arquitetura

Fluxo preferencial:

`Page/Component -> Service/Use Case -> Repository -> Firebase/Data Source`

Responsabilidades:

- **Pages/Components**: renderização, interação, acessibilidade e estado estritamente visual.
- **Features**: composição de funcionalidades.
- **Services**: regras de negócio, casos de uso, coordenação e validações de domínio.
- **Repositories**: acesso e persistência de dados.
- **DTOs**: contratos entre camadas e fronteiras externas.
- **Models**: representação e invariantes do domínio.
- **Routes**: definição e proteção de navegação.
- **Core**: infraestrutura compartilhada, autenticação, erros e abstrações centrais.
- **Utils**: funções puras/genéricas sem regra de negócio específica.
- **Constants**: constantes estáveis e enumerações.
- **Styles**: tokens, temas e componentes visuais compartilhados.

É proibido criar novo acesso direto ao Firestore dentro de componente/página quando houver ou puder existir Repository apropriado.

## 4. Estrutura de diretórios

```text
src/
├── components/
├── config/
├── constants/
├── core/
├── css/            # legado em migração
├── dtos/
├── features/
├── js/             # legado em migração
├── models/
├── pages/
├── repositories/
├── routes/
├── scripts/
├── services/
├── styles/
├── tests/
└── utils/

tests/              # suíte automatizada executada por npm test
```

Código legado pode permanecer durante a migração, mas novas funcionalidades devem preferir a arquitetura modular.

## 5. Pages e componentes

Componentes devem:

- possuir responsabilidade única;
- receber dados/callbacks por contratos claros;
- evitar acesso direto ao Firebase;
- evitar autorização espalhada;
- possuir loading, erro, vazio e sucesso quando aplicável;
- ser navegáveis por teclado quando interativos;
- usar HTML semântico e ARIA somente quando necessário;
- preservar/devolver foco em modais e drawers;
- ser responsivos por padrão.

### 5.1. Ownership de rota/view e DOM

Cada bootstrap de página deve possuir **uma rota/view explícita e exclusiva**.

Obrigatório:

- validar `pathname`, `section`, `view`, `tab` ou demais discriminadores antes de inicializar um módulo;
- quando duas views compartilham o mesmo `section`, seus bootstraps devem ser mutuamente exclusivos;
- um módulo não pode assumir que seu root existe apenas porque o `section` coincide;
- antes de escrever em `innerHTML`, anexar listeners ou consultar descendentes, validar a existência do elemento que o módulo realmente possui;
- não reaproveitar um bootstrap de lista em `view=export`, `view=participation` ou outra view especializada sem contrato explícito;
- listeners globais só devem ser instalados quando o módulo realmente estiver ativo.

Regra de regressão: toda correção causada por `null.innerHTML`, root ausente ou bootstrap concorrente deve ganhar teste que prove a exclusividade de view.

## 6. Services

Services devem:

- receber dependências explicitamente sempre que possível;
- validar pré-condições de negócio;
- retornar resultados previsíveis;
- lançar/retornar erros padronizados;
- não depender de detalhes visuais;
- não manipular DOM;
- coordenar mais de um Repository quando necessário.

Exemplos: disponibilidade antes de escalar, uma escala por evento, ministro duplicado, permissões efetivas, regras de setlist/tom.

## 7. Repositories

Repositories devem:

- centralizar collections e queries;
- converter documentos para Models/DTOs;
- esconder SDK Firebase das camadas superiores;
- evitar consultas duplicadas;
- documentar operações dependentes de índice;
- preservar IDs/timestamps relevantes;
- evitar gravações parciais inconsistentes.

Usar transação/batch quando consistência entre documentos exigir atomicidade.

## 8. DTOs e Models

Como o projeto permanece em JavaScript, contratos relevantes devem utilizar JSDoc.

Evitar objetos sem contrato atravessando várias camadas.

## 9. Routes e autorização

Toda rota protegida deve considerar:

1. usuário autenticado;
2. perfil provisionado;
3. usuário ativo;
4. permissão necessária (`READ`/`EDIT`);
5. estado de carregamento da sessão;
6. comportamento seguro para acesso negado.

Ocultar item de menu **não é segurança**.

A mesma operação deve ser protegida por Firestore Security Rules e/ou backend.

### 9.1. Paridade UI x Rules

A matriz de permissões da UI é contrato de segurança.

- Se a UI permite `Sem acesso`, as Rules não podem conceder leitura implícita para aquele módulo.
- Não criar exceções do tipo “todo usuário ativo pode ler X” sem requisito explícito e representação correspondente na UI.
- Dependências operacionais (ex.: Setlist precisa ler músicas/usuários) devem derivar da permissão efetiva do módulo solicitante, não de um bypass global.
- Toda alteração na matriz deve atualizar UI, guards, Rules e testes na mesma mudança.

## 10. Autenticação e provisionamento

Provedores previstos: Google e e-mail/senha.

Regras:

- Firebase Authentication é a identidade canônica;
- nunca salvar senha/hash/credencial no Firestore;
- nunca salvar token de autenticação manualmente em `localStorage`;
- logout encerra Firebase Auth e limpa somente dados locais da aplicação;
- sessão expirada e usuário desativado devem ter tratamento explícito;
- recuperação de senha usa Firebase Authentication;
- conta autenticada sem documento `users/{uid}` deve ser tratada como **não provisionada**, não como oportunidade de autoelevação;
- cliente/browser jamais deve se autoatribuir `ADMIN` ou `SUPER_ADMIN`;
- provisionamento administrativo deve ocorrer por fluxo confiável (Admin SDK/backend/admin já autorizado), com trilha auditável.

## 11. Permissões e privilégio administrativo

Função ministerial é independente de permissão do sistema.

`SUPER_ADMIN` deve ser reconhecido apenas por fonte de autorização confiável e perfil ativo/claim apropriado.

É proibido:

- e-mail administrativo hardcoded como fonte de autorização no frontend;
- e-mail hardcoded de bootstrap nas Firestore Rules;
- permitir criação de primeiro SUPER_ADMIN pelo navegador;
- confiar em `localStorage`, query string ou estado visual para elevar privilégio.

## 12. Collections e nomenclatura

Collections alvo:

- `users`
- `ministryFunctions`
- `userFunctions`
- `permissions`
- `events`
- `unavailability`
- `schedules`
- `scheduleMembers`
- `setlists`
- `setlistSongs`
- `songs`
- `songMinisterKeys`
- `auditLogs`
- `lgpdConsents`

Convenções:

- collections em `camelCase` e plural;
- campos em `camelCase`;
- booleanos afirmativos (`active`, `enabled`, `confirmed`);
- datas de domínio como Timestamp;
- `createdAt`/`updatedAt` consistentes;
- referências explícitas (`eventId`, `scheduleId`, `userId`).

## 13. Firestore Security Rules

As Rules são código de produção e devem ser revisadas junto com qualquer mudança de dados/permissão.

Estado esperado:

- acesso somente a perfis provisionados e ativos, salvo endpoints estritamente necessários ao próprio bootstrap autenticado;
- leitura/escrita por permissão explícita ou SUPER_ADMIN confiável;
- sem fallback global autenticado;
- prevenção de elevação de privilégio;
- operações administrativas com campos sensíveis protegidos;
- regras testadas automaticamente.

### 13.1. Audit logs

`auditLogs` deve ser append-only.

No cliente, quando a escrita ainda for necessária:

- `actorUserId` deve ser o próprio usuário autenticado;
- schema deve usar `hasAll`/`hasOnly` ou validação equivalente;
- `createdAt` deve usar timestamp do servidor (`request.time`/server timestamp);
- ação/tipo/id precisam de limites/formato válidos;
- update/delete devem permanecer proibidos.

Para trilha com valor probatório forte, ações críticas devem migrar para escrita por backend privilegiado, pois o cliente não deve ser considerado testemunha confiável do próprio evento.

## 14. Segurança e sanitização

Obrigatório:

- não versionar `.env` real, private keys, service accounts ou secrets;
- não logar tokens, senhas, Authorization, cookies ou credenciais;
- validar dados da UI antes de persistir;
- escapar conteúdo do usuário antes de renderizar HTML;
- evitar `innerHTML` com conteúdo não confiável;
- aplicar menor privilégio;
- revisar operações administrativas contra abuso.

### 14.1. Logs, URLs e artefatos de QA

Nunca persistir em screenshots metadata, JSON, ZIP, trace, console dump ou artifact CI:

- header `Authorization`;
- bearer token;
- cookie/session;
- URL completa quando query string puder carregar credencial;
- payload de request que possa conter token.

Antes de salvar evidência automática:

- sanitizar/redigir dados sensíveis;
- preferir `origin + pathname` e uma whitelist de query params seguros;
- classificar `requestfailed`: aborto de listener Firestore durante navegação não deve ser contado como falha de backend por padrão;
- nunca publicar artifact bruto sem revisar se contém credenciais.

## 15. LGPD

Aplicar minimização, finalidade, consentimento quando aplicável, versionamento de termos, retenção proporcional e não replicar dados pessoais desnecessariamente.

Audit logs registram o mínimo necessário para rastreabilidade.

## 16. UX, responsividade e acessibilidade

Toda alteração visual deve ser validada, no mínimo, nesta matriz:

- desktop: **1440 × 900**;
- breakpoint intermediário/tablet: **820–834 px** de largura;
- mobile: **390 × 844**;
- tema claro;
- tema escuro.

Se o componente tem breakpoint próprio, validar imediatamente antes e depois dele.

### 16.1. Requisitos bloqueantes

- zero overflow horizontal acidental no `document`;
- regiões que precisam de scroll horizontal devem conter o scroll localmente e ser acessíveis por teclado;
- touch target interativo em mobile/coarse pointer: **mínimo 44 × 44 px**;
- texto normal: contraste WCAG AA **>= 4.5:1**;
- texto grande e componentes gráficos/controles: **>= 3:1** quando aplicável;
- foco visível;
- todo controle de formulário possui accessible name (`label`, `aria-label` ou `aria-labelledby`);
- cada view possui um `h1` coerente;
- nenhuma informação relevante é comunicada somente por cor;
- loading/erro/vazio/sucesso são consistentes;
- modais/drawers preservam foco e não deixam conteúdo inacessível.

Não usar verde-lima/brand accent como texto sobre fundo claro sem cálculo explícito de contraste. Para texto de destaque no tema claro, usar token escuro próprio (`--music-accent-text` ou equivalente aprovado).

### 16.2. ARIA

Preferir HTML nativo. Quando ARIA for realmente necessário:

- respeitar a hierarquia de roles exigida;
- `grid` deve possuir `row`, e `row` deve possuir `gridcell`/células apropriadas;
- não usar ARIA para “consertar” semântica visual que poderia ser HTML nativo;
- testar com Axe e navegação por teclado.

### 16.3. Navegação e submenus

Funcionalidades distintas do mesmo domínio devem ser submenus reais quando isso representar a arquitetura de informação.

Submenus devem funcionar em desktop, sidebar recolhida, drawer mobile e teclado, com rota/estado ativo correto.

### 16.4. Preservação de contexto de listagens

Ao sair de uma listagem para abrir consulta, detalhe, cadastro ou edição e depois retornar, a aplicação deve preservar o contexto anterior sempre que esse contexto ainda for válido.

Obrigatório:

- preservar filtros ativos, busca, ordenação, paginação e seleção relevante da listagem;
- usar a URL/query string como fonte principal do estado navegável quando o estado precisar sobreviver à troca de página;
- atualizar esse estado com `history.replaceState` quando possível, sem reload;
- usar `sessionStorage` somente como fallback local de curta duração, nunca como única fonte quando o estado deva ser reproduzível por URL;
- validar qualquer `returnTo`/destino de retorno e aceitar somente URLs internas da própria aplicação;
- não criar leituras adicionais no Firestore apenas para reconstruir filtros, paginação ou contexto visual;
- parâmetros neutros/default devem ser omitidos da URL quando possível;
- fluxos que permanecem na mesma página por modal/dialog não devem introduzir navegação artificial apenas para cumprir esta regra;
- qualquer correção de regressão relacionada à perda de contexto deve incluir teste automatizado cobrindo restauração e segurança do retorno.

Regra de UX: o fluxo esperado é **filtrar -> abrir/editar -> voltar -> continuar de onde estava**, sem perda de contexto e sem custo de rede desnecessário.

## 17. Erros, loading, empty states e confirmações

Erros devem preservar contexto técnico sem expor detalhe sensível e apresentar mensagem amigável.

Operações destrutivas/administrativas relevantes exigem confirmação explícita.

Texto de status normal (“75 de 500 registros”) não deve usar classe/semântica que o QA confunda com loading infinito; loading deve desaparecer ou mudar semanticamente quando concluído.

## 18. Testes

Comando principal:

```bash
npm test
```

ou:

```bash
make test
```

Toda correção de bug relevante deve adicionar teste de regressão.

Prioridades:

- Services/regras de negócio;
- Repository/DTO;
- autorização/guards;
- Firestore Rules;
- route/view ownership;
- transformações de build;
- acessibilidade/responsividade;
- regressões já observadas em produção.

### 18.1. Transformações de build

Scripts de build nunca podem fazer substituição regex global indiscriminada em HTML.

Exemplo proibido: converter todo `#RRGGBB` do arquivo em CSS variable, pois isso pode corromper `value` de `<input type="color">`, `data-*`, SVG ou atributos nativos.

Obrigatório:

- transformação de cor deve ser limitada a contexto CSS (`<style>` e `style="..."`) quando esta for a intenção;
- valores nativos de HTML devem permanecer no formato exigido pelo browser;
- CSS custom property (`var(--token)`) não pode substituir valor que exige hexadecimal literal;
- toda normalização de build deve ter teste com casos positivos e negativos.

## 19. Logs, observabilidade e auditoria

Logs técnicos:

- não incluem secrets;
- usam níveis coerentes;
- não deixam `console.log` permanente sem finalidade;
- `console.error` em fluxo nominal é bug.

Auditoria de negócio deve registrar ator, ação, entidade/tipo, ID, horário do servidor e resumo mínimo.

## 20. Design System e estilos

Novos estilos reutilizáveis convergem para `src/styles`.

Evitar:

- cores hex repetidas;
- spacing/radius arbitrário;
- CSS duplicando componente existente;
- estilo inline sem necessidade;
- breakpoint conflitante entre shell e conteúdo.

### 20.1. Breakpoints

O shell usa 900 px como transição desktop/mobile. Componentes críticos não devem permanecer em layout desktop incompatível dentro da faixa em que o shell já virou mobile.

Ao definir breakpoint diferente, justificar e validar a faixa intermediária, especialmente **769–900 px**.

## 21. Compatibilidade e legado

Ao tocar legado:

- não fazer refatoração ampla sem necessidade;
- extrair regra de negócio para Service quando modificada;
- mover acesso Firebase para Repository quando alterado;
- preservar comportamento público salvo mudança intencional;
- adicionar teste de regressão.

Runtime de compatibilidade/acessibilidade pode existir como safety net, mas **não substitui corrigir a fonte** quando o componente for novamente alterado.

## 22. Definition of Ready (DoR)

Um item está pronto quando objetivo, critérios, entidades/permissões, impacto em dados/Rules, dependências, comportamento responsivo e riscos de segurança/LGPD são conhecidos proporcionalmente ao tamanho da tarefa.

## 23. Definition of Done (DoD)

Um item com UI só está concluído quando:

- implementação completa e arquitetura respeitada;
- testes relevantes passam;
- fluxo principal validado;
- desktop 1440, intermediário 820/834 e mobile 390 considerados quando afetados;
- tema claro e escuro considerados;
- nenhum overflow horizontal acidental conhecido;
- touch targets >=44 px em controles relevantes no mobile;
- Axe/contraste sem regressão relevante;
- `console.error` e `pageerror` em fluxo nominal = **0**;
- nenhum HTTP 5xx inesperado;
- Rules atualizadas e coerentes com a UI quando necessário;
- artifacts/logs sanitizados;
- documentação afetada atualizada;
- nenhum secret adicionado;
- nenhuma regressão conhecida introduzida.

## 24. Convenções de arquivos e código

- JS: `kebab-case.js` ou padrão consistente do módulo;
- classes/models: `PascalCase`;
- funções/variáveis: `camelCase`;
- constantes globais: `UPPER_SNAKE_CASE` quando realmente constantes;
- evitar abreviações ambíguas;
- funções pequenas/responsabilidade única;
- `async/await` consistente;
- JSDoc em contratos públicos/não triviais.

## 25. Branches, commits e Pull Requests

Branches: `feat/`, `fix/`, `refactor/`, `docs/`, `test/`.

Commits preferencialmente Conventional Commits.

PR deve informar: problema, solução, impacto em dados/Rules, testes, evidência visual, riscos/migrações.

Não misturar refatoração ampla não relacionada.

## 26. Checklist obrigatório para qualquer alteração

Antes de concluir, responder objetivamente:

1. A separação UI -> Service -> Repository foi preservada?
2. O bootstrap pertence exclusivamente à rota/view atual?
3. Todo root DOM manipulado é validado antes do uso?
4. Autenticação e autorização estão separadas?
5. UI, guard e Firestore Rules concedem exatamente o mesmo nível de acesso?
6. Existe identidade administrativa hardcoded ou caminho de autoelevação? Se sim, bloquear.
7. Há risco de secrets em logs, URLs, traces ou artifacts?
8. Desktop 1440, intermediário 820/834 e mobile 390 foram considerados?
9. Tema claro/escuro mantêm contraste adequado?
10. Existe overflow horizontal acidental?
11. Controles touch possuem 44 × 44 px?
12. Form controls têm accessible name e ARIA possui hierarquia válida?
13. Console nominal está sem `console.error`/`pageerror`?
14. Transformações de build preservam atributos nativos?
15. Um teste de regressão cobre o bug corrigido?
16. Documentação/ROADMAP precisam ser atualizados?

## 27. QA de produção

Auditoria de produção deve ser **não destrutiva** por padrão.

Pode abrir consulta, filtros, detalhe, cadastro e edição sem salvar. Fluxos destrutivos só com fixture isolada e cleanup garantido.

Uma auditoria considerada completa deve, quando aplicável:

- percorrer todas as rotas expostas ao perfil testado;
- capturar desktop/mobile e claro/escuro;
- abrir filtros, menus, create/edit/detail seguros;
- observar `console.error`, `console.warn`, `pageerror`, requests e HTTP 5xx;
- executar Axe;
- medir overflow do documento;
- medir touch targets;
- distinguir falso positivo de defeito real antes de classificar severidade;
- sanitizar toda evidência antes de upload.

Não classificar `net::ERR_ABORTED` de listener Firestore cancelado por navegação como indisponibilidade de backend sem evidência adicional.

## 28. Prioridade de instruções

Ao trabalhar em funcionalidade com `AGENTS.md` próprio, as regras específicas complementam este documento.

Em caso de conflito:

1. requisito explícito da tarefa atual;
2. `AGENTS.md` mais específico;
3. este `AGENTS.md` raiz;
4. convenções do legado.

Nunca usar legado como justificativa para reduzir segurança, autorização, acessibilidade ou proteção de dados.