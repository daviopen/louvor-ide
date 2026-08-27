# IDE Music 🎵

Sistema web para gestão do ministério de música da **Comunidade IDE**.

O IDE Music centraliza usuários, funções ministeriais, indisponibilidades, eventos, escalas, setlists e biblioteca de músicas/cifras em uma aplicação responsiva, com autenticação, permissões, auditoria e integração com Firebase.

> Produção: https://louvor-ide.web.app

## Visão geral

O projeto nasceu como uma ferramenta de gerenciamento de cifras e evoluiu para uma plataforma de apoio à operação completa do ministério de música.

Hoje a aplicação contempla, entre outros recursos:

- autenticação com Google e e-mail/senha;
- gestão de usuários e permissões por módulo;
- funções ministeriais configuráveis;
- registro de indisponibilidades;
- cadastro e acompanhamento de eventos;
- criação e edição de escalas vinculadas aos eventos;
- geração de setlists por escala;
- biblioteca de músicas, cifras, letras, tons e BPM;
- dress code dos eventos/setlists;
- auditoria de alterações administrativas;
- consentimento e controles relacionados à LGPD;
- temas claro, escuro e preferência do sistema;
- experiência responsiva para desktop e mobile.

## Módulos

### Dashboard

Visão resumida da operação, priorizando informações relacionadas ao usuário autenticado, como próximas escalas, setlists e indisponibilidades.

### Usuários

Permite administrar as pessoas que utilizam ou participam do ministério.

Principais recursos:

- cadastro e edição de usuários;
- ativação e inativação;
- múltiplas funções ministeriais por pessoa;
- autenticação via Firebase Authentication;
- fluxo seguro para definição e recuperação de senha;
- permissões independentes das funções ministeriais.

### Permissões

O acesso aos módulos é controlado por níveis de permissão:

- **Sem acesso**;
- **Leitura**;
- **Edição**.

Funções ministeriais, como Ministro, Back Vocal ou Bateria, não concedem automaticamente permissões administrativas.

### Funções Ministeriais

As funções utilizadas nas escalas são parametrizáveis e podem ser ativadas, inativadas e ordenadas.

Exemplos:

- Ministro;
- Back Vocal;
- Bateria;
- Baixo;
- Guitarra;
- Violão;
- Teclado;
- Sax;
- DM;
- novas funções cadastradas posteriormente.

### Indisponibilidades

Os usuários podem informar períodos em que não poderão participar das escalas.

A aplicação considera essas informações durante a montagem das escalas e suporta tratamento administrativo de exceções com rastreabilidade.

### Eventos

Eventos representam cultos, reuniões e demais compromissos que podem demandar equipe de música.

O cadastro suporta informações como:

- nome;
- data;
- horário;
- descrição;
- local;
- tema;
- status.

Ao criar um evento, a aplicação mantém a estrutura relacionada de escala e setlist.

### Escalas

Cada evento possui sua escala correspondente.

A montagem considera:

- funções necessárias;
- usuários ativos;
- funções ministeriais de cada usuário;
- indisponibilidades;
- conflitos e duplicidades;
- completude da equipe.

A interface foi preparada para operação tanto em desktop quanto em dispositivos móveis.

### Setlists

Os setlists são vinculados ao evento e à escala.

Recursos disponíveis incluem:

- inclusão e remoção de músicas;
- ordenação das músicas;
- ministro responsável por música;
- tom específico da execução;
- sugestão de tom preferido do ministro;
- observações, transições e momentos especiais;
- integrantes da escala;
- dress code;
- histórico de setlists.

### Músicas

A biblioteca concentra o repertório do ministério.

Os registros podem conter:

- título;
- artista;
- ministros;
- tom original;
- tom preferido por ministro;
- BPM;
- links de referência;
- cifra;
- letra e demais informações de apoio.

A aplicação possui visualização de cifra/letra, transposição e modo palco.

### Auditoria

Operações administrativas relevantes são registradas para aumentar rastreabilidade e segurança.

### Configurações

Área administrativa destinada às parametrizações globais do IDE Music, incluindo configurações relacionadas às funções ministeriais e ao template utilizado para composição das escalas.

## Arquitetura

O projeto utiliza arquitetura modular por domínio/feature.

Fluxo preferencial:

```text
Page / Component
      ↓
Service / Use Case
      ↓
Repository
      ↓
Firebase / Data Source
```

Responsabilidades principais:

- **Pages / Components**: interface, interação e estado visual;
- **Features**: composição das funcionalidades de negócio;
- **Services**: regras de negócio e casos de uso;
- **Repositories**: persistência e consultas;
- **DTOs**: contratos de entrada e saída;
- **Models**: entidades de domínio;
- **Routes**: navegação e proteção de rotas;
- **Core**: infraestrutura transversal, autenticação e erros;
- **Styles**: design system, tokens e temas.

Consulte [`AGENTS.md`](AGENTS.md) para as regras completas de arquitetura, segurança, UX e desenvolvimento.

## Estrutura do projeto

