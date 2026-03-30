import React from 'react';
import { Beaker, Scale, Calculator, ChevronRight } from 'lucide-react';
import { Formula } from './types';
import { formatVersion } from '../../lib/formatters';

interface ProporcaoCardProps {
  formula: Formula;
  onClick: () => void;
}

export default function ProporcaoCard({ formula, onClick }: ProporcaoCardProps) {
  const badge = formatVersion(formula.version);

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-[64px] border border-slate-200 p-12 hover:shadow-[0_45px_100px_rgba(32,46,172,0.12)] hover:border-[#202eac]/60 transition-all cursor-pointer group relative overflow-hidden ring-1 ring-slate-100 active:scale-[0.98]"
    >
      <div className="absolute -right-12 -bottom-12 opacity-[0.04] group-hover:scale-[1.15] group-hover:rotate-12 transition-all duration-700">
        <Calculator className="w-56 h-56 text-[#202eac]" />
      </div>
      <div className="flex items-center justify-between mb-10">
        <span className="text-[11px] bg-[#202eac] text-white px-4 py-1.5 rounded-full font-black shadow-lg shadow-blue-100">
          {badge}
        </span>
        <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
          {formula.lm_code || 'LABORD'}
        </span>
      </div>
      <h3 className="text-3xl font-black text-slate-900 group-hover:text-[#202eac] mb-4 leading-tight transition-colors">
        {formula.name}
      </h3>
      <div className="flex items-center gap-6 text-[11px] font-black text-slate-400 mb-12 uppercase">
        <span className="flex items-center gap-2.5">
          <Beaker className="w-5 h-5 text-emerald-500" /> {formula.base_volume}L
        </span>
        <span className="flex items-center gap-2.5">
          <Scale className="w-5 h-5 text-[#202eac]" /> {formula.formula_ingredients?.length || 0} Itens
        </span>
      </div>
      <div className="p-6 bg-slate-50 rounded-[32px] group-hover:bg-[#202eac] transition-all flex items-center justify-center gap-4 font-black group-hover:text-white group-hover:translate-y-[-6px] shadow-sm group-hover:shadow-2xl group-hover:shadow-blue-200">
        <Calculator className="w-6 h-6" />
        <span className="uppercase tracking-widest text-[11px]">Dimensionar</span>
        <ChevronRight className="w-5 h-5 group-hover:translate-x-2 transition-all" />
      </div>
    </div>
  );
}
