import React from 'react';
import { Truck, MapPin, X, Trash2, ChevronRight, User } from 'lucide-react';
import { SaleOrder } from './types';
import { getStatusConfig } from './salesUtils';

interface SalesOrderCardProps {
  order: SaleOrder;
  onClick: () => void;
  onCancel: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}

export function SalesOrderCard({ order, onClick, onCancel, onDelete }: SalesOrderCardProps) {
  const statusCfg = getStatusConfig(order.status);
  
  return (
    <div 
      className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all p-5 flex flex-col group cursor-pointer hover:border-[#202eac]/30"
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{order.number}</span>
          <h3 className="font-bold text-slate-800 truncate max-w-[180px]" title={order.client_name}>{order.client_name}</h3>
        </div>
        <div className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1.5 border ${statusCfg.color}`}>
          {statusCfg.icon}
          {statusCfg.label.toUpperCase()}
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Valor Total:</span>
          <span className="font-bold text-slate-800">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.final_value)}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Entrega:</span>
          <span className="flex items-center gap-1 font-medium text-slate-600 capitalize">
            {order.delivery_method === 'entrega' ? <Truck className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
            {order.delivery_method}
          </span>
        </div>
      </div>

      <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[9px] text-slate-400 uppercase font-bold tracking-tight">Data do Pedido</span>
          <span className="text-xs font-semibold text-slate-600">{new Date(order.created_at).toLocaleDateString()}</span>
        </div>
        <div className="flex items-center gap-2">
          {order.status !== 'recebido' && order.status !== 'cancelado' && (
            <button 
              onClick={onCancel}
              className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
              title="Cancelar Pedido"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button 
            onClick={onDelete}
            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
            title="Excluir Pedido"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button className="p-2 bg-slate-50 text-slate-400 group-hover:bg-[#202eac] group-hover:text-white rounded-xl transition-all">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