```text
louvor-ide/
├── .github/              # GitHub Actions e automações
├── docs/                 # Documentação técnica e funcional
├── src/
│   ├── components/       # Componentes reutilizáveis
│   ├── config/           # Configurações e integrações
│   ├── constants/        # Constantes e enumerações
│   ├── core/             # Infraestrutura compartilhada
│   ├── css/              # CSS legado em migração
│   ├── dtos/             # Contratos de transporte
│   ├── features/         # Domínios e funcionalidades
│   ├── js/               # JavaScript legado em migração
│   ├── models/           # Modelos de domínio
│   ├── pages/            # Páginas da aplicação
│   ├── repositories/     # Acesso a dados
│   ├── routes/           # Rotas e guards
│   ├── scripts/          # Scripts da aplicação
│   ├── services/         # Regras de negócio
│   ├── styles/           # Design system e temas
│   ├── tests/            # Testes próximos da arquitetura nova
│   └── utils/            # Utilitários puros
├── tests/                # Suíte automatizada
├── AGENTS.md             # Regras de engenharia do projeto
├── ROADMAP.md            # Roadmap oficial
├── firebase.json         # Hosting e Firestore Rules
├── firestore.rules       # Regras de segurança do Firestore
├── Makefile              # Comandos padronizados
└── package.json
```

## Stack

- HTML5;
- CSS3;
- JavaScript vanilla;
- Firebase Authentication;
- Cloud Firestore;
- Firebase Hosting;
- Firebase CLI;
- Node.js 18+;
- `node --test`;
- GitHub Actions;
- Makefile.

O projeto não utiliza framework ou bundler como requisito da arquitetura atual.

## Firebase

### Authentication

Firebase Authentication é a fonte de identidade do sistema.

Provedores suportados:

- Google;
- e-mail e senha.

Senhas não devem ser armazenadas no Firestore ou no `localStorage`.

### Firestore

O modelo de dados contempla domínios como:

```text
users
ministryFunctions
userFunctions
permissions
events
unavailability
schedules
scheduleMembers
setlists
setlistSongs
songs
songMinisterKeys
auditLogs
lgpdConsents
```

A autorização não deve depender somente da interface. Operações protegidas também devem respeitar as regras de segurança do Firestore e, quando necessário, mecanismos confiáveis de backend.

### Hosting

A aplicação é publicada no Firebase Hosting.

- Produção: https://louvor-ide.web.app
- Alternativa: https://louvor-ide.firebaseapp.com

## Desenvolvimento local

### Requisitos

- Node.js 18 ou superior;
- npm 8 ou superior;
- Firebase CLI para operações de hosting/deploy;
- acesso ao projeto Firebase correspondente.

### Setup

```bash
make setup
```

ou:

```bash
npm run setup
```

### Servidor local

```bash
make dev
```

ou:

```bash
npm run dev
```

Por padrão, o Firebase Hosting local utiliza:

```text
http://localhost:5000
```

## Testes

### Testes automatizados

```bash
npm test
```

A suíte principal utiliza o test runner nativo do Node.js.

### Teste E2E completo

```bash
npm run test:e2e:full
```

Esse fluxo é utilizado para validar a operação integrada das funcionalidades do sistema.

## Build

```bash
make build
```

ou:

```bash
npm run build
```

## Deploy

### Via Makefile

```bash
make deploy
```

### Via npm

```bash
npm run deploy
```

### Via Firebase CLI

```bash
firebase deploy --only hosting
```

Para alterações em regras do Firestore, valide também o escopo correspondente antes da publicação.

## CI/CD

O projeto utiliza GitHub Actions para automatizar verificações do repositório e o fluxo de publicação.

O princípio de entrega adotado pelo projeto é:

```text
Build ✅ → Testes ✅ → Actions ✅ → Validação da aplicação ✅ → Concluído
```

Não considerar uma funcionalidade finalizada apenas porque o código foi alterado localmente.

## Segurança

Princípios obrigatórios:

- não versionar secrets;
- não armazenar senhas;
- utilizar Firebase Authentication como identidade canônica;
- aplicar menor privilégio;
- separar função ministerial de permissão do sistema;
- proteger operações críticas também fora do frontend;
- registrar alterações administrativas relevantes;
- tratar dados pessoais conforme os princípios da LGPD.

## Design System e UX

O IDE Music possui uma identidade visual compartilhada e componentes reutilizáveis para manter consistência entre os módulos.

A aplicação deve preservar:

- suporte a tema claro, escuro e preferência do sistema;
- contraste adequado;
- responsividade desktop/mobile;
- navegação por teclado nos componentes interativos;
- estados padronizados de loading, erro e vazio;
- botões, formulários, filtros, modais e tabelas consistentes entre as telas.

## Roadmap

O planejamento oficial e o status detalhado das funcionalidades ficam em:

[`ROADMAP.md`](ROADMAP.md)

Um item só deve ser marcado como concluído depois de implementado, testado e validado.

## Documentação adicional

- [`AGENTS.md`](AGENTS.md) — arquitetura, padrões e regras de engenharia;
- [`ROADMAP.md`](ROADMAP.md) — evolução funcional do produto;
- [`docs/GOOGLE-AUTH-SETUP.md`](docs/GOOGLE-AUTH-SETUP.md) — configuração do login Google, quando aplicável.

## Licença

O projeto está licenciado sob a licença MIT, conforme definido no `package.json`.

---

**IDE Music — tecnologia a serviço da organização do ministério de música.**
