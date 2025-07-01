# Funcionalidade: Múltiplos Ministros em Setlists

## Visão Geral

Esta funcionalidade permite que uma setlist tenha múltiplos ministros, onde cada música pode ter um ministro diferente, e o tom de cada música é ajustado conforme o ministro selecionado para ela.

## Funcionalidades Implementadas

### ✅ 1. Integração com Firestore
- ✅ Carregamento de setlists e músicas reais do Firestore
- ✅ Salvamento de setlists com ministros individuais por música
- ✅ Migração automática de dados antigos do localStorage para o novo formato

### ✅ 2. Interface de Usuário
- ✅ Seletor de ministro individual para cada música na setlist
- ✅ Resumo visual dos ministros utilizados na setlist
- ✅ Elemento `<div id="ministers-summary"></div>` adicionado ao HTML
- ✅ CSS específico para o resumo dos ministros com diferentes estilos
- ✅ **NOVO**: Remoção da seção "Ministro Principal" - interface simplificada
- ✅ **NOVO**: Seletores de ministro mostram apenas ministros que cantam a música específica

### ✅ 3. Lógica de Negócio
- ✅ Função `addSong` refatorada para incluir o campo `assignedMinister` por música
- ✅ Função `updateSongsList` atualizada para exibir seletor de ministro por música
- ✅ Função `changeSongMinister` implementada para recalcular o tom ao trocar ministro
- ✅ Função `getMinistersUsedInSetlist` para gerar resumo dos ministros
- ✅ **NOVO**: Função `getMinistersForSong` para mostrar apenas ministros que cantam a música específica
- ✅ **NOVO**: Validação obrigatória - todas as músicas devem ter ministro definido
- ✅ **NOVO**: Remoção do conceito de "ministro padrão" - cada música tem seu ministro específico

### ✅ 4. Salvamento e Carregamento
- ✅ Salvamento registra ministro e tom de cada música individualmente
- ✅ Carregamento correto de ministros individuais das músicas ao editar
- ✅ Correção de bug ao salvar setlists no Firestore (remoção de campos undefined)

### ✅ 5. Debug e Logs
- ✅ Logs detalhados para debug e diagnóstico
- ✅ Validação de permissões do Firestore
- ✅ Funções utilitárias para debug no console do navegador

## Estrutura de Dados

### Música na Setlist
```javascript
{
  id: "id-da-musica",
  titulo: "Nome da Música",
  artista: "Nome do Artista",
  tom: "Tom Original",
  finalKey: "Tom Final Aplicado",
  ministerSpecific: true/false,
  assignedMinister: "Nome do Ministro", // null = usar ministro padrão
  order: 1
}
```

### Setlist Salva
```javascript
{
  nome: "Nome da Setlist",
  data: "2025-06-30",
  descricao: "Descrição",
  ministro: "Ministro Padrão", // pode ser null
  musicas: [
    {
      id: "id-da-musica",
      titulo: "Nome da Música",
      artista: "Nome do Artista",
      tomOriginal: "Tom Original",
      tomFinal: "Tom Final",
      ministro: "Ministro Individual", // pode ser null
      ministroEspecifico: true/false,
      ordem: 1
    }
  ],
  ministrosUtilizados: [
    {
      name: "Nome do Ministro",
      isDefault: true/false,
      musicas: [...]
    }
  ]
}
```

## Interface do Usuário

### Resumo dos Ministros
- **Local**: Logo acima da lista de músicas selecionadas
- **Exibição**: Mostra todos os ministros utilizados na setlist
- **Informações**: Nome do ministro, número de músicas, quais músicas
- **Estados**:
  - Oculto quando não há músicas
  - Alerta quando nenhum ministro está definido
  - Resumo visual quando há ministros definidos

### Seletor de Ministro por Música
- **Local**: Em cada música da lista de músicas selecionadas
- **Funcionalidade**: Permite trocar o ministro individual da música
- **Comportamento**: Recalcula automaticamente o tom da música

## Testes Recomendados

### ✅ Teste 1: Criação de Nova Setlist
1. ✅ Abrir página de criação de setlist
2. ✅ Adicionar músicas à setlist
3. ✅ Verificar se seletor de ministro aparece para cada música
4. ✅ Trocar ministro de algumas músicas
5. ✅ Verificar se resumo dos ministros é atualizado
6. ✅ Salvar setlist e verificar se dados foram salvos corretamente

