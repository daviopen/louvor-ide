# Services

Casos de uso e regras de negócio compartilhadas. Services não devem conhecer APIs concretas do Firestore; persistência deve ser acessada exclusivamente por repositories.

Serviços legados em `src/js/modules` serão migrados gradualmente para esta pasta para evitar regressões.
