# Audit — AGENTS.md

Complementa o `/AGENTS.md` para auditoria de negócio.

## Objetivo
Registrar alterações administrativas e exceções relevantes com rastreabilidade suficiente para segurança e operação, sem replicar dados pessoais/sensíveis desnecessários.

## Entidades e DTOs
- `AuditLog`: `id`, `actorUserId`, `action`, `entityType`, `entityId`, `details?`, `summary?`, `reason?`, `createdAt`.
- `CreateAuditLogDTO` deve conter apenas metadados mínimos necessários; evitar snapshots integrais por padrão.
- Quando uma alteração possuir estado anterior e novo relevante, usar `details.before` e `details.after` com snapshots mínimos do domínio.
- Eventos de autenticação usam `entityType: auth`, o `uid` como `entityId` e somente identificadores públicos do provedor; nunca e-mail, senha, token ou credencial.

## Regras e validações
- Logs de auditoria são append-only no fluxo normal.
- Ações críticas devem registrar ator, ação, entidade, ID e timestamp.
- Exceções administrativas devem incluir motivo/contexto quando exigido pelo caso de uso.
- Não registrar senhas, tokens, credenciais, conteúdo sensível desnecessário ou payloads integrais sem justificativa.
- Falha de auditoria em operação crítica deve ter política explícita: preferir consistência transacional/batch quando necessário.
- Login é registrado uma vez por sessão autenticada; logout deve ser auditado antes de encerrar a sessão Firebase.
- Alterações persistentes dos domínios Usuários, Permissões, Funções, Indisponibilidades, Eventos, Escalas, Setlists e Músicas devem possuir evento de auditoria correspondente.

## Permissões e rotas
- Leitura exige permissão do módulo Auditoria.
- Criação normalmente ocorre via Services/backend, não por formulário genérico do usuário.
- Atualização/exclusão de logs deve ser proibida no fluxo normal.
- Rota sugerida: `/audit`.

## Services / Repositories / Components
- Serviços de domínio normalizam o evento e repositories encapsulam a escrita em `auditLogs`.
- Operações que já usam transaction/batch devem registrar o Audit Log no mesmo commit sempre que a atomicidade for necessária.
- UI: tabela/lista com filtros por período, ator, ação e entidade, paginação e detalhes mínimos.

## Collections
- `auditLogs`
- `users` apenas para resolução controlada de exibição do ator quando necessário.

## Segurança e LGPD
- Rules devem restringir fortemente leitura e impedir edição/remoção pelo cliente.
- A criação pelo cliente exige usuário ativo e `actorUserId` igual ao `request.auth.uid`.
- Aplicar minimização, retenção definida e acesso por menor privilégio.
- Não usar Audit Log como armazenamento paralelo de dados pessoais.

## Testes
- operações críticas geram log com campos mínimos;
- login/logout geram eventos sem credenciais;
- alterações relevantes preservam `before`/`after` mínimos quando aplicável;
- logs não aceitam segredo/token/senha nos contratos padronizados;
- usuário sem permissão não consulta auditoria;
- atualização/exclusão é negada no fluxo normal;
- cobertura automatizada deve verificar os eventos dos domínios auditáveis.
