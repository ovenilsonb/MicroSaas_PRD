# Módulo Proporção - Documentação

## Visão Geral

O módulo **Proporção** é uma calculadora de custos para fórmulas de produtos químicos. Permite dimensionar a produção por volume ou quantidade de peças, calcular custos de insumos e embalagens, e salvar simulações para referência futura.

---

## Arquivos e Suas Funções

### types.ts

**O que faz:** Define todas as interfaces TypeScript do módulo.

**Interfaces principais:**
- `Formula` - Fórmula química com ingredientes
- `Ingredient` - Insumo químico
- `FormulaIngredient` - Relação entre fórmula e insumo
- `PackagingOption` - Opção de embalagem (capacidade, custo)
- `AssemblyOption` - Sugestão de montagem de embalagens
- `Simulation` - Simulação salva
- `CalculationResult` - Resultado do cálculo
- `CalculationMode` - Tipo de cálculo: 'volume' | 'units'
- `ViewMode` - Modo de visualização: 'grid' | 'list'

**Por que separado:** Tipo forte e único fonte de verdade. Facilita alterações de estrutura sem procurar em múltiplos arquivos.

---

### useProporcaoData.ts

**O que faz:** Contém 3 hooks especializados:

#### useProporcaoData()
- **Função:** Busca fórmulas ativas e opções de embalagem do Supabase ou localStorage
- **Retorna:** `formulas`, `packagingOptions`, `isLoading`, `hiddenFormulas`, `hideFormula`, `showFormula`, `fetchFormulas`, `fetchPackaging`
- **Lógica:** Filtra apenas fórmulas ativas, agrupa por nome base (ignora versões antigas)

#### useSimulation()
- **Função:** Gerencia simulações salvas no localStorage
- **Retorna:** `recentSimulations`, `saveSimulation`, `fetchSimulations`
- **Lógica:** Salva histórico de cálculos com todos os detalhes de custos

#### useCalculation()
- **Função:** Cálculos memoizados para dimensionamento
- **Retorna:** 
  - `packagingOptionsByCapacity` - Embalagens agrupadas por capacidade
  - `uniqueCapacities` - Lista de capacidades únicas
  - `assemblyOptions` - Sugestões de montagem otimizada
  - `packagingAllocation` - Distribuição de embalagens
  - `currentBatchSize` - Volume/produção atual
  - `calculationResult` - Ingredientes calculados
  - `chemicalCost` - Custo apenas de químicos
  - `totalCost` - Custo total (químicos + embalagens)

**Por que separado:** Lógica de negócio separada da UI. Permite reutilizar em outros componentes ou testar isoladamente.

---

### ProporcaoCard.tsx

**O que faz:** Card visual de fórmula na galeria.

**Props:**
```typescript
interface ProporcaoCardProps {
  formula: Formula;
  onClick: () => void;
}
```

**Visual:**
- Badge de versão (V1, V2, etc)
- Código LM
- Nome da fórmula
- Volume base
- Número de ingredientes
- Botão "Dimensionar"

---

### ProporcaoSummary.tsx

**O que faz:** Exibe 4 cards de métricas principais.

**Cards:**
1. **Custo Total Lote** (azul) - Valor total em R$
2. **Produção Final** (branco) - Volume ou quantidade produced
3. **Custo por Litro/Kg** (azul claro) - R$/L
4. **Custo S/ Embalagem** (verde) - Apenas químicos

**Props:**
```typescript
interface ProporcaoSummaryProps {
  totalCost: number;
  currentBatchSize: number;
  chemicalCost: number;
  calculationMode: CalculationMode;
}
```

---

### MemorialComposicao.tsx

**O que faz:** Tabela completa com todos os componentes da fórmula.

**Funcionalidades:**
- Lista todos os ingredientes químicos com quantidade calculada
- Lista embalagens selecionadas
- Calcula % do custo total para cada item
- Mostra subtotal por item

