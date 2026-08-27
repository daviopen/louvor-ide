# Schedules — AGENTS.md

Complementa o `/AGENTS.md` para escalas.

## Objetivo
Montar uma escala por evento, relacionando funções ministeriais e usuários ativos/disponíveis com prevenção de conflitos e histórico consistente.

## Entidades e DTOs
- `Schedule`: `id`, `eventId`, `status`, `slots[{ id, functionId }]`, timestamps.
- `ScheduleMember`: `id`, `scheduleId`, `slotId`, `userId`, `functionId`, `active`, metadados de exceção quando aplicável.
- Exceção administrativa usa metadados mínimos como `exception.override` e `exception.reason`; nunca substitui a indisponibilidade original.
- DTOs devem separar adicionar/remover posição, adicionar/trocar/remover membro e registrar exceção administrativa.

## Regras e validações
- Uma escala por evento; geração idempotente e identificador derivado do evento quando aplicável.
- Novas escalas usam o template administrativo definido em Configurações, com funções ministeriais e quantidades parametrizáveis.
- Na ausência de configuração persistida, manter fallback compatível: 4 Back Vocal, 2 Ministro, 1 Guitarra, 1 Violão, 1 Baixo, 1 Bateria e 1 Teclado, desde que as respectivas funções estejam ativas no catálogo.
- Alterações no template administrativo valem para novas escalas e não devem modificar retroativamente escalas já existentes.
- O template inicial não é limite estrutural: qualquer posição pode ser removida pelo editor e novas posições/funções podem ser adicionadas conforme o evento.
- Funções/posições são dinâmicas, podem repetir a mesma função e não possuem limite estrutural fixo.
- Selecionar função antes do usuário.
- Usuário elegível deve estar ativo, possuir a função e estar disponível.
- Considerar indisponibilidades por data, horário/período e evento.
- Uma pessoa pode exercer múltiplas funções quando permitido pelo caso de uso.
- A mesma pessoa não deve ser duplicada na mesma função; conflitos devem gerar alerta.
- Exceção administrativa para indisponibilidade exige confirmação, motivo e auditoria.
- Remoções de integrantes devem preservar histórico por inativação (`active=false`) quando houver vínculo persistido.
- Escala é `COMPLETE` somente quando todas as posições configuradas possuem integrante ativo; caso contrário permanece `DRAFT`.

## Permissões e rotas
- Leitura/edição seguem módulo Escalas.
- Exceções administrativas exigem privilégio de edição.
- A tela de Configurações e a edição do template padrão de escala são exclusivas de `ADMIN`/`SUPER_ADMIN` e devem ser protegidas também pelas Firestore Rules.
- `module.html?section=schedules` é a listagem/consulta das escalas.
- A edição deve abrir uma única escala por vez em `module.html?section=schedules&scheduleId=<id>`; não renderizar vários editores na mesma tela.

## Services / Repositories / Components
- Service coordena usuários, funções, indisponibilidade, conflitos, completude e membros.
- Repositories: `schedules`, `scheduleMembers`; não consultar Firestore diretamente na UI de Escalas.
- Listagem: um card resumido por evento, status de completude, integrantes e ação `Editar escala`, mantendo filtros históricos.
- Editor: uma escala por tela, breadcrumb/voltar, posições por função, avatar, troca/remoção e adição de função.
- A seleção normal de pessoa deve usar um único campo pesquisável/autocomplete por função; não duplicar input de busca + select para a mesma ação.
- A seleção normal nunca deve misturar indisponíveis; usuários indisponíveis só aparecem no fluxo administrativo de exceção.
- UX deve ser específica para mobile e preservar hierarquia visual clara entre evento, função e pessoa.

## Collections
- `schedules`
- `scheduleMembers`
- `events`
- `users`
- `userFunctions`
- `ministryFunctions`
- `unavailability`
- `settings`
- `auditLogs`

## Segurança e LGPD
- Validar server-side/Rules as operações permitidas quando aplicável.
- Não aceitar `userId/functionId` incompatíveis apenas porque vieram do cliente.
- Exceções devem registrar ator, motivo e contexto mínimo.
- Não apagar indisponibilidade para viabilizar uma escala; preservar ambas as evidências.

## Testes
- uma escala por evento e idempotência;
- template administrativo cria exatamente as funções e quantidades configuradas;
- fallback sem configuração cria 4 Back Vocal, 2 Ministro, 1 Guitarra, 1 Violão, 1 Baixo, 1 Bateria e 1 Teclado;
- alteração do template não modifica retroativamente escalas existentes;
- posições do template permanecem removíveis e novas posições podem ser adicionadas;
- elegibilidade por função/status/disponibilidade;
- conflitos e exceções;
- múltiplas funções quando permitido e bloqueio de duplicidade na mesma função;
- completude baseada nas posições configuradas;
- listagem separada do editor individual por `scheduleId`;
- histórico/filtros não alteram dados;
- usuário sem edição não modifica escala;
- usuário não administrador não acessa nem altera Configurações;
- seleção normal usa um único combobox pesquisável e não expõe indisponíveis;
- fluxo de exceção exige confirmação/motivo;
- regressão de Eventos ao integrar a área de Escalas.
