import React from 'react';
import { ArrowDownAZ, ArrowUpZA, Pencil, Copy, Trash2 } from 'lucide-react';
import { Formula } from './types';
import { calculateTotalCost, formatCurrency } from './formulaUtils';

interface FormulaTableProps {
  formulas: Formula[];
  sortField: string;
  sortOrder: 'asc' | 'desc';
  onSort: (field: string) => void;
  onEdit: (formula: Formula) => void;
  onDuplicate: (formula: Formula) => void;
  onDelete: (id: string, name: string) => void;
  getStatusColor: (status: string) => string;
  getStatusText: (status: string) => string;
}

export const FormulaTable: React.FC<FormulaTableProps> = ({
  formulas,
  sortField,
  sortOrder,
  onSort,
  onEdit,
  onDuplicate,
  onDelete,
  getStatusColor,
  getStatusText
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm">
            <th className="py-4 px-6 font-semibold cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => onSort('name')}>
              <div className="flex items-center gap-2">
                Nome da Fórmula
                {sortField === 'name' && (sortOrder === 'asc' ? <ArrowDownAZ className="w-3.5 h-3.5" /> : <ArrowUpZA className="w-3.5 h-3.5" />)}
              </div>
            </th>
            <th className="py-4 px-6 font-semibold cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => onSort('group')}>
              <div className="flex items-center gap-2">
                Categoria
                {sortField === 'group' && (sortOrder === 'asc' ? <ArrowDownAZ className="w-3.5 h-3.5" /> : <ArrowUpZA className="w-3.5 h-3.5" />)}
              </div>
            </th>
            <th className="py-4 px-6 font-semibold cursor-pointer hover:bg-slate-100 transition-colors text-right" onClick={() => onSort('volume')}>
              <div className="flex items-center justify-end gap-2">
                Volume
                {sortField === 'volume' && (sortOrder === 'asc' ? <ArrowDownAZ className="w-3.5 h-3.5" /> : <ArrowUpZA className="w-3.5 h-3.5" />)}
              </div>
            </th>
            <th className="py-4 px-6 font-semibold cursor-pointer hover:bg-slate-100 transition-colors text-right" onClick={() => onSort('version')}>
              <div className="flex items-center justify-end gap-2">
                Versão
                {sortField === 'version' && (sortOrder === 'asc' ? <ArrowDownAZ className="w-3.5 h-3.5" /> : <ArrowUpZA className="w-3.5 h-3.5" />)}
              </div>
            </th>
            <th className="py-4 px-6 font-semibold text-center">Insumos</th>
            <th className="py-4 px-6 font-semibold cursor-pointer hover:bg-slate-100 transition-colors text-right" onClick={() => onSort('cost')}>
              <div className="flex items-center justify-end gap-2">
                Custo Total
                {sortField === 'cost' && (sortOrder === 'asc' ? <ArrowDownAZ className="w-3.5 h-3.5" /> : <ArrowUpZA className="w-3.5 h-3.5" />)}
              </div>
            </th>
            <th className="py-4 px-6 font-semibold cursor-pointer hover:bg-slate-100 transition-colors text-right" onClick={() => onSort('costPerLiter')}>
              <div className="flex items-center justify-end gap-2">
                Custo/Litro
                {sortField === 'costPerLiter' && (sortOrder === 'asc' ? <ArrowDownAZ className="w-3.5 h-3.5" /> : <ArrowUpZA className="w-3.5 h-3.5" />)}
              </div>
            </th>
            <th className="py-4 px-6 font-semibold cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => onSort('status')}>
              <div className="flex items-center gap-2">
                Status
                {sortField === 'status' && (sortOrder === 'asc' ? <ArrowDownAZ className="w-3.5 h-3.5" /> : <ArrowUpZA className="w-3.5 h-3.5" />)}
              </div>
            </th>
            <th className="py-4 px-6 font-semibold cursor-pointer hover:bg-slate-100 transition-colors text-right" onClick={() => onSort('updated_at')}>
              <div className="flex items-center justify-end gap-2">
                Atualizado em
                {sortField === 'updated_at' && (sortOrder === 'asc' ? <ArrowDownAZ className="w-3.5 h-3.5" /> : <ArrowUpZA className="w-3.5 h-3.5" />)}
              </div>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {formulas.map((formula) => {
            const totalCost = calculateTotalCost(formula.formula_ingredients || []);
            const costPerLiter = totalCost / (formula.base_volume || 1);
            const ingredientCount = formula.formula_ingredients?.length || 0;

            return (
              <tr key={formula.id} className="hover:bg-slate-50 transition-colors group cursor-pointer relative" onClick={() => onEdit(formula)}>
                <td className="py-4 px-6">
                  <div className="font-bold text-slate-800 group-hover:text-[#202eac] transition-colors">{formula.name}</div>
                  {formula.lm_code && <div className="text-[10px] text-slate-400 font-mono">LM: {formula.lm_code}</div>}
                </td>
                <td className="py-4 px-6 text-slate-600">
                  {formula.groups?.name || '-'}
                </td>
                <td className="py-4 px-6 text-slate-600 font-medium text-right">
                  {(formula.base_volume || 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} L
                </td>
                <td className="py-4 px-6 text-slate-500 font-mono text-xs text-right">
                  {formula.version}
                </td>
                <td className="py-4 px-6 text-center">
                  <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-[10px] font-bold">
                    {ingredientCount} itens
                  </span>
                </td>
                <td className="py-4 px-6 font-bold text-emerald-600 text-right">
                  {formatCurrency(totalCost)}
                </td>
                <td className="py-4 px-6 font-bold text-blue-600 text-right">
                  {formatCurrency(costPerLiter)}
                </td>
                <td className="py-4 px-6">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusColor(formula.status)}`}>
                    {getStatusText(formula.status)}
                  </span>
                </td>
                <td className="py-4 px-6 text-slate-400 text-xs text-right">
                  {new Date(formula.updated_at || formula.created_at).toLocaleDateString('pt-BR')}
                </td>

                <td className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all pointer-events-none group-hover:pointer-events-auto">
                  <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl p-1.5 shadow-xl">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(formula);
                      }}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicate(formula);
                      }}
                      className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                      title="Duplicar"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(formula.id, formula.name);
                      }}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
