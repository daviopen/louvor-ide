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
- [ ] Tema claro.
- [ ] Tema escuro.
- [ ] Opção `system`.
- [ ] Detectar preferência do sistema.
- [ ] Seletor no menu do usuário.
- [ ] Persistir preferência.
- [ ] Evitar flash na troca/carregamento do tema.
- [ ] Validar todos os componentes, Setlist, cifra e letra nos dois temas.

### 8. Modelo de dados
- [ ] `users`.
- [ ] `ministryFunctions`.
- [ ] `userFunctions`.
- [ ] `permissions`.
- [ ] `events`.
- [ ] `unavailability`.
- [ ] `schedules`.
- [ ] `scheduleMembers`.
- [ ] `setlists`.
- [ ] `setlistSongs`.
- [ ] `songs`.
- [ ] `songMinisterKeys`.
- [ ] `auditLogs`.
- [ ] `lgpdConsents`.
- [ ] Implementar Pessoa ↔ Função como relação N:N.
- [ ] Suportar Ministro, Back Vocal, Bateria, Baixo, Guitarra, Violão, Teclado, Sax, DM e novas funções futuramente.
- [ ] Permitir ativar/inativar e ordenar funções.

### 9. Segurança
- [ ] Manter login Google.
- [ ] Manter login e-mail/senha.
- [ ] Recuperação de senha.
- [ ] Logout seguro.
- [ ] Tratar sessão expirada e usuário desativado.
- [ ] Criar `SUPER_ADMIN`.
- [ ] Definir inicialmente `davitads@gmail.com` como Super Admin.
- [ ] Não depender do e-mail hardcoded no frontend.
- [ ] Permitir outros administradores.
- [ ] Impedir elevação indevida de privilégios.
- [ ] Aplicar menor privilégio.
- [ ] Usar Custom Claims quando necessário.
- [ ] Proteger operações críticas via backend/Cloud Functions quando necessário.
- [ ] Implementar Firestore Security Rules por permissão.
- [ ] Criar testes automatizados das Rules.

### 10. LGPD
- [ ] Termos de Uso.
- [ ] Política de Privacidade.
- [ ] Consentimento LGPD no primeiro acesso.
- [ ] Consentimento explícito, sem checkbox pré-marcado.
- [ ] Registrar versão do termo, usuário, data e hora.
- [ ] Solicitar novo aceite quando houver alteração relevante.
- [ ] Aplicar minimização de dados.
- [ ] Definir retenção, inativação e exclusão.
- [ ] Definir dados que precisam permanecer em histórico/auditoria.

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
- [ ] Impedir ministro duplicado na mesma música.

### 24. Padrão oficial da cifra IDE Music
- [ ] Manter formato simples e natural usado pela equipe.
- [ ] Não exigir `[VERSO]`, tags ou HTML.
- [ ] Permitir `Intro:`, `Estrofe:`, `Pré-Refrão:`, `Refrão:`, `Ponte:`, `Final:` e títulos livres.
- [ ] Permitir letra e acordes na mesma linha.
- [ ] Permitir sequências somente de acordes.
- [ ] Permitir observações como `(Apenas Guitar)` e `(2x)`.
- [ ] Preservar quebras e espaçamento.

Exemplo oficial:

```text
Intro:
E  A
E  A  B  G
E  A
E  A  B  G

Estrofe:
A alegria - E  D  A/C#  (Apenas Guitar)
A verdadeira - E  B
O sentimento - E  D  A/C#  G
É o amor - E  B  E

Ponte:
Posso pisar - E  A  A  D  (2x)
Cristo é - E  D  A/C#  Am/C
Posso pisar - F#  F#  A

Refrão:
Aleluia - E  A  D
Aleluia - E  F#  B
O sentimento - E  D  A/C#
É o amor - F#  A
```

- [ ] Editor com fonte monoespaçada.
- [ ] Botão “Ver exemplo”.
- [ ] Preview em tempo real.
- [ ] Destacar automaticamente títulos, acordes e observações.
- [ ] Não exigir negrito manual.

### 25. Parser de cifra
- [ ] Reconhecer maiores, menores, sustenidos, bemóis, sétimas, nona, extensões e inversões.
- [ ] Suportar exemplos como `E`, `F#`, `Bb`, `Am`, `C#m`, `A/C#`, `Am/C`, `G7`, `D/F#`, `C9`, `Bm7`.
- [ ] Não interpretar palavras comuns como acordes.
- [ ] Não modificar letra, títulos ou observações.
- [ ] Preservar pontuação e espaçamento.
- [ ] Reconhecer acordes no início, meio e fim da linha.

