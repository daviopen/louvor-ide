# Testes - Louvor IDE

Este diretório contém todos os testes do projeto Louvor IDE, organizados por tipo e funcionalidade.

## Estrutura de Testes

### Frontend (/frontend)
- **Unit Tests**: Testes unitários de componentes React
- **Integration Tests**: Testes de integração entre componentes
- **E2E Tests**: Testes end-to-end usando Playwright
- **Service Tests**: Testes dos serviços (API, Firebase, transposição)

### Backend (/backend)
- **Unit Tests**: Testes unitários das rotas e serviços
- **Integration Tests**: Testes de integração com banco de dados
- **API Tests**: Testes das APIs REST
- **Service Tests**: Testes dos serviços de transposição

## Ferramentas de Teste

### Frontend
- **Vitest**: Framework de testes principal
- **React Testing Library**: Testes de componentes React
- **Playwright**: Testes E2E
- **MSW**: Mock Service Worker para APIs

### Backend
- **Pytest**: Framework de testes principal
- **FastAPI TestClient**: Cliente de testes para APIs
- **Pytest-asyncio**: Suporte para testes assíncronos

## Como Executar

```bash
# Todos os testes
make test

# Frontend apenas
make test-frontend

# Backend apenas
make test-backend

# E2E apenas
make test-e2e

# Com cobertura
make test-coverage
```

## Cobertura de Testes

Os testes cobrem:
- ✅ Listagem e filtros de músicas
- ✅ Transposição de acordes
- ✅ Adição/edição/exclusão de músicas
- ✅ Integração Firebase/Firestore
- ✅ APIs REST do backend
- ✅ Responsividade da interface
- ✅ Funcionalidade offline
- ✅ Navegação e roteamento
- ✅ Validação de dados
- ✅ Tratamento de erros
