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

### 23A. Cadastro e enriquecimento de músicas assistido por IA

#### 23A.1. Objetivo e princípios de produto
- [ ] Manter dois caminhos de cadastro igualmente suportados: `Cadastro manual` e `Assistido por IA`.
- [ ] Não substituir, esconder ou degradar o fluxo manual existente.
- [ ] Permitir alternar para o fluxo manual a qualquer momento caso a IA falhe ou o usuário prefira preencher os dados.
- [ ] Fazer os dois caminhos convergirem para o mesmo formulário, validações, modelo de dados e processo de persistência.
- [ ] Tratar a IA como mecanismo de assistência e pré-preenchimento, nunca como autoridade final sobre os dados da música.
- [ ] Exigir revisão humana antes de persistir conteúdo sugerido automaticamente.
- [ ] Nunca salvar automaticamente uma música apenas porque a análise da IA terminou.
- [ ] Não bloquear o cadastro da música quando uma informação automática não puder ser encontrada.
- [ ] Permitir edição de todos os valores sugeridos pela IA antes de salvar.
- [ ] Não incluir Tap Tempo no escopo do cadastro de música.

#### 23A.2. Arquitetura do MVP sem backend próprio
- [ ] Utilizar a infraestrutura Firebase existente como base do MVP.
- [ ] Utilizar Firebase Hosting para a aplicação web.
- [ ] Utilizar Firebase Authentication para identidade e autorização do usuário.
- [ ] Utilizar Firestore para persistência das músicas após confirmação do usuário.
- [ ] Adotar Firebase AI Logic como integração preferencial entre o frontend e o modelo generativo.
- [ ] Utilizar Gemini Developer API por meio do Firebase AI Logic como provider inicial de IA.
- [ ] Priorizar modelos Gemini compatíveis com o free tier enquanto o volume do projeto permitir.
- [ ] Não criar Cloud Functions como requisito obrigatório do MVP de IA.
- [ ] Não exigir servidor dedicado, container, VM ou backend pago para o MVP.
- [ ] Não armazenar chave privada do Gemini diretamente no JavaScript entregue ao navegador.
- [ ] Utilizar Firebase App Check na integração com Firebase AI Logic.
- [ ] Configurar App Check também para produção antes de liberar a funcionalidade para todos os usuários.
- [ ] Implementar limites e tratamento de cota para que indisponibilidade da IA não afete o restante do sistema.
- [ ] Encapsular a integração em uma abstração `MusicAIProvider`, evitando acoplamento direto da UI ao Gemini.
- [ ] Permitir no futuro substituir o provider sem reescrever o formulário de músicas.

#### 23A.3. Experiência de cadastro
- [ ] Ao abrir `Nova Música`, apresentar escolha clara entre `Cadastrar manualmente` e `Importar com IA`.
- [ ] Manter `Cadastrar manualmente` funcionando exatamente com os recursos previstos no item 23.
- [ ] No modo assistido, oferecer inicialmente entrada de cifra/texto colado pelo usuário.
- [ ] Permitir informar uma URL de cifra como tentativa de enriquecimento quando tecnicamente suportado.
- [ ] Se a URL não puder ser acessada/analisada, orientar o usuário a colar a cifra/texto sem interromper o fluxo.
- [ ] Permitir informar manualmente URL de YouTube de referência.
- [ ] Permitir que a IA identifique um link de YouTube existente no conteúdo recebido quando disponível.
- [ ] Permitir informar BPM manualmente quando não houver fonte automática confiável.
- [ ] Mostrar estado de análise com feedback objetivo, sem loading infinito.
- [ ] Mostrar resultado parcial mesmo quando apenas parte das informações puder ser identificada.
- [ ] Após análise, abrir o mesmo formulário de música já preenchido com os dados sugeridos.
- [ ] Diferenciar visualmente dados confirmados pelo usuário de dados ainda sugeridos pela IA quando necessário.
- [ ] Manter experiência consistente em desktop, mobile, tema claro e tema escuro.

