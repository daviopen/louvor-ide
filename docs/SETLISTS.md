# Funcionalidade de Setlists

## Visão Geral

A funcionalidade de setlists permite criar, gerenciar e organizar listas de músicas para cultos, considerando o ministro principal e seus tons preferidos.

## Funcionalidades Principais

### 1. Criar Nova Setlist
- **Arquivo**: `src/pages/setlist.html`
- **JavaScript**: `src/js/pages/setlist.js`
- **Acesso**: Botão "Nova Setlist" na página principal

**Campos disponíveis:**
- Nome da setlist
- Data do culto
- Descrição (opcional)
- Ministro principal
- Lista de músicas

### 2. Seleção Automática de Tons
- O sistema detecta automaticamente o tom preferido de cada ministro
- As músicas são automaticamente transpostas para o tom do ministro selecionado
- Indica visualmente quando uma música foi transposta

### 3. Gerenciamento de Músicas
- Busca inteligente por nome da música, artista ou ministro
- Adição fácil através de sugestões
- Reordenação das músicas (subir/descer)
- Remoção de músicas da setlist

### 4. Visualizar Setlists
- **Arquivo**: `src/pages/setlists.html`
- **JavaScript**: `src/js/pages/setlists.js`
- **Acesso**: Botão "Ver Setlists" na página principal

**Funcionalidades:**
- Lista todas as setlists criadas
- Visualização detalhada de cada setlist
- Edição de setlists existentes
- Exclusão de setlists
- Impressão de setlists

## Como Usar

### Criar uma Nova Setlist

1. **Acesse a página de criação**
   - Clique em "Nova Setlist" na página principal
   - Ou navegue para `setlist.html`

2. **Preencha as informações básicas**
   - Nome da setlist (obrigatório)
   - Data do culto (obrigatório)
   - Descrição (opcional)

3. **Selecione o ministro principal**
   - Escolha o ministro no dropdown
   - O sistema mostrará o tom preferido dele
   - As músicas serão automaticamente ajustadas para este tom

4. **Adicione as músicas**
   - Digite o nome da música no campo de busca
   - Selecione da lista de sugestões
   - A música será adicionada com o tom correto
   - Use os botões de ordenação para reorganizar

5. **Salve a setlist**
   - Clique em "Salvar Setlist"
   - A setlist será salva no banco de dados

### Visualizar e Gerenciar Setlists

1. **Acesse a lista de setlists**
   - Clique em "Ver Setlists" na página principal
   - Ou navegue para `setlists.html`

2. **Visualizar uma setlist**
   - Clique no card da setlist
   - Uma modal será aberta com todos os detalhes

3. **Editar uma setlist**
   - Clique no botão "Editar" (ícone de lápis)
   - Será redirecionado para a página de edição

4. **Excluir uma setlist**
   - Clique no botão "Excluir" (ícone de lixeira)
   - Confirme a exclusão

5. **Imprimir uma setlist**
   - Na visualização detalhada, clique em "Imprimir"
   - Uma nova janela será aberta com formato de impressão

## Estrutura de Dados

### Setlist
```javascript
{
  id: "string", // ID único
  nome: "string", // Nome da setlist
  data: "YYYY-MM-DD", // Data do culto
  descricao: "string", // Descrição opcional
  ministro: "string", // Nome do ministro
  ministroTom: "string", // Tom preferido do ministro
  musicas: [
    {
      id: "string", // ID da música
      titulo: "string", // Título da música
      artista: "string", // Artista
      tomOriginal: "string", // Tom original da música
      tomFinal: "string", // Tom final (após transposição)
      transposta: boolean, // Se foi transposta
      ordem: number // Ordem na setlist
    }
  ],
  totalMusicas: number, // Total de músicas
  criadoEm: Date, // Data de criação
  timestamp: number // Timestamp para ordenação
}
```

### Ministro (extraído das músicas)
```javascript
{
  name: "string", // Nome do ministro
  preferredKey: "string", // Tom preferido
  songCount: number // Quantidade de músicas do ministro
}
```

## Transposição Automática

O sistema utiliza o `TransposeService` para:

1. **Detectar tom preferido do ministro**
   - Analisa todas as músicas do ministro
   - Encontra o tom mais frequente
   - Define como tom preferido

2. **Transpor músicas automaticamente**
   - Quando um ministro é selecionado
   - Todas as músicas são ajustadas para seu tom
   - Músicas com tom específico do ministro são priorizadas

3. **Indicação visual**
   - Músicas transpostas são marcadas com "● Transposta"
   - Tom final é exibido claramente

## Armazenamento

O sistema utiliza armazenamento híbrido:

1. **Firebase Firestore** (principal)
   - Setlists são salvas em `setlists` collection
   - Sincronização automática

2. **localStorage** (fallback)
   - Usado quando Firebase não está disponível
   - Dados persistem localmente

## Navegação

### Página Principal (`index.html`)
- Botão "Nova Setlist" → `setlist.html`
- Botão "Ver Setlists" → `setlists.html`

### Página de Setlists (`setlists.html`)
- Botão "Nova Setlist" → `setlist.html`
- Botão "Editar" → `setlist.html?edit=ID`
- Outros botões de navegação para demais páginas

### Página de Criação/Edição (`setlist.html`)
- Detecta automaticamente modo de edição via parâmetro `edit`
- Navegação de volta para outras páginas via header

## Responsividade

Todas as páginas são totalmente responsivas:
- Layout adaptável para mobile
- Botões otimizados para toque
- Textos e espaçamentos ajustados
- Modais responsivos

## Melhorias Futuras

1. **Compartilhamento de setlists**
2. **Templates de setlists**
3. **Estatísticas de uso**
4. **Exportação para PDF**
5. **Integração com sistema de projeção**
6. **Histórico de mudanças**
