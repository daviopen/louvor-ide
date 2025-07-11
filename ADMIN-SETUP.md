# Configuração de Admin Master

Este documento explica como configurar um usuário como admin master do sistema Louvor IDE.

## Pré-requisitos

1. O usuário deve estar registrado na aplicação (ter uma conta no Firebase Auth)
2. O backend deve estar configurado com Firebase Admin SDK
3. Node.js e npm/pnpm instalados

## Passos para Configurar Admin Master

### 1. Primeiro, o usuário deve se registrar

Se você ainda não tem uma conta, registre-se primeiro na aplicação:
1. Acesse a página de registro
2. Crie uma conta com o email `davitads@gmail.com`
3. Confirme o email se necessário

### 2. Execute o script de configuração

No diretório `backend-ts`, execute:

```bash
# Navegar para o diretório do backend
cd backend-ts

# Instalar dependências se necessário
npm install

# Executar o script para configurar admin master
npm run setup-admin davitads@gmail.com
```

### 3. Verificar se a configuração funcionou

Após executar o script, você pode verificar se tudo funcionou:

1. **No console do script**: Você verá mensagens de sucesso
2. **Na aplicação**: Faça login e verifique se tem acesso a funcionalidades de admin
3. **Via API**: Faça uma requisição para `/auth/admin-status` para verificar o status

### 4. Testar endpoints de admin

Com o token de autenticação, você pode testar:

```bash
# Verificar status de admin
curl -H "Authorization: Bearer SEU_TOKEN" \
     http://localhost:3000/auth/admin-status

# Listar todos os usuários (apenas admins)
curl -H "Authorization: Bearer SEU_TOKEN" \
     http://localhost:3000/auth/users

# Listar todos os administradores (apenas master admin)
curl -H "Authorization: Bearer SEU_TOKEN" \
     http://localhost:3000/auth/admins
```

## O que o Script Faz

O script `setup-admin.ts` realiza as seguintes ações:

1. **Verifica se o usuário existe** no Firebase Auth
2. **Cria/atualiza o documento do usuário** no Firestore com `role: 'admin'`
3. **Define custom claims** no Firebase Auth:
   - `role: 'admin'`
   - `isAdmin: true`
   - `isMasterAdmin: true`

## Estrutura de Permissões

### Roles Disponíveis:
- `user`: Usuário comum
- `minister`: Ministro (pode gerenciar músicas de seus ministérios)
- `admin`: Administrador (acesso completo ao sistema)

### Custom Claims para Master Admin:
- `role: 'admin'`
- `isAdmin: true`
- `isMasterAdmin: true`

## Troubleshooting

### "Usuário não encontrado no Firebase Auth"
- O usuário deve primeiro se registrar na aplicação
- Verifique se o email está correto

### "Erro ao inicializar Firebase Admin SDK"
- Verifique se o arquivo `serviceAccountKey.json` existe
- Ou configure as variáveis de ambiente do Firebase

### "Token inválido"
- Faça logout e login novamente para obter um token atualizado
- Os custom claims podem demorar alguns minutos para se propagar

## Segurança

- Apenas o master admin pode:
  - Ver a lista de todos os administradores
  - Promover outros usuários a admin (futura implementação)
  - Acessar configurações críticas do sistema

- O email `davitads@gmail.com` será o administrador principal permanente
- Recomenda-se criar outros admins através de uma interface administrativa

## Próximos Passos

Após configurar o admin master, você pode:

1. Implementar interface para promover outros usuários
2. Criar logs de auditoria para ações administrativas
3. Implementar permissões granulares por funcionalidade
4. Criar dashboard administrativo específico
