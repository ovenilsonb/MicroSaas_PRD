import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useStorageMode } from '../contexts/StorageModeContext';
import { DashboardStats, ActivityItem } from '../types/dashboard';

interface UseDashboardDataReturn {
  stats: DashboardStats;
  recentActivity: ActivityItem[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

const initialStats: DashboardStats = {
  totalInsumos: 0,
  estoqueBaixo: 0,
  totalFormulas: 0,
  custoMedio: 0,
  ofsAtivas: 0,
  ofsConcluidas: 0,
  taxaAprovacao: 0,
  totalClientes: 0,
  totalFornecedores: 0,
};

export function useDashboardData(): UseDashboardDataReturn {
  const { mode } = useStorageMode();
  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    try {
      let totalInsumos = 0;
      let estoqueBaixo = 0;
      let valorEstoque = 0;
      let totalFormulas = 0;
      let custoMedio = 0;
      let ofsAtivas = 0;
      let ofsConcluidas = 0;
      let ofsAguardandoLab = 0;
      let taxaAprovacao = 0;
      let qualidadePendente = 0;
      let faturamentoMes = 0;
      let pedidosPendentes = 0;
      let totalClientes = 0;
      let ocAtrasadas = 0;
      let comprasPendentes = 0;
      let totalFornecedores = 0;
      let activity: ActivityItem[] = [];

      if (mode === 'supabase') {
        const [
          insumosData,
          formulasData,
          ordersData,
          qcsData,
          clientesData,
          fornecedoresData,
          salesData,
          purchasesData
        ] = await Promise.all([
          supabase.from('ingredients').select('estoque_atual, estoque_minimo, preco_custo, name, created_at'),
          supabase.from('formulas').select('id, name, created_at'),
          supabase.from('production_orders').select('status'),
          supabase.from('quality_controls').select('status'),
          supabase.from('clients').select('id'),
          supabase.from('suppliers').select('id'),
          supabase.from('sale_orders').select('status, final_value, created_at'),
          supabase.from('purchase_orders').select('status, expected_date'),
        ]);

        const insumos = insumosData.data || [];
        const formulas = formulasData.data || [];
        const orders = ordersData.data || [];
        const qcs = qcsData.data || [];
        const clientes = clientesData.data || [];
        const fornecedores = fornecedoresData.data || [];
        const sales = salesData.data || [];
        const purchases = purchasesData.data || [];

        totalInsumos = insumos.length;
        estoqueBaixo = insumos.filter((i: any) => (i.estoque_atual || 0) <= (i.estoque_minimo || 0)).length;
        valorEstoque = insumos.reduce((acc, i: any) => acc + ((i.estoque_atual || 0) * (i.preco_custo || 0)), 0);
        
        totalFormulas = formulas.length;
        
        ofsAtivas = orders.filter((o: any) => o.status !== 'completed' && o.status !== 'cancelled').length;
        ofsConcluidas = orders.filter((o: any) => o.status === 'completed').length;
        ofsAguardandoLab = orders.filter((o: any) => o.status === 'quality_check').length;

        const totalQcDecided = qcs.filter((q: any) => q.status === 'approved' || q.status === 'rejected').length;
        const totalQcApproved = qcs.filter((q: any) => q.status === 'approved').length;
        taxaAprovacao = totalQcDecided > 0 ? (totalQcApproved / totalQcDecided) * 100 : 0;
        qualidadePendente = qcs.filter((q: any) => q.status === 'pending').length;

        totalClientes = clientes.length;
        totalFornecedores = fornecedores.length;

        // Vendas
        faturamentoMes = sales.reduce((acc, s: any) => {
          const date = new Date(s.created_at);
          if (s.status === 'recebido' && date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
            return acc + (s.final_value || 0);
          }
          return acc;
        }, 0);
        pedidosPendentes = sales.filter((s: any) => s.status !== 'recebido' && s.status !== 'cancelado').length;

        // Compras
        comprasPendentes = purchases.filter((p: any) => p.status === 'enviado' || p.status === 'rascunho').length;
        ocAtrasadas = purchases.filter((p: any) => p.status === 'enviado' && p.expected_date && new Date(p.expected_date) < today).length;

        activity = [
          ...formulas.map((f: any) => ({ type: 'formula' as const, name: f.name, date: new Date(f.created_at), id: f.id })),
          ...insumos.map((i: any) => ({ type: 'insumo' as const, name: i.name, date: new Date(i.created_at) }))
        ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5);
      } else {
        const localIngs = JSON.parse(localStorage.getItem('local_ingredients') || '[]');
        const localForms = JSON.parse(localStorage.getItem('local_formulas') || '[]');
        const localOrders = JSON.parse(localStorage.getItem('local_production_orders') || '[]');
        const localQCs = JSON.parse(localStorage.getItem('local_quality_controls') || '[]');
        const localClientes = JSON.parse(localStorage.getItem('local_clients') || '[]');
        const localFornecedores = JSON.parse(localStorage.getItem('local_suppliers') || '[]');
        const localSales = JSON.parse(localStorage.getItem('local_sale_orders') || '[]');
        const localPurchases = JSON.parse(localStorage.getItem('local_purchase_orders') || '[]');

        totalInsumos = localIngs.length;
        estoqueBaixo = localIngs.filter((i: any) => (i.estoque_atual || 0) <= (i.estoque_minimo || 0)).length;
        valorEstoque = localIngs.reduce((acc: number, i: any) => acc + ((i.estoque_atual || 0) * (Number(i.preco_custo) || 0)), 0);
        
        totalFormulas = localForms.length;
        
        ofsAtivas = localOrders.filter((o: any) => o.status !== 'completed' && o.status !== 'cancelled').length;
        ofsConcluidas = localOrders.filter((o: any) => o.status === 'completed').length;
        ofsAguardandoLab = localOrders.filter((o: any) => o.status === 'quality_check').length;

        const qcDecided = localQCs.filter((q: any) => q.status === 'approved' || q.status === 'rejected');
        const qcApproved = qcDecided.filter((q: any) => q.status === 'approved');
        taxaAprovacao = qcDecided.length > 0 ? (qcApproved.length / qcDecided.length) * 100 : 0;
        qualidadePendente = localQCs.filter((q: any) => q.status === 'pending').length;

        totalClientes = localClientes.length;
        totalFornecedores = localFornecedores.length;

        // Vendas
        faturamentoMes = localSales.reduce((acc: number, s: any) => {
          const date = new Date(s.created_at);
          if (s.status === 'recebido' && date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
            return acc + (s.final_value || 0);
          }
          return acc;
        }, 0);
        pedidosPendentes = localSales.filter((s: any) => s.status !== 'recebido' && s.status !== 'cancelado').length;

        // Compras
        comprasPendentes = localPurchases.filter((p: any) => p.status === 'enviado' || p.status === 'rascunho').length;
        ocAtrasadas = localPurchases.filter((p: any) => p.status === 'enviado' && p.expected_date && new Date(p.expected_date) < today).length;

        activity = [
          ...localForms.map((f: any) => {
            const date = f.created_at ? new Date(f.created_at) : new Date();
            return { type: 'formula' as const, name: f.name || 'Sem Nome', date: isNaN(date.getTime()) ? new Date() : date, id: f.id };
          }),
          ...localIngs.map((i: any) => {
            const date = i.created_at ? new Date(i.created_at) : new Date();
            return { type: 'insumo' as const, name: i.name || 'Sem Nome', date: isNaN(date.getTime()) ? new Date() : date };
          })
        ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5);
      }

      setRecentActivity(activity);
      setStats({
        totalInsumos,
        estoqueBaixo,
        valorEstoque,
        totalFormulas,
        custoMedio,
        ofsAtivas,
        ofsConcluidas,
        ofsAguardandoLab,
        taxaAprovacao,
        qualidadePendente,
        faturamentoMes,
        pedidosPendentes,
        totalClientes,
        ocAtrasadas,
        comprasPendentes,
        totalFornecedores,
      });
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Não foi possível carregar os dados do dashboard.');
    } finally {
      setIsLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return {
    stats,
    recentActivity,
    isLoading,
    error,
    refetch: fetchDashboardData,
  };
}
