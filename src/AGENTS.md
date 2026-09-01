# AGENTS.md — Regras de implementação em `src/`

Este arquivo complementa o `AGENTS.md` da raiz para qualquer alteração dentro de `src/`. Ele existe para transformar decisões recorrentes de autorização, mutações e UX em regras locais obrigatórias, evitando que novas funcionalidades repitam falhas já encontradas em produção.

## 1. Permissões são contrato entre camadas

Toda funcionalidade protegida deve implementar a mesma decisão de acesso em quatro pontos:

1. UI/controles visíveis;
2. guard/Service (`canRead` / `canEdit`);
3. Repository/operação de persistência;
4. Firestore Security Rules.

Nunca considerar uma funcionalidade pronta quando somente a UI está protegida.

`READ` significa consultar e navegar pelos detalhes sem possibilidade de mutação. `EDIT` inclui leitura e habilita ações de alteração. `NONE` não deve oferecer rota, botão ou acesso indireto ao módulo.

`SUPER_ADMIN` é o único bypass global implícito. `ADMIN` continua sujeito à matriz de permissões de módulos, salvo regra de negócio explícita, documentada e refletida também nas Firestore Rules e testes.

## 2. UX obrigatória para READ x EDIT

Em listagens que possuem detalhe/editor:

- usuário com `EDIT` recebe ação com semântica de edição (`Editar`, ícone de lápis quando aplicável);
- usuário apenas com `READ` recebe ação de consulta (`Visualizar`, ícone de olho/lupa quando aplicável);
- não exibir botão `Editar` desabilitado para quem só possui leitura quando existe uma visualização útil;
- a mesma rota pode servir como detalhe somente leitura se todos os controles mutáveis forem removidos/desabilitados e o texto da tela também assumir semântica de visualização;
- ações destrutivas, inclusão, remoção, seleção mutável, drag-and-drop e `save` devem desaparecer ou ficar efetivamente indisponíveis em `READ`;
- esconder controles não substitui validação de permissão no Service e nas Rules.

Para Escalas, `READ` deve permitir abrir cada escala e consultar pessoas, funções, status e demais informações disponíveis, sem adicionar/remover funções nem adicionar/trocar/remover pessoas.

## 3. Mutações e atualização da interface

Uma mutação só deve retornar sucesso quando a operação de negócio inteira estiver concluída.

Obrigatório:

- se a UI é otimista, sucesso persiste o estado local e erro restaura o estado anterior;
- não exigir F5 para refletir uma alteração concluída;
- não usar reload completo como correção de consistência quando o estado local pode ser atualizado de forma determinística;
- quando necessário reconciliar com o servidor, recarregar somente o recurso/lista afetado;
- mensagens de erro não podem contradizer uma gravação que efetivamente foi concluída;
- operações compostas que precisam ser atômicas devem usar batch/transaction.

Se uma etapa secundária (por exemplo auditoria) puder fazer a Promise falhar depois de a entidade principal já ter sido gravada, isso é um defeito de atomicidade/contrato e deve ser corrigido na fonte.

## 4. Auditoria Firestore

Toda gravação em `auditLogs` deve respeitar o contrato das Security Rules.

Obrigatório no cliente:

- `createdAt` usa `firebase.firestore.FieldValue.serverTimestamp()` em runtime Firebase;
- fallback de relógio local só pode existir para testes/ambientes sem Firebase;
- quando auditoria fizer parte de uma mutação atômica, ela deve estar no mesmo batch/transaction;
- nunca usar `new Date()`/relógio do browser como `createdAt` de audit log quando a Rule exige `request.time`;
- falha de auditoria não deve produzir o estado “dados alterados + UI informa que falhou”.

Ao criar novo Repository com auditoria, reutilize esse padrão e adicione teste de regressão.

## 5. Setlists

Setlists devem obedecer integralmente à permissão `setlists`.

- `READ`: abrir consulta e conteúdo disponível sem salvar alterações;
- `EDIT`: alterar metadados, Dress Code, músicas, ordem, ministro, tom e observações enquanto o estado do evento/setlist permitir;
- `COMPLETED` e `CANCELLED` permanecem somente leitura mesmo para quem possui `EDIT`, salvo requisito explícito futuro;
- o Service é a autoridade de negócio para `canRead`/`canEdit` e estado somente leitura;
- qualquer gravação de Setlist e `setlistSongs` deve permanecer coerente com as Rules e com a auditoria.

