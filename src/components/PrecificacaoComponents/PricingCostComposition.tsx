import React from 'react';
import { Calculator, Plus, Minus, Package, DollarSign } from 'lucide-react';
import { Formula } from './types';
import { fmt, formatCapacity, parseCost } from './pricingUtils';

interface PricingCostCompositionProps {
  selectedFormula: Formula;
  selectedCapacity: number;
  fixedCostsPerUnit: number;
  onFixedCostsChange: (val: number) => void;
  showIngredients: boolean;
  onToggleIngredients: () => void;
  detailCalc: any;
}

export const PricingCostComposition: React.FC<PricingCostCompositionProps> = ({
  selectedFormula,
  selectedCapacity,
  fixedCostsPerUnit,
  onFixedCostsChange,
  showIngredients,
  onToggleIngredients,
  detailCalc
}) => {
  if (!detailCalc) return null;

  return (
    <div className="bg-white p-6 rounded-[28px] border border-slate-200 shadow-sm">
      <h3 className="font-bold text-slate-700 flex items-center gap-2 mb-5">
        <Calculator className="w-4 h-4 text-[#202eac]" />
        Composição de Custos ({formatCapacity(selectedCapacity)})
      </h3>
      <div className="grid grid-cols-4 gap-4 mb-4">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Custo Fórmula</span>
          <span className="text-lg font-black text-slate-800">{fmt(detailCalc.totalIngCost)}</span>
        </div>
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Rendimento</span>
          <span className="text-lg font-black text-slate-800">{detailCalc.rendimento} un</span>
        </div>
        <div>
          <span className={`text-[10px] font-bold uppercase tracking-wider block mb-1 px-2 py-0.5 rounded-md inline-block bg-emerald-50 text-emerald-600`}>
            Custo/Un ({formatCapacity(selectedCapacity)})
          </span>
          <span className="text-lg font-black text-emerald-600 block mt-1">{fmt(detailCalc.custoUnidade)}</span>
        </div>
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Custos Fixos/Un</span>
          <input
            type="number"
            value={fixedCostsPerUnit}
            onChange={e => onFixedCostsChange(parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-700 focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] outline-none"
            min={0}
            step={0.01}
            placeholder="0,00"
          />
        </div>
      </div>

      {/* Ingredients Composition Toggle */}
      <div className="mt-4 border-t border-slate-100 pt-4">
        <button
          onClick={onToggleIngredients}
          className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-[#202eac] transition-colors"
        >
          {showIngredients ? <Minus className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {showIngredients ? 'Esconder Composição' : 'Ver Composição (Ingredientes)'}
        </button>

        {showIngredients && (
          <div className="mt-4 space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">
              <div className="col-span-6">Ingrediente</div>
              <div className="col-span-3 text-right">Qtd ({formatCapacity(selectedCapacity)})</div>
              <div className="col-span-3 text-right">Custo</div>
            </div>
            {selectedFormula.formula_ingredients.map((fi, idx) => {
              const cost = parseCost(fi.variants?.cost_per_unit || fi.ingredients?.cost_per_unit);
              const qty = fi.quantity * (selectedCapacity / (selectedFormula.base_volume || 1));
              return (
                <div key={idx} className="grid grid-cols-12 gap-2 p-2 rounded-lg bg-slate-50 text-[11px] items-center border border-slate-100">
                  <div className="col-span-6 font-bold text-slate-700">{fi.ingredients?.name}</div>
                  <div className="col-span-3 text-right font-mono">{qty.toFixed(3)} {fi.ingredients?.unit}</div>
                  <div className="col-span-3 text-right font-bold text-slate-600">{fmt(qty * cost)}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 mt-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3 text-white">
            <DollarSign className="w-5 h-5 opacity-80" />
            <span className="font-bold text-sm">Custo por Unidade</span>
          </div>
          <span className="text-2xl font-black text-white">{fmt(detailCalc.custoTotal)}</span>
        </div>

        {/* Breakdown de custos */}
        <div className="grid grid-cols-1 gap-2 bg-white/10 rounded-xl p-3">
          <div className="flex justify-between items-center text-white/80 text-xs">
            <span className="flex items-center gap-2">
              <Package className="w-3.5 h-3.5" />
              Ingredientes
            </span>
            <span className="font-mono font-bold">{fmt(detailCalc.liquidCost)}</span>
          </div>
          <div className="flex justify-between items-center text-white/80 text-xs">
            <span className="flex items-center gap-2">
              <Package className="w-3.5 h-3.5" />
              Embalagem
            </span>
            <span className="font-mono font-bold">{fmt(detailCalc.pkgCost)}</span>
          </div>
          {detailCalc.labelCost > 0 && (
            <div className="flex justify-between items-center text-white/80 text-xs">
              <span className="flex items-center gap-2">
                <Package className="w-3.5 h-3.5" />
                Rótulo
              </span>
              <span className="font-mono font-bold">{fmt(detailCalc.labelCost)}</span>
            </div>
          )}
          {fixedCostsPerUnit > 0 && (
            <div className="flex justify-between items-center text-white/80 text-xs">
              <span className="flex items-center gap-2">
                <Calculator className="w-3.5 h-3.5" />
                Custos Fixos
              </span>
              <span className="font-mono font-bold">{fmt(fixedCostsPerUnit)}</span>
            </div>
          )}
          <div className="border-t border-white/20 pt-2 mt-1 flex justify-between items-center text-white text-xs font-bold">
            <span>Total</span>
            <span className="font-mono">{fmt(detailCalc.custoTotal)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
