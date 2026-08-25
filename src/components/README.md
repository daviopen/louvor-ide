# Components — IDE Music Design System

Componentes reutilizáveis, sem acesso direto ao Firebase e sem regras de negócio. Recebem dados/callbacks por parâmetros e podem ser usados em JavaScript vanilla ou pela API global `IDEMusic`.

## Carregamento

```html
<link rel="stylesheet" href="../styles/button.css">
<link rel="stylesheet" href="../styles/input.css">
<link rel="stylesheet" href="../styles/design-system.css">

<script src="../components/button.js"></script>
<script src="../components/input.js"></script>
<script src="../components/form-controls.js"></script>
<script src="../components/overlays-feedback.js"></script>
<script src="../components/data-display.js"></script>
<script src="../components/navigation-layout.js"></script>
```

Nas páginas autenticadas legadas, `app-shell.js` injeta `design-system.css` e aplica classes padronizadas aos controles existentes durante a migração incremental.

## Button / IconButton

Arquivo: `src/components/button.js`. API: `IDEMusic.Button`.

- `createButton({ label, variant, size, iconClass, loading, onClick })`
- `createIconButton({ ariaLabel, iconClass, variant, size, loading, onClick })`
- variantes: `primary`, `secondary`, `ghost`, `danger`
- tamanhos: `sm`, `md`, `lg`
- `IconButton` exige `ariaLabel`
- `loading` aplica `aria-busy` e bloqueia interação

## Input / Textarea

Arquivo: `src/components/input.js`. API: `IDEMusic.Input`.

- `createInput({ id|name, label|ariaLabel, type, value, hint, error, required, disabled, readOnly })`
- `createTextarea({ id|name, label|ariaLabel, rows, resize, value, hint, error })`
- associa `label`, `aria-describedby`, `aria-invalid` e erro com `role="alert"`

## Select / MultiSelect / SearchSelect

Arquivo: `src/components/form-controls.js`. API: `IDEMusic.FormControls`.

- `createSelect({ label|ariaLabel, options, value, placeholder, onChange })`
- `createMultiSelect({ label|ariaLabel, options, value[] })`
- `createSearchSelect({ ariaLabel, options, onSelect })`
- `SearchSelect` usa semântica de `combobox` + `listbox`

## Checkbox / RadioGroup / Switch

- `createCheckbox({ label, checked, onChange })`
- `createRadioGroup({ label, name, options, value, onChange })`
- `createSwitch({ label, checked, onChange })`
- Switch expõe `role="switch"` e sincroniza `aria-checked`

## DatePicker / TimePicker / ColorPicker

- `createDatePicker({ label|ariaLabel, value, onChange })`
- `createTimePicker({ label|ariaLabel, value, onChange })`
- `createColorPicker({ label|ariaLabel, value, onChange })`
- ColorPicker aceita hexadecimal `#RRGGBB`; valor inválido volta ao padrão visual

## Modal / Drawer / ConfirmDialog

Arquivo: `src/components/overlays-feedback.js`. API: `IDEMusic.OverlayFeedback`.

- `createModal({ title|ariaLabel, content, actions, onClose })`
- `createDrawer({ title|ariaLabel, content, side })`
- `createConfirmDialog({ title, message, confirmLabel, cancelLabel, onConfirm, onCancel })`
- Modais usam `role="dialog"` e `aria-modal="true"`

## Toast / Badge / StatusBadge

- `createToast({ message, tone, duration })`
- `createBadge({ label, tone })`
- `createStatusBadge({ status, label, tone })`
- tons: `neutral`, `primary`, `success`, `warning`, `error`, `info`
- Toast de erro usa `role="alert"`; demais usam `role="status"`

## Avatar / UserChip / RoleChip

Arquivo: `src/components/data-display.js`. API: `IDEMusic.DataDisplay`.

- `createAvatar({ src, alt, name, initials, size })`
- `createUserChip({ label, avatar, removable, onRemove })`
- `createRoleChip({ label, removable, onRemove })`

## Card / SectionCard

- `createCard({ title, content, actions })`
- `createSectionCard({ title, content, actions })`

## Table / Pagination

- `createTable({ caption, columns, rows })`
- colunas aceitam `{ key, label, render }`
- `createPagination({ page, totalPages, onPageChange })`
- página ativa usa `aria-current="page"`
- em telas pequenas a tabela possui fallback responsivo em blocos

## EmptyState / Skeleton / Loading

- `createEmptyState({ title, description, action })`
- `createSkeleton({ shape, width, height })`
- `createLoading({ label })`
- Loading usa `role="status"` e `aria-live="polite"`
- animações respeitam `prefers-reduced-motion`

## SearchBox / FilterBar

Arquivo: `src/components/navigation-layout.js`. API: `IDEMusic.NavigationLayout`.

- `createSearchBox({ ariaLabel, placeholder, onInput })`
- `createFilterBar({ ariaLabel, children, clearAction })`

## PageHeader / Breadcrumb

- `createPageHeader({ title, subtitle, actions })`
- `createBreadcrumb({ items: [{ label, href }] })`
- item atual usa `aria-current="page"`

## Sidebar / MobileNavigation

- `createSidebar({ items })`
- `createMobileNavigation({ items })`
- itens aceitam `{ label, href, active, visible, icon }`
- o shell legado continua responsável pela navegação atual até a migração completa dos domínios

## PermissionGuard / FormField

- `createPermissionGuard({ allowed, content, fallback })`
- `createFormField({ label, control, hint, error })`
- `PermissionGuard` é somente camada de UX; **não substitui Firestore Rules/backend**

## Padrão de tela CRUD

`createCrudPage` padroniza a composição:

1. breadcrumb opcional;
2. `PageHeader` com título, descrição e ações;
3. `FilterBar` opcional;
4. área de conteúdo para Table/Card/EmptyState/Loading;
5. paginação no conteúdo quando aplicável.

```js
const page = IDEMusic.NavigationLayout.createCrudPage({
  title: 'Usuários',
  subtitle: 'Gerencie pessoas, funções e status.',
  actions: [newUserButton],
  filters: [searchBox, statusSelect],
  content: table
});
```

## Padrão de formulário

`createFormLayout` organiza campos e ações com comportamento responsivo:

```js
const form = IDEMusic.NavigationLayout.createFormLayout({
  fields: [nameField, emailField, roleField],
  actions: [cancelButton, saveButton],
  onSubmit: handleSubmit
});
```

Regras:

- cada campo precisa de label visível ou nome acessível equivalente;
- erros devem ficar associados ao controle;
- não usar HTML fornecido pelo usuário via `innerHTML`;
- evitar duplo envio usando loading/disabled no botão principal;
- manter ação destrutiva visualmente distinta;
- preservar foco e navegação por teclado;
- segurança e permissões reais continuam em Services/Routes/Firestore Rules/backend.

## Migração de telas existentes

`src/js/modules/app-shell.js` realiza a ponte temporária para páginas legadas autenticadas:

- injeta `src/styles/design-system.css`;
- converte classes de botões legados para `ide-button`;
- converte inputs/textareas/selects para controles padronizados;
- aplica Card/SectionCard a containers equivalentes;
- aplica EmptyState e Loading padronizados;
- preserva IDs, eventos inline e scripts existentes.

A estratégia é incremental: novas telas devem usar diretamente as factories do Design System; telas legadas podem ser reescritas por domínio sem uma migração big-bang.
