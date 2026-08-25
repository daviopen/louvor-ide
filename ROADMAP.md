# Roadmap Completo de Evolução — IDE Music

> Checklist oficial para evolução do projeto `louvor-ide`.
>
> Marcar `- [x]` apenas quando o item estiver implementado, testado e validado.

## P0 — Fundação técnica

### 0. Princípios gerais
- [ ] Priorizar UX em desktop e mobile.
- [ ] Garantir acessibilidade e contraste adequados.
- [ ] Aplicar segurança e LGPD desde a modelagem.
- [ ] Separar função ministerial de permissão do sistema.
- [ ] Usar Firebase Authentication como fonte de identidade.
- [ ] Não confiar no frontend como controle real de acesso.
- [ ] Aplicar autorização também no Firestore Rules e/ou backend.
- [ ] Não armazenar senhas no Firestore.
- [ ] Não versionar secrets.
- [ ] Evitar duplicação e regras de negócio espalhadas na UI.

### 1. Arquitetura
- [x] Revisar a arquitetura atual.
- [x] Adotar arquitetura modular por domínio/feature.
- [x] Padronizar diretórios: `core`, `components`, `features`, `services`, `repositories`, `models`, `dtos`, `routes`, `utils`, `styles`, `constants`, `tests`.
- [x] Separar UI, regras de negócio e acesso a dados.
- [x] Evitar chamadas diretas ao Firestore dentro de componentes.
- [x] Criar padrão único de erros, loading, empty states e confirmações.
- [x] Avaliar migração gradual para TypeScript.
- [x] Caso permaneça em JavaScript, utilizar JSDoc e contratos padronizados.

### 2. AGENTS.md raiz
- [x] Criar `/AGENTS.md`.
- [x] Documentar propósito, stack e arquitetura.
- [x] Documentar estrutura de diretórios.
- [x] Documentar padrões de Components, Services, Repositories, DTOs, Models e Routes.
- [x] Documentar collections e nomenclaturas.
- [x] Documentar autenticação, autorização e Firestore Rules.
- [x] Documentar segurança e LGPD.
- [x] Documentar UX e acessibilidade.
- [x] Documentar estratégia de testes, logs e auditoria.
- [x] Documentar Definition of Ready e Definition of Done.
- [x] Definir convenções para arquivos, branches, commits e Pull Requests.

### 3. AGENTS.md por funcionalidade
- [x] `auth/AGENTS.md`.
- [x] `users/AGENTS.md`.
- [x] `permissions/AGENTS.md`.
- [x] `roles/AGENTS.md`.
- [x] `unavailability/AGENTS.md`.
- [x] `events/AGENTS.md`.
- [x] `schedules/AGENTS.md`.
- [x] `setlists/AGENTS.md`.
- [x] `songs/AGENTS.md`.
- [x] `audit/AGENTS.md`.
- [x] Cada arquivo deve definir objetivo, entidades, DTOs, regras, validações, permissões, routes, services, components, collections, segurança e testes.

### 4. Auditoria do código atual
- [x] Revisar todo o projeto conforme o AGENTS.md.
- [x] Mapear duplicações de JS/CSS/componentes.
- [x] Mapear regras de negócio no frontend.
- [x] Mapear acessos diretos ao Firebase.
- [x] Mapear nomenclaturas inconsistentes.
- [x] Mapear problemas de responsividade, acessibilidade e contraste.
- [x] Mapear riscos de segurança e uso inadequado de `localStorage`.
- [x] Refatorar código legado necessário.

### 5. Design System
- [x] `Button` / `IconButton`.
- [x] `Input` / `Textarea`.
- [x] `Select` / `MultiSelect` / `SearchSelect`.
- [x] `Checkbox` / `RadioGroup` / `Switch`.
- [x] `DatePicker` / `TimePicker` / `ColorPicker`.
- [x] `Modal` / `Drawer` / `ConfirmDialog`.
- [x] `Toast` / `Badge` / `StatusBadge`.
- [x] `Avatar` / `UserChip` / `RoleChip`.
- [x] `Card` / `SectionCard`.
- [x] `Table` / `Pagination`.
- [x] `EmptyState` / `Skeleton` / `Loading`.
- [x] `SearchBox` / `FilterBar`.
- [x] `PageHeader` / `Breadcrumb`.
- [x] `Sidebar` / `MobileNavigation`.
- [x] `PermissionGuard` / `FormField`.
- [x] Criar padrão de tela CRUD e de formulário.
- [x] Documentar os componentes.
- [x] Migrar telas existentes para os componentes padronizados.

### 6. Paleta e tokens
- [x] Definir paleta oficial do IDE Music.
- [x] Tokens: `primary`, `primary-hover`, `primary-active`, `secondary`, `background`, `surface`, `surface-secondary`, `text-primary`, `text-secondary`, `border`, `success`, `warning`, `error`, `info`.
- [x] Definir spacing, radius, sombras, tipografia, breakpoints e z-index.
- [x] Eliminar hexadecimais espalhados pelo código.
- [x] Garantir contraste WCAG.

