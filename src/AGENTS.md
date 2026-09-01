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

`SUPER_ADMIN` é o único bypass global implícito. O perfil de acesso do usuário define as permissões funcionais; o campo técnico `role` existe para compatibilidade de segurança (`MEMBER`, `ADMIN`, `SUPER_ADMIN`) e não deve voltar a ser usado como substituto da matriz de perfis.

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
2. Quais perfis de acesso recebem `NONE`, `READ` e `EDIT`?
3. O comportamento de `NONE`, `READ` e `EDIT` está definido?
4. A UI diferencia visualizar de editar?
5. O Service valida acesso antes da mutação?
6. As Firestore Rules concedem exatamente o mesmo acesso?
7. A operação composta é atômica quando necessário?
8. Audit log usa timestamp do servidor?
9. Sucesso atualiza a UI sem F5?
10. Erro restaura estado otimista ou mantém a UI coerente?
11. Há teste de regressão para perfil/permissão e para a mutação crítica?
12. Foi confirmado que nenhum perfil perdeu acesso que já possuía sem decisão explícita de produto?

## 8. Validação funcional pós-Action com contas QA

Alteração que afete UI, autenticação, autorização, Firestore, navegação, formulário ou mutação não deve ser considerada validada apenas porque o GitHub Action passou.

Depois de `Quality Gate` e deploy concluídos com sucesso, executar validação funcional diretamente na aplicação publicada sempre que houver acesso às contas QA apropriadas.

### 8.1. Contas QA fixas e persistentes

O projeto deve manter **exatamente duas contas de QA persistentes**, criadas uma única vez no Firebase Authentication e reutilizadas entre execuções, sessões e iterações futuras.

Essas contas possuem identidade funcional estável:

- **QA MEMBER EDIT**: conta ativa dedicada à validação de fluxos com mutação;
- **QA MEMBER READ**: conta ativa dedicada à validação de leitura, ausência de controles de edição e negação de acesso.

Regras obrigatórias de ciclo de vida:

- não criar nova conta de QA a cada teste, deploy, Action ou sessão;
- não excluir/recriar as contas ao final da validação;
- não gerar nova senha automaticamente a cada execução;
- manter o mesmo usuário Firebase/UID enquanto a conta permanecer válida;
- manter nomes funcionais estáveis para facilitar auditoria, logs e investigação de defeitos;
- alteração de e-mail, UID, perfil base ou finalidade da conta exige decisão explícita e atualização deste padrão;
- dados temporários criados pelas contas podem ser limpos, mas a identidade da conta permanece.

Os perfis dessas contas podem ser ajustados deliberadamente entre cenários para validar os níveis esperados, mas o usuário/UID deve permanecer o mesmo. Nunca usar `SUPER_ADMIN` como substituto para validar comportamento de um perfil comum.

### 8.2. Segurança das credenciais

A identidade lógica das contas pode ser documentada como `QA MEMBER EDIT` e `QA MEMBER READ`, porém credenciais secretas devem ficar fora do Git.

É proibido adicionar senha, token, cookie, refresh token, service account ou outro segredo dessas contas em:

- `AGENTS.md`;
- código-fonte;
- testes e fixtures;
- arquivos versionados;
- logs;
- screenshots;
- artifacts;
- GitHub Actions.

As credenciais devem ser armazenadas em meio seguro e persistente fora do repositório. Se uma credencial precisar ser rotacionada, alterar somente a credencial; preservar a conta e o UID sempre que possível.

Essas contas não fazem parte da pipeline e não devem ser autenticadas automaticamente pelo GitHub Actions. O objetivo é validar a aplicação publicada em uma sessão funcional real depois que a pipeline concluir.

### 8.3. Execução da validação

Para cada correção ou funcionalidade afetada, a validação pós-deploy deve cobrir, conforme aplicável:

1. login com conta QA com perfil que possua `EDIT`;
2. acesso à rota afetada;
3. execução real do fluxo alterado, incluindo salvar/adicionar/remover quando essa for a finalidade da correção;
4. confirmação visual de que o estado foi atualizado sem F5;
5. recarga/nova navegação para confirmar persistência no servidor;
6. ausência de `console.error`, `pageerror` e HTTP 5xx inesperado;
7. login com conta QA em perfil que possua somente `READ` e confirmação de que consulta funciona, mas controles de mutação não são oferecidos nem aceitos;
8. quando houver `NONE`, confirmar que menu/rota e operação permanecem bloqueados;
9. quando a mudança afetar responsividade, repetir o fluxo relevante em desktop e mobile.