### ✅ Teste 2: Edição de Setlist Existente
1. ✅ Carregar setlist existente para edição
2. ✅ Verificar se ministros individuais são carregados corretamente
3. ✅ Modificar ministros de algumas músicas
4. ✅ Verificar se resumo é atualizado em tempo real
5. ✅ Salvar modificações

### ✅ Teste 3: Validações
1. ✅ Tentar salvar setlist sem ministros definidos
2. ✅ Verificar mensagens de erro/alerta apropriadas
3. ✅ Testar migração de dados antigos

### ⏳ Teste 4: Visualização e Impressão
1. ⏳ Verificar se visualização mostra ministros e tons corretos
2. ⏳ Testar impressão da setlist com ministros

## Arquivos Modificados

- `/src/pages/setlist.html` - Adicionado elemento de resumo dos ministros e CSS
- `/src/js/pages/setlist-simple.js` - Implementação completa da funcionalidade
- `/src/config/firebase-config.js` - Referenciado para integração

## Próximos Passos

1. ⏳ Testar a interface completa no navegador
2. ⏳ Verificar visualização e impressão de setlists
3. ⏳ Revisar experiência do usuário para casos extremos
4. ⏳ Documentar guia do usuário para a nova funcionalidade

## ✅ **CORREÇÕES RECENTES: Bugs de Edição e Exclusão**

### 🐛 **Problemas Corrigidos:**

1. **✅ Exclusão de Setlists**
   - **Problema:** Exclusão não funcionava (apenas removia do localStorage, não do Firestore)
   - **Solução:** Função `deleteSetlist` agora exclui do Firestore primeiro, depois do localStorage
   - **Resultado:** Exclusões funcionam corretamente em ambos os sistemas

2. **✅ Duplicação na Edição**
   - **Problema:** Ao editar e salvar setlist, criava duplicatas
   - **Solução:** 
     - Função `loadSetlistForEdit` agora carrega do Firestore primeiro (fonte principal)
     - Lógica de salvamento melhorada para detectar e evitar duplicatas
     - Verificação por nome/data para evitar setlists duplicadas
   - **Resultado:** Edições agora atualizam corretamente sem duplicar

3. **✅ Sincronização Firestore/localStorage**
   - **Problema:** Inconsistências entre dados do Firestore e localStorage
   - **Solução:** 
     - Priorização do Firestore como fonte principal
     - localStorage usado apenas como backup/fallback
     - Carregamento e salvamento sincronizados
   - **Resultado:** Dados consistentes entre as duas fontes

### 🔧 **Funções Modificadas:**

- `deleteSetlist()` - Agora async, exclui do Firestore primeiro
- `loadSetlistForEdit()` - Agora async, carrega do Firestore primeiro  
- `saveSetlist()` - Lógica aprimorada para evitar duplicatas
- `checkEditMode()` - Agora async para suportar carregamento do Firestore

---

### 🎯 **Mudanças Implementadas (Hoje):**

1. **✅ Remoção da Seção "Ministro Principal"**
   - Interface simplificada - apenas seleção de músicas
   - Cada música deve ter seu ministro específico
   - Não há mais conceito de "ministro padrão"

2. **✅ Seletores Inteligentes de Ministros**
   - Cada música mostra apenas os ministros que cantam aquela música específica
   - Função `getMinistersForSong()` implementada
   - Exibe tom específico do ministro para a música (quando disponível)

3. **✅ Validação Obrigatória**
   - Todas as músicas devem ter ministro definido
   - Impossível salvar setlist com músicas sem ministro
   - Mensagem clara mostrando quais músicas precisam de ministro

4. **✅ Código Refatorado**
   - Remoção de `selectedMinister` e `selectedMinisterForEdit`
   - Simplificação das funções de validação e salvamento
   - Interface mais limpa e intuitiva
   - **✅ Correção da visualização de setlists para mostrar múltiplos ministros**

### 🚀 **Como Usar a Nova Interface:**

1. **Criar Nova Setlist:**
   - Preencha nome, data e descrição
   - Adicione músicas uma por uma
   - Para cada música, selecione um ministro da lista (apenas ministros que cantam a música)
   - Veja o resumo dos ministros sendo atualizado automaticamente
   - Salve quando todas as músicas tiverem ministros definidos

2. **Seletores Inteligentes:**
   - Cada música mostra apenas ministros que têm configuração para ela
   - Se a música tem tom específico para um ministro, isso é mostrado
   - Se não há tom específico, mostra o tom preferido do ministro