### 7. Tema claro/escuro
- [x] Tema claro.
- [x] Tema escuro.
- [x] Opção `system`.
- [x] Detectar preferência do sistema.
- [x] Seletor no menu do usuário.
- [x] Persistir preferência.
- [x] Evitar flash na troca/carregamento do tema.
- [x] Validar todos os componentes, Setlist, cifra e letra nos dois temas.

### 8. Modelo de dados
- [x] `users`.
- [x] `ministryFunctions`.
- [x] `userFunctions`.
- [x] `permissions`.
- [x] `events`.
- [x] `unavailability`.
- [x] `schedules`.
- [x] `scheduleMembers`.
- [x] `setlists`.
- [x] `setlistSongs`.
- [x] `songs`.
- [x] `songMinisterKeys`.
- [x] `auditLogs`.
- [x] `lgpdConsents`.
- [x] Implementar Pessoa ↔ Função como relação N:N.
- [x] Suportar Ministro, Back Vocal, Bateria, Baixo, Guitarra, Violão, Teclado, Sax, DM e novas funções futuramente.
- [x] Permitir ativar/inativar e ordenar funções.

### 9. Segurança
- [x] Manter login Google.
- [x] Manter login e-mail/senha.
- [x] Recuperação de senha.
- [x] Logout seguro.
- [x] Tratar sessão expirada e usuário desativado.
- [x] Criar `SUPER_ADMIN`.
- [x] Definir inicialmente `davitads@gmail.com` como Super Admin.
- [x] Não depender do e-mail hardcoded no frontend.
- [x] Permitir outros administradores.
- [x] Impedir elevação indevida de privilégios.
- [x] Aplicar menor privilégio.
- [x] Usar Custom Claims quando necessário.
- [x] Proteger operações críticas via backend/Cloud Functions quando necessário.
- [x] Implementar Firestore Security Rules por permissão.
- [x] Criar testes automatizados das Rules.

### 10. LGPD
- [x] Termos de Uso.
- [x] Política de Privacidade.
- [x] Consentimento LGPD no primeiro acesso.
- [x] Consentimento explícito, sem checkbox pré-marcado.
- [x] Registrar versão do termo, usuário, data e hora.
- [x] Solicitar novo aceite quando houver alteração relevante.
- [x] Aplicar minimização de dados.
- [x] Definir retenção, inativação e exclusão.
- [x] Definir dados que precisam permanecer em histórico/auditoria.

## P1 — Identidade e administração

### 11. Menu principal
- [ ] Sidebar desktop e navegação mobile.
- [ ] Sidebar recolhível.
- [ ] Destacar rota atual.
- [ ] Ocultar itens sem permissão.
- [ ] Dashboard.
- [ ] Usuários > Usuários.
- [ ] Usuários > Permissões.
- [ ] Escalas > Indisponibilidade.
- [ ] Escalas > Eventos.
- [ ] Escalas > Escalas.
- [ ] Setlist > Próximos.
- [ ] Setlist > Histórico.
- [ ] Músicas > Consultar.
- [ ] Músicas > Nova Música.
- [ ] Administração > Auditoria.
- [ ] Administração > Configurações.

### 12. CRUD de usuários
- [ ] Listar usuários.
- [ ] Criar usuário.
- [ ] Editar usuário.
- [ ] Inativar/reativar usuário.
- [ ] Evitar exclusão física quando houver histórico.
- [ ] Exibir nome, avatar, e-mail, funções, status e último acesso quando disponível.
- [ ] Buscar por nome/e-mail.
- [ ] Filtrar por função e status.
- [ ] Paginação.
- [ ] Cadastro com múltiplas funções e permissões iniciais.
- [ ] Fluxo seguro de definição/redefinição de senha pelo Firebase.
- [ ] Nunca visualizar ou armazenar senha.
- [ ] Registrar alterações em Audit Log.

### 13. Permissões
- [ ] Níveis: Sem acesso, Leitura, Edição.
- [ ] Aplicar a Dashboard, Usuários, Permissões, Indisponibilidades, Eventos, Escalas, Setlists, Músicas e Auditoria.
- [ ] Criar matriz de permissões por usuário.
- [ ] Mostrar alterações antes de salvar.
- [ ] Confirmar mudanças administrativas.
- [ ] Ocultar menu sem acesso.
- [ ] Bloquear rota direta.
- [ ] Bloquear leitura/escrita no Firestore independentemente do frontend.