Dados criados durante QA devem usar registros claramente identificáveis como teste e, quando a operação for segura, devem ser removidos ao final. Não usar dados reais sensíveis de membros como fixture de teste.

Ordem de conclusão esperada para mudanças de produção:

`implementação -> testes locais/estáticos -> Quality Gate -> deploy -> validação funcional na aplicação com contas QA persistentes -> conclusão`.

Se o Action passar mas a validação funcional falhar, o item continua **não concluído**. Se o deploy não tiver ocorrido, também não é permitido afirmar que a correção foi validada em produção.

Quando as contas QA ainda não estiverem provisionadas ou suas credenciais não estiverem disponíveis na sessão de trabalho, registrar explicitamente essa limitação e não substituir a etapa por suposição baseada somente em testes automatizados.

## 9. Perfis de acesso são a fonte de verdade

Usuários comuns não devem receber uma matriz de permissões configurada manualmente módulo por módulo. A aplicação deve associar cada usuário a **um único perfil de acesso reutilizável** através de `users.accessProfile`.

Perfis canônicos:

| Perfil | dashboard | users | permissions | unavailability | events | schedules | setlists | songs | audit |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Participante** (`PARTICIPANT`) | READ | NONE | NONE | EDIT | READ | READ | READ | READ | NONE |
| **Ministro** (`MINISTER`) | READ | NONE | NONE | EDIT | READ | READ | EDIT | EDIT | NONE |
| **DM** (`DM`) | READ | NONE | NONE | EDIT | READ | EDIT | EDIT | EDIT | NONE |
| **Líder** (`LEADER`) | READ | READ | READ | EDIT | EDIT | EDIT | EDIT | EDIT | READ |
| **Administrador** (`ADMINISTRATOR`) | EDIT | EDIT | EDIT | EDIT | EDIT | EDIT | EDIT | EDIT | EDIT |

A fonte de verdade executável desta matriz é `src/js/modules/access-profiles.js`. Os documentos da coleção `permissions` podem continuar existindo como **materialização técnica** para compatibilidade e enforcement das Firestore Rules, mas não são mais o modelo administrativo apresentado ao usuário.

### 9.1. Regras para associação e alteração de perfil

- a tela de Usuários deve pedir **Perfil de acesso**, nunca nove seletores independentes de módulo;
- a associação do perfil deve atualizar `users.accessProfile` e a matriz técnica de `permissions` de forma coerente;
- mudanças de perfil devem ser atômicas sempre que envolverem mais de um documento;
- `SUPER_ADMIN` continua sendo bypass global e não depende de `accessProfile` para manter seus privilégios;
- o perfil `ADMINISTRATOR` pode corresponder tecnicamente ao `role: ADMIN` quando necessário às regras existentes;
- funções ministeriais (`Ministro`, `Back`, `Bateria`, etc.) continuam sendo conceito separado de perfil de acesso. O fato de alguém exercer a função ministerial “Ministro” não deve alterar automaticamente seu perfil sem decisão explícita;
- nunca inferir aumento/redução de privilégio apenas pelo nome de uma função ministerial.

### 9.2. Regra obrigatória para novas funcionalidades

Toda nova funcionalidade, rota, botão, operação ou módulo protegido deve, **antes da implementação**, ter seu acesso classificado para os cinco perfis canônicos.

Se o pedido do usuário já determinar claramente quem acessa, aplicar a decisão e atualizar `access-profiles.js`, Rules/guards relevantes e testes quando necessário.

Se houver qualquer dúvida real sobre qual perfil deve receber `NONE`, `READ` ou `EDIT`, **perguntar ao usuário antes de inventar a política de acesso**. Não escolher silenciosamente um perfil “parecido”, não copiar acesso de outro módulo por conveniência e não assumir que Administrador/Líder/DM/Ministro/Participante devem herdar uma nova função sem confirmação quando isso não for evidente.

Ao modificar funcionalidade existente:

- preservar o acesso atual de todos os perfis, salvo solicitação explícita para alterá-lo;
- não remover acesso como efeito colateral de refactor, alteração de rota, mudança de nome, criação de submenu ou troca de componente;
- testes devem detectar regressões da matriz;
- se uma mudança exige alterar acesso de um perfil, registrar a decisão no mesmo commit/PR e atualizar esta matriz quando aplicável.

Em caso de conflito, o `AGENTS.md` raiz continua sendo a regra global e este arquivo torna as exigências acima mais específicas para o código de `src/`.
