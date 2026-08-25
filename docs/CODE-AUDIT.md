# Auditoria do Código Atual — IDE Music

Data da auditoria: 2026-08-25

Esta auditoria registra o estado do código legado antes da evolução dos próximos itens do `ROADMAP.md`. O objetivo é estabelecer uma linha de base objetiva para refatoração incremental, sem esconder riscos existentes e sem exigir uma reescrita ampla antes das próximas entregas.

## 1. Escopo revisado

Foram revisados:

- arquitetura e estrutura de diretórios;
- páginas HTML e scripts de página;
- módulos JavaScript compartilhados;
- integração Firebase Authentication / Firestore;
- persistência e uso de `localStorage` / `sessionStorage`;
- CSS global e estilos inline;
- nomenclaturas e identidade IDE Music;
- testes automatizados existentes;
- Firestore Rules e configuração de Firebase;
- arquivos legados/duplicados de Setlist.

## 2. Resumo executivo

O projeto já possui uma arquitetura alvo documentada e uma base inicial de `core`, `features`, `repositories`, `services`, `dtos`, `models`, `routes`, `styles` e `tests`, mas o runtime principal ainda depende fortemente de código legado em `src/js`, páginas HTML com muito CSS inline e acesso direto ao Firebase.

Principais riscos atuais:

1. **Acesso direto ao Firestore dentro de scripts de página**, especialmente no fluxo de Setlist.
2. **Persistência híbrida Firestore + `localStorage`**, com fallback silencioso para gravações locais quando o Firestore falha.
3. **Duplicação de implementação**, principalmente pares `setlist.js`/`setlist-simple.js`, `setlists.js`/`setlists-simple.js` e dois adaptadores de banco (`firebase-config.js` e `database.js`).
4. **Configuração Firebase duplicada/hardcoded em código legado**. A configuração Web do Firebase não é segredo por si só, mas duplicá-la fora do ponto central cria risco operacional e de configuração divergente.
5. **HTML dinâmico construído com `innerHTML`/template strings usando dados persistidos**, elevando risco de XSS se valores não forem escapados.
6. **CSS e regras visuais duplicadas em páginas**, com grande quantidade de hexadecimais e estilos inline, dificultando consistência, contraste e dark mode.
7. **Nomenclatura histórica `MusicIde*` coexistindo com a marca oficial `IDE Music`**.
8. **Firestore Rules ainda transitórias**, sem autorização granular por módulo/permissão.

## 3. Duplicações de JS, CSS e componentes

### 3.1 Setlists

Arquivos paralelos encontrados:

- `src/js/pages/setlist.js`
- `src/js/pages/setlist-simple.js`
- `src/js/pages/setlists.js`
- `src/js/pages/setlists-simple.js`

As páginas atuais carregam as versões `*-simple.js`, enquanto as versões sem sufixo permanecem no repositório. Isso aumenta o custo de manutenção e a possibilidade de corrigir o arquivo errado.

Ação definida:

- considerar `setlist-simple.js` e `setlists-simple.js` como **legado ativo** até migração para `features/setlists`;
- considerar `setlist.js` e `setlists.js` como **candidatos a remoção** após teste de regressão confirmar ausência de referências;
- não criar nova lógica nesses quatro arquivos sem extração para Service/Repository.

### 3.2 Banco de dados

Existem duas implementações com responsabilidade sobre inicialização/persistência:

- `src/config/firebase-config.js`
- `src/js/modules/database.js`

Ambas implementam comportamento híbrido Firestore + `localStorage`, incluindo dados de exemplo e lógica de fallback.

Ação definida:

- manter `src/config/firebase-config.js` apenas como bootstrap/configuração durante a transição;
- migrar persistência para `src/repositories`;
- remover a implementação paralela de `database.js` quando os consumidores forem migrados.

### 3.3 Estilos

Há CSS global em:

- `src/css/styles.css`
- `src/css/music-ide-theme.css`

Além disso, páginas como `setlist.html` contêm centenas de linhas de CSS inline e regras de cor duplicadas.

Ação definida:

