# ROADMAP — IDE Music

> Este arquivo contém **somente itens pendentes**.
>
> Um item só deve ser marcado como concluído após: **implementação → testes → GitHub Actions → validação na aplicação publicada**.

## P0 — Operação e UX

### 1. Eventos
- [ ] Ao excluir um evento, excluir também a escala e o Setlist vinculados.
- [ ] Exigir confirmação antes da exclusão e registrar a operação na auditoria.

### 2. Escalas
- [ ] Adicionar ordenação na tela de escalas.
- [ ] Adicionar filtro por **mês/ano**, além de data inicial e final.
- [ ] Na edição de uma escala, exibir ao final um resumo mensal com **todos os usuários ativos** e a quantidade de escalas de cada pessoa no mês de referência.
- [ ] Contar no máximo uma participação por pessoa em cada escala, mesmo quando ela exercer mais de uma função no mesmo evento.

### 3. Indisponibilidades
- [ ] Adicionar filtro por **mês/ano**, além de data inicial e final.
- [ ] Permitir indisponibilidade recorrente por dia da semana dentro de um período, por exemplo: indisponível em todas as sextas-feiras entre duas datas.
- [ ] Validar conflitos dessas recorrências durante a montagem das escalas.

### 4. Eventos — filtros
- [ ] Adicionar filtro por **mês/ano**, além de data inicial e final.

### 5. Usuários
- [ ] Remover paginação da tela de usuários.
- [ ] Manter busca e filtros funcionando sobre a lista completa.

### 6. Configurações
- [ ] Organizar `Configurações` em submenus.
- [ ] Criar submenu `Template de Escala`.
- [ ] Criar submenu `Funções Ministeriais`.
- [ ] Permitir configurar no template quais funções existem em uma escala e suas respectivas quantidades.
- [ ] Permitir definir e editar ícones das funções ministeriais.
- [ ] Garantir acesso às configurações somente para administradores autorizados.

### 7. Ajuda
- [ ] Criar menu `Ajuda`, sem regra adicional de permissionamento.
- [ ] Explicar cada módulo do sistema, principais ações e fluxos disponíveis.
- [ ] Manter o conteúdo compatível com desktop, mobile, tema claro e escuro.

## P1 — Exportação e compartilhamento

### 8. Exportação mensal de escalas em PDF
- [ ] Criar submenu `Escalas > Exportar`.
- [ ] Permitir selecionar mês e ano.
- [ ] Gerar o PDF diretamente no navegador, sem backend adicional.
- [ ] Exibir data, horário, evento, local e integrantes agrupados por função ministerial.
- [ ] Ordenar eventos cronologicamente e ocultar IDs técnicos.
- [ ] Criar layout claro, legível e consistente com o Design System.
- [ ] Suportar múltiplas páginas sem cortes de conteúdo.
- [ ] Permitir baixar o arquivo com nome previsível, por exemplo `escala-2026-09.pdf`.
- [ ] Tratar mês sem eventos com Empty State adequado.
- [ ] Validar geração em desktop e mobile.
- [ ] Criar testes para agrupamento, ordenação e conteúdo do PDF.

### 9. Compartilhamento client-side
- [ ] Disponibilizar ação `Compartilhar` quando a Web Share API estiver disponível.
- [ ] Permitir compartilhar link da escala ou Setlist.
- [ ] Permitir compartilhar o PDF gerado localmente quando o navegador/dispositivo suportar compartilhamento de arquivos.
- [ ] Implementar fallback para copiar o link.
- [ ] Não utilizar credenciais privadas ou backend adicional somente para compartilhamento.

## P2 — Músicas assistidas por IA

### 10. MVP de importação assistida
- [ ] Manter `Cadastro manual` e adicionar opção `Importar com IA`.
- [ ] Usar o mesmo formulário, validações e persistência para os dois fluxos.
- [ ] Nunca salvar automaticamente conteúdo sugerido pela IA; exigir revisão e confirmação do usuário.
- [ ] Permitir continuar pelo cadastro manual quando a IA falhar, estiver indisponível ou atingir limite de cota.
- [ ] Utilizar Firebase AI Logic com provider abstraído por `MusicAIProvider`.
- [ ] Priorizar Gemini compatível com free tier enquanto disponível.
- [ ] Proteger a integração com Firebase App Check.
- [ ] Não expor chaves privadas no frontend.
- [ ] Não exigir Cloud Functions ou servidor dedicado para o MVP.

### 11. Entrada e enriquecimento
- [ ] Permitir colar cifra/texto para análise.
- [ ] Aceitar URL de cifra como tentativa de enriquecimento quando tecnicamente permitida.
- [ ] Usar fallback imediato para texto colado quando a URL não puder ser processada.
- [ ] Permitir informar URL de YouTube de referência.
- [ ] Permitir informar BPM manualmente quando não houver fonte automática confiável.
- [ ] Não implementar Tap Tempo.
- [ ] Não implementar scraping de fontes que proíbam automação.