### 26. Transposição
- [ ] Transpor somente acordes.
- [ ] Transpor nota principal e baixo de inversão.
- [ ] Exemplo: `A/C#` +2 semitons → `B/D#`.
- [ ] Não alterar texto, `(2x)` ou observações.
- [ ] Testes em todos os 12 tons.
- [ ] Testar sustenidos, bemóis, maiores, menores, inversões e extensões.

### 27. Renderização e armazenamento
- [ ] Títulos em destaque.
- [ ] Acordes em destaque.
- [ ] Letra em peso normal.
- [ ] Observações com aparência secundária.
- [ ] Preservar quebra de linha/espaçamento.
- [ ] Controle de tamanho da fonte.
- [ ] Funcionar em mobile, palco e dark mode.
- [ ] Salvar cifra como texto puro.
- [ ] Não armazenar HTML (`<strong>`, `<span>`, etc.).
- [ ] Reutilizar a mesma cifra em edição, preview, transposição, Setlist, modo palco e impressão futura.

### 28. Letra
- [ ] Campo específico independente da cifra.
- [ ] Exibir no Setlist.
- [ ] Visualização limpa.
- [ ] Controle de tamanho de fonte.
- [ ] Modo palco.
- [ ] Garantir contraste.
- [ ] Avaliar direitos autorais/licenciamento.

## P5 — Refinamento

### 29. Dashboard
- [ ] Próxima escala.
- [ ] Evento, data, horário e função.
- [ ] Integrantes.
- [ ] Dress Code.
- [ ] Link para Setlist.
- [ ] Próximas indisponibilidades.
- [ ] Para admins: próximos eventos, escalas incompletas, Setlists pendentes e atalhos administrativos.

### 30. UX geral
- [ ] Breadcrumbs e rota atual.
- [ ] Validação inline.
- [ ] Preservar formulário em caso de erro.
- [ ] Evitar duplo envio.
- [ ] Feedbacks claros de sucesso/erro.
- [ ] Foco no primeiro campo inválido.
- [ ] Estados de Loading, Skeleton, Empty State, Erro, Sem permissão, Offline e Sem resultados.

### 31. Responsividade
- [ ] Testar desktop, notebook, tablet, Android e iPhone.
- [ ] Validar Sidebar, modais, formulários, tabelas, Setlist e cifras.
- [ ] Converter tabelas para cards no mobile quando necessário.
- [ ] Garantir áreas de toque adequadas.
- [ ] Evitar scroll horizontal desnecessário.

### 32. Acessibilidade
- [ ] Navegação por teclado.
- [ ] `focus-visible`.
- [ ] Labels associados.
- [ ] ARIA quando necessário.
- [ ] Contraste adequado.
- [ ] Não representar estados apenas por cor.
- [ ] Suporte aos principais fluxos em leitores de tela.

### 33. Performance
- [ ] Revisar queries e índices Firestore.
- [ ] Paginação.
- [ ] Evitar carregar todos os usuários/músicas sem necessidade.
- [ ] Lazy loading.
- [ ] Reduzir listeners.
- [ ] Otimizar imagens/fontes/bundle.
- [ ] Medir Core Web Vitals.
- [ ] Testar conexão móvel.

### 34. Offline
- [ ] Auditar `localStorage`.
- [ ] Não usar dados locais como fonte de verdade de permissões.
- [ ] Evitar dados sensíveis em cache.
- [ ] Avaliar persistência offline do Firestore.
- [ ] Indicador offline e pendências de sincronização.
- [ ] Estratégia para conflitos de sincronização.

### 35. Auditoria
- [ ] Criar `auditLogs`.
- [ ] Registrar ator, ação, entidade, ID, timestamp e alterações relevantes.
- [ ] Proibir edição dos logs por usuários comuns.
- [ ] Tela administrativa com filtros por usuário, ação, período e entidade.
- [ ] Auditar usuários, permissões, funções, indisponibilidades administrativas, eventos, escalas e exclusões.

### 36. Testes unitários
- [ ] Validators e DTOs.
- [ ] Services e Repositories.
- [ ] Parser de cifra e transposição.
- [ ] Disponibilidade e seleção por função.
- [ ] Geração de escala e Setlist.
- [ ] Permission Guards.
- [ ] Regras de negócio de usuários.

