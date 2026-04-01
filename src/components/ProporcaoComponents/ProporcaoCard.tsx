import React from 'react';
import { Beaker, Scale, ChevronRight } from 'lucide-react';
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
      className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col group cursor-pointer"
    >
      <div className="p-4 border-b border-slate-100">
        <div className="flex justify-between items-start mb-2">
          <div>
            {formula.lm_code && (
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-0.5 block">
                {formula.lm_code}
              </span>
            )}
            <h3 className="text-base font-bold text-slate-800 leading-tight group-hover:text-[#202eac] transition-colors">
              {formula.name}
            </h3>
          </div>
          <span className="text-[9px] font-bold bg-gradient-to-r from-[#202eac] to-[#4b5ce8] text-white px-1.5 py-0.5 rounded shadow-sm">
            {badge.toUpperCase()}
          </span>
        </div>

        <div className="flex items-center gap-3 mt-3 text-xs">
          <div className="flex items-center gap-1 text-slate-600 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">
            <Beaker className="w-3.5 h-3.5 text-blue-500" />
            <span className="font-semibold">{formula.base_volume}L</span>
          </div>
          <div className="flex items-center gap-1 text-slate-600 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">
            <Scale className="w-3.5 h-3.5 text-emerald-500" />
            <span className="font-semibold">{formula.formula_ingredients?.length || 0} itens</span>
          </div>
        </div>
      </div>

      <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <span className="text-xs text-slate-500 font-medium">Clique para calcular</span>
        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#202eac] transition-colors" />
      </div>
    </div>
  );
}
