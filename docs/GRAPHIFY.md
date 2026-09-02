# Graphify no IDE Music

O Graphify transforma o repositório em um knowledge graph navegável e consultável. Ele é ferramenta de engenharia: não faz parte do runtime, não é carregado no navegador e não participa do deploy do Firebase Hosting.

## Objetivo no IDE Music

O uso prioritário do Graphify neste projeto é reduzir leitura desnecessária do repositório e aumentar a precisão das implementações. Antes de abrir muitos arquivos, o agente/desenvolvedor deve usar o grafo para descobrir os caminhos realmente envolvidos e então ler somente o código indicado.

Casos prioritários:

- autenticação, rotas, guards e permissões;
- paridade entre UI, perfil, documentos de permissão e Firestore Security Rules;
- Page/Component -> Service -> Repository -> Firebase;
- escalas, eventos, usuários, funções ministeriais, setlists e músicas;
- refatorações do legado em `src/js`;
- regressões com alto raio de impacto.

O grafo é evidência auxiliar. Código, Rules, testes e comportamento observável continuam sendo a fonte final de verdade.

## Instalação

O pacote PyPI é `graphifyy`; o comando instalado é `graphify`.

```bash
uv tool install graphifyy
# alternativa: pipx install graphifyy

graphify install
# somente Codex:
graphify install --platform codex
```

Também existe:

```bash
make graphify-install
```

## Gerar e atualizar o grafo

A geração oficial acontece dentro do assistente de código com o skill instalado:

```text
/graphify .
```

No Codex a invocação pode aparecer como `$graphify`.

Atualização incremental:

```text
/graphify . --update
```

Análise mais profunda, somente quando necessária:

```text
/graphify . --mode deep
```

Não use `graphify extract .` ou `graphify update .` como substitutos: a documentação oficial atual define a construção do grafo pelo skill `/graphify`.

## Artefatos compartilhados

A saída principal é:

```text
graphify-out/
├── graph.json
├── graph.html
└── GRAPH_REPORT.md
```

No IDE Music, `graphify-out/` é intencionalmente versionável. Isso permite que outro desenvolvedor ou agente consulte o mapa existente sem reconstruir todo o projeto. O Graphify também documenta esse diretório como apropriado para compartilhamento entre o time.

Depois de gerar/atualizar o grafo:

```bash
git add graphify-out/
git commit -m "chore: refresh Graphify knowledge graph"
git push
```

Quando `graphify-out/**` é enviado ao GitHub, o workflow `Graphify Knowledge Graph` publica uma cópia como artifact do GitHub Actions.

## Fluxo para economizar tokens

Para tarefas não triviais, siga esta ordem:

1. Leia `graphify-out/GRAPH_REPORT.md` para orientação arquitetural geral, quando necessário.
2. Faça uma consulta curta ao grafo antes de pesquisar o repositório inteiro.
3. Use `--budget` para limitar o contexto retornado.
4. Abra somente arquivos e linhas citados pelo Graphify.
5. Use `path` ou `explain` quando precisar aprofundar uma relação específica.
6. Só amplie a busca textual se o grafo não cobrir a dúvida.
7. Confirme no código real antes de implementar.

Exemplos econômicos:

```bash
graphify query "where are schedule permissions enforced?" --budget 800
graphify query "what code handles participation route authorization?" --budget 800
graphify query "how does the schedule editor reach Firestore?" --budget 1200
graphify query "what depends on the route catalog?" --budget 1000
```

Para seguir uma cadeia específica:

```bash
graphify query "how does auth reach permissions?" --dfs --budget 800
```

Para relações pontuais:

```bash
graphify path "RouteGuard" "UserRepository"
graphify explain "PermissionService"
graphify prs --conflicts
```

A ideia não é usar o maior budget possível. Comece em 600-1200 tokens e aumente apenas quando a resposta não trouxer contexto suficiente.

## Regra para agentes de implementação

Quando `graphify-out/graph.json` estiver disponível e razoavelmente atualizado, um agente deve preferir Graphify antes de uma varredura ampla do repositório em tarefas com dependências cruzadas.

Fluxo recomendado:

```text
requisito
  -> Graphify query/path/explain
  -> arquivos/linhas candidatos
  -> leitura dirigida do código
  -> implementação
  -> testes
  -> /graphify . --update quando houver mudança estrutural relevante
```

Graphify não deve ser usado para justificar uma alteração sem inspeção do código citado. Relações `INFERRED` e `AMBIGUOUS` exigem confirmação adicional; relações `EXTRACTED` ainda precisam ser avaliadas no contexto do comportamento desejado.

## Visualização

Abra:

```bash
make graphify-open
```

ou diretamente `graphify-out/graph.html` no navegador.

## GitHub Actions / artifact

O workflow `.github/workflows/graphify-artifact.yml`:

- roda quando `graphify-out/**` muda no `main`;
- pode ser executado manualmente por `workflow_dispatch`;
- valida a presença de `graph.json`, `graph.html` e `GRAPH_REPORT.md`;
- publica `graphify-out/` como artifact para consulta/download no Actions;
- não gera o grafo e não chama LLM: ele apenas empacota o mapa já produzido pelo skill.

Essa separação evita colocar API keys/modelos no CI e mantém a geração sob controle do ambiente de desenvolvimento.

## Segurança

- Nunca coloque `.env`, tokens, cookies, service accounts ou credenciais em `graphify-out/`.
- Antes de versionar uma atualização, revise o diff dos artefatos.
- O workflow de artifact não recebe secrets e não deve passar o grafo para serviços externos além do armazenamento padrão de artifacts do GitHub.
- O grafo não entra no Firebase Hosting.
- Código e grafo estrutural são processados localmente pelo Graphify; conteúdo semântico enviado pelo assistente segue as regras do provedor/modelo usado pelo próprio assistente.

## Referências oficiais

- https://graphify.com/docs
- https://graphify.com/docs/cli
- https://graphify.com/docs/tutorial
- https://graphify.com/docs/mcp-tools
- https://github.com/Graphify-Labs/graphify
