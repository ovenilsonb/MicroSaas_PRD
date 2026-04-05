import React from 'react';
import { PackageCheck, AlertCircle, TrendingUp } from 'lucide-react';

interface PricingStatsProps {
  total: number;
  pending: number;
  avgMargin: number;
}

export default function PricingStats({ total, pending, avgMargin }: PricingStatsProps) {
  return (
    <>
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-5">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-[#202eac]">
          <PackageCheck className="w-7 h-7" />
        </div>
        <div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Fórmulas Ativas</span>
          <span className="text-3xl font-black text-slate-800">{total}</span>
        </div>
      </div>
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-5">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500">
          <AlertCircle className="w-7 h-7" />
        </div>
        <div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Pendentes</span>
          <span className="text-3xl font-black text-slate-800">{pending}</span>
        </div>
      </div>
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-5">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500">
          <TrendingUp className="w-7 h-7" />
        </div>
        <div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Margem Média</span>
          <span className="text-3xl font-black text-slate-800">{avgMargin.toFixed(1)}%</span>
        </div>
      </div>
    </>
  );
}
