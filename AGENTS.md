# AGENTS.md — IDE Music

Este arquivo define as regras de engenharia, arquitetura, segurança e qualidade para qualquer alteração no repositório `louvor-ide`.

O objetivo é permitir evolução incremental do IDE Music sem voltar a concentrar regras de negócio na interface, sem criar acessos inseguros ao Firebase e sem quebrar a experiência existente em desktop ou mobile.

## 1. Propósito do produto

O IDE Music é a aplicação de apoio ao ministério de música para gerenciamento de usuários, funções ministeriais, indisponibilidades, eventos, escalas, setlists e biblioteca de músicas/cifras.

A aplicação deve evoluir de forma modular, preservando compatibilidade com o sistema atual enquanto os domínios do roadmap são implementados.

Princípios obrigatórios:

- UX deve funcionar bem em desktop e mobile.
- Acessibilidade e contraste não são opcionais.
- Firebase Authentication é a fonte de identidade.
- Autorização não pode existir somente no frontend.
- Função ministerial e permissão do sistema são conceitos independentes.
- Senhas nunca devem ser armazenadas no Firestore ou `localStorage`.
- Secrets nunca devem ser versionados.
- Regras de negócio não devem ficar espalhadas em componentes ou páginas.
- Dados pessoais devem seguir minimização, necessidade e rastreabilidade compatíveis com LGPD.

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
- Makefile como interface preferencial para tarefas locais de desenvolvimento, build, teste e deploy.

Não introduzir framework, bundler ou migração ampla de tecnologia sem decisão arquitetural explícita.

## 3. Arquitetura

O código novo deve seguir arquitetura modular por domínio/feature.

Fluxo preferencial:

`Page/Component -> Service/Use Case -> Repository -> Firebase/Data Source`

Responsabilidades:

- **Pages/Components**: renderização, interação, acessibilidade e estado estritamente visual.
- **Features**: composição de uma funcionalidade de negócio.
- **Services**: regras de negócio, casos de uso, coordenação e validações de domínio.
- **Repositories**: acesso e persistência de dados.
- **DTOs**: contratos de entrada/saída entre camadas e fronteiras externas.
- **Models**: representação e invariantes das entidades de domínio.
- **Routes**: definição e proteção de navegação.
- **Core**: infraestrutura compartilhada, autenticação, erros e abstrações centrais.
- **Utils**: funções puras e genéricas sem regra de negócio específica.
- **Constants**: constantes estáveis e enumerações compartilhadas.
- **Styles**: tokens, temas e estilos globais/reutilizáveis.

É proibido criar novo acesso direto ao Firestore dentro de componentes/páginas quando houver ou puder existir um Repository apropriado.

## 4. Estrutura de diretórios

Estrutura de referência:

```text
src/
├── components/     # componentes de UI reutilizáveis
├── config/         # configuração da aplicação e integrações
├── constants/      # constantes e enumerações
├── core/           # infraestrutura transversal
├── css/            # legado CSS em migração
├── dtos/           # contratos de transporte
├── features/       # módulos por domínio/feature
├── js/             # legado JavaScript em migração
├── models/         # entidades/modelos
├── pages/          # páginas HTML e composição de tela
├── repositories/   # persistência e consultas
├── routes/         # navegação e guards
├── scripts/        # scripts específicos da aplicação
├── services/       # regras de negócio/casos de uso
├── styles/         # design system/tokens/temas
├── tests/          # testes próximos da arquitetura nova
└── utils/          # utilitários puros

tests/              # suíte automatizada executada por npm test
```

Código legado em `src/js` e `src/css` pode permanecer durante a migração, mas novas funcionalidades devem preferir os diretórios arquiteturais novos.

## 5. Padrões de componentes

Componentes devem:

- possuir responsabilidade única;
- receber dados e callbacks por contratos claros;
- evitar acesso direto ao Firebase;
- evitar regras de autorização espalhadas;
- possuir estados de loading, erro e vazio quando aplicável;
- ser navegáveis por teclado quando interativos;
- usar elementos semânticos e atributos ARIA somente quando necessários;
- preservar foco em modais/drawers e devolver o foco ao elemento de origem ao fechar;
- ser responsivos por padrão.

Não duplicar componentes visualmente equivalentes. Antes de criar um novo componente, verificar `src/components`.

## 6. Services

Services representam casos de uso e regras de negócio.

