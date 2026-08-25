# Auditoria do Código Atual — IDE Music

Data da auditoria: 2026-08-25

Esta auditoria registra a linha de base do código legado antes dos próximos itens do `ROADMAP.md`. A estratégia é refatoração incremental, sem reescrita ampla e sem ampliar dívidas já identificadas.

## 1. Escopo revisado

Foram revisados:

- arquitetura e estrutura de diretórios;
- páginas HTML e scripts de página;
- módulos JavaScript compartilhados;
- Firebase Authentication, Firestore e Rules;
- `localStorage` e `sessionStorage`;
- CSS global, CSS inline e responsividade;
- nomenclaturas e identidade IDE Music;
- testes automatizados existentes;
- duplicações e arquivos legados do fluxo de Setlist.

## 2. Resumo executivo

A arquitetura alvo já existe em `core`, `components`, `features`, `services`, `repositories`, `models`, `dtos`, `routes`, `utils`, `styles`, `constants` e `tests`, mas o runtime principal ainda depende de código legado em `src/js` e páginas HTML extensas.

Principais riscos atuais:

1. acesso direto ao Firestore em scripts de página, sobretudo Setlist;
2. persistência híbrida Firestore + `localStorage` com fallback silencioso;
3. dois adaptadores de banco (`firebase-config.js` e `database.js`);
4. configuração Firebase duplicada/hardcoded em código legado;
5. dados persistidos interpolados em `innerHTML`/template strings sem camada comum de escaping;
6. CSS inline e hexadecimais espalhados, dificultando contraste, manutenção e dark mode;
7. nomenclatura histórica `MusicIde*` coexistindo com a marca oficial **IDE Music**;
8. Firestore Rules ainda transitórias e sem autorização granular por módulo/permissão.

## 3. Duplicações de JS, CSS e componentes

### 3.1 Setlists

A auditoria encontrou dois pares de implementações:

- `src/js/pages/setlist.js` e `src/js/pages/setlist-simple.js`;
- `src/js/pages/setlists.js` e `src/js/pages/setlists-simple.js`.

As páginas ativas carregam somente as versões `*-simple.js`. As versões antigas sem sufixo não eram referenciadas e foram removidas nesta etapa:

- removido `src/js/pages/setlist.js`;
- removido `src/js/pages/setlists.js`.

As versões `setlist-simple.js` e `setlists-simple.js` passam a ser classificadas como **legado ativo** até a migração para `features/setlists`.

### 3.2 Persistência

Há duas implementações com responsabilidade sobre Firebase/persistência:

- `src/config/firebase-config.js`;
- `src/js/modules/database.js`.

Ambas contêm comportamento híbrido Firestore + `localStorage`, incluindo dados de exemplo e fallback.

Direção:

- `firebase-config.js` deve convergir para bootstrap/configuração;
- acesso a dados deve migrar para `src/repositories`;
- `database.js` deve ser removido depois que seus consumidores forem migrados.

### 3.3 Estilos

Há CSS global em `src/css/styles.css` e `src/css/music-ide-theme.css`, além de grandes blocos `<style>` nas páginas HTML. `setlist.html`, por exemplo, mantém várias regras de cor, layout e responsividade dentro do próprio documento.

Direção:

- novas telas não devem ampliar CSS inline;
- tokens/componentes devem migrar para `src/styles` e `src/components` nos passos 5 e 6 do roadmap.

## 4. Regras de negócio no frontend

Foram encontradas regras de negócio dentro de scripts de página, especialmente no fluxo de Setlist:

- transformação/migração da estrutura de músicas;
- definição de tom original/final;
- decisão entre Firestore e fallback local;
- carregamento e ordenação de Setlists;
- manutenção de ministros e tons por música;
- CRUD diretamente em classes de UI.

Essas regras devem migrar para `features/setlists`, Services e Repositories. Páginas/componentes devem se limitar a estado visual, eventos e renderização.

## 5. Acessos diretos ao Firebase

Ocorrências relevantes:

- `src/js/pages/setlist-simple.js` inicializa/consulta `firebase.firestore()` diretamente;
- `src/js/pages/setlists-simple.js` inicializa Firebase e executa queries Firestore na classe de UI;
- `src/js/modules/database.js` e `src/config/firebase-config.js` encapsulam parcialmente o SDK, mas continuam sendo implementações legadas e duplicadas.

Regra para código novo:

```text
Page/Component -> Service -> Repository -> Firebase
```

Nenhuma nova página/componente deve criar acesso direto ao SDK Firestore.

## 6. `localStorage` e persistência local

### Uso aceitável

`sessionStorage` no `auth-service.js` guarda apenas a URL de retorno durante o login. O valor é sanitizado e não funciona como autorização.

### Uso de risco

`firebase-config.js`, `database.js`, `setlist-simple.js` e `setlists-simple.js` usam `localStorage` como fallback para músicas/Setlists.

Riscos:

