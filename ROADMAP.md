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
- [x] Sidebar desktop e navegação mobile.
- [x] Sidebar recolhível.
- [x] Destacar rota atual.
- [x] Ocultar itens sem permissão.
- [x] Dashboard.
- [x] Usuários > Usuários.
- [x] Usuários > Permissões.
- [x] Escalas > Indisponibilidade.
- [x] Escalas > Eventos.
- [x] Escalas > Escalas.
- [x] Setlist > Próximos.
- [x] Setlist > Histórico.
- [x] Músicas > Consultar.
- [x] Músicas > Nova Música.
- [x] Administração > Auditoria.
- [x] Administração > Configurações.

### 12. CRUD de usuários
- [x] Listar usuários.
- [x] Criar usuário.
- [x] Editar usuário.
- [x] Inativar/reativar usuário.
- [x] Evitar exclusão física quando houver histórico.
- [x] Exibir nome, avatar, e-mail, funções, status e último acesso quando disponível.
- [x] Buscar por nome/e-mail.
- [x] Filtrar por função e status.
- [x] Paginação.
- [x] Cadastro com múltiplas funções e permissões iniciais.
- [x] Fluxo seguro de definição/redefinição de senha pelo Firebase.
- [x] Nunca visualizar ou armazenar senha.
- [x] Registrar alterações em Audit Log.

### 13. Permissões
- [x] Níveis: Sem acesso, Leitura, Edição.
- [x] Aplicar a Dashboard, Usuários, Permissões, Indisponibilidades, Eventos, Escalas, Setlists, Músicas e Auditoria.
- [x] Criar matriz de permissões por usuário.
- [x] Mostrar alterações antes de salvar.
- [x] Confirmar mudanças administrativas.
- [x] Ocultar menu sem acesso.
- [x] Bloquear rota direta.
- [x] Bloquear leitura/escrita no Firestore independentemente do frontend.

### 14. Funções ministeriais
- [x] Cadastro de funções.
- [x] Uma pessoa pode possuir múltiplas funções.
- [x] Ativar/inativar função.
- [x] Editar e ordenar funções.
- [x] Migrar/compatibilizar funções existentes da planilha.
- [x] Não confundir função ministerial com permissão do sistema.

## P2 — Operação das escalas

### 15. Indisponibilidades
- [x] Usuário registra sua própria indisponibilidade.
- [x] Data obrigatória.
- [x] Período opcional.
- [x] Evento específico opcional.
- [x] Observação opcional.
- [x] Editar/excluir indisponibilidade futura.
- [x] Visualização em calendário.
- [x] Admin pode registrar/editar para outra pessoa.
- [x] Registrar ator da alteração e Audit Log.
- [x] Indisponível não aparece na seleção normal da escala.
- [x] Considerar data, horário e evento.
- [x] Exceção administrativa somente com confirmação/auditoria.

### 16. Eventos
- [x] CRUD de eventos.
- [x] Campos: nome, data, horário opcional, descrição, local e tema opcionais.
- [x] Status: Planejado, Confirmado, Cancelado, Concluído.
- [x] Criar escala automaticamente ao criar evento.
- [x] Criar estrutura de Setlist vinculada.
- [x] Atualizar referências quando data/hora mudar.
- [x] Refletir cancelamento na escala e Setlist.
- [x] Manter histórico de eventos concluídos.

### 17. Escalas
- [x] Uma escala por evento.
- [x] Vincular `scheduleId` ao `eventId`.
- [x] Garantir geração idempotente sem duplicatas.
- [x] Quantidade dinâmica de funções.
- [x] Não limitar número de perfis/funções.
- [x] Selecionar função antes do usuário.
- [x] Mostrar somente usuários que possuem a função.
- [x] Mostrar somente usuários ativos e disponíveis.
- [x] Considerar indisponibilidades.
- [x] Permitir adicionar/remover função e trocar usuário.
- [x] Permitir uma pessoa em múltiplas funções quando necessário.
- [x] Alertar duplicidades e conflitos.
- [x] Exceções administrativas com confirmação.
- [x] Avatar, badges, agrupamento e autocomplete.
- [x] UX específica mobile.
- [x] Indicar escala completa/incompleta.
- [x] Histórico com filtros por data, evento, pessoa e função.

## P3 — Setlist

