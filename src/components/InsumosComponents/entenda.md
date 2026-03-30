# Módulo Insumos - Documentação

## Visão Geral

O módulo **Insumos** gerencia todas as matérias-primas, embalagens e produtos químicos utilizados na produção. Permite cadastrar, editar, controlar estoque e gerenciar variantes de insumos.

---

## Arquivos e Suas Funções

### types.ts

**O que faz:** Define todas as interfaces TypeScript do módulo.

**Interfaces principais:**
- `Ingredient` - Insumo completo com todas as propriedades
- `Variant` - Variação de insumo (ex: diferentes tamanhos de embalagem)
- `Supplier` - Fornecedor
- `ViewMode` - Modo de visualização: 'list' | 'grid'
- `SortField` - Campo para ordenação
- `SortOrder` - Ordem: 'asc' | 'desc'

---

### useInsumosData.ts

**O que faz:** Hook para gestão completa de insumos.

**Funções principais:**
- `fetchIngredients()` - Carrega todos os insumos
- `saveIngredient()` - Salva ou atualiza insumo com variantes
- `deleteIngredient()` - Remove insumo
- `updateStock()` - Atualiza estoque do insumo

**Retorna:**
```typescript
{
  ingredients: Ingredient[];
  suppliers: Supplier[];
  isLoading: boolean;
  fetchIngredients: () => Promise<void>;
  saveIngredient: (ingredient) => Promise<boolean>;
  deleteIngredient: (id) => Promise<boolean>;
  updateStock: (id, quantity) => Promise<boolean>;
}
```

---

### InsumoCard.tsx

**O que faz:** Card visual de insumo na galeria.

**Props:**
```typescript
interface InsumoCardProps {
  ingredient: Ingredient;
  onClick: () => void;
}
```

**Visual:**
- Ícone区分化学品/embalagem
- Nome e apelido
- Custo unitário
- Estoque atual
- Alerta de estoque baixo
- Indicador de variantes

---

## Funcionalidades Principais

### 1. Galeria de Insumos
- Visualização em grid ou lista
- Busca por nome ou código
- Ordenação por diversos campos
- Filtragem por tipo (químico/embalagem)

### 2. Cadastro de Insumos
- Dados gerais (nome, código, custo)
- Especificações técnicas (pH, viscosidade, etc)
- Controle de estoque (mínimo e atual)
- Validade e informações de risco
- Gerenciamento de variantes

### 3. Controle de Estoque
- Estoque atual e mínimo
- Alerta automático de estoque baixo
- Atualização de estoque

### 4. Import/Export
- Backup em JSON
- Importação de insumos

---

## Fluxo de Dados

```
┌─────────────────┐
│  useInsumosData│
│       ()        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────────┐
│  Supabase /    │────▶│   UI Display     │
│  localStorage  │     │  (Grid, Editor)  │
└─────────────────┘     └──────────────────┘
```

---

## Benefícios da Reorganização

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Sistema de Notificação | Componente inline | useToast() global |
| Reutilização | 0 componentes | 2 componentes |
| Lógica de Dados | Misturado com UI | Hook separado |
| Manutenção | Difícil | Alterações localizáveis |

---

## Como Usar

```tsx
import { useToast } from './dashboard/Toast';
import {
  useInsumosData,
  InsumoCard,
} from './InsumosComponents';

export default function Insumos() {
  const { showToast } = useToast();
  const { ingredients, isLoading, saveIngredient, deleteIngredient } = useInsumosData();

  // Render...
}
```

---

## Notas Técnicas

1. **LocalStorage:** Dados também salvos localmente quando offline
2. **Variantes:** Insumos podem ter múltiplas variantes (ex: diferentes tamanhos)
3. **Estoque:** Controle automático de estoque com alerta de mínimo
4. **Categorização:** Automaticamente diferencia químicos de embalagens
5. **Modo Offline:** Funciona com localStorage quando Supabase não está configurado
