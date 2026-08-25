# LGPD — IDE Music

## Escopo

Este documento define a política operacional de privacidade do IDE Music. A implementação deve seguir minimização, necessidade, finalidade, segurança, menor privilégio e rastreabilidade.

## Documentos vigentes

- Termos de Uso: `2026-08-25`.
- Política de Privacidade: `2026-08-25`.
- Consentimento vigente: `terms:2026-08-25|privacy:2026-08-25`.

Qualquer alteração relevante em Termos ou Privacidade deve incrementar a respectiva versão no `src/js/modules/lgpd-service.js`. A divergência entre `users.lgpdConsentVersion` e a versão vigente bloqueia o uso até novo aceite explícito.

## Registro de consentimento

O checkbox nunca pode vir pré-marcado. O aceite grava em `lgpdConsents` um registro imutável contendo somente:

- `userId`;
- `consentVersion`;
- `termsVersion`;
- `privacyVersion`;
- `acceptedAt`;
- `status=ACCEPTED`;
- `source=web`.

Não registrar IP, geolocalização, fingerprint, modelo do dispositivo, user-agent ou histórico de navegação para essa finalidade.

O perfil `users/{uid}` guarda somente ponteiros da versão vigente (`lgpdConsentVersion`, `lgpdTermsVersion`, `lgpdPrivacyVersion`, `lgpdConsentAcceptedAt`) para permitir a checagem sem consultar histórico sensível.

## Retenção, inativação e exclusão

| Categoria | Regra |
| --- | --- |
| Perfil de usuário | Inativar para remover acesso. Evitar exclusão física enquanto houver vínculos históricos. |
| Consentimentos LGPD | Preservar como histórico imutável de conformidade. Não atualizar nem excluir pelo cliente. |
| Audit Logs | Preservar como trilha imutável de segurança e prestação de contas. |
| Escalas, eventos e setlists concluídos | Preservar quando necessários ao histórico ministerial e à integridade de referências. |
| Dados operacionais temporários | Excluir ou anonimizar quando deixarem de ser necessários e não houver obrigação histórica. |
| Dados de autenticação | Administrados pelo Firebase Authentication; senhas nunca são persistidas no Firestore. |

Pedidos de exclusão devem ser analisados considerando integridade referencial, segurança, auditoria e obrigações legais. Quando a exclusão física comprometer histórico necessário, preferir inativação ou anonimização dos campos não essenciais.

## Dados que permanecem em histórico/auditoria

Devem permanecer, pelo prazo necessário à finalidade de segurança e rastreabilidade: identificador do ator, ação realizada, entidade afetada, data/hora, versão de consentimentos, vínculos históricos de escalas/eventos/setlists e demais chaves indispensáveis para reconstruir alterações administrativas relevantes.

## Regras de desenvolvimento

1. Nova coleta de dado pessoal deve ter finalidade documentada.
2. Não adicionar campos por conveniência futura.
3. Não confiar apenas no frontend para privacidade ou autorização.
4. Collections com dados pessoais devem possuir Firestore Rules compatíveis com menor privilégio.
5. Alterações relevantes de privacidade exigem nova versão e novo aceite.
6. Testes devem cobrir checkbox não pré-marcado, versionamento, payload mínimo e gate de consentimento.