Devem:

- receber dependências explicitamente sempre que possível;
- validar pré-condições de negócio;
- retornar resultados previsíveis;
- lançar/retornar erros padronizados;
- não depender de detalhes visuais da UI;
- não manipular DOM;
- coordenar mais de um Repository quando necessário.

Exemplos de regras que pertencem a Services:

- validar disponibilidade antes de escalar uma pessoa;
- garantir uma escala por evento;
- impedir ministro duplicado na mesma música;
- resolver permissões efetivas;
- aplicar regras para setlists e tons preferidos.

## 7. Repositories

Repositories encapsulam Firestore e demais mecanismos de persistência.

Devem:

- centralizar nomes de collections e queries;
- converter documentos para Models/DTOs;
- esconder detalhes do SDK Firebase das camadas superiores;
- evitar duplicação de consultas;
- documentar operações que dependam de índice;
- preservar IDs e timestamps relevantes;
- evitar gravações parciais que deixem entidades inconsistentes.

Transações ou batch writes devem ser usados quando a consistência entre múltiplos documentos exigir atomicidade.

## 8. DTOs e Models

Como o projeto permanece em JavaScript, contratos novos relevantes devem utilizar JSDoc.

DTOs devem descrever formato de entrada/saída, inclusive campos opcionais e nulabilidade.

Models devem representar entidades do domínio e não objetos brutos do Firebase.

Evitar objetos sem contrato atravessando várias camadas.

## 9. Routes e autorização

Toda rota protegida deve considerar:

1. usuário autenticado;
2. usuário ativo;
3. permissão necessária para leitura ou edição;
4. estado de carregamento da sessão;
5. comportamento seguro para acesso negado.

Ocultar um item de menu não é mecanismo de segurança.

A mesma operação deve ser protegida também por Firestore Security Rules e/ou backend quando aplicável.

## 10. Autenticação

Provedores previstos:

- Google;
- e-mail/senha.

Regras:

- usar Firebase Authentication como identidade canônica;
- nunca salvar senha, hash de senha ou credencial equivalente no Firestore;
- nunca salvar tokens de autenticação manualmente em `localStorage`;
- logout deve encerrar a sessão Firebase e limpar somente dados locais de sessão da aplicação;
- sessão expirada e usuário desativado devem ter tratamento explícito;
- recuperação de senha deve usar o fluxo do Firebase Authentication.

## 11. Permissões

Permissão do sistema deve ser separada das funções ministeriais.

Exemplo:

- função ministerial: Ministro, Back Vocal, Bateria, Baixo, Guitarra, Violão, Teclado, Sax, DM;
- permissão: Sem acesso, Leitura, Edição por módulo.

Nunca inferir privilégio administrativo apenas por uma função ministerial.

`SUPER_ADMIN` deve ser tratado como autorização do sistema, preferencialmente suportada por mecanismo confiável como Custom Claims/backend quando essa etapa for implementada.

Não introduzir e-mail administrativo hardcoded como controle definitivo de autorização no frontend.

## 12. Collections e nomenclatura

Modelo alvo definido pelo roadmap:

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

- collections em `camelCase` e no plural;
- IDs do Firebase não devem carregar significado de negócio desnecessário;
- campos em `camelCase`;
- booleanos com nomes afirmativos (`active`, `enabled`, `confirmed`);
- datas persistidas como Timestamp quando forem datas/horas de domínio;
- `createdAt` e `updatedAt` devem ser consistentes;
- referências lógicas devem usar nomes explícitos, por exemplo `eventId`, `scheduleId`, `userId`.

Antes de alterar collection existente ou migrar estrutura, prever compatibilidade/migração e atualizar Rules e testes.

## 13. Firestore Security Rules

As Rules são parte da aplicação e devem ser revisadas junto com qualquer alteração de dados/permissão.

Estado atual: as regras permitem leitura/escrita para usuários autenticados pelos provedores aceitos. Isso é uma etapa transitória e não deve ser tratado como modelo final de autorização.

Toda nova funcionalidade sensível deve prever:

- quem pode ler;
- quem pode criar;
- quem pode editar;
- quem pode excluir/inativar;
- quais campos podem ser modificados;
- prevenção de elevação de privilégios;
- testes automatizados das Rules quando a infraestrutura correspondente for adicionada.

Frontend nunca substitui Rule/backend.

## 14. Segurança

Obrigatório:

