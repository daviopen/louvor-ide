# Mural de notificações

O Mural substitui o sino e mantém o histórico pessoal, inclusive lido. A rota usa a permissão dashboard, disponível nos cinco perfis canônicos, como Meu Perfil. As regras Firestore existentes continuam limitando leitura e marcação ao destinatário ativo autenticado.

`notification-center.js -> NotificationService -> NotificationRepository` atende Mural e resumo do Dashboard. Meu Perfil também contém ativação de push. A assinatura e o Service Worker existentes permanecem independentes do histórico.

Consultas: `userId == uid`, `createdAt DESC`, limite 5 no Dashboard e 30 por página no Mural, com cursor. Sem listener nem varredura integral. O deploy cria somente o índice necessário por API e espera READY antes de publicar Hosting; nenhum índice existente é removido.

No Dashboard, o resumo começa recolhido em um controle nativo `details`/`summary`, operável por teclado. “Ver todas” permanece acessível mesmo recolhido. Ao expandir, aparecem as cinco últimas notificações com prévia do corpo em uma linha; o Mural mantém o texto completo. Expandir/recolher não dispara consultas adicionais nem marca mensagens como lidas.

Validação local: testes de escopo, ordenação anterior ao limite, cursor, retenção de lidos, falha na gravação, leitura monotônica e destinos seguros. Validação visual/autenticada e entrega real de push precisam de navegador e conta QA; não são provadas pelos testes unitários.
