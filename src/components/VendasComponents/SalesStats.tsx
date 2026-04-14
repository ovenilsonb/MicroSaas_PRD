import React, { useMemo } from 'react';
import { ShoppingBag, PackageOpen, Undo2, Package, Clock, DollarSign } from 'lucide-react';
import { SaleOrder, SaleStatus } from './types';

interface SalesStatsProps {
  orders: SaleOrder[];
  statusFilter: string;
  setStatusFilter: (filter: any) => void;
}

export function SalesStats({ orders, statusFilter, setStatusFilter }: SalesStatsProps) {
  const stats = useMemo(() => {
    const totalRevenue = orders
      .filter(o => o.status === 'recebido')
      .reduce((acc, curr) => acc + curr.final_value, 0);

    return {
      total: orders.length,
      revenue: totalRevenue,
      waitingProduction: orders.filter(o => o.status === 'producao').length,
      needsReproduction: orders.filter(o => o.status === 'reproducao').length,
      waitingAction: orders.filter(o => o.status === 'separacao').length,
      pendingReceipt: orders.filter(o => o.status === 'transito' || o.status === 'retirada').length
    };
  }, [orders]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
      <div 
        onClick={() => setStatusFilter('todos')}
        className={`p-5 rounded-2xl border transition-all cursor-pointer group shadow-sm flex flex-col justify-between min-h-[110px] ${statusFilter === 'todos' ? 'bg-[#202eac] border-[#202eac] text-white' : 'bg-white border-slate-200 hover:border-[#202eac]/30'}`}
      >
        <div className="flex justify-between items-start">
          <div className={`p-2 rounded-lg ${statusFilter === 'todos' ? 'bg-white/20' : 'bg-blue-50 text-[#202eac]'}`}>
            <ShoppingBag className="w-5 h-5" />
          </div>
          <span className={`text-2xl font-black ${statusFilter === 'todos' ? 'text-white' : 'text-slate-800'}`}>{stats.total}</span>
        </div>
        <p className={`text-[10px] font-bold uppercase tracking-wider ${statusFilter === 'todos' ? 'text-blue-100' : 'text-slate-500'}`}>Total de Pedidos</p>
      </div>

      <div 
        onClick={() => setStatusFilter('producao')}
        className={`p-5 rounded-2xl border transition-all cursor-pointer group shadow-sm flex flex-col justify-between min-h-[110px] ${statusFilter === 'producao' ? 'bg-amber-500 border-amber-500 text-white' : 'bg-white border-slate-200 hover:border-amber-300'}`}
      >
        <div className="flex justify-between items-start">
          <div className={`p-2 rounded-lg ${statusFilter === 'producao' ? 'bg-white/20' : 'bg-amber-50 text-amber-600'}`}>
            <PackageOpen className="w-5 h-5" />
          </div>
          <span className={`text-2xl font-black ${statusFilter === 'producao' ? 'text-white' : 'text-slate-800'}`}>{stats.waitingProduction}</span>
        </div>
        <p className={`text-[10px] font-bold uppercase tracking-wider ${statusFilter === 'producao' ? 'text-amber-50' : 'text-slate-500'}`}>Aguardando Produção</p>
      </div>

      <div 
        onClick={() => setStatusFilter('reproducao')}
        className={`p-5 rounded-2xl border transition-all cursor-pointer group shadow-sm flex flex-col justify-between min-h-[110px] ${statusFilter === 'reproducao' ? 'bg-orange-600 border-orange-600 text-white' : 'bg-white border-slate-200 hover:border-orange-300'}`}
      >
        <div className="flex justify-between items-start">
          <div className={`p-2 rounded-lg ${statusFilter === 'reproducao' ? 'bg-white/20' : 'bg-orange-50 text-orange-600'}`}>
            <Undo2 className="w-5 h-5" />
          </div>
          <span className={`text-2xl font-black ${statusFilter === 'reproducao' ? 'text-white' : 'text-slate-800'}`}>{stats.needsReproduction}</span>
        </div>
        <p className={`text-[10px] font-bold uppercase tracking-wider ${statusFilter === 'reproducao' ? 'text-orange-50' : 'text-slate-500'}`}>Refazer (Qualidade)</p>
      </div>

      <div 
        onClick={() => setStatusFilter('separacao')}
        className={`p-5 rounded-2xl border transition-all cursor-pointer group shadow-sm flex flex-col justify-between min-h-[110px] ${statusFilter === 'separacao' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 hover:border-blue-300'}`}
      >
        <div className="flex justify-between items-start">
          <div className={`p-2 rounded-lg ${statusFilter === 'separacao' ? 'bg-white/20' : 'bg-blue-50 text-blue-600'}`}>
            <Package className="w-5 h-5" />
          </div>
          <span className={`text-2xl font-black ${statusFilter === 'separacao' ? 'text-white' : 'text-slate-800'}`}>{stats.waitingAction}</span>
        </div>
        <p className={`text-[10px] font-bold uppercase tracking-wider ${statusFilter === 'separacao' ? 'text-blue-50' : 'text-slate-500'}`}>Disponível p/ Separar</p>
      </div>

      <div 
        onClick={() => setStatusFilter('pendente_recebimento')}
        className={`p-5 rounded-2xl border transition-all cursor-pointer group shadow-sm flex flex-col justify-between min-h-[110px] ${statusFilter === 'pendente_recebimento' ? 'bg-cyan-600 border-cyan-600 text-white' : 'bg-white border-slate-200 hover:border-cyan-300'}`}
      >
        <div className="flex justify-between items-start">
          <div className={`p-2 rounded-lg ${statusFilter === 'pendente_recebimento' ? 'bg-white/20' : 'bg-cyan-50 text-cyan-600'}`}>
            <Clock className="w-5 h-5" />
          </div>
          <span className={`text-2xl font-black ${statusFilter === 'pendente_recebimento' ? 'text-white' : 'text-slate-800'}`}>{stats.pendingReceipt}</span>
        </div>
        <p className={`text-[10px] font-bold uppercase tracking-wider ${statusFilter === 'pendente_recebimento' ? 'text-cyan-50' : 'text-slate-500'}`}>Pendente Recebimento</p>
      </div>

      <div className="p-5 rounded-2xl border shadow-sm flex flex-col justify-between min-h-[110px] bg-emerald-50 border-emerald-100">
        <div className="flex justify-between items-start">
          <div className="p-2 rounded-lg bg-emerald-100 text-emerald-600">
            <DollarSign className="w-5 h-5" />
          </div>
          <span className="text-xl font-black text-emerald-800 tracking-tighter">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.revenue)}
          </span>
        </div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Faturamento (Mês)</p>
      </div>
    </div>
  );
}
