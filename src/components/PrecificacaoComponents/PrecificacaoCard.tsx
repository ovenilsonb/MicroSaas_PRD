import React from 'react';
import { DollarSign, ChevronRight, Beaker, Package } from 'lucide-react';
import { Formula } from './types';
import { getFormulaCategory, categoryColors } from './usePrecificacaoData';

interface PrecificacaoCardProps {
  formula: Formula;
  onClick: () => void;
}

export default function PrecificacaoCard({ formula, onClick }: PrecificacaoCardProps) {
  const rawV = formula.version || 'V1';
  const badge = rawV.startsWith('V') ? rawV : `V${rawV}`;
  const category = getFormulaCategory(formula.name);
  const colors = categoryColors[category] || categoryColors.Produtos;

  const calculateCost = () => {
    return formula.formula_ingredients.reduce((sum, item) => {
      const vc = item.variants?.cost_per_unit || 0;
      const ic = item.ingredients?.cost_per_unit || 0;
      return sum + item.quantity * (vc || ic);
    }, 0);
  };

  const custoBase = calculateCost();
  const custoPorLitro = formula.base_volume > 0 ? custoBase / formula.base_volume : 0;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-[48px] border border-slate-200 p-8 hover:shadow-[0_20px_60px_rgba(32,46,172,0.1)] hover:border-[#202eac]/40 transition-all cursor-pointer group relative overflow-hidden"
    >
      <div className="absolute -right-8 -bottom-8 opacity-[0.04] group-hover:scale-110 transition-transform">
        <DollarSign className="w-40 h-40 text-[#202eac]" />
      </div>

      <div className="flex items-center justify-between mb-6">
        <span className={`text-[10px] px-3 py-1.5 rounded-full font-black shadow-sm ${colors.bg} ${colors.text}`}>
          {category}
        </span>
        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
          {formula.lm_code || 'SEM CÓD'}
        </span>
      </div>

      <h3 className="text-2xl font-black text-slate-800 mb-3 group-hover:text-[#202eac] transition-colors">
        {formula.name}
      </h3>

      <div className="flex items-center gap-6 text-[11px] font-bold text-slate-400 mb-6 uppercase">
        <span className="flex items-center gap-2">
          <Beaker className="w-4 h-4" /> {formula.base_volume}L
        </span>
        <span className="flex items-center gap-2">
          <Package className="w-4 h-4" /> {formula.formula_ingredients?.length || 0} itens
        </span>
      </div>

      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl mb-6">
        <div>
          <span className="text-[9px] text-slate-400 font-bold uppercase block">Custo Base</span>
          <span className="text-lg font-black text-slate-700">
            {custoBase.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
        </div>
        <div className="text-right">
          <span className="text-[9px] text-slate-400 font-bold uppercase block">Custo/L</span>
          <span className="text-lg font-black text-slate-700">
            {custoPorLitro.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
        </div>
      </div>

      <div className={`p-4 rounded-2xl flex items-center justify-between font-bold transition-all ${
        formula.status === 'active' 
          ? 'bg-emerald-50 text-emerald-700' 
          : 'bg-slate-100 text-slate-500'
      }`}>
        <span className="text-[10px] uppercase tracking-wider">
          {formula.status === 'active' ? 'Ativo' : formula.status}
        </span>
        <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
      </div>
    </div>
  );
}
