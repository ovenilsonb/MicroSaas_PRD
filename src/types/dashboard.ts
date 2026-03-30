export interface DashboardStats {
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

export interface ActivityItem {
  type: 'formula' | 'insumo' | 'cliente' | 'fornecedor' | 'producao' | 'qualidade';
  name: string;
  date: Date;
  id?: string;
}

export interface NotificationState {
  show: boolean;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
}

export interface DashboardCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color?: 'blue' | 'indigo' | 'amber' | 'emerald' | 'red' | 'purple';
  trend?: {
    value: number;
    isPositive: boolean;
  };
  isLoading?: boolean;
  onClick?: () => void;
}

export interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  action: string;
  colorScheme?: 'blue' | 'indigo' | 'amber' | 'emerald';
}