- não versionar `.env` real, chaves privadas, service accounts ou secrets;
- não logar tokens, senhas ou payloads sensíveis;
- validar dados vindos da UI antes de persistir;
- escapar/tratar conteúdo fornecido pelo usuário antes de renderizar HTML;
- evitar `innerHTML` com conteúdo não confiável;
- aplicar menor privilégio;
- não usar `localStorage` como fonte confiável de autorização;
- revisar operações administrativas quanto a abuso e escalonamento de privilégio.

A configuração pública do Firebase Web não deve ser confundida com autorização. Segurança depende de Authentication, Rules e backend adequado.

## 15. LGPD

Aplicar:

- minimização de dados;
- finalidade explícita;
- coleta apenas do necessário;
- consentimento quando juridicamente/aplicacionalmente exigido;
- registro de versão de termos e data/hora do aceite;
- política para retenção, inativação e exclusão;
- preservação apenas do histórico necessário para auditoria/operação;
- evitar replicar dados pessoais desnecessariamente entre documentos.

Audit logs devem registrar o necessário para rastreabilidade sem copiar dados sensíveis sem necessidade.

## 16. UX e acessibilidade

Toda alteração de UI deve ser validada em viewport desktop e mobile.

### 16.1. Navegação, funcionalidades e submenus

A árvore de navegação deve representar a arquitetura de informação do produto, e não apenas agrupar links visualmente.

- Funcionalidades distintas pertencentes ao mesmo domínio devem ser expostas como **submenus reais** do item pai na navegação principal. Exemplo: `Configurações > Template de Escala` e `Configurações > Funções Ministeriais`.
- Abas/tabs devem ser usadas apenas para diferentes visões, estados ou recortes da **mesma funcionalidade**, e não para esconder módulos funcionais independentes.
- Cada submenu deve possuir destino/estado de rota identificável e indicação correta de item ativo.
- Regras de autorização do item pai e dos filhos devem permanecer explícitas e coerentes; ocultar submenu não substitui guard, Rules ou backend.
- A hierarquia deve funcionar em desktop, drawer mobile e sidebar recolhida, com navegação por teclado e sem duplicar a mesma navegação dentro do conteúdo da página sem necessidade.
- Ao adicionar uma nova funcionalidade sob um domínio já existente, avaliar primeiro se ela deve ser um submenu antes de criar novo item de primeiro nível.

Requisitos mínimos:

- contraste compatível com WCAG para texto e controles;
- foco visível;
- navegação por teclado;
- labels associados aos campos;
- mensagens de erro compreensíveis;
- áreas de toque adequadas no mobile;
- nenhuma informação relevante comunicada somente por cor;
- layouts sem overflow horizontal acidental;
- estados de loading, erro, vazio e sucesso consistentes.

Não introduzir texto em verde claro ou outra cor de baixo contraste sobre fundo branco.

## 17. Erros, loading, empty states e confirmações

Usar o padrão compartilhado do projeto em vez de soluções locais incompatíveis.

Erros devem:

- ter código/tipo quando útil;
- preservar contexto técnico para diagnóstico sem expor detalhes sensíveis ao usuário;
- apresentar mensagem amigável na UI.

Operações destrutivas ou administrativas relevantes devem solicitar confirmação explícita.

## 18. Testes

Comando principal:

```bash
npm test
```

ou:

```bash
make test
```

Toda alteração deve incluir ou atualizar testes quando houver lógica verificável automaticamente.

Prioridades de teste:

- Services e regras de negócio;
- utilitários puros;
- mapeamentos de Repository/DTO;
- autorização e guards;
- regressões identificadas;
- Firestore Security Rules quando o ambiente de testes das Rules estiver disponível.

Testes não devem depender de produção nem alterar dados reais.

## 19. Logs e auditoria

Logs técnicos:

- não incluir secrets ou credenciais;
- usar níveis coerentes;
- evitar `console.log` permanente sem finalidade operacional.

Audit Log de negócio deve registrar, quando aplicável:

- ator (`actorUserId`);
- ação;
- entidade/tipo;
- ID da entidade;
- data/hora;
- resumo mínimo da mudança;
- motivo/contexto quando exigido por exceções administrativas.

Alterações administrativas críticas devem ser auditáveis.

## 20. Design System e estilos

Novos estilos reutilizáveis devem convergir para `src/styles` e componentes compartilhados.

