import React from 'react';
import { 
  Factory, Timer, Zap, CheckCircle2, 
  ShieldCheck, PackageCheck, ClipboardList, Beaker, 
  Package, Hash 
} from 'lucide-react';
import { ProductionOrder, Formula } from './types/production';
import { getStatusConfig, PROCESS_FLOW } from './utils/productionConstants';
import { fmt, getRiskIcons } from './utils/productionUtils';

interface ProductionDetailsViewProps {
  order: ProductionOrder;
  formula?: Formula;
  scaledIngredients: any[];
  onAdvance: () => void;
  onToggleStep: (stepKey: string) => void;
  onUpdateBatch: (ingId: string, batch: string) => void;
}

export const ProductionDetailsView: React.FC<ProductionDetailsViewProps> = ({
  order, formula, scaledIngredients, onAdvance, onToggleStep, onUpdateBatch
}) => {
  const cfg = getStatusConfig(order.status);
  const epiRisks = getRiskIcons(scaledIngredients);
  const stepsCompleted = (order.steps || []).filter(s => s.completed).length;
  const stepsTotal = (order.steps || []).length || 1;
  const allBatchesVerified = (order.ingredientBatches || []).every(b => b.verified);
  
  const ingredientsCost = scaledIngredients.reduce((acc, fi) => acc + fi.scaledQty * fi.unitCost, 0);
  const packagingCost = (order.packagingPlan || []).reduce((acc, p) => acc + (p.cost || 0) * p.quantity, 0);
  const totalCost = ingredientsCost + packagingCost;

  const elapsed = order.start_date
    ? Math.round((new Date(order.end_date || Date.now()).getTime() - new Date(order.start_date).getTime()) / 60000)
    : 0;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Header Info Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-[#202eac]/10 text-[#202eac] rounded-2xl flex items-center justify-center">
              <Factory className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800">OF: {order.batch_number}</h2>
              <p className="text-sm text-slate-500">
                {formula?.name} • {(formula?.version || 'v1.0').toLowerCase()} • {order.planned_volume}L
              </p>
              {order.operatorName && (
                <p className="text-xs text-slate-400 mt-1">
                  Operador: {order.operatorName} {order.equipmentId ? `• ${order.equipmentId}` : ''}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase border ${cfg.color}`}>
              {cfg.label}
            </span>
            {elapsed > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
                <Timer className="w-3.5 h-3.5" /> {elapsed} min
              </div>
            )}
          </div>
        </div>

        {/* EPI Alertas */}
        <div className="flex flex-wrap gap-2 mt-4">
          {epiRisks.map((r, i) => (
            <div key={i} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold border ${r.color}`}>
              {r.icon} {r.label}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Process Flow */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#202eac]" /> Fluxo de Processo
            </h3>
            <div className="space-y-1">
              {PROCESS_FLOW.map((pf, idx) => {
                const isCompleted = order.status === 'completed';
                const isActive = !isCompleted && pf.status === order.status;
                const isPast = isCompleted || cfg.step > idx;
                return (
                  <div key={pf.status} className="flex flex-col">
                    <div className={`flex items-center gap-3 p-3 rounded-xl transition-all ${isActive ? 'bg-[#202eac]/5 border border-[#202eac]/20' : isPast ? 'opacity-80' : 'opacity-40'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-black ${isPast ? 'bg-emerald-100 text-emerald-600' : isActive ? 'bg-[#202eac] text-white animate-pulse' : 'bg-slate-100 text-slate-400'}`}>
                        {isPast ? <CheckCircle2 className="w-4 h-4" /> : (idx + 1)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-[11px] font-bold ${isActive ? 'text-[#202eac]' : 'text-slate-600'}`}>{pf.label}</div>
                        <div className="text-[10px] text-slate-400 truncate">{pf.description}</div>
                      </div>
                    </div>
                    {idx < PROCESS_FLOW.length - 1 && (
                      <div className={`w-0.5 h-4 ml-[22px] ${isPast ? 'bg-emerald-300' : 'bg-slate-200'}`} />
                    )}
                  </div>
                );
              })}
            </div>

            {order.status !== 'completed' && order.status !== 'cancelled' && order.status !== 'quality_check' && (
              <button 
                onClick={onAdvance}
                className="w-full py-3 bg-[#202eac] text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-blue-800 transition-all shadow-lg shadow-blue-100"
              >
                Avançar Etapa
              </button>
            )}

            {order.status === 'quality_check' && (
              <div className="text-center p-4 bg-amber-50 rounded-xl border border-amber-200">
                <ShieldCheck className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                <div className="font-bold text-amber-800 text-sm">Aguardando Laudo Técnico</div>
                <p className="text-[10px] text-amber-600 mt-1">Acesse o módulo de Qualidade para liberar o lote.</p>
              </div>
            )}
          </div>

          {/* Checklist */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
             <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-amber-500" /> Checklist SOP
                </h3>
                <span className="text-[10px] font-bold text-slate-400">{stepsCompleted}/{stepsTotal}</span>
              </div>
              <div className="space-y-2">
                {(order.steps || []).map(step => (
                  <button 
                    key={step.key} 
                    onClick={() => onToggleStep(step.key)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${step.completed ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50 border-slate-100'}`}
                  >
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${step.completed ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300 text-transparent'}`}>
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    </div>
                    <span className={`text-[11px] font-medium ${step.completed ? 'text-emerald-700 line-through' : 'text-slate-700'}`}>
                      {step.label}
                    </span>
                  </button>
                ))}
              </div>
          </div>
        </div>

        {/* RIGHT: Table & Financials */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
             <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                  <Beaker className="w-4 h-4 text-purple-500" /> Insumos & Rastreabilidade
                </h3>
                {allBatchesVerified && (
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-200">
                    ✓ Tudo Rastreado
                  </span>
                )}
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-5">Insumo</th>
                      <th className="py-3 px-5 text-right">Qtd</th>
                      <th className="py-3 px-5 text-right">Subtotal</th>
                      <th className="py-3 px-5">Lote Fornecedor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {scaledIngredients.map(fi => {
                      const batch = (order.ingredientBatches || []).find(b => b.ingredientId === fi.ingredient_id);
                      return (
                        <tr key={fi.id}>
                          <td className="py-3 px-5 text-sm">
                            <div className="font-bold text-slate-800">{fi.variants?.name || fi.ingredients?.name}</div>
                            <div className="text-[10px] text-slate-400">{fi.ingredients?.produto_quimico ? '🧪 Químico' : '📦 Material'}</div>
                          </td>
                          <td className="py-3 px-5 text-right font-bold text-slate-700 text-sm">
                            {fi.scaledQty.toFixed(3)} {fi.ingredients?.unit}
                          </td>
                          <td className="py-3 px-5 text-right font-bold text-emerald-600 text-sm">
                            {fmt(fi.scaledQty * fi.unitCost)}
                          </td>
                          <td className="py-3 px-5">
                            <div className="flex items-center gap-2">
                              <input 
                                type="text" 
                                value={batch?.supplierBatch || ''} 
                                onChange={e => onUpdateBatch(fi.ingredient_id, e.target.value)}
                                placeholder="Registrar Lote"
                                className={`w-32 px-3 py-1.5 text-[10px] font-mono border rounded-lg outline-none transition-all ${
                                  batch?.verified ? 'bg-emerald-50 border-emerald-300' : 'bg-slate-50 border-slate-200'
                                }`} 
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                    <tr>
                      <td className="py-3 px-5 font-black text-slate-800 text-sm" colSpan={2}>Custo Total OF</td>
                      <td className="py-3 px-5 text-right font-black text-emerald-600 text-base">{fmt(totalCost)}</td>
                      <td className="py-3 px-5 text-[10px] text-slate-400">
                        {fmt(totalCost / (order.planned_volume || 1))}/L
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
             <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
                <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Custo/L</div>
                <div className="text-lg font-black text-[#202eac]">{fmt(totalCost / (order.planned_volume || 1))}</div>
             </div>
             <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
                <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Volume</div>
                <div className="text-lg font-black text-slate-800">{order.planned_volume}L</div>
             </div>
             <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
                <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Insumos</div>
                <div className="text-lg font-black text-slate-800">{scaledIngredients.length}</div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
