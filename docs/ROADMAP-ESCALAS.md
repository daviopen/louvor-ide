# Evolução do IDE Music: eventos, indisponibilidades e escalas

## Objetivo

Transformar o IDE Music em um fluxo único para:

1. manter o cadastro da equipe e das funções que cada pessoa exerce;
2. permitir que cada integrante informe suas indisponibilidades;
3. cadastrar os eventos da igreja;
4. gerar uma sugestão de escala respeitando as regras do ministério;
5. permitir ajustes manuais antes da publicação.

## Fluxo proposto

### Integrante

1. Entra com sua conta.
2. Vê os próximos eventos.
3. Marca datas ou períodos em que não estará disponível.
4. Consulta as escalas publicadas e confirma participação.

### Liderança

1. Cadastra pessoas, funções e limites.
2. Cadastra os eventos e as posições necessárias.
3. Define o prazo para envio das indisponibilidades.
4. Gera uma sugestão de escala.
5. Analisa conflitos, ajusta pessoas e publica.

## Regras iniciais da Comunidade IDE

### Restrições obrigatórias

- Uma pessoa por instrumento em cada evento.
- Até quatro backs por evento.
- Até dois ministros por evento.
- Ninguém pode ser escalado em uma função que não esteja em seu cadastro.
- Uma pessoa indisponível nunca pode ser sugerida.
- DM pode ser qualquer músico cadastrado e também deve respeitar a disponibilidade.
- DM não entra na contagem de escalas do resumo.
- Com exceção do DM, uma pessoa não deve ocupar duas posições incompatíveis no mesmo evento.

### Critérios de equilíbrio

- Priorizar quem tem menos escalas no período.
- Evitar a mesma pessoa em eventos consecutivos quando houver alternativa.
- Respeitar um limite mensal individual, quando configurado.
- Distribuir ministros, backs e instrumentos de forma equilibrada.
- Exibir aviso, em vez de preencher silenciosamente, quando não existir combinação válida.

## Modelo de dados no Firestore

### `people`

```json
{
  "name": "Davi",
  "active": true,
  "roles": ["guitar", "acoustic_guitar", "minister", "dm"],
  "maxEventsPerMonth": 4,
  "userId": "firebase-auth-uid"
}
```

### `unavailability`

```json
{
  "personId": "people-id",
  "startAt": "2026-09-18T00:00:00-03:00",
  "endAt": "2026-09-20T23:59:59-03:00",
  "reason": "Viagem",
  "createdBy": "firebase-auth-uid"
}
```

### `events`

```json
{
  "name": "INSIDE",
  "startsAt": "2026-09-25T20:00:00-03:00",
  "status": "open",
  "requirements": {
    "drums": 1,
    "bass": 1,
    "keyboard": 1,
    "electricGuitar": 1,
    "acousticGuitar": 1,
    "minister": 2,
    "back": 4,
    "dm": 1
  },
  "unavailabilityDeadline": "2026-09-20T23:59:59-03:00"
}
```

### `schedules`

```json
{
  "eventId": "event-id",
  "status": "draft",
  "assignments": [
    { "role": "drums", "personId": "person-id", "confirmation": "pending" }
  ],
  "warnings": [],
  "generatedAt": "server-timestamp",
  "publishedAt": null
}
```

## Segurança necessária

O projeto atual permite acesso direto ao Firestore pelo navegador. Antes de abrir o preenchimento das indisponibilidades para toda a equipe, é necessário adicionar Firebase Authentication e regras que garantam:

- integrante edita apenas as próprias indisponibilidades;
- liderança gerencia pessoas, eventos e escalas;
- setlists e escalas publicadas podem ser consultadas por quem tiver permissão;
- operações de teste não criam nem apagam documentos no banco de produção.

A opção recomendada para a primeira versão é login com Google, por ser simples para a equipe e integrado ao Firebase.

## Entregas sugeridas

### Etapa 1 — estabilidade

- Corrigir a transposição da setlist.
- Remover dependência quebrada de CDN.
- Adicionar testes automatizados de acordes e tons salvos.

### Etapa 2 — acesso e equipe

- Firebase Authentication.
- Perfis `admin` e `member`.
- Cadastro de pessoas, funções e limites.

### Etapa 3 — disponibilidade e eventos

- Tela individual de indisponibilidades.
- Cadastro de eventos e posições necessárias.
- Painel de pendências por evento.

### Etapa 4 — geração da escala

- Motor determinístico de validação das regras obrigatórias.
- Pontuação para equilíbrio da equipe.
- Sugestão automática, avisos e edição manual.
- Resumo mensal, sem contabilizar DM.

### Etapa 5 — publicação

- Confirmação de participação.
- Histórico de alterações.
- Versão de impressão e compartilhamento para WhatsApp.

## Critérios de aceite da primeira versão de escalas

- Uma indisponibilidade salva impede a pessoa de aparecer como opção válida no evento.
- A geração nunca coloca duas pessoas no mesmo instrumento.
- A geração respeita os limites de backs e ministros.
- DM pode ser escolhido entre os músicos disponíveis e não altera a contagem mensal.
- A liderança pode trocar qualquer sugestão manualmente.
- Todo conflito fica visível antes da publicação.
- Uma escala publicada preserva um retrato dos nomes e funções usados naquele momento.
