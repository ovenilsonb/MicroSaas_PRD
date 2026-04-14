import React from 'react';
import { 
  Hash, Calendar, ChevronRight, Trash2, 
  Factory, Plus 
} from 'lucide-react';
import { ProductionOrder } from './types/production';
import { getStatusConfig } from './utils/productionConstants';

interface ProductionTableProps {
  orders: ProductionOrder[];
  onSelect: (order: ProductionOrder) => void;
  onDelete: (id: string) => void;
  onAddNew: () => void;
}

export const ProductionTable: React.FC<ProductionTableProps> = ({ 
  orders, onSelect, onDelete, onAddNew 
}) => {
  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto mt-10 shadow-sm">
        <div className="w-20 h-20 bg-blue-50 text-[#202eac] rounded-full flex items-center justify-center mx-auto mb-6">
          <Factory className="w-10 h-10" />
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">Nenhuma OF encontrada</h3>
        <p className="text-slate-500 mb-8">Crie uma nova ordem de fabricação para começar a produzir.</p>
        <button 
          onClick={onAddNew} 
          className="px-6 py-3 bg-[#202eac] hover:bg-blue-800 text-white font-bold rounded-xl transition-colors inline-flex items-center gap-2"
        >
          <Plus className="w-5 h-5" /> Nova OF
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider">
            <th className="py-4 px-6 font-bold">Lote / OF</th>
            <th className="py-4 px-6 font-bold">Produto / Fórmula</th>
            <th className="py-4 px-6 font-bold text-center">Volume</th>
            <th className="py-4 px-6 font-bold text-center">Progresso</th>
            <th className="py-4 px-6 font-bold text-center">Status</th>
            <th className="py-4 px-6 font-bold">Data</th>
            <th className="py-4 px-6 font-bold text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {orders.map(order => {
            const formula = order.formulaSnapshot;
            const stepsCompleted = (order.steps || []).filter(s => s.completed).length;
            const stepsTotal = (order.steps || []).length || 1;
            const cfg = getStatusConfig(order.status);
            
            return (
              <tr
                key={order.id}
                onClick={() => onSelect(order)}
                className="hover:bg-blue-50/50 transition-colors group cursor-pointer"
              >
                <td className="py-4 px-6">
                  <div className="font-bold text-slate-800 flex items-center gap-2">
                    <Hash className="w-3.5 h-3.5 text-slate-400" />
                    {order.batch_number}
                  </div>
                </td>
                <td className="py-4 px-6">
                  <div className="font-semibold text-slate-700">{formula?.name || '—'}</div>
                  <div className="text-[10px] text-slate-400 font-mono uppercase">
                    {formula?.lm_code || 'S/C'} • {(formula?.version || 'v1.0').toLowerCase()}
                  </div>
                </td>
                <td className="py-4 px-6 text-center font-bold text-slate-600">
                  {order.planned_volume}L
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center gap-2 justify-center">
                    <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#202eac] rounded-full transition-all duration-500" 
                        style={{ width: `${(stepsCompleted / stepsTotal) * 100}%` }} 
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold">{stepsCompleted}/{stepsTotal}</span>
                  </div>
                </td>
                <td className="py-4 px-6 text-center">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${cfg.color}`}>
                    {cfg.label}
                  </span>
                </td>
                <td className="py-4 px-6">
                  <div className="text-xs text-slate-500 flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" />
                    {new Date(order.created_at).toLocaleDateString('pt-BR')}
                  </div>
                </td>
                <td className="py-4 px-6 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); onSelect(order); }}
                      className="p-1.5 hover:bg-blue-100 text-[#202eac] bg-blue-50 rounded-lg transition-all"
                      title="Detalhes"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    {order.status === 'planned' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onDelete(order.id); }}
                        className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-all"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
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
