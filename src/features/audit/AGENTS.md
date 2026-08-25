# Audit — AGENTS.md

Complementa o `/AGENTS.md` para auditoria de negócio.

## Objetivo
Registrar alterações administrativas e exceções relevantes com rastreabilidade suficiente para segurança e operação, sem replicar dados pessoais/sensíveis desnecessários.

## Entidades e DTOs
- `AuditLog`: `id`, `actorUserId`, `action`, `entityType`, `entityId`, `summary`, `reason?`, `createdAt`.
- `CreateAuditLogDTO` deve conter apenas metadados mínimos necessários; evitar snapshots integrais por padrão.

## Regras e validações
- Logs de auditoria são append-only no fluxo normal.
- Ações críticas devem registrar ator, ação, entidade, ID e timestamp.
- Exceções administrativas devem incluir motivo/contexto quando exigido pelo caso de uso.
- Não registrar senhas, tokens, credenciais, conteúdo sensível desnecessário ou payloads integrais sem justificativa.
- Falha de auditoria em operação crítica deve ter política explícita: preferir consistência transacional/batch quando necessário.

## Permissões e rotas
- Leitura exige permissão do módulo Auditoria.
- Criação normalmente ocorre via Services/backend, não por formulário genérico do usuário.
- Atualização/exclusão de logs deve ser proibida no fluxo normal.
- Rota sugerida: `/audit`.

## Services / Repositories / Components
- `AuditService` recebe eventos de negócio normalizados.
- `AuditRepository` encapsula `auditLogs` e consultas paginadas/filtradas.
- UI: tabela/lista com filtros por período, ator, ação e entidade, paginação e detalhes mínimos.

## Collections
- `auditLogs`
- `users` apenas para resolução controlada de exibição do ator quando necessário.

## Segurança e LGPD
- Rules devem restringir fortemente leitura e impedir edição/remoção pelo cliente.
- Aplicar minimização, retenção definida e acesso por menor privilégio.
- Não usar Audit Log como armazenamento paralelo de dados pessoais.

## Testes
- operações críticas geram log com campos mínimos;
- logs não aceitam segredo/token/senha em campos padronizados;
- usuário sem permissão não consulta auditoria;
- atualização/exclusão é negada no fluxo normal;
- filtros e paginação preservam ordenação temporal.