## 6. Escalas

Escalas devem oferecer dois modos claros:

- **Visualizar escala** para `READ`;
- **Editar escala** para `EDIT`.

No modo de visualização devem aparecer as pessoas escaladas e suas funções, sem controles de mutação. No modo de edição permanecem os controles de adicionar/remover função, selecionar/trocar/remover pessoa e demais ações autorizadas.

A listagem deve usar o texto e o ícone correspondentes ao acesso real do usuário. Nunca chamar uma tela de “edição” quando o usuário só pode consultar.

## 7. Checklist para nova funcionalidade protegida

Antes de concluir uma nova funcionalidade ou mutation dentro de `src/`, verificar:

1. Qual módulo/permissão governa a operação?
2. O comportamento de `NONE`, `READ` e `EDIT` está definido?
3. A UI diferencia visualizar de editar?
4. O Service valida acesso antes da mutação?
5. As Firestore Rules concedem exatamente o mesmo acesso?
6. A operação composta é atômica quando necessário?
7. Audit log usa timestamp do servidor?
8. Sucesso atualiza a UI sem F5?
9. Erro restaura estado otimista ou mantém a UI coerente?
10. Há teste de regressão para permissão e para a mutação crítica?

## 8. Validação funcional pós-Action com contas QA

Alteração que afete UI, autenticação, autorização, Firestore, navegação, formulário ou mutação não deve ser considerada validada apenas porque o GitHub Action passou.

Depois de `Quality Gate` e deploy concluídos com sucesso, executar validação funcional diretamente na aplicação publicada sempre que houver acesso às contas QA apropriadas.

Manter duas contas reais e não administrativas dedicadas exclusivamente a QA:

- **QA MEMBER EDIT**: perfil `MEMBER`, ativo, com permissões `EDIT` nos módulos operacionais que precisam ter mutações validadas;
- **QA MEMBER READ**: perfil `MEMBER`, ativo, configurado com `READ` nos mesmos módulos quando a funcionalidade possuir modo somente leitura, e `NONE` nos módulos que precisem ter negação de acesso validada.

Regras obrigatórias para essas contas:

- nunca usar `ADMIN` ou `SUPER_ADMIN` como substituto para validar comportamento de usuário comum;
- não adicionar e-mail, senha, token, cookie ou qualquer credencial dessas contas ao repositório, `AGENTS.md`, código, testes, fixtures, logs ou GitHub Actions;
- credenciais ficam fora do Git e são usadas somente na sessão de validação interativa;
- essas contas não fazem parte da pipeline e não devem ser autenticadas automaticamente pelo GitHub Actions;
- dados criados durante QA devem usar registros claramente identificáveis como teste e, quando a operação for segura, devem ser removidos ao final;
- não usar dados reais sensíveis de membros como fixture de teste.

Para cada correção ou funcionalidade afetada, a validação pós-deploy deve cobrir, conforme aplicável:

1. login com **QA MEMBER EDIT**;
2. acesso à rota afetada;
3. execução real do fluxo alterado, incluindo salvar/adicionar/remover quando essa for a finalidade da correção;
4. confirmação visual de que o estado foi atualizado sem F5;
5. recarga/nova navegação para confirmar persistência no servidor;
6. ausência de `console.error`, `pageerror` e HTTP 5xx inesperado;
7. login com **QA MEMBER READ** e confirmação de que consulta funciona, mas controles de mutação não são oferecidos nem aceitos;
8. quando houver `NONE`, confirmar que menu/rota e operação permanecem bloqueados;
9. quando a mudança afetar responsividade, repetir o fluxo relevante em desktop e mobile.

Ordem de conclusão esperada para mudanças de produção:

`implementação -> testes locais/estáticos -> Quality Gate -> deploy -> validação funcional na aplicação com contas QA -> conclusão`.

Se o Action passar mas a validação funcional falhar, o item continua **não concluído**. Se o deploy não tiver ocorrido, também não é permitido afirmar que a correção foi validada em produção.

Quando as contas QA ainda não estiverem provisionadas ou suas credenciais não estiverem disponíveis na sessão de trabalho, registrar explicitamente essa limitação e não substituir a etapa por suposição baseada somente em testes automatizados.

Em caso de conflito, o `AGENTS.md` raiz continua sendo a regra global e este arquivo torna as exigências acima mais específicas para o código de `src/`.