**Props:**
```typescript
interface MemorialComposicaoProps {
  ingredients: CalculatedIngredient[];
  nonChemicalCosts: NonChemicalCost[];
  totalCost: number;
}
```

---

### AssemblySuggestions.tsx

**O que faz:** Lista sugestões de montagem de embalagens.

**Lógica:**
- Gera combinações de embalagens sem sobra
- Recomenda a opção com menor variedade de itens
- Permite seleção rápida

**Props:**
```typescript
interface AssemblySuggestionsProps {
  assemblyOptions: AssemblyOption[];
  packagingOptionsByCapacity: Record<number, PackagingOption[]>;
  onSelectOption: (opt: AssemblyOption) => void;
}
```

---

### Input.tsx

**O que faz:** Componentes de entrada reutilizáveis.

**Componentes:**

#### Input
- Input estilizado para valores numéricos grandes
- Suporte a label e suffix (ex: "L/KG")
- Estilo: bordas arredondadas, foco azul

#### ToggleGroup
- Botões toggle para alternar entre modos
- Usado para "Volume Fixo" vs "Qtd Peças"
- Estilo: botões embutidos em container

---

### index.ts

**O que faz:** Exporta todos os componentes e hooks do módulo.

```typescript
export * from './types';
export { useProporcaoData, useSimulation, useCalculation } from './useProporcaoData';
export { default as ProporcaoCard } from './ProporcaoCard';
export { default as ProporcaoSummary } from './ProporcaoSummary';
export { default as MemorialComposicao } from './MemorialComposicao';
export { default as AssemblySuggestions } from './AssemblySuggestions';
```

**Benefício:** Importação limpa no componente principal.

---

## Benefícios da Reorganização

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Linhas Proporcao.tsx | ~510 | ~334 |
| Reutilização de código | 0 componentes | 7 componentes |
| Testabilidade | Difícil | Cada hook testável |
| Manutenção | Difícil | Alterações localizáveis |
| Sistema de Toast | Modal inline | useToast() global |
| Separação de Concerns | Misturado | UI / Lógica / Tipos |

---

## Como Usar

### No componente principal (Proporcao.tsx):

```tsx
import { useToast } from './dashboard/Toast';
import {
  useProporcaoData,
  useSimulation,
  useCalculation,
  ProporcaoCard,
  ProporcaoSummary,
  MemorialComposicao,
  AssemblySuggestions,
  CalculationMode,
  ViewMode,
} from './ProporcaoComponents';

export default function Proporcao() {
  const { showToast } = useToast();
  const { formulas, packagingOptions, isLoading } = useProporcaoData();
  const { recentSimulations, saveSimulation, fetchSimulations } = useSimulation();
  
  const calculation = useCalculation(
    packagingOptions,
    batchSize,
    selectedPackagingKeys,
    calculationMode,
    selectedFormula?.base_volume || 0,
    selectedFormula?.formula_ingredients || []
  );

  // Render...
}
```

---

## Fluxo de Dados

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  useProporcao  │────▶│  useCalculation  │────▶│   UI Display    │
│     Data()     │     │     ()           │     │  (Summary,      │
└─────────────────┘     └──────────────────┘     │   Memorial,     │
         │                      │                │   Suggestions)  │
         ▼                      ▼                └─────────────────┘
┌─────────────────┐     ┌──────────────────┐
│ Supabase /      │     │ Cálculos         │
│ localStorage    │     │ Memoizados        │
└─────────────────┘     └──────────────────┘
```

---

## Notas Técnicas

1. **Memoização:** Todos os cálculos usam `useMemo` para evitar recálculos desnecessários
2. **Versionamento de fórmulas:** O sistema automatically usa a versão mais recente de cada fórmula base
3. **Modo Offline:** Funciona com localStorage quando Supabase não está configurado
4. **Sugestões inteligente:** O algoritmo encontra combinações de embalagens sem sobra (zero leftover)
