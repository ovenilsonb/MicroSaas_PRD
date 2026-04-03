import React from 'react';
import { Beaker, Package, Copy, Trash2 } from 'lucide-react';
import { Ingredient } from './types';

interface InsumoGridProps {
  ingredients: Ingredient[];
  onOpenModal: (ingredient?: Ingredient) => void;
  onDuplicate: (ingredient: Ingredient) => void;
  onDelete: (id: string, name: string) => void;
  formatCurrency: (value: number) => string;
}

export default function InsumoGrid({ ingredients, onOpenModal, onDuplicate, onDelete, formatCurrency }: InsumoGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {ingredients.map((ing) => {
        const estoqueAtual = ing.estoque_atual || 0;
        const estoqueMinimo = ing.estoque_minimo || 0;
        const isEstoqueBaixo = estoqueAtual <= estoqueMinimo;
        const maxEstoqueVisual = estoqueMinimo > 0 ? estoqueMinimo * 3 : 100;
        const percentualEstoque = Math.min(100, Math.max(0, (estoqueAtual / (maxEstoqueVisual || 1)) * 100));

        return (
          <div
            key={ing.id}
            onClick={() => onOpenModal(ing)}
            className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group relative"
          >
            <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm rounded-lg p-1 shadow-sm border border-slate-100" onClick={(e) => e.stopPropagation()}>
              <button onClick={(e) => { e.stopPropagation(); onDuplicate(ing); }} className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors" title="Duplicar">
                <Copy className="w-4 h-4" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); onDelete(ing.id, ing.name); }} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Excluir">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                {ing.produto_quimico ? (
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <Beaker className="w-4.5 h-4.5" />
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                    <Package className="w-4.5 h-4.5" />
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-slate-800 uppercase line-clamp-1 pr-16 text-sm">{ing.name}</h3>
                  <p className="text-[10px] text-slate-400 italic">{ing.codigo || 'S/ CÓDIGO'}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100 col-span-2">
                <p className="text-[10px] text-slate-500 font-medium mb-1.5">Valor Unitário</p>
                {ing.tem_variantes && ing.variants && ing.variants.length > 0 ? (
                  <div className="flex flex-col gap-1">
                    {[...ing.variants].sort((a, b) => {
                      const costA = typeof a.cost_per_unit === 'string' ? parseFloat(a.cost_per_unit.replace(/\./g, '').replace(',', '.')) || 0 : a.cost_per_unit || 0;
                      const costB = typeof b.cost_per_unit === 'string' ? parseFloat(b.cost_per_unit.replace(/\./g, '').replace(',', '.')) || 0 : b.cost_per_unit || 0;
                      return costA - costB;
                    }).map((v, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[10px] bg-white px-2 py-1 rounded border border-slate-200">
                        <span className="text-slate-600 font-medium truncate max-w-[120px]" title={v.name}>{v.name}</span>
                        <span className="font-bold text-slate-800 ml-2">
                          {formatCurrency(typeof v.cost_per_unit === 'string' ? parseFloat(v.cost_per_unit.replace(/\./g, '').replace(',', '.')) || 0 : v.cost_per_unit || 0)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="font-bold text-slate-800 text-sm">{formatCurrency(ing.cost_per_unit)} <span className="text-[10px] font-normal text-slate-500">/ {ing.unit?.toUpperCase()}</span></p>
                )}
              </div>
              <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100 col-span-2">
                <p className="text-[10px] text-slate-500 font-medium mb-0.5">Fornecedor</p>
                <p className="font-bold text-slate-800 text-xs uppercase line-clamp-1">{ing.fornecedor || '-'}</p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] text-slate-500 font-medium">Estoque Atual</p>
                <p className={`text-xs font-bold ${isEstoqueBaixo ? 'text-red-500' : 'text-emerald-600'}`}>
                  {estoqueAtual.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 })} {ing.unit?.toUpperCase()}
                </p>
              </div>
              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden flex">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${isEstoqueBaixo ? 'bg-red-500' : 'bg-gradient-to-r from-amber-400 to-emerald-500'}`}
                  style={{ width: `${percentualEstoque}%` }}
                ></div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