### 18. Setlist por escala
- [x] Criar automaticamente para cada escala.
- [x] Vincular ao evento e à escala.
- [x] Exibir integrantes.
- [x] Somente pessoas escaladas como Ministro ficam disponíveis como ministro do Setlist.
- [x] Adicionar/remover músicas.
- [x] Ordenar por drag-and-drop.
- [x] Salvar ordem.
- [x] Selecionar ministro por música.
- [x] Sugerir tom preferido do ministro.
- [x] Permitir tom específico para aquela execução sem alterar o padrão permanente.
- [x] Observação/transição/momento especial por música.

### 19. Dress Code
- [x] Permitir 0 a 3 cores.
- [x] Color Picker.
- [x] Entrada por hexadecimal.
- [x] Validar hexadecimal.
- [x] Sincronizar seletor e código.
- [x] Mostrar preview.
- [x] Exibir cores no topo do Setlist.
- [x] Validar em tema claro, escuro e mobile.

### 20. Histórico de Setlists
- [x] Submenu Histórico.
- [x] Separar próximos e anteriores.
- [x] Filtros por data, período, evento, ministro, música e tema.
- [x] Abrir Setlist antigo.
- [x] Respeitar modo somente leitura.
- [x] Paginação.

### 21. Cifra e letra
- [x] Manter “Ver cifra”.
- [x] Criar “Ver letra”.
- [x] Alternância rápida.
- [x] Exibir tom da execução.
- [x] Transposição na visualização.
- [x] Navegação anterior/próxima.
- [x] Modo palco.
- [x] Controle de tamanho de fonte.
- [x] Otimizar para celular e alto contraste.
- [x] Documentar cuidados de direitos autorais para letras completas.

## P4 — Biblioteca de músicas

### 22. Consultar músicas
- [x] Submenu Consultar Músicas.
- [x] Botão `+ Nova Música` no topo.
- [x] Busca por nome.
- [x] Filtros por artista, ministro, tom e tema.
- [x] Filtros combinados.
- [x] Limpar filtros.
- [x] Quantidade de resultados.
- [x] Paginação.
- [x] Empty State.
- [x] Layout mobile.

### 23. Criar/editar música
- [x] Nome.
- [x] Artista.
- [x] Tom original.
- [x] Tema.
- [x] Link de referência opcional.
- [x] Cifra.
- [x] Letra.
- [x] Observações opcionais.
- [x] Mostrar somente usuários com função Ministro.
- [x] Permitir vários ministros.
- [x] Definir `preferredKey` por ministro.
- [x] Validar campos obrigatórios.
- [x] Preview de cifra.
- [x] Preview de letra.
- [x] Confirmar saída com alterações não salvas.
- [x] Registrar criação/edição em Audit Log.

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
- [x] Logging estruturado.
- [x] Correlation ID quando aplicável.
- [x] Não registrar secrets ou dados sensíveis desnecessários.
- [x] Separar mensagem para usuário de detalhe técnico.
- [x] Monitorar falhas críticas.

## P6 — Qualidade

### 26. Testes
- [x] Testes unitários de regras de negócio.
- [x] Testes de Services.
- [x] Testes de Repositories.
- [x] Testes de componentes críticos.
- [x] Testes de autenticação e autorização.
- [x] Testes de Firestore Rules.
- [x] Testes E2E dos fluxos críticos.
- [x] Testes de responsividade.
- [x] Testes de acessibilidade.
- [x] Testes de tema claro/escuro.
- [x] Testes de transposição.
- [x] Testes de conflito de indisponibilidade.
- [x] Testes de geração idempotente de escala/Setlist.

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
- [x] Próximos eventos.
- [x] Próximas escalas.
- [x] Setlists pendentes.
- [x] Indisponibilidades próximas.
- [x] Ações rápidas.
- [x] Indicadores para administradores.

### 29. Mobile
- [x] Navegação mobile dedicada.
- [x] Formulários responsivos.
- [x] Tabelas adaptadas.
- [x] Setlist otimizado para celular.
- [x] Cifra/letra em modo palco.
- [x] Botões com área de toque adequada.
- [x] Testes em larguras pequenas.

### 30. Acessibilidade
- [x] Navegação por teclado.
- [x] Focus visível.
- [x] Labels corretos.
- [x] ARIA onde necessário.
- [x] Contraste WCAG.
- [x] Componentes não dependerem somente de cor.
- [x] Mensagens de erro acessíveis.

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