### 37. Testes de integração
- [ ] Authentication + Users.
- [ ] Users + Functions.
- [ ] Users + Permissions.
- [ ] Events + Schedules.
- [ ] Schedules + Unavailability.
- [ ] Schedules + Setlists.
- [ ] Setlists + Songs.
- [ ] Songs + Ministers.
- [ ] Firestore + Security Rules.
- [ ] LGPD + primeiro acesso.

### 38. Testes E2E
- [ ] Login Google e e-mail/senha.
- [ ] Recuperação de senha e logout.
- [ ] CRUD/inativação de usuário.
- [ ] Funções e permissões.
- [ ] Aceite LGPD.
- [ ] Indisponibilidade.
- [ ] Evento → escala automática.
- [ ] Montagem da escala com disponibilidade/função.
- [ ] Setlist, músicas, ordem, ministro e tom.
- [ ] Dress Code.
- [ ] Cifra, transposição e letra.
- [ ] Histórico.
- [ ] Light/dark.
- [ ] Acesso negado.

### 39. Testes de segurança
- [ ] Usuário não autenticado não acessa dados privados.
- [ ] Leitura não permite escrita.
- [ ] Usuário sem módulo não acessa o módulo.
- [ ] Usuário comum não altera permissões.
- [ ] Admin comum não eleva indevidamente privilégios.
- [ ] Usuário não altera Audit Logs.
- [ ] Usuário não altera outro usuário diretamente via Firestore sem autorização.
- [ ] Testar acesso direto por URL e manipulação de requests.

### 40. CI/CD
- [ ] Lint e formatter.
- [ ] Testes e build automáticos.
- [ ] Bloquear merge com falhas.
- [ ] GitHub Actions.
- [ ] Ambientes dev, homologação e produção.
- [ ] Configurações Firebase separadas por ambiente.
- [ ] `.env.example` sem secrets.
- [ ] Preview deployment quando possível.
- [ ] Deploy em produção somente após homologação.

### 41. Monitoramento
- [ ] Monitorar erros JavaScript/Firebase.
- [ ] Monitorar autenticação e performance.
- [ ] Logs técnicos sem dados pessoais desnecessários.
- [ ] Alertas para erros críticos.
- [ ] Monitorar falhas de deploy.

## Fluxo completo esperado
- [ ] Admin cadastra usuário.
- [ ] Admin vincula múltiplas funções.
- [ ] Admin define permissões.
- [ ] Usuário aceita LGPD.
- [ ] Usuário registra indisponibilidade.
- [ ] Admin cria evento.
- [ ] Sistema cria escala automaticamente.
- [ ] Admin escolhe funções necessárias.
- [ ] Sistema mostra somente usuários elegíveis e disponíveis.
- [ ] Admin conclui a escala.
- [ ] Sistema disponibiliza Setlist.
- [ ] Usuários autorizados adicionam músicas.
- [ ] Sistema mostra ministros escalados e sugere seus tons.
- [ ] Dress Code é definido.
- [ ] Integrantes consultam Setlist, cifra e letra.
- [ ] Evento concluído vai para histórico sem perder escala/Setlist.

## Definition of Done

Uma funcionalidade somente é concluída quando:

- [ ] Segue o `AGENTS.md`.
- [ ] Regras estão documentadas.
- [ ] Usa componentes padronizados.
- [ ] Não possui duplicação evitável.
- [ ] Possui validações e estados de loading/erro/empty quando aplicável.
- [ ] Funciona em desktop e mobile.
- [ ] Funciona em tema claro e escuro.
- [ ] Possui controle real de permissão.
- [ ] Firestore Rules foram avaliadas/testadas.
- [ ] LGPD foi avaliada.
- [ ] Testes relevantes passam.
- [ ] Build e lint passam.
- [ ] Nenhum secret foi exposto.
- [ ] Foi validada em homologação.

## Marcos

### Marco 1 — Fundação
- [ ] Arquitetura, AGENTS.md, Design System, paleta, temas, modelo de dados e testes base.

### Marco 2 — Administração
- [ ] Usuários, funções, permissões, LGPD, segurança e auditoria.

### Marco 3 — Escalas
- [ ] Indisponibilidade, eventos, escala automática e seleção inteligente.

### Marco 4 — Setlist
- [ ] Setlist, Dress Code, histórico, ministro/tom, cifra e letra.

### Marco 5 — Biblioteca de músicas
- [ ] Consulta, cadastro, filtros, parser, transposição e letras.

### Marco 6 — IDE Music v3
- [ ] Segurança, LGPD, mobile, desktop, dark mode, acessibilidade, performance e testes validados.
- [ ] Homologação aprovada.
- [ ] Deploy em produção.