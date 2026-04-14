import React from 'react';
import { Search, AlertTriangle } from 'lucide-react';
import { 
  Formula, 
  PricingEntry 
} from './types';
import { 
  fmt, 
  formatCapacity, 
  getFormulaCategory, 
  categoryColors, 
  getCapColor 
} from './pricingUtils';

interface PricingGridProps {
  formulas: Formula[];
  uniqueCapacities: number[];
  savedPricing: PricingEntry[];
  onOpenFormula: (formula: Formula) => void;
  getVolumePricingStatus: (id: string) => { priced: number; total: number };
}

export const PricingGrid: React.FC<PricingGridProps> = ({
  formulas,
  uniqueCapacities,
  savedPricing,
  onOpenFormula,
  getVolumePricingStatus
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {formulas.map(formula => {
        const cat = getFormulaCategory(formula);
        const catColor = categoryColors[cat] || categoryColors.Produtos;
        const volStatus = getVolumePricingStatus(formula.id);

        return (
          <button
            key={formula.id}
            onClick={() => onOpenFormula(formula)}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-[#202eac] hover:shadow-md transition-all text-left group"
          >
            {/* Header row: category + status */}
            <div className="flex items-center justify-between mb-3">
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${catColor.bg} ${catColor.text}`}>
                {cat}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${volStatus.priced === volStatus.total && volStatus.total > 0 ? 'bg-emerald-50 text-emerald-600' : volStatus.priced > 0 ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                {volStatus.priced}/{volStatus.total} volumes
              </span>
            </div>

            {/* Formula name and code */}
            <h3 className="font-bold text-slate-800 group-hover:text-[#202eac] transition-colors text-base flex flex-wrap items-center gap-2">
              {formula.name}
              <span className="text-[10px] bg-[#202eac] text-white px-1.5 py-0.5 rounded font-black border border-blue-100/50 shadow-sm shrink-0">V{(formula.version || '1').replace(/^v/i, '')}</span>
            </h3>
            <p className="text-xs text-slate-400 font-mono mt-0.5">{formula.lm_code || 'S/C'}</p>

            {/* Visual Progress Bar */}
            <div className="mt-4 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${volStatus.priced === volStatus.total ? 'bg-emerald-500' : 'bg-[#202eac]'}`}
                style={{ width: `${volStatus.total > 0 ? (volStatus.priced / volStatus.total) * 100 : 0}%` }}
              />
            </div>

            {/* Mini pricing table per volume */}
            <div className="mt-4 space-y-0 rounded-xl overflow-hidden border border-slate-100">
              {/* Header */}
              <div className="grid grid-cols-4 gap-0 text-[9px] font-black text-slate-400 uppercase tracking-wider bg-slate-50 px-3 py-2 border-b border-slate-100">
                <div>Volume</div>
                <div className="text-right">Varejo</div>
                <div className="text-right">Atacado</div>
                <div className="text-right">Fardo / Caixa</div>
              </div>
              {/* Rows per capacity */}
              {uniqueCapacities.map(cap => {
                const entry = savedPricing.find(e => e.formulaId === formula.id && e.capacityKey === String(cap));
                const hasPricing = entry && entry.varejoPrice > 0;
                const cc = getCapColor(cap);
                return (
                  <div key={cap} className={`grid grid-cols-4 gap-0 text-[11px] px-3 py-2 border-b border-slate-50 last:border-b-0 ${cc.bg}`}>
                    <div className={`font-black ${cc.text}`}>{formatCapacity(cap)}</div>
                    {hasPricing ? (
                      <>
                        <div className="text-right font-bold text-emerald-600">{fmt(entry!.varejoPrice)}</div>
                        <div className="text-right font-bold text-amber-600">{fmt(entry!.atacadoPrice)}</div>
                        <div className="text-right font-bold text-purple-600">{fmt(entry!.fardoPrice)}</div>
                      </>
                    ) : (
                      <>
                        <div className="text-right flex items-center justify-end"><AlertTriangle className="w-3 h-3 text-amber-400" /></div>
                        <div className="text-right flex items-center justify-end"><AlertTriangle className="w-3 h-3 text-amber-400" /></div>
                        <div className="text-right flex items-center justify-end"><AlertTriangle className="w-3 h-3 text-amber-400" /></div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </button>
        );
      })}
    </div>
  );
};
