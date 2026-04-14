import React from 'react';
import { Package, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

interface StatsProps {
  type: 'finished' | 'raw';
  finishedGoods: any[];
  fgLogs: any[];
  stats: any[];
  currentMonthLogs: any[];
}

export default function InventoryStats({ type, finishedGoods, fgLogs, stats, currentMonthLogs }: StatsProps) {
  if (type === 'finished') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total de Tipos Produzidos</div>
          <div className="text-3xl font-black text-slate-800">{finishedGoods.length}</div>
          <div className="text-[10px] text-slate-400 mt-1">Variações em estoque</div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Unidades Disponíveis</div>
          <div className="text-3xl font-black text-slate-800">
            {finishedGoods.reduce((acc, fg) => acc + (fg.stock_quantity || 0), 0).toLocaleString()}
          </div>
          <div className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-emerald-500" /> Prontos para expedição
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Entradas de Lote (Histórico)</div>
          <div className="text-3xl font-black text-slate-800">
            {fgLogs.filter(l => l.type === 'in').length}
          </div>
          <div className="text-[10px] text-blue-400 mt-1 flex items-center gap-1">
            <Package className="w-3 h-3 text-blue-500" /> Lotes recebidos
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 shrink-0">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total de Itens</div>
        <div className="text-3xl font-black text-slate-800">{stats.length}</div>
        <div className="text-[10px] text-slate-400 mt-1">Insumos cadastrados</div>
      </div>
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm border-l-4 border-l-red-500">
        <div className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Abaixo do Mínimo</div>
        <div className="text-3xl font-black text-slate-800">{stats.filter(s => s.estoque_atual < s.estoque_minimo).length}</div>
        <div className="text-[10px] text-red-400 mt-1 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> Requer compra urgente
        </div>
      </div>
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Entradas (Mês)</div>
        <div className="text-3xl font-black text-slate-800">
          {currentMonthLogs.filter(l => l.type === 'in').length}
        </div>
        <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
          <TrendingUp className="w-3 h-3 text-emerald-500" /> Reposição de estoque
        </div>
      </div>
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Saídas p/ OFs (Mês)</div>
        <div className="text-3xl font-black text-slate-800">
          {currentMonthLogs.filter(l => l.type === 'out').length}
        </div>
        <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
          <TrendingDown className="w-3 h-3 text-blue-500" /> Consumo em produção
        </div>
      </div>
    </div>
  );
}