#### 23A.4. Informações que a IA poderá identificar/estruturar
- [ ] Nome da música.
- [ ] Artista/intérprete.
- [ ] Tom original quando identificável.
- [ ] Cifra.
- [ ] Letra.
- [ ] Estrutura musical.
- [ ] Intro.
- [ ] Versos.
- [ ] Pré-refrões.
- [ ] Refrões.
- [ ] Pontes.
- [ ] Instrumentais/interlúdios.
- [ ] Outro/final.
- [ ] Compasso quando houver evidência suficiente.
- [ ] BPM quando houver fonte ou evidência confiável.
- [ ] URL de vídeo de referência quando encontrada no conteúdo ou fornecida pelo usuário.
- [ ] Observações úteis somente quando derivadas do conteúdo recebido, sem inventar informação ausente.
- [ ] Nunca inferir como fato um campo que não esteja suficientemente sustentado pelo conteúdo analisado.

#### 23A.5. Modelo de dados e proveniência
- [ ] Evoluir `songs` para suportar `originalKey` e manter separado o tom utilizado em cada execução/setlist.
- [ ] Preservar `preferredKey` por ministro sem confundi-lo com o tom original da gravação.
- [ ] Armazenar `sourceUrl` quando o usuário fornecer uma fonte externa.
- [ ] Armazenar `sourceProvider` quando identificável.
- [ ] Armazenar `sourceType`, por exemplo `manual`, `url`, `ai_assisted`.
- [ ] Armazenar `importedAt` quando houver importação assistida.
- [ ] Estruturar vídeo de referência com `provider`, `url`, `videoId` e metadados disponíveis.
- [ ] Tratar BPM como metadado da versão/gravação de referência, não apenas do título da música.
- [ ] Permitir registrar a origem do BPM.
- [ ] Permitir registrar origem por campo relevante quando tecnicamente viável.
- [ ] Definir estrutura de confiança/proveniência para campos gerados automaticamente.
- [ ] Não obrigar score numérico de confiança quando o modelo/provider não fornecer informação confiável; permitir categorias como `alta`, `média`, `baixa` ou `não determinada`.
- [ ] Garantir retrocompatibilidade com músicas já cadastradas.

#### 23A.6. Structured Output e contrato da IA
- [ ] Definir schema único para a resposta do modelo, evitando retorno textual livre para o fluxo de importação.
- [ ] Utilizar Structured Output/JSON Schema quando suportado pelo provider selecionado.
- [ ] Validar a resposta da IA antes de aplicar qualquer valor ao formulário.
- [ ] Rejeitar resposta malformada sem apagar dados já preenchidos pelo usuário.
- [ ] Normalizar nomes de seções musicais para enum interno (`intro`, `verse`, `pre_chorus`, `chorus`, `bridge`, `instrumental`, `outro`, `other`).
- [ ] Validar tom musical contra valores aceitos pelo sistema.
- [ ] Validar BPM como número em faixa plausível sem alterar silenciosamente o valor retornado.
- [ ] Tratar campos ausentes como `null`/vazio em vez de inventar valores.
- [ ] Criar versão do schema de importação para permitir evolução futura sem quebrar músicas existentes.

#### 23A.7. YouTube e referências de gravação
- [ ] Suportar URL de YouTube como referência de música.
- [ ] Extrair `videoId` de URLs válidas quando possível.
- [ ] Não exigir YouTube para concluir o cadastro.
- [ ] Permitir trocar o vídeo sugerido antes de salvar.
- [ ] Preparar o modelo para diferenciar versão oficial, ao vivo, acústica ou outra versão quando essa informação estiver disponível.
- [ ] Exibir o vídeo/link de referência na consulta da música sem obrigar reprodução embutida.
- [ ] Preparar futura evolução para utilizar timestamps/seções do vídeo sem incluir isso no MVP.

#### 23A.8. BPM e fontes externas
- [ ] Manter campo BPM opcional.
- [ ] Buscar BPM automaticamente apenas por fonte/API cujo uso automatizado seja permitido.
- [ ] Não implementar scraping automatizado do SongBPM enquanto os termos do serviço proibirem automação/scraping.
- [ ] Permitir que o usuário consulte fontes externas manualmente e informe o BPM.
- [ ] Manter abstração `TempoProvider` para futuras integrações permitidas.
- [ ] Priorizar metadados confiáveis antes de inferência por IA.
- [ ] Se nenhuma fonte confiável estiver disponível, manter BPM vazio para preenchimento manual.
- [ ] Não implementar Tap Tempo neste fluxo.
- [ ] Registrar a origem do BPM quando obtido automaticamente.

