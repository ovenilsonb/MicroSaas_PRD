import React from 'react';
import { Users, BadgeDollarSign, MapPin, TrendingUp } from 'lucide-react';

interface ClientStatsProps {
  stats: {
    totalClients: number;
    topPricing: string;
    topNeighborhood: string;
    totalInvestedPlaceholder: number;
  };
}

export function ClientStats({ stats }: ClientStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 group hover:border-[#202eac]/30 transition-all">
        <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
          <Users className="w-6 h-6 text-[#202eac]" />
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total de Clientes</p>
          <p className="text-2xl font-bold text-slate-800">{stats.totalClients}</p>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 group hover:border-emerald-200 transition-all">
        <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
          <BadgeDollarSign className="w-6 h-6 text-emerald-600" />
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tabela Principal</p>
          <p className="text-xl font-bold text-slate-800 uppercase">{stats.topPricing}</p>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 group hover:border-orange-200 transition-all">
        <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
          <MapPin className="w-6 h-6 text-orange-600" />
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Top Região (Bairro)</p>
          <p className="text-xl font-bold text-slate-800 line-clamp-1" title={stats.topNeighborhood}>{stats.topNeighborhood}</p>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 group hover:border-purple-200 transition-all">
        <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
          <TrendingUp className="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">LTV (Em Breve)</p>
          <p className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <span className="text-sm">R$</span> 0,00
          </p>
        </div>
      </div>
    </div>
  );
}
