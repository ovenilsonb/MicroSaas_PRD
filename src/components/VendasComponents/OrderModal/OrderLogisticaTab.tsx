import React from 'react';
import { Truck, MapPin, Calendar, FileText } from 'lucide-react';
import { SaleOrder } from '../types';

interface OrderLogisticaTabProps {
  currentOrder: Partial<SaleOrder>;
  setCurrentOrder: (order: any) => void;
}

export function OrderLogisticaTab({
  currentOrder,
  setCurrentOrder
}: OrderLogisticaTabProps) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Método de Logística *</label>
          <div className="grid grid-cols-2 gap-3">
            <button 
              type="button"
              onClick={() => setCurrentOrder((prev: any) => ({ ...prev, delivery_method: 'entrega' }))}
              className={`p-4 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${currentOrder.delivery_method === 'entrega' ? 'bg-blue-50 border-[#202eac] text-[#202eac]' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
            >
              <div className={`p-3 rounded-2xl ${currentOrder.delivery_method === 'entrega' ? 'bg-[#202eac] text-white shadow-lg shadow-blue-200' : 'bg-slate-50'}`}>
                <Truck className="w-6 h-6" />
              </div>
              <span className="text-sm font-bold uppercase tracking-widest">Entrega</span>
            </button>
            <button 
              type="button"
              onClick={() => setCurrentOrder((prev: any) => ({ ...prev, delivery_method: 'retirada' }))}
              className={`p-4 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${currentOrder.delivery_method === 'retirada' ? 'bg-indigo-50 border-indigo-700 text-indigo-700' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
            >
              <div className={`p-3 rounded-2xl ${currentOrder.delivery_method === 'retirada' ? 'bg-indigo-700 text-white shadow-lg shadow-indigo-200' : 'bg-slate-50'}`}>
                <MapPin className="w-6 h-6" />
              </div>
              <span className="text-sm font-bold uppercase tracking-widest">Retirada</span>
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Previsão de Entrega / Retirada</label>
          <div className="relative">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="date" 
              className="w-full h-14 bg-white border border-slate-100 rounded-3xl pl-12 pr-6 outline-none focus:border-[#202eac] transition-all font-bold text-slate-700 uppercase shadow-sm"
              value={currentOrder.expected_delivery_date || ''}
              onChange={(e) => setCurrentOrder((prev: any) => ({ ...prev, expected_delivery_date: e.target.value }))}
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <FileText className="w-4 h-4 text-slate-400" />
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Notas Comerciais e Logísticas</label>
        </div>
        <textarea 
          className="w-full h-32 bg-white border border-slate-100 rounded-3xl p-6 outline-none focus:border-[#202eac] transition-all font-medium text-slate-700 custom-scrollbar uppercase text-xs shadow-sm"
          placeholder="Ex: Deixar na portaria, cliente paga frete, etc..."
          value={currentOrder.notes || ''}
          onChange={(e) => setCurrentOrder((prev: any) => ({ ...prev, notes: e.target.value }))}
        />
      </div>
    </div>
  );
}