#### 23A.9. URLs, CORS e limitações do MVP
- [ ] Tratar leitura automática de URL como capacidade oportunística, não requisito para concluir o MVP.
- [ ] Considerar limitações de CORS no navegador.
- [ ] Testar URL Context/recursos equivalentes do provider com sites reais utilizados pelo ministério antes de assumir compatibilidade.
- [ ] Implementar fallback imediato para `colar cifra/texto` quando a URL não puder ser processada.
- [ ] Não criar crawler genérico no frontend.
- [ ] Não contornar bloqueios técnicos ou termos de uso de sites de terceiros.
- [ ] Manter lista/documentação de fontes testadas e comportamento conhecido.

#### 23A.10. Segurança, privacidade e custos
- [ ] Ativar e validar Firebase App Check para chamadas de IA.
- [ ] Restringir uso da funcionalidade a usuários autenticados e com permissão adequada de músicas.
- [ ] Não enviar ao modelo dados pessoais do usuário que não sejam necessários para estruturar a música.
- [ ] Não registrar prompts completos contendo conteúdo sensível em logs de produção sem necessidade.
- [ ] Tratar erros de quota/rate limit com mensagem clara e opção de continuar manualmente.
- [ ] Implementar proteção contra múltiplos cliques/requisições duplicadas.
- [ ] Monitorar consumo da API/modelo dentro das ferramentas disponíveis do Firebase/Google.
- [ ] Definir limite operacional do recurso para evitar consumo acidental de cota.
- [ ] Documentar que o free tier não é garantia permanente e pode mudar conforme políticas do provider.
- [ ] Não transformar ativação de billing em requisito para o MVP enquanto houver uma alternativa gratuita funcional e compatível.

#### 23A.11. Direitos autorais e conteúdo de terceiros
- [ ] Tratar cifra/letra fornecida pelo usuário como conteúdo de origem externa e registrar sua fonte quando informada.
- [ ] Não implementar scraping massivo de letras/cifras de terceiros.
- [ ] Respeitar robots, termos de serviço, licenças e restrições de cada fonte integrada.
- [ ] Não remover atribuição/origem quando ela for necessária.
- [ ] Documentar no `songs/AGENTS.md` as regras de importação, armazenamento e exibição de conteúdo protegido.
- [ ] Revisar a política de armazenamento de letras/cifras completas antes de integrar fontes externas de forma automatizada.

#### 23A.12. Arquitetura extensível de providers
- [ ] Criar contrato `MusicAIProvider`.
- [ ] Implementar inicialmente `FirebaseAILogicMusicProvider`.
- [ ] Não chamar SDK do Gemini diretamente a partir dos componentes de UI.
- [ ] Criar contrato `TempoProvider` para BPM.
- [ ] Criar contrato de referência de vídeo quando necessário.
- [ ] Permitir futuramente providers via Cloud Functions, APIs externas ou modelos locais sem alterar o formulário.
- [ ] Garantir que a ausência de qualquer provider preserve o cadastro manual.

#### 23A.13. Observabilidade e auditoria
- [ ] Registrar evento de início/fim da análise de IA sem persistir conteúdo desnecessário do prompt.
- [ ] Registrar provider/modelo utilizado quando útil para diagnóstico.
- [ ] Registrar sucesso, falha, timeout, quota excedida e resposta inválida.
- [ ] Registrar no Audit Log se uma música foi criada manualmente ou a partir de fluxo assistido por IA.
- [ ] Registrar apenas a versão final confirmada pelo usuário como estado persistido da música.
- [ ] Não tratar sugestões descartadas pela pessoa como dados oficiais da música.

#### 23A.14. Testes do MVP
- [ ] Teste unitário do parser/validador do Structured Output.
- [ ] Testes de normalização de seções musicais.
- [ ] Testes de tons válidos e inválidos.
- [ ] Testes de BPM válido, ausente e inválido.
- [ ] Testes de parsing de URL do YouTube.
- [ ] Testes do fallback de URL para cifra/texto colado.
- [ ] Testes de resposta parcial da IA.
- [ ] Testes de resposta malformada da IA.
- [ ] Testes de erro de quota/rate limit.
- [ ] Testes de indisponibilidade do provider.
- [ ] Validar que falha da IA não impede cadastro manual.
- [ ] Validar que nenhum dado é salvo antes da confirmação do usuário.
- [ ] Testar fluxo manual e assistido em desktop.
- [ ] Testar fluxo manual e assistido em mobile.
- [ ] Testar tema claro e escuro.
- [ ] Testar acessibilidade dos estados de análise, erro e revisão.
- [ ] Incluir pelo menos um fluxo E2E de cadastro assistido com provider simulado/mocado para não depender de quota externa no CI.

