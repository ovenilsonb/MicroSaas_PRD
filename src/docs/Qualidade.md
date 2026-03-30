# Módulo Qualidade - Documentação

## Visão Geral

O módulo **Qualidade** gerencia o controle de qualidade das produções, registra laudos técnicos, aprova ou reprova batches e mantém histórico de análises.

---

## Interfaces

### QualityControl
```typescript
interface QualityControl {
  id: string;
  production_order_id: string;
  status: 'pending' | 'approved' | 'rejected';
  ph?: string;
  viscosity?: string;
  color?: string;
  odor?: string;
  appearance?: string;
  notes?: string;
  analyst?: string;
  created_at: string;
  completed_at?: string;
}
```

---

## Status de Qualidade

| Status | Descrição |
|--------|-----------|
| `pending` | Pendente de análise |
| `approved` | Aprovado |
| `rejected` | Reprovado |

---

## Funcionalidades

### 1. Análises Pendentes
- Lista de batches aguardando análise
- Seleção de ordem de fabricação
- Preenchimento de parâmetros

### 2. Parâmetros de Análise
- **pH**: Potencial hidrogeniônico
- **Viscosidade**: Resistência ao fluxo
- **Cor**: Avaliação visual
- **Odor**: Avaliação sensorial
- **Aparência**: Aspecto geral do produto

### 3. Aprovação/Reprovação
- Registro de laudo técnico
- Assinatura do analista
- Histórico de decisões

### 4. Histórico de Qualidade
- Visualização de análises anteriores
- Filtro por status
- Busca por data

---

## Integração com useToast

```tsx
import { useToast } from './dashboard/Toast';

export default function Qualidade() {
  const { showToast } = useToast();
  
  // Exemplo de uso:
  showToast('error', 'Erro ao Salvar', 'Não foi possível salvar o laudo de qualidade.');
}
```

---

## Fluxo de Qualidade

```
production_order created
        ↓
quality_check status
        ↓
   pending → approved / rejected
        ↓
   completed (with date)
```

---

## Parâmetros Técnicos

| Parâmetro | Descrição | Tipo |
|-----------|-----------|------|
| pH | Potencial hidrogeniônico | 0-14 |
| Viscosidade | Resistência ao fluxo | cP |
| Cor | Avaliação visual | Conforme/Não Conforme |
| Odor | Avaliação sensorial | Conforme/Não Conforme |
| Aparência | Aspecto geral | Conforme/Não Conforme |

---

## Fonte de Dados

- **Supabase mode**: Tabela `quality_controls`
- **LocalStorage mode**: `local_quality_controls`

---

## Notas Técnicas

1. **Abas**: 'pending' (pendentes) e 'history' (histórico)
2. **Campos padrão**: 'Conforme' para cor, odor e aparência
3. **Código splitting**: Carregado sob demanda com React.lazy()
4. **Notificações**: Sistema useToast global integrado
