import React from 'react';
import { PackageCheck, AlertCircle, TrendingUp } from 'lucide-react';
import { fmt } from './pricingUtils';

interface PricingStatsProps {
  stats: {
    total: number;
    priced: number;
    pending: number;
    avgMargin: number;
  };
}

export const PricingStats: React.FC<PricingStatsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Fórmulas Ativas */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-5">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-[#202eac]">
          <PackageCheck className="w-7 h-7" />
        </div>
        <div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Fórmulas Ativas</span>
          <span className="text-3xl font-black text-slate-800">{stats.total}</span>
        </div>
      </div>

      {/* Pendentes */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-5">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500">
          <AlertCircle className="w-7 h-7" />
        </div>
        <div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Pendentes</span>
          <span className="text-3xl font-black text-slate-800">{stats.pending}</span>
        </div>
      </div>

      {/* Margem Média */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-5">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500">
          <TrendingUp className="w-7 h-7" />
        </div>
        <div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Margem Média</span>
          <span className="text-3xl font-black text-slate-800">{stats.avgMargin.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
};