#### 23A.15. Critérios de aceite do MVP
- [ ] Usuário consegue continuar cadastrando música 100% manualmente.
- [ ] Usuário consegue escolher `Assistido por IA` sem sair do módulo de músicas.
- [ ] Usuário consegue colar cifra/texto e solicitar análise.
- [ ] IA retorna dados em contrato estruturado e validado.
- [ ] Resultado preenche o formulário existente sem salvar automaticamente.
- [ ] Usuário consegue corrigir qualquer campo antes de salvar.
- [ ] Campos não identificados permanecem vazios/editáveis.
- [ ] URL de YouTube pode ser informada e persistida.
- [ ] BPM pode ser preenchido automaticamente quando houver fonte permitida ou manualmente quando não houver.
- [ ] Não existe Tap Tempo no formulário.
- [ ] App Check protege o acesso ao Firebase AI Logic em produção.
- [ ] Nenhuma chave privada de IA fica exposta no bundle da aplicação.
- [ ] Erro ou indisponibilidade da IA oferece continuidade imediata pelo cadastro manual.
- [ ] Build, lint e testes passam.
- [ ] GitHub Actions passam.
- [ ] Fluxo validado na aplicação publicada antes de marcar o épico como concluído.

#### 23A.16. Evoluções futuras — fora do MVP inicial
- [ ] Avaliar Cloud Functions somente quando houver necessidade real de processamento server-side.
- [ ] Avaliar backend serverless caso seja necessário acessar fontes incompatíveis com CORS de forma permitida.
- [ ] Avaliar cache de metadados externos para reduzir chamadas e custo.
- [ ] Avaliar busca automática de vídeo oficial por APIs autorizadas.
- [ ] Avaliar providers alternativos de IA.
- [ ] Avaliar detecção automática de BPM por análise de áudio somente se houver fonte de áudio e uso permitido.
- [ ] Avaliar detecção automática de tonalidade por áudio.
- [ ] Avaliar timestamps de seções da música no vídeo de referência.
- [ ] Avaliar comparação entre versão original e versão utilizada pela igreja.
- [ ] Avaliar métricas do estudo de caso: tempo médio de cadastro manual vs IA, percentual de campos preenchidos automaticamente, quantidade de correções humanas, taxa de sucesso e custo por cadastro.

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

## P10 — Recursos sem backend adicional

> Este épico deve permanecer implementável no navegador utilizando apenas a aplicação web e os serviços Firebase já existentes. Não introduzir Cloud Functions, servidor dedicado, container, SMTP, API key privada exposta no cliente ou outro serviço server-side como requisito destes itens.

### 34. Exportação mensal de escalas em PDF no frontend
- [ ] Criar submenu `Escalas > Exportar`.
- [ ] Permitir selecionar mês e ano de referência.
- [ ] Consultar no Firestore as escalas e eventos correspondentes ao mês selecionado.
- [ ] Gerar o PDF diretamente no navegador, sem Cloud Function ou serviço externo de geração de PDF.
- [ ] Exibir no PDF data, horário, evento, local e integrantes agrupados por função ministerial.
- [ ] Exibir somente informações úteis ao usuário, sem IDs técnicos de documentos.
- [ ] Ordenar os eventos cronologicamente.
- [ ] Utilizar layout claro, legível e consistente com o Design System do IDE Music.
- [ ] Suportar múltiplas páginas sem cortar cards, títulos ou integrantes.
- [ ] Permitir baixar o arquivo localmente.
- [ ] Definir nome de arquivo previsível, por exemplo `escala-2026-09.pdf`.
- [ ] Validar exportação em desktop e mobile.
- [ ] Validar meses sem eventos com Empty State adequado.
- [ ] Criar testes para agrupamento, ordenação e conteúdo gerado.

