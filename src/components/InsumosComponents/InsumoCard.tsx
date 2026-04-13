import React from 'react';
import { Beaker, Package, AlertTriangle, TrendingUp } from 'lucide-react';
import { Ingredient } from './types';

interface InsumoCardProps {
  ingredient: Ingredient;
  onClick: () => void;
}

const formatCurrency = (v: number) => 
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function InsumoCard({ ingredient, onClick }: InsumoCardProps) {
  const isLowStock = (ingredient.estoque_atual || 0) <= (ingredient.estoque_minimo || 0);
  const isChemical = ingredient.produto_quimico !== false;

  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          isChemical ? 'bg-blue-50 dark:bg-blue-900/30 text-[#202eac] dark:text-blue-400' : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
        }`}>
          {isChemical ? <Beaker className="w-5 h-5" /> : <Package className="w-5 h-5" />}
        </div>
        {isLowStock && (
          <div className="flex items-center gap-1 text-amber-600 text-xs font-medium">
            <AlertTriangle className="w-3.5 h-3.5" />
            Estoque Baixo
          </div>
        )}
      </div>

      <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-1 line-clamp-2">{ingredient.name}</h3>

      {ingredient.apelido && (
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">{ingredient.apelido}</p>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 mt-3">
        <div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 block">Custo/Unit</span>
          <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">
            {formatCurrency(ingredient.cost_per_unit || 0)}
          </span>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-slate-400 dark:text-slate-500 block">Estoque</span>
          <span className={`font-bold text-sm ${isLowStock ? 'text-amber-600 dark:text-amber-400' : 'text-slate-700 dark:text-slate-200'}`}>
            {ingredient.estoque_atual || 0} {ingredient.unit}
          </span>
        </div>
      </div>

      {ingredient.tem_variantes && ingredient.variants && ingredient.variants.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            {ingredient.variants.length} variante(s)
          </span>
        </div>
      )}
    </div>
  );
}