Evitar:

- hexadecimais repetidos e espalhados;
- valores de spacing/radius arbitrários duplicados;
- CSS específico duplicando componente existente;
- estilos inline sem necessidade.

Tokens oficiais do IDE Music deverão ser usados assim que forem definidos no roadmap.

## 21. Compatibilidade e legado

A evolução é incremental.

Ao tocar código legado:

- não fazer refatoração ampla sem necessidade do item atual;
- extrair regra de negócio para Service quando ela estiver sendo modificada;
- mover acesso Firebase para Repository quando ele estiver sendo alterado;
- preservar comportamento público salvo quando a mudança for intencional;
- adicionar teste de regressão quando corrigir bug relevante.

## 22. Definition of Ready (DoR)

Um item está pronto para desenvolvimento quando:

- objetivo está claro;
- critérios de aceitação são identificáveis;
- entidades e permissões envolvidas são conhecidas;
- impacto em dados/Rules é entendido;
- dependências relevantes estão disponíveis;
- comportamento desktop/mobile foi considerado;
- riscos de segurança/LGPD foram avaliados quando aplicável.

Itens pequenos de refatoração ou correção podem usar uma versão proporcional desses critérios.

## 23. Definition of Done (DoD)

Um item só pode ser marcado como concluído no `ROADMAP.md` quando:

- implementação está completa;
- arquitetura deste documento foi respeitada;
- não há novo acesso inseguro ao Firebase;
- testes relevantes foram adicionados/atualizados e estão passando;
- fluxo principal foi validado;
- desktop e mobile foram considerados quando houver UI;
- acessibilidade/contraste foram verificados quando houver UI;
- Firestore Rules foram atualizadas quando necessário;
- documentação afetada foi atualizada;
- não foram adicionados secrets;
- não há regressão conhecida introduzida pela mudança.

## 24. Convenções de arquivos e código

- nomes de arquivos JavaScript: preferir `kebab-case.js` ou manter padrão consistente já adotado no módulo;
- classes/models: `PascalCase` quando representarem construtores/classes;
- funções e variáveis: `camelCase`;
- constantes globais: `UPPER_SNAKE_CASE` quando realmente constantes;
- evitar abreviações ambíguas;
- preferir funções pequenas com responsabilidade única;
- usar `async/await` de forma consistente em código assíncrono novo;
- documentar contratos públicos e estruturas não triviais com JSDoc.

Não renomear arquivos em massa apenas para adequação estética.

## 25. Branches, commits e Pull Requests

Branches sugeridas:

- `feat/<descricao-curta>`
- `fix/<descricao-curta>`
- `refactor/<descricao-curta>`
- `docs/<descricao-curta>`
- `test/<descricao-curta>`

Commits devem ser pequenos, objetivos e preferencialmente seguir Conventional Commits:

- `feat: ...`
- `fix: ...`
- `refactor: ...`
- `docs: ...`
- `test: ...`
- `chore: ...`

Pull Requests devem informar:

- problema/objetivo;
- solução adotada;
- impacto em dados e Rules;
- testes executados;
- evidência visual quando houver UI;
- riscos e migrações quando aplicável.

Não misturar refatoração ampla não relacionada com funcionalidade de negócio na mesma PR.

## 26. Checklist para qualquer alteração

Antes de concluir:

1. A mudança respeita a separação UI -> Service -> Repository?
2. Há alguma regra de negócio nova dentro da UI que deveria estar em Service?
3. Há algum acesso Firebase novo fora de Repository/core apropriado?
4. Autenticação e autorização estão separadas?
5. As Firestore Rules precisam mudar?
6. Há risco de armazenar ou expor dados sensíveis?
7. Desktop e mobile continuam utilizáveis?
8. Contraste, foco e labels estão adequados?
9. Testes relevantes passam?
10. A documentação e o `ROADMAP.md` devem ser atualizados?

## 27. Prioridade de instruções

Ao trabalhar em uma funcionalidade que possuir seu próprio `AGENTS.md`, as regras específicas daquele diretório complementam este documento.

Em caso de conflito:

1. requisitos explícitos da tarefa atual;
2. `AGENTS.md` mais específico do diretório/feature;
3. este `AGENTS.md` raiz;
4. convenções inferidas de código legado.

Nunca usar uma convenção de legado como justificativa para reduzir segurança, autorização ou proteção de dados.