### 14. Funções ministeriais
- [ ] Cadastro de funções.
- [ ] Uma pessoa pode possuir múltiplas funções.
- [ ] Ativar/inativar função.
- [ ] Editar e ordenar funções.
- [ ] Migrar/compatibilizar funções existentes da planilha.
- [ ] Não confundir função ministerial com permissão do sistema.

## P2 — Operação das escalas

### 15. Indisponibilidades
- [ ] Usuário registra sua própria indisponibilidade.
- [ ] Data obrigatória.
- [ ] Período opcional.
- [ ] Evento específico opcional.
- [ ] Observação opcional.
- [ ] Editar/excluir indisponibilidade futura.
- [ ] Visualização em calendário.
- [ ] Admin pode registrar/editar para outra pessoa.
- [ ] Registrar ator da alteração e Audit Log.
- [ ] Indisponível não aparece na seleção normal da escala.
- [ ] Considerar data, horário e evento.
- [ ] Exceção administrativa somente com confirmação/auditoria.

### 16. Eventos
- [ ] CRUD de eventos.
- [ ] Campos: nome, data, horário opcional, descrição, local e tema opcionais.
- [ ] Status: Planejado, Confirmado, Cancelado, Concluído.
- [ ] Criar escala automaticamente ao criar evento.
- [ ] Criar estrutura de Setlist vinculada.
- [ ] Atualizar referências quando data/hora mudar.
- [ ] Refletir cancelamento na escala e Setlist.
- [ ] Manter histórico de eventos concluídos.

### 17. Escalas
- [ ] Uma escala por evento.
- [ ] Vincular `scheduleId` ao `eventId`.
- [ ] Garantir geração idempotente sem duplicatas.
- [ ] Quantidade dinâmica de funções.
- [ ] Não limitar número de perfis/funções.
- [ ] Selecionar função antes do usuário.
- [ ] Mostrar somente usuários que possuem a função.
- [ ] Mostrar somente usuários ativos e disponíveis.
- [ ] Considerar indisponibilidades.
- [ ] Permitir adicionar/remover função e trocar usuário.
- [ ] Permitir uma pessoa em múltiplas funções quando necessário.
- [ ] Alertar duplicidades e conflitos.
- [ ] Exceções administrativas com confirmação.
- [ ] Avatar, badges, agrupamento e autocomplete.
- [ ] UX específica mobile.
- [ ] Indicar escala completa/incompleta.
- [ ] Histórico com filtros por data, evento, pessoa e função.

## P3 — Setlist

### 18. Setlist por escala
- [ ] Criar automaticamente para cada escala.
- [ ] Vincular ao evento e à escala.
- [ ] Exibir integrantes.
- [ ] Somente pessoas escaladas como Ministro ficam disponíveis como ministro do Setlist.
- [ ] Adicionar/remover músicas.
- [ ] Ordenar por drag-and-drop.
- [ ] Salvar ordem.
- [ ] Selecionar ministro por música.
- [ ] Sugerir tom preferido do ministro.
- [ ] Permitir tom específico para aquela execução sem alterar o padrão permanente.
- [ ] Observação/transição/momento especial por música.

### 19. Dress Code
- [ ] Permitir 0 a 3 cores.
- [ ] Color Picker.
- [ ] Entrada por hexadecimal.
- [ ] Validar hexadecimal.
- [ ] Sincronizar seletor e código.
- [ ] Mostrar preview.
- [ ] Exibir cores no topo do Setlist.
- [ ] Validar em tema claro, escuro e mobile.

### 20. Histórico de Setlists
- [ ] Submenu Histórico.
- [ ] Separar próximos e anteriores.
- [ ] Filtros por data, período, evento, ministro, música, artista e tema.
- [ ] Abrir Setlist antigo.
- [ ] Respeitar modo somente leitura.
- [ ] Paginação.

### 21. Cifra e letra
- [ ] Manter “Ver cifra”.
- [ ] Criar “Ver letra”.
- [ ] Alternância rápida.
- [ ] Exibir tom da execução.
- [ ] Transposição na visualização.
- [ ] Navegação anterior/próxima.
- [ ] Modo palco.
- [ ] Controle de tamanho de fonte.
- [ ] Otimizar para celular e alto contraste.
- [ ] Documentar cuidados de direitos autorais para letras completas.

## P4 — Biblioteca de músicas

### 22. Consultar músicas
- [ ] Submenu Consultar Músicas.
- [ ] Botão `+ Nova Música` no topo.
- [ ] Busca por nome.
- [ ] Filtros por artista, ministro, tom e tema.
- [ ] Filtros combinados.
- [ ] Limpar filtros.
- [ ] Quantidade de resultados.
- [ ] Paginação.
- [ ] Empty State.
- [ ] Layout mobile.

