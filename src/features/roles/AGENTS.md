# Roles — AGENTS.md

Complementa o `/AGENTS.md` para funções ministeriais.

## Objetivo
Gerenciar funções ministeriais de forma independente das permissões do sistema, permitindo relação N:N entre pessoas e funções.

## Entidades e DTOs
- `MinistryFunction`: `id`, `name`, `slug`, `active`, `order`, `createdAt`, `updatedAt`.
- `UserFunction`: `userId`, `functionId`, timestamps.
- DTOs de criação/edição devem restringir campos editáveis.

## Regras e validações
- Nome obrigatório e único conforme normalização definida pelo Service.
- Funções podem ser ativadas/inativadas e ordenadas.
- Uma pessoa pode possuir múltiplas funções.
- Não excluir fisicamente função referenciada por histórico; preferir inativação.
- Ministro, Back Vocal, Bateria, Baixo, Guitarra, Violão, Teclado, Sax e DM são dados de domínio, não perfis de acesso.

## Permissões e rotas
- Consulta depende de leitura administrativa/operacional conforme tela.
- Criar, editar, ordenar e inativar exige permissão de edição apropriada.
- Rota sugerida: `/roles` ou área equivalente de administração.

## Services / Repositories / Components
- Service valida unicidade, ordenação, inativação e vínculos.
- Repositories: `ministryFunctions` e `userFunctions`.
- UI: lista ordenável, formulário, status e seleção múltipla de funções por usuário.

## Collections
- `ministryFunctions`
- `userFunctions`
- `auditLogs`

## Segurança e LGPD
- Alterar função ministerial não pode conceder permissão do sistema.
- Rules devem impedir edição sem privilégio adequado.
- Audit Log deve registrar alterações administrativas relevantes.

## Testes
- relação N:N;
- unicidade/normalização;
- ativação/inativação sem perda de histórico;
- reordenação consistente;
- função ministerial não altera permissões.