- falha no Firestore pode terminar em gravação somente local;
- dados podem divergir entre navegadores/dispositivos;
- não existe sincronização ou resolução explícita de conflitos;
- o usuário pode receber sucesso sem persistência central;
- permissões e auditoria ficam inconsistentes se esse padrão for aplicado a módulos administrativos.

Direção:

- não ampliar esse padrão;
- remover fallback de escrita na migração para Repositories;
- usar a persistência offline oficial do Firestore quando o passo Offline for implementado;
- nunca usar `localStorage` para privilégios, permissões, tokens ou decisões de autorização.

## 7. Segurança

### 7.1 Configuração Firebase

Há configuração Firebase Web hardcoded em `database.js`, `setlist-simple.js` e `setlists-simple.js`, apesar da configuração central por `window.ENV`.

A configuração Web do Firebase é pública por natureza, mas a duplicação é inadequada porque dificulta ambientes separados, manutenção e troca segura de configuração.

### 7.2 XSS

`setlists-simple.js` monta cards e modais com `innerHTML`/template strings incluindo campos persistidos como nome, descrição, artista, título e ministro.

Direção:

- preferir `textContent` e criação de elementos DOM;
- quando HTML for inevitável, escapar dados persistidos antes da interpolação;
- não aceitar conteúdo persistido como HTML confiável.

### 7.3 Autorização

A aplicação possui autenticação, mas autorização granular por módulo/permissão ainda não está implementada de forma confiável no frontend + Rules/backend. O estado das Firestore Rules é transitório e não deve ser usado como modelo final.

## 8. Nomenclaturas inconsistentes

Identificadores históricos encontrados:

- `MusicIdeAuth`;
- `currentMusicIdeUser`;
- `musicIdeAuthReady`;
- classes CSS `music-ide-*`;
- `music-ide-theme.css`.

A marca oficial visível é **IDE Music**.

Direção:

- não fazer rename em massa agora;
- novo código deve preferir `ideMusic`/`IdeMusic` quando precisar de namespace;
- renomear legado junto da migração do módulo correspondente e com testes de regressão.

## 9. Responsividade, acessibilidade e contraste

Pontos positivos:

- o tema global já contém Sidebar e breakpoint mobile;
- várias páginas usam labels de formulário;
- o tema atual corrige parte do contraste do verde claro em superfícies claras;
- Auth evita flash de conteúdo protegido com `auth-pending`.

Débitos:

- páginas continuam com CSS inline independente do tema;
- há muitos hexadecimais locais;
- existem interações em `<div onclick>` e HTML gerado;
- foco, teclado e leitores de tela precisam de validação fluxo a fluxo;
- ainda não existe sistema formal de light/dark theme.

## 10. Mapa de legado

| Área | Arquivos principais | Estado | Direção |
| --- | --- | --- | --- |
| Auth | `src/js/modules/auth-service.js` | ativo, com testes | migrar gradualmente para feature/core |
| Firebase bootstrap | `src/config/firebase-config.js` | ativo, legado | restringir a bootstrap |
| DatabaseService | `src/js/modules/database.js` | legado paralelo | retirar após migrar consumidores |
| Setlist editor | `src/js/pages/setlist-simple.js` | legado ativo | migrar para Service + Repository |
| Setlist listagem | `src/js/pages/setlists-simple.js` | legado ativo | migrar para Service + Repository |
| Setlist versões antigas | `setlist.js`, `setlists.js` | removidos nesta auditoria | concluído |
| CSS de marca | `src/css/music-ide-theme.css` | ativo | converter em tokens/design system |
| CSS inline | vários HTML | legado | extrair gradualmente |

## 11. Prioridades de refatoração

### P0 — antes de administração/permissões

1. proteger dados com Firestore Rules compatíveis com autorização;
2. não usar fallback local para operações administrativas;
3. manter novas telas sem Firestore direto;
4. eliminar interpolação não escapada de dados persistidos.

### P1 — durante Design System/modelo de dados

1. consolidar adaptadores de banco em Repositories;
2. migrar Setlist para `features/setlists`;
3. extrair CSS inline para tokens/componentes;
4. normalizar `MusicIde*` durante migração de cada módulo.

## 12. Critério de não-regressão

A partir desta auditoria:

- nenhuma nova página deve acessar Firestore diretamente;
- nenhum novo módulo deve introduzir fallback de escrita em `localStorage`;
- nenhuma nova configuração Firebase deve ser hardcoded fora da configuração central;
- nenhum HTML dinâmico novo deve interpolar dados não confiáveis sem escaping;
- nenhuma nova regra de negócio deve ser colocada em página quando pertencer a Service;
- duplicações identificadas não devem ser recriadas.

## 13. Conclusão

A arquitetura alvo está criada, mas ainda existe legado operacional relevante. O legado será substituído por domínio conforme o roadmap avançar.

Nesta etapa, os riscos foram documentados, classificados e priorizados; além disso, duas implementações JS antigas e não referenciadas de Setlist foram removidas. Este documento passa a ser o baseline para impedir o crescimento da dívida técnica e orientar as próximas migrações.