### 35. Agenda/calendário da escala via iCalendar (`.ics`)
- [ ] Disponibilizar ação `Adicionar à agenda` na visualização da escala/evento.
- [ ] Gerar arquivo `.ics` diretamente no navegador, sem backend.
- [ ] Utilizar padrão iCalendar compatível com Google Calendar, Outlook, Apple Calendar e aplicativos equivalentes.
- [ ] Preencher título do compromisso com nome do evento e identificação do IDE Music.
- [ ] Preencher data e horário inicial/final quando disponíveis.
- [ ] Preencher local do evento quando disponível.
- [ ] Incluir na descrição a função ou funções em que o usuário está escalado.
- [ ] Incluir link direto para a escala e/ou Setlist quando houver URL pública/autorizada aplicável.
- [ ] Utilizar timezone correto do evento e evitar conversões incorretas de horário.
- [ ] Gerar `UID` estável a partir do evento/escala para permitir identificação consistente do compromisso.
- [ ] Não incluir IDs internos desnecessários no texto visível do compromisso.
- [ ] Permitir baixar o `.ics` individual de um evento.
- [ ] Permitir gerar um `.ics` contendo todas as escalas do usuário em um mês selecionado.
- [ ] Considerar apenas escalas em que o usuário autenticado participa na exportação pessoal mensal.
- [ ] Ordenar eventos cronologicamente no arquivo mensal.
- [ ] Validar importação do arquivo no Google Calendar.
- [ ] Validar importação do arquivo no Outlook.
- [ ] Validar importação em calendário de dispositivo móvel quando possível.
- [ ] Criar testes para datas, timezone, `UID`, caracteres especiais e múltiplos eventos.

### 36. Compartilhamento client-side de escala e agenda
- [ ] Disponibilizar ação `Compartilhar` quando a Web Share API estiver disponível no dispositivo.
- [ ] Permitir compartilhar link da escala/setlist sem necessidade de backend adicional.
- [ ] Permitir compartilhar o PDF ou `.ics` gerado localmente quando o navegador/dispositivo suportar compartilhamento de arquivos.
- [ ] Implementar fallback para copiar link quando Web Share API não estiver disponível.
- [ ] Não utilizar tokens privados, credenciais ou serviços server-side para o compartilhamento.
- [ ] Manter comportamento consistente em desktop e mobile.

### 37. Firebase App Check sem backend próprio
- [ ] Avaliar e habilitar Firebase App Check nos serviços Firebase utilizados diretamente pelo frontend quando compatível.
- [ ] Priorizar providers oficiais suportados diretamente pelo Firebase Web SDK e que não exijam Cloud Function própria.
- [ ] Não utilizar provider customizado que dependa de backend como requisito deste épico.
- [ ] Configurar modo de observação antes de enforcement quando aplicável.
- [ ] Validar que autenticação, Firestore e funcionalidades existentes continuam operando após a ativação.
- [ ] Documentar configuração de desenvolvimento/local para não bloquear testes automatizados.

### 38. Limites explícitos do escopo sem backend
- [ ] Não implementar envio automático de e-mail/SMTP neste épico.
- [ ] Não implementar envio automático de convite `.ics` por e-mail neste épico; disponibilizar geração/download/compartilhamento local.
- [ ] Não implementar push direcionado que exija armazenar secret/API key privilegiada no frontend.
- [ ] Não expor REST API keys privadas, SMTP credentials ou secrets no bundle web.
- [ ] Não adicionar Cloud Functions apenas para atender aos itens 34 a 37.
- [ ] Caso uma evolução futura exija backend, registrar em épico separado antes da implementação.

### 39. Definition of Done dos recursos sem backend
- [ ] Nenhuma Cloud Function nova criada para estes recursos.
- [ ] Nenhum serviço backend dedicado criado para estes recursos.
- [ ] Nenhum secret privado presente no frontend.
- [ ] PDF mensal validado com dados reais em produção.
- [ ] `.ics` individual validado com dados reais em produção.
- [ ] `.ics` mensal do usuário validado com dados reais em produção.
- [ ] Compartilhamento/fallback validado em desktop e mobile.
- [ ] Testes unitários e E2E relevantes passando.
- [ ] GitHub Actions passando.
- [ ] Funcionalidades validadas na aplicação publicada antes de marcar os itens como concluídos.
