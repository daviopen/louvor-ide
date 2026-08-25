# Components

Componentes visuais reutilizáveis e sem acesso direto ao Firebase. Devem receber dados/callbacks por parâmetros e delegar regras de negócio aos services.

## Button / IconButton

Arquivos:

- `src/components/button.js`: factories `createButton` e `createIconButton`.
- `src/styles/button.css`: variantes, tamanhos e estados visuais.

Carregue o CSS e o JavaScript na página e utilize a API global `IDEMusic.Button`.

```html
<link rel="stylesheet" href="../styles/button.css">
<script src="../components/button.js"></script>
```

```js
const { createButton, createIconButton } = IDEMusic.Button;

const saveButton = createButton({
  label: 'Salvar',
  iconClass: 'fas fa-check',
  loading: false,
  onClick: handleSave
});

const deleteButton = createIconButton({
  ariaLabel: 'Excluir música',
  iconClass: 'fas fa-trash',
  variant: 'danger',
  onClick: handleDelete
});
```

Variantes disponíveis: `primary`, `secondary`, `ghost` e `danger`.

Tamanhos disponíveis: `sm`, `md` e `lg`.

Regras:

- `Button` exige `label` não vazio.
- `IconButton` exige `ariaLabel` não vazio.
- `loading` desabilita o botão e aplica `aria-busy="true"`.
- `type` usa `button` por padrão para evitar submits acidentais.
- ícones decorativos recebem `aria-hidden="true"`.
- não usar `innerHTML` para labels ou conteúdo fornecido pelo usuário.