### 23. Criar/editar música
- [ ] Nome.
- [ ] Artista.
- [ ] Tom original.
- [ ] Tema.
- [ ] Link de referência opcional.
- [ ] Cifra.
- [ ] Letra.
- [ ] Observações opcionais.
- [ ] Mostrar somente usuários com função Ministro.
- [ ] Permitir vários ministros.
- [ ] Definir `preferredKey` por ministro.
- [ ] Validar campos obrigatórios.
- [ ] Preview de cifra.
- [ ] Preview de letra.
- [ ] Confirmar saída com alterações não salvas.
- [ ] Registrar criação/edição em Audit Log.

## P5 — Auditoria e observabilidade

### 24. Audit Log
- [ ] Registrar usuário, data/hora, ação, entidade, ID, valores anteriores e novos quando aplicável.
- [ ] Auditar login/logout relevante.
- [ ] Auditar usuários.
- [ ] Auditar permissões.
- [ ] Auditar funções.
- [ ] Auditar indisponibilidades.
- [ ] Auditar eventos.
- [ ] Auditar escalas.
- [ ] Auditar Setlists.
- [ ] Auditar músicas.
- [ ] Auditar consentimentos LGPD.
- [ ] Tela de auditoria somente leitura.
- [ ] Filtros por usuário, período, ação e entidade.
- [ ] Detalhamento de alterações.

### 25. Erros e logs
- [ ] Logging estruturado.
- [ ] Correlation ID quando aplicável.
- [ ] Não registrar secrets ou dados sensíveis desnecessários.
- [ ] Separar mensagem para usuário de detalhe técnico.
- [ ] Monitorar falhas críticas.

## P6 — Qualidade

### 26. Testes
- [ ] Testes unitários de regras de negócio.
- [ ] Testes de Services.
- [ ] Testes de Repositories.
- [ ] Testes de componentes críticos.
- [ ] Testes de autenticação e autorização.
- [ ] Testes de Firestore Rules.
- [ ] Testes E2E dos fluxos críticos.
- [ ] Testes de responsividade.
- [ ] Testes de acessibilidade.
- [ ] Testes de tema claro/escuro.
- [ ] Testes de transposição.
- [ ] Testes de conflito de indisponibilidade.
- [ ] Testes de geração idempotente de escala/Setlist.

### 27. CI/CD
- [ ] Lint.
- [ ] Testes automáticos.
- [ ] Build automático.
- [ ] Deploy controlado.
- [ ] Validação de Firestore Rules.
- [ ] Bloquear merge/deploy em falhas críticas.
- [ ] Ambientes separados quando necessário.

## P7 — UX e produto

### 28. Dashboard
- [ ] Próximos eventos.
- [ ] Próximas escalas.
- [ ] Setlists pendentes.
- [ ] Indisponibilidades próximas.
- [ ] Ações rápidas.
- [ ] Indicadores para administradores.

### 29. Mobile
- [ ] Navegação mobile dedicada.
- [ ] Formulários responsivos.
- [ ] Tabelas adaptadas.
- [ ] Setlist otimizado para celular.
- [ ] Cifra/letra em modo palco.
- [ ] Botões com área de toque adequada.
- [ ] Testes em larguras pequenas.

### 30. Acessibilidade
- [ ] Navegação por teclado.
- [ ] Focus visível.
- [ ] Labels corretos.
- [ ] ARIA onde necessário.
- [ ] Contraste WCAG.
- [ ] Componentes não dependerem somente de cor.
- [ ] Mensagens de erro acessíveis.

## P8 — Migração e legado

### 31. Migração de dados
- [ ] Inventariar dados atuais.
- [ ] Mapear planilha atual para novo modelo.
- [ ] Migrar usuários e funções.
- [ ] Migrar indisponibilidades.
- [ ] Migrar eventos e escalas.
- [ ] Migrar músicas.
- [ ] Migrar Setlists.
- [ ] Manter IDs/referências quando necessário.
- [ ] Criar script reexecutável/idempotente.
- [ ] Validar contagens antes/depois.
- [ ] Plano de rollback.

### 32. Limpeza final
- [ ] Remover código legado não utilizado.
- [ ] Remover collections antigas não utilizadas.
- [ ] Remover estilos duplicados.
- [ ] Remover rotas antigas.
- [ ] Atualizar toda documentação.
- [ ] Garantir que o AGENTS.md reflita o estado final.

## P9 — Encerramento

### 33. Definition of Done final
- [ ] Build limpo.
- [ ] Todos os testes passando.
- [ ] Firestore Rules testadas.
- [ ] Desktop validado.
- [ ] Mobile validado.
- [ ] Tema claro validado.
- [ ] Tema escuro validado.
- [ ] Acessibilidade validada.
- [ ] Segurança validada.
- [ ] LGPD validada.
- [ ] Migração validada.
- [ ] Documentação atualizada.
- [ ] Sem secrets versionados.
- [ ] Sem senhas armazenadas.
- [ ] Audit Log funcionando.
- [ ] Fluxos críticos testados ponta a ponta.
