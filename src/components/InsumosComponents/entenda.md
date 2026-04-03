# Módulo Insumos - Documentação

## Visão Geral

O módulo **Insumos** gerencia todas as matérias-primas, embalagens e produtos químicos utilizados na produção. Permite cadastrar, editar, controlar estoque e gerenciar variantes de insumos.

---

## Arquitetura Refatorada (v2)

O módulo foi refatorado de um arquivo monolítico de 2130 linhas para uma arquitetura modular com componentes separados.

### Árvore de Arquivos

```
InsumosComponents/
├── types.ts                    # Interfaces TypeScript
├── useInsumosData.ts           # Hook de dados (CRUD + estoque + Supabase)
├── InsumoCard.tsx              # Card do grid view (legado, mantido para compatibilidade)
├── InsumoStats.tsx             # Cards de estatísticas
├── InsumoFilters.tsx           # Barra de busca, filtros, ordenação e view mode
├── InsumoTable.tsx             # Tabela de insumos (list view)
├── InsumoGrid.tsx              # Grid de cards (grid view)
├── InsumoModal.tsx             # Modal completo (4 tabs: geral, técnicas, estoque, uso)
├── InsumoPagination.tsx        # Paginação com seletor de itens por página
├── StockMovementPanel.tsx      # Painel de movimentação de estoque
├── DeleteConfirmDialog.tsx     # Diálogo de confirmação de exclusão
├── index.ts                    # Barrel exports
└── entende.md                  # Esta documentação
```

---

## Componentes e Suas Funções

### types.ts
**Interfaces:** `Ingredient` (20+ campos), `Variant`, `Supplier`, `ViewMode`, `SortField`, `SortOrder`

### useInsumosData.ts
**Hook principal** com dual storage (Supabase + localStorage):
- `fetchIngredients()` - Carrega insumos ordenados por sort_order + name
- `saveIngredient()` - CRUD com variantes
- `deleteIngredient()` - Remove com verificação de fórmulas
- `updateStock()` - Atualiza estoque direto
- `addStockMovement()` - **Agora integrado com `inventory_logs` do Supabase**
- `getStockMovements()` - **Com suporte a filtro por data**
- `exportStockMovements()` - **Export CSV de movimentações**

### InsumoStats.tsx
Cards de estatísticas: total, estoque baixo, valor em estoque, produtos químicos

### InsumoFilters.tsx
Busca, filtros (tipo/fornecedor/estoque), view mode toggle, ordenação

### InsumoTable.tsx
Tabela completa com drag-and-drop, ordenação por coluna, ações hover

### InsumoGrid.tsx
Grid responsivo de cards com variantes e barra de estoque

### InsumoModal.tsx
Modal com 4 tabs:
- **Geral**: nome, código, apelido, unidade, custo, fornecedor, validade, estoque, variantes
- **Informações Técnicas**: peso específico, pH, temperatura, viscosidade, solubilidade, risco
- **Movimentação**: saldo atual, registrar entrada/saída, histórico com filtro por data
- **Uso em Fórmulas**: lista de fórmulas que utilizam o insumo

### InsumoPagination.tsx
Paginação com seletor de itens por página (10, 25, 50, 100)

### StockMovementPanel.tsx
Painel de movimentação com formulário, histórico, filtro por período e export CSV

### DeleteConfirmDialog.tsx
Diálogo de confirmação com verificação de uso em fórmulas

---

## Schema do Banco (Supabase)

### Tabela `ingredients`
| Coluna | Tipo | Notas |
|---|---|---|
| `id` | uuid | PK |
| `name` | text | NOT NULL |
| `codigo` | text | |
| `apelido` | text | |
| `unit` | text | NOT NULL |
| `cost_per_unit` | numeric | default 0 |
| `fornecedor` | text | |
| `supplier_id` | uuid | FK → suppliers (novo) |
| `validade_indeterminada` | boolean | default true |
| `expiry_date` | date | |
| `estoque_atual` | numeric | default 0 |
| `estoque_minimo` | numeric | default 0 |
| `produto_quimico` | boolean | default true |
| `tem_variantes` | boolean | default false |
| `peso_especifico` | text | |
| `ph` | text | |
| `temperatura` | text | |
| `viscosidade` | text | |
| `solubilidade` | text | |
| `risco` | text | |
| `sort_order` | integer | default 0 (novo) |
| `created_at` | timestamptz | |

### Tabela `inventory_logs`
| Coluna | Tipo | Notas |
|---|---|---|
| `id` | uuid | PK |
| `ingredient_id` | uuid | FK → ingredients |
| `variant_id` | uuid | FK → ingredient_variants |
| `quantity` | numeric | |
| `type` | text | 'in', 'out', 'adjust' |
| `reference_id` | uuid | |
| `notes` | text | |
| `created_at` | timestamptz | |

---

## Melhorias Aplicadas (v2 - 03/04/2026)

| # | Melhoria | Status |
|---|---|---|
| 1 | Refatoração em 9 subcomponentes | ✅ |
| 2 | Integração `inventory_logs` Supabase | ✅ |
| 3 | Migrations para colunas faltantes | ✅ |
| 4 | Seletor de itens por página (10/25/50/100) | ✅ |
| 5 | Filtro de movimentações por período | ✅ |
| 6 | Export CSV de movimentações | ✅ |
| 7 | Coluna `sort_order` para drag-and-drop no Supabase | ✅ |
| 8 | Logging de erros nos catch blocks | ✅ |
| 9 | Coluna `supplier_id` FK para suppliers | ✅ |
| 10 | Alerta de custo zero | ✅ |

---

## Atalhos de Teclado

| Atalho | Ação |
|---|---|
| `Ctrl+N` | Novo insumo |
| `Ctrl+F` | Focar busca |
| `Esc` | Fechar modal |

---

## Como Usar

```tsx
import {
  useInsumosData,
  InsumoStats,
  InsumoFilters,
  InsumoTable,
  InsumoGrid,
  InsumoModal,
  InsumoPagination,
  StockMovementPanel,
  DeleteConfirmDialog,
} from './InsumosComponents';

// Hook de dados
const {
  ingredients, suppliers, isLoading,
  fetchIngredients, saveIngredient, deleteIngredient,
  addStockMovement, getStockMovements, exportStockMovements,
} = useInsumosData();
```

---

## Migration Necessária

Execute no Supabase SQL Editor:

```sql
-- Arquivo: supabase/migrations/20260403_v3_insumos_improvements.sql
```

Isso adiciona as colunas faltantes (`apelido`, `tem_variantes`, `peso_especifico`, `ph`, `temperatura`, `viscosidade`, `solubilidade`, `risco`, `sort_order`, `supplier_id`) e índices de performance.
