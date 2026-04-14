import React from 'react';
import {
  Beaker, Package, ShieldCheck, AlertTriangle, Factory,
  BadgeDollarSign, ShoppingBag, CreditCard
} from 'lucide-react';
import { DashboardStats } from '../types/dashboard';

export interface DashboardCardDefinition {
  id: string;
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: 'blue' | 'indigo' | 'amber' | 'emerald' | 'red' | 'purple';
  module: 'vendas' | 'producao' | 'suprimentos' | 'geral';
}

export function useDashboardCards(stats: DashboardStats) {
  const allCards: DashboardCardDefinition[] = React.useMemo(() => [
    // ─── COMERCIAL & VENDAS ───────────────────────────────────
    {
      id: 'kpi-faturamento',
      title: 'Faturamento Mensal',
      value: stats.faturamentoMes,
      icon: <BadgeDollarSign />,
      color: 'emerald',
      module: 'vendas',
    },
    {
      id: 'kpi-vendas-pendentes',
      title: 'Pedidos em Aberto',
      value: stats.pedidosPendentes,
      icon: <ShoppingBag />,
      color: 'blue',
      module: 'vendas',
    },

    // ─── INDUSTRIAL & QUALIDADE ──────────────────────────────
    {
      id: 'kpi-ofs-ativas',
      title: "OF's em Produção",
      value: stats.ofsAtivas,
      icon: <Factory />,
      color: 'amber',
      module: 'producao',
    },
    {
      id: 'kpi-qualidade-pendente',
      title: 'Aguardando Laudo',
      value: stats.qualidadePendente,
      icon: <ShieldCheck />,
      color: stats.qualidadePendente > 0 ? 'amber' : 'emerald',
      module: 'producao',
    },

    // ─── SUPRIMENTOS & ESTOQUE ──────────────────────────────
    {
      id: 'kpi-valor-estoque',
      title: 'Investimento Estoque',
      value: stats.valorEstoque,
      icon: <CreditCard />,
      color: 'indigo',
      module: 'suprimentos',
    },
    {
      id: 'kpi-estoque-baixo',
      title: 'Alerta de Reposição',
      value: stats.estoqueBaixo,
      icon: <AlertTriangle />,
      color: stats.estoqueBaixo > 0 ? 'red' : 'emerald',
      module: 'suprimentos',
    },

    // ─── CADASTROS ──────────────────────────────────────────
    {
      id: 'kpi-formulas',
      title: 'Total de Fórmulas',
      value: stats.totalFormulas,
      icon: <Beaker />,
      color: 'blue',
      module: 'geral',
    },
    {
      id: 'kpi-compras',
      title: 'Compras Pendentes',
      value: stats.comprasPendentes,
      icon: <Package />,
      color: 'purple',
      module: 'suprimentos',
    },
  ], [stats]);

  return { allCards };
}
