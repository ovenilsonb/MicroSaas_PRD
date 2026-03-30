import React from 'react';
import { Beaker, Package, Activity, ShieldCheck, AlertTriangle, DollarSign, Users, Factory } from 'lucide-react';
import DashboardCard, { DashboardCardSkeleton } from './DashboardCard';
import { DashboardStats } from '../../types/dashboard';

interface StatsGridProps {
  stats: DashboardStats;
  isLoading?: boolean;
  isEditing?: boolean;
}

export default function StatsGrid({ stats, isLoading = false, isEditing = false }: StatsGridProps) {
  const cards = [
    {
      key: 'formulas',
      title: 'Total de Fórmulas',
      value: stats.totalFormulas,
      icon: <Beaker className="w-6 h-6" />,
      color: 'blue' as const,
    },
    {
      key: 'insumos',
      title: 'Insumos Cadastrados',
      value: stats.totalInsumos,
      icon: <Package className="w-6 h-6" />,
      color: 'indigo' as const,
    },
    {
      key: 'ofs-ativas',
      title: "OF's em Produção",
      value: stats.ofsAtivas,
      icon: <Activity className="w-6 h-6" />,
      color: 'amber' as const,
    },
    {
      key: 'qualidade',
      title: 'Aprovação de Qualidade',
      value: `${stats.taxaAprovacao.toFixed(1)}%`,
      icon: <ShieldCheck className="w-6 h-6" />,
      color: stats.taxaAprovacao >= 90 ? 'emerald' as const : 'amber' as const,
    },
    {
      key: 'estoque-baixo',
      title: 'Alerta Estoque Baixo',
      value: stats.estoqueBaixo,
      icon: <AlertTriangle className="w-6 h-6" />,
      color: stats.estoqueBaixo > 0 ? 'red' as const : 'emerald' as const,
    },
    {
      key: 'clientes',
      title: 'Clientes Ativos',
      value: stats.totalClientes,
      icon: <Users className="w-6 h-6" />,
      color: 'purple' as const,
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <DashboardCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
