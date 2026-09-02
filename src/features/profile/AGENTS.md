# Meu Perfil — regras locais

O módulo de perfil é self-service e está disponível para qualquer usuário provisionado e ativo.

- O usuário só pode editar `name`, `phone`, `birthDate` e `photoURL` do próprio documento `users/{uid}`.
- `uid`, `email`, `active`, `role`, `accessProfile`, `permissions`, funções ministeriais e timestamps de criação não podem ser alterados pelo fluxo self-service.
- A foto é enviada diretamente ao Cloudinary por unsigned upload preset; nenhum API secret pode existir no cliente ou no repositório.
- O arquivo é validado, recortado e reduzido no navegador antes do upload para evitar tráfego e armazenamento desnecessários.
- A URL persistida pelo próprio usuário deve apontar para o Cloudinary configurado do IDE Music ou para a foto Google do provedor autenticado.
- Conta com provider `password` pode trocar a própria senha somente após reautenticação com a senha atual.
- Conta exclusivamente Google não oferece alteração de senha local.
- Dados pessoais seguem minimização: não adicionar novos campos sem finalidade clara para o ministério.
- Toda mudança de campos self-service exige atualização coordenada de Service, Repository, Firestore Rules e testes.
