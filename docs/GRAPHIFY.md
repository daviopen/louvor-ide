# Graphify no IDE Music

O Graphify é uma ferramenta local de engenharia para transformar o repositório em um knowledge graph navegável e consultável. Ele não faz parte do runtime da aplicação, não é carregado no navegador e não participa do deploy do Firebase Hosting.

## Objetivo

Use o Graphify para análise de arquitetura e impacto antes de alterações que atravessem vários módulos, especialmente:

- autenticação, rotas e permissões;
- paridade entre UI, guards e Firestore Security Rules;
- dependências entre pages/components, services e repositories;
- fluxos de escalas, eventos, usuários, funções ministeriais, setlists e músicas;
- refatorações do código legado em `src/js` para a arquitetura modular;
- investigação de regressões com alto raio de impacto.

O Graphify complementa testes, revisão de código e leitura direta da implementação. O grafo não substitui validação de runtime, Firestore Rules, E2E ou análise manual de segurança.

## Pré-requisitos

- Python 3.10 ou superior.
- Recomendado: `uv` ou `pipx` para instalar a ferramenta de forma isolada.

O pacote oficial no PyPI chama-se `graphifyy` (com dois `y`), mas o binário instalado chama-se `graphify`.

## Instalação

Forma recomendada:

```bash
uv tool install graphifyy
```

Alternativa:

```bash
pipx install graphifyy
```

Depois, registre o skill no assistente de código usado localmente:

```bash
graphify install
```

Para Codex:

```bash
graphify install --platform codex
```

Também é possível usar:

```bash
make graphify-install
```

O target do Makefile tenta usar `uv`, depois `pipx`; se nenhum estiver disponível, informa as opções suportadas em vez de instalar globalmente de forma implícita.

## Gerar o grafo

### Via assistente de código

Depois de registrar o skill, execute no assistente suportado:

```text
/graphify .
```

No Codex, a invocação pode aparecer como `$graphify` conforme a integração instalada.

Para atualizar somente mudanças:

```text
/graphify . --update
```

Para análise mais profunda:

```text
/graphify . --mode deep
```

### Via CLI/headless

Para gerar o grafo diretamente pelo terminal:

```bash
make graphify-extract
```

Equivalente a:

```bash
graphify extract .
```

A extração headless pode precisar de um backend LLM configurado dependendo da versão do Graphify e dos tipos de arquivos analisados. Não adicione API keys ao repositório, ao Makefile, ao `.env.example` nem aos artefatos do grafo.

Para uma atualização incremental via CLI:

```bash
make graphify-update
```

## Artefatos

A saída padrão fica em:

```text
graphify-out/
├── graph.json
├── graph.html
├── GRAPH_REPORT.md
└── outros arquivos internos/cache
```

Todo o diretório `graphify-out/` é artefato derivado e está ignorado pelo Git.

Nunca versionar o grafo gerado sem uma decisão arquitetural explícita, pois ele pode ficar obsoleto e pode incorporar metadados derivados do conteúdo analisado.

## Consultar o grafo

Depois de gerar `graphify-out/graph.json`:

```bash
make graphify-query Q="what connects auth to permissions?"
```

ou diretamente:

```bash
graphify query "what connects auth to permissions?"
```

Outros comandos úteis:

```bash
graphify explain "PermissionService"
graphify path "RouteGuard" "UserRepository"
graphify prs --conflicts
```

Exemplos úteis para o IDE Music:

```bash
graphify query "where are schedule permissions enforced?"
graphify query "what depends on permissions and route guards?"
graphify query "how does a schedule page reach Firestore?"
graphify query "what code participates in setlist song loading?"
graphify query "which modules read users and ministry functions?"
```

## Abrir a visualização

```bash
make graphify-open
```

O target abre `graphify-out/graph.html` usando o comando disponível no sistema operacional (`open`, `xdg-open` ou `start`).

## Targets disponíveis

```bash
make graphify-install
make graphify-check
make graphify-extract
make graphify-update
make graphify-query Q="pergunta"
make graphify-open
make graphify-clean
```

`graphify-clean` remove apenas `graphify-out/` e não interfere no build normal do projeto.

## Fluxo recomendado antes de mudanças de alto impacto

1. Atualize o grafo.
2. Consulte dependências e caminhos relevantes.
3. Confirme manualmente os arquivos indicados pelo grafo.
4. Implemente respeitando `AGENTS.md`.
5. Execute `make lint` e `make test`.
6. Para alterações de autorização, valide também Firestore Rules e os fluxos E2E afetados.
7. Para alterações visuais, cumpra a matriz de responsividade, temas e acessibilidade do projeto.

## Segurança

- Graphify é ferramenta de desenvolvimento; não deve ser incluído no Firebase Hosting.
- `graphify-out/` não deve ser publicado como artifact de CI sem revisão e sanitização.
- Nunca forneça secrets, tokens, cookies, credenciais ou arquivos `.env` a um processo de análise sem necessidade explícita.
- Se uma execução headless usar um provedor LLM remoto, confirme previamente os requisitos de residência, privacidade e tratamento de dados do projeto.
- Para código ou dados que não possam sair do ambiente local, use um backend local suportado ou o fluxo do assistente já aprovado para o ambiente.

## Referências oficiais

- Documentação: https://graphify.com/docs
- CLI: https://graphify.com/docs/cli
- Instalação: https://graphify.com/docs/install
- Repositório: https://github.com/Graphify-Labs/graphify