### 12. Dados identificados pela IA
- [ ] Estruturar nome, artista, tom original, cifra e letra.
- [ ] Estruturar seções musicais: intro, verso, pré-refrão, refrão, ponte, instrumental e final.
- [ ] Identificar compasso e BPM somente quando houver evidência suficiente.
- [ ] Identificar referência de vídeo quando fornecida ou encontrada de forma permitida.
- [ ] Manter campos não identificados vazios e editáveis.
- [ ] Não inventar informações ausentes.

### 13. Contrato e modelo de dados
- [ ] Definir Structured Output/JSON Schema versionado para resposta da IA.
- [ ] Validar e normalizar a resposta antes de preencher o formulário.
- [ ] Validar tom musical e faixa plausível de BPM.
- [ ] Evoluir `songs` para separar `originalKey`, tom da execução e `preferredKey` por ministro.
- [ ] Registrar `sourceUrl`, `sourceProvider`, `sourceType` e `importedAt` quando aplicável.
- [ ] Estruturar referência de vídeo com provider, URL e `videoId`.
- [ ] Registrar origem do BPM e proveniência de campos automáticos quando disponível.
- [ ] Garantir retrocompatibilidade com músicas existentes.

### 14. Segurança, auditoria e testes da IA
- [ ] Restringir IA a usuários autenticados com permissão de músicas.
- [ ] Implementar proteção contra requisições duplicadas e tratamento de quota/rate limit.
- [ ] Registrar provider/modelo, sucesso, falha, timeout, quota e resposta inválida sem armazenar conteúdo sensível desnecessário.
- [ ] Registrar no Audit Log se a música foi criada manualmente ou via fluxo assistido.
- [ ] Criar testes de parser/schema, seções musicais, tons, BPM, YouTube, respostas parciais/malformadas e fallback manual.
- [ ] Criar E2E do fluxo assistido usando provider mockado no CI.
- [ ] Validar desktop, mobile, tema claro/escuro e acessibilidade.

## P3 — Auditoria e segurança

### 15. Audit Log
- [ ] Garantir auditoria de login/logout relevante, usuários, permissões, funções, indisponibilidades, eventos, escalas, Setlists, músicas e consentimentos LGPD.
- [ ] Registrar usuário, data/hora, ação, entidade, ID e alterações relevantes.
- [ ] Mostrar **nome do usuário** na interface de auditoria em vez de depender apenas do ID técnico.
- [ ] Manter tela somente leitura.
- [ ] Adicionar filtros por usuário, período, ação e entidade.
- [ ] Permitir detalhar valores anteriores e novos quando aplicável.

### 16. Firebase App Check
- [ ] Avaliar e habilitar App Check nos serviços Firebase acessados pelo frontend quando compatível.
- [ ] Usar modo de observação antes de enforcement quando aplicável.
- [ ] Validar autenticação, Firestore e demais funcionalidades após ativação.
- [ ] Documentar configuração de desenvolvimento/local e CI.

### 17. Regras permanentes de segurança
- [ ] Não armazenar senhas no Firestore.
- [ ] Não versionar secrets ou expor credenciais privadas no bundle web.
- [ ] Manter autorização efetiva nas Firestore Rules e não apenas no frontend.
- [ ] Manter função ministerial separada de permissão de sistema.
- [ ] Aplicar menor privilégio e LGPD nas novas funcionalidades.

## P4 — CI/CD e qualidade

### 18. Pipeline
- [ ] Garantir lint automático.
- [ ] Garantir testes automáticos.
- [ ] Garantir build automático.
- [ ] Validar Firestore Rules no pipeline.
- [ ] Bloquear merge/deploy em falhas críticas.
- [ ] Manter deploy controlado e ambientes separados quando necessário.

### 19. Estabilidade E2E
- [ ] Manter execução Playwright cobrindo os fluxos críticos do sistema.
- [ ] Corrigir testes instáveis ou jobs do GitHub Actions que falham de forma recorrente.
- [ ] Garantir que mudanças funcionais relevantes incluam ou atualizem seus testes.

## P5 — Migração e limpeza técnica

### 20. Migração de dados
- [ ] Inventariar dados legados ainda utilizados.
- [ ] Mapear e migrar usuários, funções, indisponibilidades, eventos, escalas, músicas e Setlists quando necessário.
- [ ] Preservar IDs/referências necessárias.
- [ ] Criar scripts idempotentes e reexecutáveis.
- [ ] Validar contagens antes/depois e definir rollback.

### 21. Limpeza final
- [ ] Remover código, collections, estilos e rotas antigas que não sejam mais utilizados.
- [ ] Eliminar duplicações e regras de negócio espalhadas pela UI.
- [ ] Atualizar documentação e `AGENTS.md` para refletir o estado real do projeto.

## Definition of Done

Para qualquer item deste ROADMAP ser considerado concluído:

- [ ] Implementação concluída.
- [ ] Build e lint passando.
- [ ] Testes relevantes passando.
- [ ] GitHub Actions passando.
- [ ] Firestore Rules validadas quando afetadas.
- [ ] Desktop e mobile validados quando aplicável.
- [ ] Tema claro e escuro validados quando aplicável.
- [ ] Segurança, acessibilidade e LGPD revisadas quando aplicável.
- [ ] Funcionalidade validada na aplicação publicada.
- [ ] Documentação atualizada quando necessário.