- novas telas não devem adicionar grandes blocos `<style>` locais;
- componentes e tokens novos devem ir para `src/styles`/`src/components`;
- CSS legado será migrado gradualmente no passo de Design System.

## 4. Regras de negócio no frontend

Foram encontradas regras de negócio dentro de scripts de página, principalmente em Setlist:

- composição e migração de estrutura de músicas da Setlist;
- definição de tom original/final;
- transformação de dados legados;
- decisão entre Firestore e fallback local;
- carregamento/ordenação de Setlists;
- manutenção de ministros e tons por música;
- operações CRUD diretamente no gerenciador de tela.

Essas regras devem migrar para `features/setlists`, Services e Repositories. A UI deve ficar responsável apenas por estado visual, eventos de interface e renderização.

## 5. Acessos diretos ao Firebase

### 5.1 Ocorrências relevantes

`src/js/pages/setlist-simple.js` inicializa/consulta `firebase.firestore()` diretamente e acessa collections dentro da própria classe de UI.

`src/js/pages/setlists-simple.js` também inicializa Firebase e executa consultas Firestore diretamente.

`src/js/modules/database.js` e `src/config/firebase-config.js` encapsulam parcialmente o acesso, porém ainda são implementações legadas e duplicadas.

### 5.2 Regra para código novo

Nenhuma nova página/componente pode criar chamadas do tipo:

```js
firebase.firestore()
db.collection(...)
```

quando `db` for uma instância direta do SDK.

Novos acessos devem passar por Repository.

## 6. `localStorage` e persistência local

### 6.1 Uso aceitável encontrado

`sessionStorage` no `auth-service.js` é usado somente para guardar a URL de retorno durante o login. O valor é sanitizado e não é fonte de autorização.

### 6.2 Uso de risco

`firebase-config.js`, `database.js`, `setlist-simple.js` e `setlists-simple.js` tratam `localStorage` como fallback para dados de músicas/Setlists.

Problemas:

- uma falha do Firestore pode resultar em gravação local silenciosa;
- o usuário pode acreditar que dados foram persistidos no sistema central quando ficaram apenas no navegador;
- dados podem divergir entre dispositivos;
- o navegador passa a funcionar como fonte de verdade paralela;
- não existe estratégia explícita de sincronização/conflito;
- o comportamento dificulta aplicação consistente de permissões e auditoria.

Ação definida:

- não ampliar esse padrão;
- remover fallback de escrita durante a migração para Repositories;
- quando o modo offline for implementado, preferir persistência offline oficial do Firestore, com estado de sincronização explícito;
- nunca usar `localStorage` para permissões, privilégios, tokens ou decisões de autorização.

## 7. Segurança

### 7.1 Configuração Firebase duplicada

Há configuração Firebase Web hardcoded em `database.js`, `setlist-simple.js` e `setlists-simple.js`, apesar da existência de configuração central baseada em `window.ENV`.

Embora a configuração Web do Firebase seja pública por natureza, a duplicação deve ser removida porque:

- dificulta troca de ambiente;
- pode apontar homologação para produção;
- contorna a configuração central;
- cria múltiplos pontos de manutenção.

### 7.2 XSS

`setlists-simple.js` monta cards usando template strings e `innerHTML`, incluindo campos persistidos como nome, descrição, artista e título.

Até a migração para componentes seguros:

- conteúdo persistido deve ser escapado antes de entrar em HTML;
- preferir `textContent` e criação de elementos DOM;
- não aceitar HTML de usuário como conteúdo confiável.

### 7.3 Autorização

O frontend protege autenticação, mas autorização por módulo/permissão ainda não está implementada de forma confiável.

O estado atual das Firestore Rules deve ser tratado como transitório. As próximas implementações administrativas não podem depender apenas de menu oculto ou validação JS.

## 8. Nomenclaturas inconsistentes

Foram encontrados identificadores históricos como:

- `MusicIdeAuth`
- `currentMusicIdeUser`
- `musicIdeAuthReady`
- classes CSS `music-ide-*`
- arquivo `music-ide-theme.css`

