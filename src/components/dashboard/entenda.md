# Módulo Dashboard - Documentação

## Visão Geral

O módulo **Dashboard** é a tela inicial do sistema QuímicaSaaS. Apresenta uma visão geral do negócio com métricas-chave, ações rápidas e atividade recente. Permite personalização do layout via drag-and-drop.

---

## Arquivos e Suas Funções

### Dashboard.tsx

**O que faz:** Componente principal do dashboard.

**Funcionalidades:**
- Grid de estatísticas (6 cards)
- Ações rápidas (4 botões)
- Atividade recente (lista)
- Layout editável (drag-and-drop)
- Integração com useToast para notificações

---

### StatsGrid.tsx

**O que faz:** Grid de cards de métricas.

**Cards:**
1. **Total de Fórmulas** - Quantidade de fórmulas ativas
2. **Insumos Cadastrados** - Total de insumos no catálogo
3. **OF's em Produção** - Ordens de fabricação ativas
4. **Aprovação de Qualidade** - Taxa de aprovação em %
5. **Alerta Estoque Baixo** - Insumos abaixo do mínimo (vermelho se > 0)
6. **Clientes Ativos** - Total de clientes cadastrados

---

### DashboardCard.tsx

**O que faz:** Card genérico para métricas.

**Props:**
```typescript
interface DashboardCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color?: 'blue' | 'indigo' | 'amber' | 'emerald' | 'red' | 'purple';
  trend?: { value: number; isPositive: boolean };
  isLoading?: boolean;
  onClick?: () => void;
}
```

**Funcionalidades:**
- Suporte a cores
- Indicador de tendência (↑/↓)
- Skeleton de loading
- Modo de edição (drag handle)

---

### QuickActions.tsx

**O que faz:** Menu de ações rápidas.

**Ações disponíveis:**
1. **Nova Fórmula** - Ir para módulo de fórmulas
2. **Gerenciar Insumos** - Ir para módulo de insumos
3. **Nova Proporção** - Ir para módulo de proporção
4. **Novo Cliente** - Ir para módulo de clientes

---

### RecentActivity.tsx

**O que faz:** Lista de atividades recentes.

**Tipos de atividade:**
- `formula` - Fórmula cadastrada (ícone azul)
- `insumo` - Insumo adicionado (ícone verde)
- `cliente` - Cliente cadastrado (ícone roxo)
- `fornecedor` - Fornecedor cadastrado (ícone âmbar)
- `producao` - Produção iniciada (ícone indigo)
- `qualidade` - Verificação de qualidade (ícone ciano)

---

### Toast.tsx

**O que faz:** Sistema de notificações globais.

**Funcionalidades:**
- Context API para notificações
- 4 tipos: success, error, warning, info
- Auto-dismiss (5 segundos)
- Hook reutilizável: `useToast()`

**Uso:**
```tsx
import { useToast } from './dashboard/Toast';

function MyComponent() {
  const { showToast } = useToast();
  
  showToast('success', 'Título', 'Mensagem');
}
```

---

### useDashboardData.ts

**O que faz:** Hook para buscar dados do dashboard.

**Retorna:**
```typescript
interface DashboardStats {
  totalInsumos: number;
  estoqueBaixo: number;
  totalFormulas: number;
  custoMedio: number;
  ofsAtivas: number;
  ofsConcluidas: number;
  taxaAprovacao: number;
  totalClientes: number;
  totalFornecedores: number;
}

{
  stats: DashboardStats;
  recentActivity: ActivityItem[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}
```

---

## Fluxo de Dados

```
┌─────────────────┐
│ useDashboardData│
│      ()         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────────┐
│  Supabase /     │────▶│   UI Display      │
│  localStorage   │     │ (StatsGrid,      │
└─────────────────┘     │  QuickActions,    │
                       │  RecentActivity)  │
                       └──────────────────┘
```

---

## Layout Customizável

O dashboard usa **react-grid-layout** para permitir arrastar e redimensionar cards.

**Breakpoints:**
- `lg` (1200px): 12 colunas
- `md` (996px): 10 colunas
- `sm` (768px): 6 colunas
- `xs` (480px): 4 colunas

**Layout padrão:**
- Linha 1: StatsGrid (6 cards)
- Linha 2: QuickActions (4 cols) + RecentActivity (8 cols)

**Salvar layout:** O layout é salvo no localStorage (`dashboardLayouts`).

---

## Tipos (types/dashboard.ts)

```typescript
interface DashboardStats {
  totalInsumos: number;
  estoqueBaixo: number;
  totalFormulas: number;
  custoMedio: number;
  ofsAtivas: number;
  ofsConcluidas: number;
  taxaAprovacao: number;
  totalClientes: number;
  totalFornecedores: number;
}

interface ActivityItem {
  type: 'formula' | 'insumo' | 'cliente' | 'fornecedor' | 'producao' | 'qualidade';
  name: string;
  date: Date;
  id?: string;
}

interface NotificationState {
  show: boolean;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
}
```

---

## Como Usar

```tsx
import { useDashboardData } from '../hooks/useDashboardData';
import { useToast } from './dashboard/Toast';
import StatsGrid from './dashboard/StatsGrid';
import QuickActions from './dashboard/QuickActions';
import RecentActivity from './dashboard/RecentActivity';

export default function Dashboard() {
  const { showToast } = useToast();
  const { stats, recentActivity, isLoading, error } = useDashboardData();

  if (error) {
    showToast('error', 'Erro', error);
  }

  return (
    <div>
      <StatsGrid stats={stats} isLoading={isLoading} />
      <QuickActions onAction={setActiveMenu} />
      <RecentActivity activities={recentActivity} isLoading={isLoading} />
    </div>
  );
}
```

---

## Notas Técnicas

1. **Dados:** Busca de Supabase ou localStorage conforme modo
2. **Layout:** Salvo em localStorage, pode ser restaurado
3. **Estoque baixo:** Calculado quando estoque_atual <= estoque_minimo
4. **Taxa aprovação:** Baseada em quality_controls (approved/rejected)
5. **Modo Offline:** Funciona com localStorage quando Supabase não está configurado
6. **Edição de layout:** Ativada pelo botão "Editar Layout" no header

---

## Estrutura de Arquivos

```
src/components/dashboard/
├── Dashboard.tsx          # Componente principal
├── StatsGrid.tsx         # Grid de métricas
├── DashboardCard.tsx     # Card individual
├── QuickActions.tsx      # Menu de ações
├── RecentActivity.tsx    # Lista de atividades
├── Toast.tsx            # Sistema de notificações
├── index.ts             # Exports
└── entenda.md           # Esta documentação

src/hooks/
└── useDashboardData.ts  # Hook de dados

src/types/
└── dashboard.ts         # Interfaces TypeScript
```

---

## Benefícios da Reorganização

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Linhas Dashboard.tsx | ~410 | ~90 |
| Componentes reutilizáveis | 0 | 7 |
| Separação UI/Lógica | Misturado | Hook separado |
| Sistema de Notificação | Inline | useToast() global |
| Testabilidade | Difícil | Cada componente testável |
