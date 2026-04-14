import React, { useState } from 'react';
import { 
  Plus, Beaker, CheckCircle2, Package, 
  PackageOpen, ChevronDown, Lightbulb, Minus, 
  PlusCircle, AlertTriangle 
} from 'lucide-react';
import { Formula, PackagingOption } from './types/production';
import { generateBatchNumber } from './utils/productionUtils';
import { usePackagingCalculator } from './hooks/usePackagingCalculator';

interface ProductionOrderFormProps {
  latestFormulas: Formula[];
  packagingOptions: PackagingOption[];
  isSaving: boolean;
  onSubmit: (orderData: any) => void;
}

export const ProductionOrderForm: React.FC<ProductionOrderFormProps> = ({
  latestFormulas, packagingOptions, isSaving, onSubmit
}) => {
  const [targetFormulaId, setTargetFormulaId] = useState('');
  const [plannedVolume, setPlannedVolume] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [operatorName, setOperatorName] = useState('');
  const [equipmentId, setEquipmentId] = useState('');
  const [packagingQty, setPackagingQty] = useState<Record<string, number>>({});
  const [showPackagingSection, setShowPackagingSection] = useState(false);

  const {
    packagingVolConsumed,
    packagingLeftover,
    packagingSuggestions,
    packagingPairs
  } = usePackagingCalculator(plannedVolume, packagingOptions, packagingQty);

  const handleSelectFormula = (id: string) => {
    setTargetFormulaId(id);
    const formula = latestFormulas.find(f => f.id === id);
    if (formula) {
      setPlannedVolume('');
      setBatchNumber(generateBatchNumber(formula.batch_prefix));
    }
  };

  const updatePackagingQty = (embKey: string, newQty: number, matchingRotulo: PackagingOption | null) => {
    setPackagingQty(prev => {
      const updated = { ...prev, [embKey]: Math.max(0, newQty) };
      if (matchingRotulo) {
        const rotuloKey = `${matchingRotulo.id}_${matchingRotulo.variant_id || 'base'}`;
        updated[rotuloKey] = Math.max(0, newQty);
      }
      return updated;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formula = latestFormulas.find(f => f.id === targetFormulaId);
    onSubmit({
      targetFormulaId,
      plannedVolume,
      batchNumber,
      operatorName,
      equipmentId,
      packagingQty,
      formula
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <Plus className="w-5 h-5 text-[#202eac]" /> Nova Ordem de Fabricação
          </h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {/* Formula Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-bold text-slate-700">Escolha a Fórmula</label>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Sempre a versão mais atual
              </span>
            </div>
            
            <div className="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {latestFormulas.map(f => (
                <button 
                  key={f.id} 
                  type="button" 
                  onClick={() => handleSelectFormula(f.id)}
                  className={`p-4 rounded-xl border-2 text-left transition-all flex items-center justify-between ${targetFormulaId === f.id ? 'border-[#202eac] bg-blue-50/50 ring-2 ring-blue-100' : 'border-slate-100 bg-slate-50 hover:border-slate-200'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${targetFormulaId === f.id ? 'bg-[#202eac] text-white' : 'bg-slate-200 text-slate-500'}`}>
                      <Beaker className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-800">{f.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {f.lm_code || 'S/C'} • {(f.version || 'v1.0').toLowerCase()} • {f.base_volume}L
                      </div>
                    </div>
                  </div>
                  {targetFormulaId === f.id && <CheckCircle2 className="w-5 h-5 text-[#202eac]" />}
                </button>
              ))}
            </div>
          </div>

          {targetFormulaId && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase">Volume do Lote (L)</label>
                  <input 
                    type="number" 
                    value={plannedVolume} 
                    onChange={e => setPlannedVolume(e.target.value)}
                    placeholder="DIGITE O VOLUME"
                    className={`w-full px-4 py-3 bg-white border rounded-xl outline-none font-black text-slate-800 transition-all ${
                      !plannedVolume ? 'border-amber-400 ring-2 ring-amber-50' : 'border-slate-200 focus:ring-2 focus:ring-[#202eac]/20'
                    }`} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase">Número do Lote</label>
                  <input 
                    type="text" 
                    value={batchNumber} 
                    onChange={e => setBatchNumber(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#202eac]/20 outline-none font-mono text-slate-800 uppercase" 
                  />
                </div>
              </div>

              {/* Packaging Section */}
              <div className="border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPackagingSection(!showPackagingSection)}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                    showPackagingSection ? 'border-[#202eac]/30 bg-blue-50/30' : 'border-dashed border-slate-200 hover:border-slate-300 bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${showPackagingSection ? 'bg-[#202eac] text-white' : 'bg-slate-200 text-slate-500'}`}>
                      <PackageOpen className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-sm text-slate-800">Distribuição de Envase</div>
                      <div className="text-[10px] text-slate-400">Opcional — Defina as embalagens</div>
                    </div>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${showPackagingSection ? 'rotate-180' : ''}`} />
                </button>

                {showPackagingSection && parseFloat(plannedVolume || '0') > 0 && (
                  <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-2">
                    {/* Volume Status Bar */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            packagingLeftover === 0 ? 'bg-emerald-500' : packagingLeftover < 0 ? 'bg-red-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${Math.min(100, (packagingVolConsumed / parseFloat(plannedVolume || '1')) * 100)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-slate-500">Alocado: {packagingVolConsumed.toFixed(1)}L</span>
                        {packagingLeftover === 0 ? (
                          <span className="text-emerald-600">Volume 100% Alocado ✓</span>
                        ) : (
                          <span className={packagingLeftover < 0 ? 'text-red-500' : 'text-amber-500'}>
                            {packagingLeftover > 0 ? `Sobra: ${packagingLeftover.toFixed(1)}L` : `Excesso: ${Math.abs(packagingLeftover).toFixed(1)}L`}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Suggestions */}
                    {packagingSuggestions.length > 0 && packagingVolConsumed === 0 && (
                      <div className="bg-blue-50 rounded-xl border border-blue-100 p-4">
                        <h4 className="text-[10px] font-bold text-[#202eac] uppercase mb-2 flex items-center gap-1">
                          <Lightbulb className="w-3 h-3" /> Sugestões Rápidas:
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {packagingSuggestions.slice(0, 3).map((combo, idx) => (
                            <button 
                              key={idx} 
                              type="button"
                              onClick={() => {
                                const newQty: Record<string, number> = {};
                                Object.entries(combo).forEach(([cap, qty]) => {
                                  const pair = packagingPairs.find(p => p.embalagem.capacity === parseFloat(cap));
                                  if (pair) {
                                    const key = `${pair.embalagem.id}_${pair.embalagem.variant_id || 'base'}`;
                                    newQty[key] = qty;
                                    if (pair.rotulo) {
                                      const rKey = `${pair.rotulo.id}_${pair.rotulo.variant_id || 'base'}`;
                                      newQty[rKey] = qty;
                                    }
                                  }
                                });
                                setPackagingQty(newQty);
                              }}
                              className="px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-[11px] font-bold text-slate-700 hover:border-[#202eac]"
                            >
                              Sugestão #{idx + 1}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Manual Selection */}
                    <div className="space-y-2">
                      {packagingPairs.map(({ embalagem: pkg, rotulo }) => {
                        const embKey = `${pkg.id}_${pkg.variant_id || 'base'}`;
                        const qty = packagingQty[embKey] || 0;
                        return (
                          <div key={embKey} className={`p-3 rounded-xl border transition-all ${qty > 0 ? 'border-[#202eac]/30 bg-blue-50/30' : 'border-slate-100 bg-white'}`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] ${qty > 0 ? 'bg-[#202eac] text-white' : 'bg-slate-100 text-slate-500'}`}>
                                  {pkg.capacity >= 1 ? `${pkg.capacity}L` : `${pkg.capacity * 1000}ml`}
                                </div>
                                <div className="text-sm font-bold text-slate-800">{pkg.name}</div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button type="button" onClick={() => updatePackagingQty(embKey, qty - 1, rotulo)} className="p-1 hover:bg-slate-200 rounded-md"><Minus className="w-4 h-4" /></button>
                                <span className="w-8 text-center font-bold">{qty}</span>
                                <button type="button" onClick={() => updatePackagingQty(embKey, qty + 1, rotulo)} className="p-1 hover:bg-slate-200 rounded-md"><PlusCircle className="w-4 h-4" /></button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <button 
            disabled={!targetFormulaId || isSaving || !plannedVolume} 
            className="w-full py-4 bg-[#202eac] hover:bg-blue-800 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-100 disabled:opacity-50 mt-4"
          >
            {isSaving ? 'Criando...' : 'Confirmar Lançamento de OF'}
          </button>
        </form>
      </div>
    </div>
  );
};