A identidade visível já usa **IDE Music**, que é a nomenclatura oficial.

Ação definida:

- não fazer rename em massa agora para evitar regressões;
- todo código novo deve usar prefixo/termos `ideMusic` / `IdeMusic` quando um namespace for necessário;
- renomes legados devem ocorrer junto da migração do módulo correspondente e com teste de regressão.

## 9. Responsividade, acessibilidade e contraste

### 9.1 Pontos positivos

- `music-ide-theme.css` já contém shell lateral e breakpoint mobile;
- campos usam labels em várias páginas;
- o tema atual possui tokens iniciais e melhora o contraste do verde sobre superfícies claras;
- Auth evita flash de conteúdo protegido com estado `auth-pending`.

### 9.2 Débitos

- muitas páginas ainda contêm CSS inline independente do tema global;
- cores são definidas por hexadecimais espalhados;
- componentes interativos são frequentemente construídos por `<div onclick>` ou HTML gerado;
- foco, semântica de botão, teclado e leitores de tela precisam ser validados fluxo a fluxo;
- páginas muito grandes dificultam garantir consistência mobile;
- ainda não existe tema escuro/claro formalizado por tokens oficiais.

Ação definida:

- centralizar tokens no passo 6;
- migrar componentes no passo 5;
- não introduzir novas cores ou componentes locais quando houver equivalente compartilhado.

## 10. Mapa de legado

| Área | Arquivos principais | Estado | Direção |
| --- | --- | --- | --- |
| Auth | `src/js/modules/auth-service.js` | ativo, com testes | migrar gradualmente para `features/auth`/core |
| Firebase bootstrap | `src/config/firebase-config.js` | ativo, legado | restringir a bootstrap; remover persistência híbrida |
| DatabaseService | `src/js/modules/database.js` | legado paralelo | retirar após migração de consumidores |
| Setlist editor | `src/js/pages/setlist-simple.js` | legado ativo | migrar para Service + Repository |
| Setlist listagem | `src/js/pages/setlists-simple.js` | legado ativo | migrar para Service + Repository |
| Setlist versões antigas | `setlist.js`, `setlists.js` | candidato a remoção | remover após confirmar ausência de referências |
| CSS de marca | `src/css/music-ide-theme.css` | ativo | converter em tokens/design system |
| CSS inline de páginas | vários HTML | legado | extrair para componentes/styles |

## 11. Refatoração necessária definida por prioridade

### P0 — antes de permissões/administração

1. Firestore Rules por autenticação/autorização adequada.
2. Não permitir que `localStorage` seja fonte alternativa para operações administrativas.
3. Remover acesso Firestore direto de novas telas administrativas.
4. Escapar conteúdo persistido atualmente renderizado por `innerHTML`.

### P1 — durante Design System / dados

1. Consolidar os dois adaptadores de banco em Repositories.
2. Migrar Setlist para `features/setlists`.
3. Remover versões JS antigas após regressão.
4. Extrair CSS inline e cores para tokens/componentes.
5. Normalizar nomes `MusicIde*` durante migração, não por rename global.

## 12. Critério de não-regressão

A partir desta auditoria:

- nenhuma nova página deve acessar Firestore diretamente;
- nenhum novo módulo deve introduzir fallback de escrita em `localStorage`;
- nenhuma nova configuração Firebase deve ser hardcoded fora do bootstrap de ambiente;
- nenhum novo HTML dinâmico deve interpolar dados não confiáveis sem escaping;
- nenhuma nova regra de negócio deve ser adicionada diretamente a páginas quando pertencer a Service;
- duplicações identificadas não devem ser expandidas.

## 13. Conclusão

A auditoria confirma que a arquitetura alvo está criada, porém a aplicação ainda possui uma camada significativa de legado operacional. Esse legado não deve ser reescrito em bloco: ele deve ser substituído por domínio à medida que cada item do roadmap for implementado.

Os riscos encontrados estão agora documentados, classificados e possuem direção de refatoração. Os próximos passos devem usar este documento como baseline para impedir aumento da dívida técnica e orientar a migração incremental.