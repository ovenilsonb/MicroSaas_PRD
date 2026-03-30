import React from 'react';
import { Beaker, MoreVertical, Copy, Pencil, Trash2 } from 'lucide-react';
import { Formula } from './types';

interface FormulaCardProps {
  formula: Formula;
  onClick: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

const statusColors = {
  draft: { bg: 'bg-amber-100', text: 'text-amber-700' },
  active: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  archived: { bg: 'bg-slate-100', text: 'text-slate-500' },
};

export default function FormulaCard({ formula, onClick, onEdit, onDuplicate, onDelete }: FormulaCardProps) {
  const status = formula.status as keyof typeof statusColors;
  const colors = statusColors[status] || statusColors.draft;

  const calculateCost = () => {
    return formula.formula_ingredients?.reduce((sum, item) => {
      const vc = item.variants?.cost_per_unit || 0;
      const ic = item.ingredients?.cost_per_unit || 0;
      return sum + item.quantity * (Number(vc) || Number(ic) || 0);
    }, 0) || 0;
  };

  const custoBase = calculateCost();
  const custoPorLitro = formula.base_volume > 0 ? custoBase / formula.base_volume : 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg hover:border-blue-300 transition-all group">
      <div className="flex items-start justify-between mb-4">
        <div className={`px-3 py-1 rounded-full text-xs font-bold ${colors.bg} ${colors.text}`}>
          {status === 'draft' ? 'Rascunho' : status === 'active' ? 'Ativo' : 'Arquivado'}
        </div>
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <MoreVertical className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

      <h3 className="font-bold text-slate-800 text-lg mb-2 line-clamp-2">{formula.name}</h3>

      <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
        <span className="flex items-center gap-1">
          <Beaker className="w-3.5 h-3.5" />
          {formula.base_volume}L
        </span>
        <span className="flex items-center gap-1">
          {formula.formula_ingredients?.length || 0} itens
        </span>
        {formula.lm_code && (
          <span className="text-slate-400">{formula.lm_code}</span>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <div>
          <span className="text-xs text-slate-400 block">Custo/L</span>
          <span className="font-bold text-slate-700">
            {custoPorLitro.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="px-4 py-2 bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-600 rounded-lg text-sm font-medium transition-colors"
        >
          Editar
        </button>
      </div>
    </div>
  );
}
