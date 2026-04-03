import React from 'react';
import { Beaker, Package, TestTubes, Box, GripVertical, Pencil, Copy, Trash2 } from 'lucide-react';
import { Ingredient } from './types';

interface InsumoTableProps {
  ingredients: Ingredient[];
  sortField: keyof Ingredient;
  sortOrder: 'asc' | 'desc';
  onSort: (field: keyof Ingredient) => void;
  onOpenModal: (ingredient?: Ingredient) => void;
  onDuplicate: (ingredient: Ingredient) => void;
  onDelete: (id: string, name: string) => void;
  onDragStart: (id: string) => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDrop: (targetId: string) => void;
  onDragEnd: () => void;
  draggedId: string | null;
  dragOverId: string | null;
  formatCurrency: (value: number) => string;
}

export default function InsumoTable({
  ingredients, sortField, sortOrder, onSort,
  onOpenModal, onDuplicate, onDelete,
  onDragStart, onDragOver, onDrop, onDragEnd,
  draggedId, dragOverId, formatCurrency,
}: InsumoTableProps) {
  const getSortIndicator = (field: keyof Ingredient) => {
    if (sortField !== field) return '';
    return sortOrder === 'asc' ? ' ↑' : ' ↓';
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm uppercase">
            <th className="py-4 px-4 font-semibold w-8"></th>
            <th className="py-4 px-4 font-semibold w-32 text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => onSort('validade_indeterminada')}>
              Validade{getSortIndicator('validade_indeterminada')}
            </th>
            <th className="py-4 px-4 font-semibold text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => onSort('name')}>
              Nome / Código{getSortIndicator('name')}
            </th>
            <th className="py-4 px-4 font-semibold w-20 text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => onSort('unit')}>
              Unidade{getSortIndicator('unit')}
            </th>
            <th className="py-4 px-4 font-semibold w-32 text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => onSort('cost_per_unit')}>
              Valor{getSortIndicator('cost_per_unit')}
            </th>
            <th className="py-4 px-4 font-semibold w-24 text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => onSort('tem_variantes')}>
              Variantes{getSortIndicator('tem_variantes')}
            </th>
            <th className="py-4 px-4 font-semibold w-32 text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => onSort('fornecedor')}>
              Fornecedor{getSortIndicator('fornecedor')}
            </th>
            <th className="py-4 px-4 font-semibold w-32 text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => onSort('estoque_atual')}>
              Estoque{getSortIndicator('estoque_atual')}
            </th>
            <th className="py-4 px-4 font-semibold w-24 text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => onSort('produto_quimico')}>
              Tipo{getSortIndicator('produto_quimico')}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {ingredients.map((ing) => {
            const estoqueAtual = ing.estoque_atual || 0;
            const estoqueMinimo = ing.estoque_minimo || 0;
            const isEstoqueBaixo = estoqueAtual <= estoqueMinimo;
            const maxEstoqueVisual = estoqueMinimo > 0 ? estoqueMinimo * 3 : 100;
            const percentualEstoque = Math.min(100, Math.max(0, (estoqueAtual / (maxEstoqueVisual || 1)) * 100));

            let validityColor = 'bg-slate-300';
            let validityTitle = 'Validade Indeterminada';
            let validityText = 'Indeterminada';

            if (!ing.validade_indeterminada && typeof ing.expiry_date === 'string' && ing.expiry_date.includes('-')) {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const [year, month, day] = ing.expiry_date.split('-');
              const expDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
              const twoMonthsFromNow = new Date(today);
              twoMonthsFromNow.setMonth(twoMonthsFromNow.getMonth() + 2);
              validityText = `${day}/${month}/${year}`;

              if (expDate < today) {
                validityColor = 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]';
                validityTitle = 'Vencido';
              } else if (expDate <= twoMonthsFromNow) {
                validityColor = 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]';
                validityTitle = 'Próximo do vencimento';
              } else {
                validityColor = 'bg-emerald-500';
                validityTitle = 'Dentro do prazo';
              }
            } else if (!ing.validade_indeterminada) {
              validityTitle = 'Data de validade não informada';
              validityText = 'Não inf.';
              validityColor = 'bg-slate-200';
            }

            const isDragged = draggedId === ing.id;
            const isDragOver = dragOverId === ing.id;

            return (
              <tr
                key={ing.id}
                className={`hover:bg-blue-50/80 even:bg-slate-100/60 transition-colors group border-b border-slate-200/60 last:border-none cursor-pointer ${isDragged ? 'opacity-50' : ''} ${isDragOver ? 'bg-blue-50 border-t-2 border-t-[#202eac]' : ''}`}
                onClick={() => onOpenModal(ing)}
                draggable
                onDragStart={(e) => { e.stopPropagation(); onDragStart(ing.id); }}
                onDragOver={(e) => onDragOver(e, ing.id)}
                onDrop={(e) => { e.stopPropagation(); onDrop(ing.id); }}
                onDragEnd={onDragEnd}
              >
                <td className="py-3 px-2 cursor-grab active:cursor-grabbing" onClick={e => e.stopPropagation()}>
                  <GripVertical className="w-4 h-4 text-slate-300 group-hover:text-slate-500" />
                </td>
                <td className="py-3 px-4 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <div className={`w-3 h-3 rounded-full shrink-0 ${validityColor}`} title={validityTitle}></div>
                    <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">{validityText}</span>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="font-bold text-slate-800 uppercase">{ing.name}</div>
                  <div className="text-xs text-slate-400 mt-0.5 uppercase">{ing.codigo || 'Sem código'}</div>
                </td>
                <td className="py-4 px-4">
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg">
                    {ing.unit?.toUpperCase()}
                  </span>
                </td>
                <td className="py-4 px-4">
                  {ing.tem_variantes && Array.isArray(ing.variants) && ing.variants.length > 0 ? (
                    <div className="flex flex-col">
                      {(() => {
                        const costs = ing.variants
                          .filter(v => v !== null && v !== undefined)
                          .map(v => typeof v.cost_per_unit === 'string'
                            ? parseFloat(v.cost_per_unit.replace(/\./g, '').replace(',', '.')) || 0
                            : typeof v.cost_per_unit === 'number' ? v.cost_per_unit : 0);

                        if (costs.length === 0) return <span className="text-slate-400 text-sm">Sem valor</span>;

                        const minCost = Math.min(...costs);
                        const maxCost = Math.max(...costs);

                        if (minCost === maxCost || isNaN(minCost) || !isFinite(minCost)) {
                          return <span className="font-bold text-slate-800">{formatCurrency(isNaN(minCost) ? 0 : minCost === Infinity ? 0 : minCost)}</span>;
                        }
                        return (
                          <>
                            <span className="font-bold text-slate-800 text-sm">{formatCurrency(minCost)}</span>
                            <span className="text-xs text-slate-500">até {formatCurrency(maxCost)}</span>
                          </>
                        );
                      })()}
                    </div>
                  ) : (
                    <span className="font-bold text-slate-800">{formatCurrency(ing.cost_per_unit)}</span>
                  )}
                </td>
                <td className="py-4 px-4 text-center">
                  <span className={`px-2.5 py-1 text-[10px] font-bold rounded-lg uppercase ${ing.tem_variantes ? 'bg-emerald-100 text-emerald-700' : 'bg-purple-100 text-purple-700'}`}>
                    {ing.tem_variantes ? 'SIM' : 'NÃO'}
                  </span>
                </td>
                <td className="py-4 px-4 text-slate-600 text-sm">
                  <span className="px-2 py-1 bg-slate-50 rounded-md uppercase">{ing.fornecedor || '-'}</span>
                </td>
                <td className="py-4 px-4 text-center">
                  <div className={`font-bold ${isEstoqueBaixo ? 'text-red-600' : 'text-emerald-600'}`}>
                    {estoqueAtual.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 })}
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden flex">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${isEstoqueBaixo ? 'bg-red-500' : 'bg-gradient-to-r from-amber-400 to-emerald-500'}`}
                      style={{ width: `${percentualEstoque}%` }}
                    ></div>
                  </div>
                </td>
                <td className="py-3 px-4 text-center relative">
                  {ing.produto_quimico ? (
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center mx-auto" title="Produto Químico">
                      <TestTubes className="w-4.5 h-4.5" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-600 border border-slate-200 flex items-center justify-center mx-auto" title="Outros">
                      <Box className="w-4 h-4" />
                    </div>
                  )}
                  <div
                    className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm p-1 rounded-lg border border-slate-200 shadow-sm"
                    onClick={e => e.stopPropagation()}
                  >
                    <button onClick={(e) => { e.stopPropagation(); onOpenModal(ing); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Editar">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onDuplicate(ing); }} className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors" title="Duplicar">
                      <Copy className="w-4 h-4" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(ing.id, ing.name); }} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Excluir">
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
}
