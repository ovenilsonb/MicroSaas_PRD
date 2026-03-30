# Módulo Estoque - Documentação

## Visão Geral

O módulo **Estoque** gerencia o controle de inventário de produtos acabados e matérias-primas. Permite registrar entradas, saídas e ajustes de estoque com histórico completo.

---

## Interfaces

### InventoryLog
```typescript
interface InventoryLog {
  id: string;
  ingredient_id?: string;
  quantity: number;
  type: 'in' | 'out' | 'adjust';
  notes: string | null;
  created_at: string;
}
```

### IngredientStats
```typescript
interface IngredientStats {
  id: string;
  nome: string;
  estoque_atual: number;
  estoque_minimo: number;
  unidade_medida: string;
}
```

### FinishedGood
```typescript
interface FinishedGood {
  id: string;
  key: string;
  name: string;
  formula_id: string;
  packaging_id: string;
  variant_id: string | null;
  stock_quantity: number;
}
```

---

## Funcionalidades

### 1. Aba Produtos Acabados
- Lista de produtos fabricados
- Controle de quantidade em estoque
- Histórico de movimentações

### 2. Aba Matérias-Primas
- Lista de insumos com estoque
- Alerta de estoque baixo
- Histórico de movimentações

### 3. Movimentações
- **Entrada (in)** - Adição de estoque
- **Saída (out)** - Remação de estoque
- **Ajuste (adjust)** - Correção de quantidade

### 4. Histórico
- Registro de todas as movimentações
- Data, tipo, quantidade e observações

---

## Integração com useToast

```tsx
import { useToast } from './dashboard/Toast';

export default function Estoque() {
  const { showToast } = useToast();
  
  showToast('error', 'Quantidade Inválida', 'Por favor, insira uma quantidade válida.');
}
```

---

## Fonte de Dados

- **Supabase mode**: Tabelas `ingredients`, `finished_goods`, `inventory_logs`
- **LocalStorage mode**: `local_ingredients`, `local_finished_goods`, `local_inventory_logs`

---

## Notas Técnicas

1. **Tabs**: Alterna entre 'finished' (produtos) e 'raw' (matérias-primas)
2. **Estoque baixo**: Calculado quando estoque_atual <= estoque_minimo
3. **Validações**: Quantidade não pode ser negativa
4. **Código splitting**: Carregado sob demanda com React.lazy()
