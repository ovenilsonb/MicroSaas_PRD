import React, { useState, useMemo, useEffect } from 'react';
import { X, CheckCircle2, AlertTriangle, ChevronRight, Package, Square, CheckSquare } from 'lucide-react';
import { Formula, PricingEntry } from './types';

interface PricingListModalProps {
  isOpen: boolean;
  onClose: () => void;
  formulas: Formula[];
  savedPricing: PricingEntry[];
  uniqueCapacities: number[];
  onSelectFormula: (formula: Formula, capacity?: number) => void;
  onUpdatePricing: (entries: PricingEntry[]) => void;
  showToast?: (type: 'success' | 'error' | 'info', title: string, message: string) => void;
}

const formatCapacity = (cap: number): string => {
  if (cap >= 1) return `${cap}L`;
  return `${cap * 1000}ml`;
};

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function PricingListModal({
  isOpen,
  onClose,
  formulas,
  savedPricing,
  uniqueCapacities,
  onSelectFormula,
  onUpdatePricing,
  showToast,
}: PricingListModalProps) {
  const [selectedFormulaId, setSelectedFormulaId] = useState<string>('');
  const [enabledCapacities, setEnabledCapacities] = useState<Set<string>>(new Set());
  const [localPricing, setLocalPricing] = useState<PricingEntry[]>([]);

  useEffect(() => {
    setLocalPricing(savedPricing);
  }, [savedPricing, selectedFormulaId]);

  const selectedFormula = useMemo(() => 
    formulas.find(f => f.id === selectedFormulaId),
    [formulas, selectedFormulaId]
  );

  const formulaPricing = useMemo(() => {
    if (!selectedFormula) return [];
    return uniqueCapacities.map(cap => {
      const key = String(cap);
      const entry = localPricing.find(e => e.formulaId === selectedFormula.id && e.capacityKey === key);
      return {
        capacity: cap,
        key,
        isEnabled: enabledCapacities.has(key),
        isPriced: entry && entry.varejoPrice > 0,
        entry,
      };
    });
  }, [selectedFormula, localPricing, uniqueCapacities, enabledCapacities]);

  const precificadasCount = useMemo(() => {
    const formulasWithPricing = new Set<string>();
    localPricing.forEach(e => {
      if (e.varejoPrice > 0) formulasWithPricing.add(e.formulaId);
    });
    return formulasWithPricing.size;
  }, [localPricing]);

  const handleToggleCapacity = (cap: number, key: string) => {
    const newEnabled = new Set(enabledCapacities);
    if (newEnabled.has(key)) {
      newEnabled.delete(key);
    } else {
      newEnabled.add(key);
    }
    setEnabledCapacities(newEnabled);
  };

  const handleSaveEnabled = () => {
    if (!selectedFormula) return;
    
    const currentFormulaEntries = localPricing.filter(e => e.formulaId === selectedFormula.id);
    const enabledEntries = currentFormulaEntries.filter(e => enabledCapacities.has(e.capacityKey));
    
    const otherFormulasEntries = localPricing.filter(e => e.formulaId !== selectedFormula.id);
    const newPricing = [...otherFormulasEntries, ...enabledEntries];
    
    setLocalPricing(newPricing);
    onUpdatePricing(newPricing);
    showToast?.('success', 'Salvo!', 'Seleção de embalagens atualizada.');
  };

  const handleOpenPricing = (cap: number, isPriced: boolean) => {
    if (!selectedFormula) return;
    onSelectFormula(selectedFormula, cap);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-slate-800">Fórmulas Precificadas</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 space-y-4">
          {/* Summary */}
          <div className="bg-emerald-50 rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <span className="text-sm text-slate-500 block">Total de fórmulas precificadas</span>
              <span className="text-2xl font-black text-emerald-700">{precificadasCount}</span>
            </div>
          </div>

          {/* Formula Selector */}
          <div>
            <label className="text-sm font-bold text-slate-600 block mb-2">
              Selecionar Fórmula
            </label>
            <select
              value={selectedFormulaId}
              onChange={(e) => {
                setSelectedFormulaId(e.target.value);
                setEnabledCapacities(new Set());
              }}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] outline-none bg-white"
            >
              <option value="">Selecione uma fórmula...</option>
              {formulas.map(f => (
                <option key={f.id} value={f.id}>
                  {f.name} {f.lm_code ? `(${f.lm_code})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Capacity Table with Checkbox */}
          {selectedFormula && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-slate-500" />
                  <span className="text-sm font-bold text-slate-700">Embalagens</span>
                </div>
                <button
                  onClick={handleSaveEnabled}
                  className="px-3 py-1.5 bg-[#202eac] text-white text-xs font-bold rounded-lg hover:bg-blue-800 transition-colors"
                >
                  Salvar Seleções
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-12">
                        <CheckSquare className="w-4 h-4" />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Embalagem</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-emerald-600 uppercase tracking-wider">Varejo</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-amber-600 uppercase tracking-wider">Atacado</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-purple-600 uppercase tracking-wider">Fardo</th>
                      <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {formulaPricing.map(({ capacity, key, isEnabled, isPriced, entry }) => (
                      <tr key={key} className={isPriced ? 'bg-white' : 'bg-amber-50/50'}>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleToggleCapacity(capacity, key)}
                            className={`p-1 rounded transition-colors ${
                              isEnabled 
                                ? 'text-[#202eac] hover:bg-blue-50' 
                                : 'text-slate-300 hover:text-slate-400 hover:bg-slate-50'
                            }`}
                            title={isEnabled ? 'Desmarcar' : 'Marcar para precificar'}
                          >
                            {isEnabled ? (
                              <CheckSquare className="w-5 h-5" />
                            ) : (
                              <Square className="w-5 h-5" />
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`font-bold ${isEnabled ? 'text-slate-700' : 'text-slate-400'}`}>
                              {formatCapacity(capacity)}
                            </span>
                            {!isEnabled && (
                              <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                Desativado
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {isPriced && entry ? (
                            <span className="font-bold text-emerald-600">{fmt(entry.varejoPrice)}</span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {isPriced && entry ? (
                            <span className="font-bold text-amber-600">{fmt(entry.atacadoPrice)}</span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {isPriced && entry ? (
                            <span className="font-bold text-purple-600">{fmt(entry.fardoPrice)}</span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isPriced ? (
                            <button
                              onClick={() => handleOpenPricing(capacity, true)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors cursor-pointer"
                            >
                              <CheckCircle2 className="w-3 h-3" /> OK
                            </button>
                          ) : isEnabled ? (
                            <button
                              onClick={() => handleOpenPricing(capacity, false)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors cursor-pointer"
                            >
                              <AlertTriangle className="w-3 h-3" /> Precificar
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-400">
                              <Square className="w-3 h-3" /> Inativo
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {selectedFormula && (
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
            <button
              onClick={() => {
                onSelectFormula(selectedFormula);
                onClose();
              }}
              className="w-full py-3 bg-[#202eac] text-white rounded-xl font-bold hover:bg-blue-800 transition-colors flex items-center justify-center gap-2"
            >
              Editar Precificação <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
