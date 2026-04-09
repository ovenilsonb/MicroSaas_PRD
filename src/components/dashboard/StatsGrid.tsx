import { 
  Beaker, Package, ShieldCheck, AlertTriangle, Factory, 
  BadgeDollarSign, ShoppingBag, CreditCard 
} from 'lucide-react';
import DashboardCard, { DashboardCardSkeleton } from './DashboardCard';
import { DashboardStats } from '../../types/dashboard';

interface StatsGridProps {
  stats: DashboardStats;
  isLoading?: boolean;
  isEditing?: boolean;
}

export default function StatsGrid({ stats, isLoading = false, isEditing = false }: StatsGridProps) {
  const cards = [
    // ─── COMERCIAL & VENDAS ───────────────────────────────────
    {
      key: 'faturamento',
      title: 'Faturamento Mensal',
      value: stats.faturamentoMes,
      icon: <BadgeDollarSign className="w-6 h-6" />,
      color: 'emerald' as const,
    },
    {
      key: 'vendas-pendentes',
      title: 'Pedidos em Aberto',
      value: stats.pedidosPendentes,
      icon: <ShoppingBag className="w-6 h-6" />,
      color: 'blue' as const,
    },

    // ─── INDUSTRIAL & QUALIDADE ──────────────────────────────
    {
      key: 'ofs-ativas',
      title: "OF's em Produção",
      value: stats.ofsAtivas,
      icon: <Factory className="w-6 h-6" />,
      color: 'amber' as const,
    },
    {
      key: 'qualidade-pendente',
      title: 'Aguardando Laudo',
      value: stats.qualidadePendente,
      icon: <ShieldCheck className="w-6 h-6" />,
      color: stats.qualidadePendente > 0 ? 'amber' as const : 'emerald' as const,
    },

    // ─── SUPRIMENTOS & ESTOQUE ──────────────────────────────
    {
      key: 'valor-estoque',
      title: 'Investimento Estoque',
      value: stats.valorEstoque,
      icon: <CreditCard className="w-6 h-6" />,
      color: 'indigo' as const,
    },
    {
      key: 'estoque-baixo',
      title: 'Alerta de Reposição',
      value: stats.estoqueBaixo,
      icon: <AlertTriangle className="w-6 h-6" />,
      color: stats.estoqueBaixo > 0 ? 'red' as const : 'emerald' as const,
    },

    // ─── CADASTROS ──────────────────────────────────────────
    {
      key: 'formulas',
      title: 'Total de Fórmulas',
      value: stats.totalFormulas,
      icon: <Beaker className="w-6 h-6" />,
      color: 'blue' as const,
    },
    {
      key: 'compras',
      title: 'Compras Pendentes',
      value: stats.comprasPendentes,
      icon: <Package className="w-6 h-6" />,
      color: 'purple' as const,
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-4">
        {[...Array(8)].map((_, i) => (
          <DashboardCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-4">
      {cards.map((card) => (
        <DashboardCard
          key={card.key}
          title={card.title}
          value={card.value}
          icon={card.icon}
          color={card.color}
          isEditing={isEditing}
        />
      ))}
    </div>
  );
}
