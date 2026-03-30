# Módulo Produção - Documentação

## Visão Geral

O módulo **Produção** gerencia ordens de fabricação (OF), controle de processo produtivo, rastreabilidade e acompanhamento de cada lote produzido.

---

## Interfaces

### ProductionOrder
```typescript
interface ProductionOrder {
  id: string;
  formula_id: string;
  batch_number: string;
  status: OrderStatus;
  planned_volume: number;
  actual_volume?: number;
  planned_date: string;
  completed_date?: string;
  created_at: string;
  formulas?: Formula;
  production_steps?: ProductionStep[];
}
```

### OrderStatus
```typescript
type OrderStatus = 'planned' | 'weighing' | 'mixing' | 'homogenizing' | 'quality_check' | 'completed' | 'cancelled';
```

### ProductionStep
```typescript
interface ProductionStep {
  key: string;
  label: string;
  completed: boolean;
  completedAt?: string;
}
```

---

## Status da Ordem de Fabricação

| Status | Descrição |
|--------|-----------|
| `planned` | Planejada |
| `weighing` | Pesagem |
| `mixing` | Mistura |
| `homogenizing` | Homogeneização |
| `quality_check` | Controle de Qualidade |
| `completed` | Concluída |
| `cancelled` | Cancelada |

---

## Funcionalidades

### 1. Lista de Ordens
- Visualização de todas as OFs
- Busca por número de lote
- Filtro por status
- Criação de nova OF

### 2. Criação de OF
- Seleção de fórmula
- Definição de volume do lote
- Geração automática de número de lote
- Seleção de embalagens

### 3. Acompanhamento de Produção
- Atualização de status
- Registro de etapas completadas
- Controle de tempo

### 4. Detalhes da OF
- Ingredientes necessários
- Embalagens utilizadas
- Histórico de alterações

---

## Integração com useToast

```tsx
import { useToast } from './dashboard/Toast';

export default function Producao() {
  const { showToast } = useToast();
  
  // Exemplos de uso:
  showToast('error', 'Volume Necessário', 'Por favor, informe o volume do lote.');
  showToast('success', 'OF Criada', `Lote ${batchNumber} criado com sucesso.`);
  showToast('success', 'Status Atualizado', `OF ${order.batch_number} agora está em: ${status}`);
  showToast('success', 'Excluída', 'Ordem de fabricação excluída.');
}
```

---

## Fluxo de Produção

```
planned → weighing → mixing → homogenizing → quality_check → completed
                                                         ↓
                                                      cancelled
```

---

## Fonte de Dados

- **Supabase mode**: Tabelas `production_orders`, `formulas`, `formula_ingredients`
- **LocalStorage mode**: `local_production_orders`, `local_formulas`

---

## Notas Técnicas

1. **Número de lote**: Gerado automaticamente com prefixo da fórmula
2. **Volume**: Planejamento vs realizado
3. **Embalagens**: Seleção e quantidade para o lote
4. **Código splitting**: Carregado sob demanda com React.lazy()
5. **Notificações**: Substituído sistema inline por useToast global
