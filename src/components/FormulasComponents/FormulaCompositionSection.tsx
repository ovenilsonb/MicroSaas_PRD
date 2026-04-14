import React from 'react';
import { Beaker, Search, X, Plus, Pencil, Package, AlertTriangle } from 'lucide-react';
import { FormulaIngredient, Formula } from './types';
import { formatCurrency, formatQuantity } from './formulaUtils';

interface FormulaCompositionSectionProps {
  currentFormula: Partial<Formula>;
  currentIngredients: FormulaIngredient[];
  totals: { cost: number; volume: number };
  ingSearchTerm: string;
  setIngSearchTerm: (val: string) => void;
  selectedIngId: string;
  setSelectedIngId: (val: string) => void;
  ingQuantity: string;
  setIngQuantity: (val: string) => void;
  isIngDropdownOpen: boolean;
  setIsIngDropdownOpen: (val: boolean) => void;
  highlightedIndex: number;
  setHighlightedIndex: (val: number) => void;
  filteredAndSortedIngredients: any[];
  qtyInputRef: React.RefObject<HTMLInputElement>;
  onAddIngredient: () => void;
  onRemoveIngredient: (index: number) => void;
  onEditIngredient: (item: FormulaIngredient, index: number) => void;
}

export const FormulaCompositionSection: React.FC<FormulaCompositionSectionProps> = ({
  currentFormula,
  currentIngredients,
  totals,
  ingSearchTerm,
  setIngSearchTerm,
  selectedIngId,
  setSelectedIngId,
  ingQuantity,
  setIngQuantity,
  isIngDropdownOpen,
  setIsIngDropdownOpen,
  highlightedIndex,
  setHighlightedIndex,
  filteredAndSortedIngredients,
  qtyInputRef,
  onAddIngredient,
  onRemoveIngredient,
  onEditIngredient
}) => {
  const selectedIngredient = filteredAndSortedIngredients.find(ing => {
    const [id, vId] = selectedIngId.split('|');
    return ing.id === id && (vId ? ing.variant_id === vId : !ing.variant_id);
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col flex-1">
      <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-xl">
        <h2 className="font-bold text-slate-800 flex items-center gap-2">
          <Beaker className="w-5 h-5 text-[#202eac]" /> Composição da Fórmula
          <span className="bg-[#202eac] text-white text-xs px-2 py-0.5 rounded-full ml-2">
            {currentIngredients.length} itens
          </span>
        </h2>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1">Custo Total da Fórmula</span>
            <span className="text-emerald-600 font-bold text-xl leading-none">
              {formatCurrency(totals.cost)}
            </span>
          </div>
          <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1 text-right">Volume Base</span>
            <span className="text-[#202eac] font-bold text-xl leading-none">
              {currentFormula.base_volume || 0} <span className="text-xs font-medium">L/Kg</span>
            </span>
          </div>
        </div>
      </div>

      {/* Add Ingredient Bar */}
      <div className="p-4 border-b border-slate-100 bg-white flex flex-col gap-3">
        <div className="flex gap-3 items-end">
          <div className="flex-1 relative">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Adicionar Insumo</label>
            <div
              className={`w-full px-3 py-2.5 bg-slate-50 border rounded-lg focus-within:bg-white focus-within:ring-2 transition-all flex items-center cursor-text ${selectedIngId && currentIngredients.some(i => i.ingredient_id === selectedIngId.split('|')[0] && i.variant_id === (selectedIngId.split('|')[1] || null))
                ? 'border-red-400 focus-within:ring-red-500/20 focus-within:border-red-500 animate-pulse'
                : 'border-slate-300 focus-within:ring-[#202eac]/20 focus-within:border-[#202eac]'
                }`}
              onClick={() => setIsIngDropdownOpen(true)}
            >
              <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
              <input
                type="text"
                placeholder="Pesquisar insumo (ex: agu)..."
                value={ingSearchTerm}
                onChange={e => {
                  setIngSearchTerm(e.target.value);
                  setIsIngDropdownOpen(true);
                  if (selectedIngId) setSelectedIngId('');
                }}
                onFocus={() => setIsIngDropdownOpen(true)}
                className="bg-transparent border-none outline-none w-full text-sm text-slate-800 placeholder:text-slate-400"
              />
              {selectedIngId && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedIngId('');
                    setIngSearchTerm('');
                  }}
                  className="ml-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {isIngDropdownOpen && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredAndSortedIngredients.length > 0 ? (
                  filteredAndSortedIngredients.map((ing, idx) => {
                    const uniqueId = ing.variant_id ? `${ing.id}|${ing.variant_id}` : `${ing.id}|`;
                    return (
                      <div
                        key={`${uniqueId}-${idx}`}
                        className={`px-4 py-2.5 cursor-pointer flex items-center justify-between border-b border-slate-50 last:border-0 transition-colors ${highlightedIndex === idx ? 'bg-[#202eac] text-white' : 'hover:bg-slate-50'
                          } ${selectedIngId === uniqueId && highlightedIndex !== idx ? 'bg-[#202eac]/5' : ''}`}
                        onClick={() => {
                          setSelectedIngId(uniqueId);
                          setIngSearchTerm(ing.displayName);
                          setIsIngDropdownOpen(false);
                          setHighlightedIndex(-1);
                          setTimeout(() => {
                            qtyInputRef.current?.focus();
                          }, 50);
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${ing.produto_quimico ? 'bg-amber-400' : 'bg-slate-300'}`}></div>
                          <div>
                            <div className={`font-medium text-sm ${highlightedIndex === idx ? 'text-white' : 'text-slate-800'}`}>{ing.displayName}</div>
                            {(ing.apelido || ing.codigo || ing.variant_codigo) && (
                              <div className={`text-[10px] italic ${highlightedIndex === idx ? 'text-blue-100' : 'text-slate-400'}`}>
                                {[ing.apelido, ing.codigo || ing.variant_codigo].filter(Boolean).join(' • ')}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className={`text-xs font-bold ${highlightedIndex === idx ? 'text-white' : 'text-slate-600'}`}>
                          {formatCurrency(ing.cost_per_unit)}/{ing.unit?.toUpperCase()}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="px-4 py-3 text-sm text-slate-500 text-center flex flex-col items-center gap-1">
                    {ingSearchTerm.length > 0 && ingSearchTerm.length < 2 ? (
                      <>
                        <span className="font-bold text-[#202eac]">Continue digitando...</span>
                        <span className="text-[10px]">Mínimo de 2 caracteres para pesquisar</span>
                      </>
                    ) : (
                      "Nenhum insumo encontrado."
                    )}
                  </div>
                )}
              </div>
            )}
            {selectedIngId && currentIngredients.some(i => i.ingredient_id === selectedIngId.split('|')[0] && i.variant_id === (selectedIngId.split('|')[1] || null)) && (
              <div className="absolute -bottom-5 left-0 text-[10px] font-bold text-red-500 flex items-center gap-1">
                Este insumo já foi adicionado à fórmula (a quantidade será atualizada).
              </div>
            )}
          </div>
          <div className="w-32">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Quantidade</label>
            <input
              type="text"
              value={ingQuantity}
              ref={qtyInputRef}
              onChange={e => setIngQuantity(e.target.value)}
              disabled={!selectedIngId}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all disabled:opacity-50"
              placeholder={selectedIngredient?.produto_quimico === false ? "0" : "0,000"}
            />
          </div>
          <button
            onClick={onAddIngredient}
            disabled={!selectedIngId || !ingQuantity}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> {selectedIngId && currentIngredients.some(i => i.ingredient_id === selectedIngId.split('|')[0] && i.variant_id === (selectedIngId.split('|')[1] || null)) ? 'Atualizar' : 'Adicionar'}
          </button>
        </div>
      </div>

      {/* Ingredients Tables */}
      <div className="flex-1 overflow-auto bg-slate-50/30 p-4 space-y-6">
        {/* Matérias-Primas (Químicos) */}
        <div>
          <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-400"></div>
            Matérias-Primas (Químicos)
          </h3>
          {currentIngredients.filter(item => item.ingredients?.produto_quimico).length === 0 ? (
            <div className="flex flex-col items-center justify-center text-slate-400 py-8 border-2 border-dashed border-slate-200 rounded-xl bg-white">
              <Beaker className="w-8 h-8 mb-2 text-slate-300" />
              <p className="font-medium text-slate-500 text-sm">Nenhuma matéria-prima adicionada</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Insumo</th>
                    <th className="py-3 px-4 text-right">Qtd Total</th>
                    <th className="py-3 px-4 text-center">%</th>
                    <th className="py-3 px-4 text-center">Unid.</th>
                    <th className="py-3 px-4 text-right">Val. Unit.</th>
                    <th className="py-3 px-4 text-right">Total</th>
                    <th className="py-3 px-4 text-center w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentIngredients.map((item, index) => {
                    if (!item.ingredients?.produto_quimico) return null;

                    const percentage = totals.volume > 0 ? (item.quantity / totals.volume) * 100 : 0;
                    const rawCost = item.variants?.cost_per_unit ?? item.ingredients?.cost_per_unit ?? 0;
                    const itemCostPerUnit = typeof rawCost === 'string'
                      ? parseFloat(rawCost.replace(/\./g, '').replace(',', '.')) || 0
                      : rawCost;
                    const cost = item.quantity * itemCostPerUnit;

                    return (
                      <tr key={index} className="hover:bg-slate-50 transition-colors group">
                        <td className="py-3 px-4 font-medium text-slate-800">
                          {item.ingredients?.name}
                          {item.variants && (
                            <span className="ml-2 text-xs text-slate-500 font-normal">
                              ({item.variants.name})
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-700">
                          {formatQuantity(item.quantity)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            {percentage.toFixed(2)}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center text-slate-500">
                          {item.ingredients?.unit?.toUpperCase()}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-500">
                          {formatCurrency(itemCostPerUnit)}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-800">
                          {formatCurrency(cost)}
                        </td>
                        <td className="py-3 px-4 text-center relative group-hover:bg-slate-50 transition-colors">
                          <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => onEditIngredient(item, index)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                              title="Editar"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onRemoveIngredient(index)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                              title="Remover"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Material de Embalagem (BOM) */}
        <div>
          <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-400"></div>
            Material de Embalagem (BOM)
          </h3>
          {currentIngredients.filter(item => !item.ingredients?.produto_quimico).length === 0 ? (
            <div className="flex flex-col items-center justify-center text-slate-400 py-8 border-2 border-dashed border-slate-200 rounded-xl bg-white">
              <Package className="w-8 h-8 mb-2 text-slate-300" />
              <p className="font-medium text-slate-500 text-sm">Nenhum material de embalagem adicionado</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Item</th>
                    <th className="py-3 px-4 text-right">Qtd</th>
                    <th className="py-3 px-4 text-center">Unid.</th>
                    <th className="py-3 px-4 text-right">Val. Unit.</th>
                    <th className="py-3 px-4 text-right">Total</th>
                    <th className="py-3 px-4 text-center w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentIngredients.map((item, index) => {
                    if (item.ingredients?.produto_quimico) return null;

                    const rawCost = item.variants?.cost_per_unit ?? item.ingredients?.cost_per_unit ?? 0;
                    const itemCostPerUnit = typeof rawCost === 'string'
                      ? parseFloat(rawCost.replace(/\./g, '').replace(',', '.')) || 0
                      : rawCost;
                    const cost = item.quantity * itemCostPerUnit;

                    return (
                      <tr key={index} className="hover:bg-slate-50 transition-colors group">
                        <td className="py-3 px-4 font-medium text-slate-800">
                          {item.ingredients?.name}
                          {item.variants && (
                            <span className="ml-2 text-xs text-slate-500 font-normal">
                              ({item.variants.name})
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-700">
                          {formatQuantity(item.quantity)}
                        </td>
                        <td className="py-3 px-4 text-center text-slate-500">
                          {item.ingredients?.unit?.toUpperCase()}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-500">
                          {formatCurrency(itemCostPerUnit)}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-slate-800">
                          {formatCurrency(cost)}
                        </td>
                        <td className="py-3 px-4 text-center relative group-hover:bg-slate-50 transition-colors">
                          <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => onEditIngredient(item, index)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                              title="Editar"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onRemoveIngredient(index)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                              title="Remover"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Warning Summary (Volume Mismatch) */}
        {Math.abs(totals.volume - (currentFormula.base_volume || 0)) > 0.001 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3 shadow-sm animate-pulse">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div className="flex-1">
              <p className="text-amber-800 text-sm font-bold">Divergência de Volume!</p>
              <p className="text-amber-700 text-xs">
                O volume total dos químicos ({formatQuantity(totals.volume)} L/Kg) difere do Volume Base ({currentFormula.base_volume || 0} L/Kg).
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
