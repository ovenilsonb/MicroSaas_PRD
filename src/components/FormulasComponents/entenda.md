# Módulo Fórmulas - Documentação

## Visão Geral

O módulo **Fórmulas** é o coração do sistema de produção química. Permite criar, editar, versionar e gerenciar fórmulas de produtos, incluindo ingredientes, custos e especificações técnicas.

---

## Arquivos e Suas Funções

### types.ts

**O que faz:** Define todas as interfaces TypeScript do módulo.

**Interfaces principais:**
- `Formula` - Fórmula química completa com ingredientes
- `Ingredient` - Insumo químico ou embalagem
- `FormulaIngredient` - Relação entre fórmula e insumo (quantidade)
- `Group` - Grupo/categoria de fórmulas
- `ViewMode` - Modo de visualização: 'grid' | 'list' | 'editor'

---

### useFormulasData.ts

**O que faz:** Hook para gestão completa de fórmulas.

**Funções principais:**
- `fetchData()` - Carrega fórmulas, grupos e ingredientes
- `saveFormula()` - Salva ou atualiza fórmula com ingredientes
- `deleteFormula()` - Remove fórmula
- `duplicateFormula()` - Duplica fórmula existente
- `saveGroup()` - Cria/edita grupo
- `deleteGroup()` - Remove grupo

**Retorna:**
```typescript
{
  formulas: Formula[];
  groups: Group[];
  allIngredients: Ingredient[];
  isLoading: boolean;
  fetchData: () => Promise<void>;
  saveFormula: (formula, ingredients) => Promise<boolean>;
  deleteFormula: (id) => Promise<boolean>;
  duplicateFormula: (formula) => Promise<boolean>;
  saveGroup: (name, existingId?) => Promise<boolean>;
  deleteGroup: (id) => Promise<boolean>;
}
```

---

### FormulaCard.tsx

**O que faz:** Card visual de fórmula na galeria.

**Props:**
```typescript
interface FormulaCardProps {
  formula: Formula;
  onClick: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}
```

**Visual:**
- Badge de status (Rascunho/Ativo/Arquivado)
- Nome da fórmula
- Volume base
- Número de ingredientes
- Código LM
- Custo por litro calculado

---

## Funcionalidades Principais

### 1. Galeria de Fórmulas
- Visualização em grid ou lista
- Busca por nome ou código
- Ordenação (nome, data, versão)
- Gerenciamento de grupos

### 2. Editor de Fórmulas
- Criar nova fórmula
- Editar fórmula existente
- Adicionar/remover ingredientes
- Especificar quantidade por ingrediente
- Versionamento de fórmulas
- Instruções de produção

### 3. Gestão de Grupos
- Criar/editrar grupos
- Associar fórmulas a grupos
- Filtrar por grupo

### 4. Import/Export
- Backup em JSON
- Importação de fórmulas

---

## Fluxo de Dados

```
┌─────────────────────┐
│  useFormulasData   │
│       ()            │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐     ┌──────────────────┐
│  Supabase /         │────▶│   UI Display     │
│  localStorage       │     │  (Grid, Editor)  │
└─────────────────────┘     └──────────────────┘
```

---

## Benefícios da Reorganização

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Sistema de Notificação | Componente inline | useToast() global |
| Reutilização | 0 componentes | 1+ componentes |
| Lógica de Dados | Misturado com UI | Hook separado |
| Manutenção | Difícil | Alterações localizáveis |

---

## Como Usar

```tsx
import { useToast } from './dashboard/Toast';
import {
  useFormulasData,
  FormulaCard,
} from './FormulasComponents';

export default function Formulas() {
  const { showToast } = useToast();
  const { formulas, groups, isLoading, saveFormula, deleteFormula } = useFormulasData();

  // Render...
}
```

---

## Notas Técnicas

1. **LocalStorage:** Dados também salvos localmente quando offline
2. **Versionamento:** Cada fórmula pode ter múltiplas versões (V1, V2, etc)
3. **Status:** Fórmulas podem ser rascunho (draft), ativas ou arquivadas
4. **Custo automático:** Calcula custo base e custo por litro automaticamente
5. **Modo Offline:** Funciona com localStorage quando Supabase não está configurado
