# Módulo Precificação - Documentação

## Visão Geral

O módulo **Precificação** permite definir preços de venda para fórmulas químicas em diferentes canais (varejo, atacado, fardo). Calcula automaticamente custos, margens e markup baseado nos ingredientes e embalagens.

---

## Arquivos e Suas Funções

### types.ts

**O que faz:** Define todas as interfaces TypeScript do módulo.

**Interfaces principais:**
- `Formula` - Fórmula química com ingredientes
- `Ingredient` - Insumo químico
- `FormulaIngredient` - Relação entre fórmula e insumo
- `PackagingOption` - Opção de embalagem (capacidade, custo)
- `PricingEntry` - Dados de precificação salvos por fórmula+capacidade
- `PriceCalculation` - Resultado dos cálculos de preço
- `ViewMode` - Modo de visualização: 'grid' | 'list'

---

### usePrecificacaoData.ts

**O que faz:** Contém hooks para gestão de dados e cálculos.

#### usePrecificacaoData()
- **Função:** Busca fórmulas e embalagens, gerencia precificações salvas
- **Retorna:** 
  - `formulas` - Lista de fórmulas ativas
  - `packagingOptions` - Lista de embalagens
  - `savedPricing` - Precificações salvas no localStorage
  - `uniqueCapacities` - Capacidades únicas disponíveis
  - `savePricing()` - Salvar precificação
  - `getSavedEntry()` - Buscar precificação salva

#### usePriceCalculation()
- **Função:** Calcula custos e preços com base em parâmetros
- **Retorna:** Custos, margens, markups e preços calculados

#### Funções auxiliares
- `getFormulaCategory()` - Categoriza fórmula por nome (Amaciantes, Detergentes, etc)
- `categoryColors` - Cores por categoria

---

### PrecificacaoCard.tsx

**O que faz:** Card visual de fórmula na galeria.

**Props:**
```typescript
interface PrecificacaoCardProps {
  formula: Formula;
  onClick: () => void;
}
```

**Visual:**
- Badge de categoria (cor diferente por tipo)
- Código LM
- Nome da fórmula
- Volume base
- Custo Base e Custo/L calculados
- Status (Ativo/Pendente)

---

### PricingSummary.tsx

**O que faz:** Exibe cards de métricas de precificação.

**Cards:**
1. **Custo Químicos** (verde) - Soma dos custos de ingredientes
2. **Custo Embalagem** (azul) - Custo da embalagem
3. **Custo Total** (branco) - Custo total (químicos + embalagem + fixo)
4. **Margem** (%) - Margem de lucro
5. **Preço Varejo** (azul escuro) - Preço recomendado para venda
6. **Preço Atacado** (roxo) - Preço para atacadistas

---

### Input.tsx

**O que faz:** Componentes de entrada reutilizáveis.

**Componentes:**

#### Input
- Input estilizado padrão
- Suporte a label

#### NumberInput
- Input para números com formatação automática
- Suporte a prefixo (R$) e sufixo (L, UN)
- Trata vírgulas automaticamente

#### ToggleGroup
- Botões toggle para alternar entre modos

---

### index.ts

**O que faz:** Exporta todos os componentes e hooks do módulo.

---

## Fluxo de Dados

```
┌─────────────────────┐     ┌──────────────────────┐
│  usePrecificacao    │────▶│  usePriceCalculation │
│      Data()         │     │        ()            │
└─────────────────────┘     └──────────────────────┘
         │                           │
         ▼                           ▼
┌─────────────────────┐     ┌──────────────────────┐
│  Supabase /         │     │  UI Display           │
│  localStorage       │     │  (Summary, Card)      │
└─────────────────────┘     └──────────────────────┘
```

---

## Funcionalidades Principais

### 1. Galeria de Fórmulas
- Lista fórmulas ativas com busca
- Visualização grid ou list
- Cards com custo base calculado

### 2. Detail View (Precificação)
- Seleção de capacidade (500ml, 1L, 2L, 5L)
- Ajuste de preços com botões +/- (arredonda para .95, .90, .80)
- Cálculo automático de margem e markup
- Gráficos visuais (donut, barras)
- Salvar precificações por capacidade

### 3. Precificação por Canal
- **Varejo** - Preço para consumidor final
- **Atacado** - 15% desconto sobre varejo
- **Fardo** - 6 unidades com 10% desconto adicional

### 4. Custos Configuráveis
- Custo de ingredientes (automático)
- Custo de embalagem (automático por capacidade)
- Custos fixos por unidade (input manual)

---

## Benefícios da Reorganização

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Sistema de Notificação | Componente inline | useToast() global |
| Reutilização | 0 componentes | 4 componentes |
| Lógica de Dados | Misturado com UI | Hook separado |
| Manutenção | Difícil | Alterações localizáveis |

---

## Como Usar

```tsx
import { useToast } from './dashboard/Toast';
import {
  usePrecificacaoData,
  usePriceCalculation,
  PrecificacaoCard,
  PricingSummary,
  getFormulaCategory,
} from './PrecificacaoComponents';

export default function Precificacao() {
  const { showToast } = useToast();
  const { formulas, packagingOptions, isLoading, savePricing } = usePrecificacaoData();
  const { calculation } = usePriceCalculation(...);

  // Render...
}
```

---

## Notas Técnicas

1. **LocalStorage:** Precificações são salvas em `precificacao_entries` no localStorage
2. **Categorização:** Fórmulas são automaticamente categorizadas por nome (Amaciantes, Detergentes, etc)
3. **Arredondamento:** Preços usam função `snapPrice()` para terminar em .95, .90 ou .80
4. **Modo Offline:** Funciona com localStorage quando Supabase não está configurado
5. **Gráficos:** SVG donut e barras para visualização de custos
