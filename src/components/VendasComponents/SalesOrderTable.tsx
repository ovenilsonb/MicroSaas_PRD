import React from 'react';
import { User, Truck, MapPin, Factory, Printer, CheckCircle2, Undo2, X, Edit2, Trash2 } from 'lucide-react';
import { SaleOrder } from './types';
import { getStatusConfig } from './salesUtils';

interface SalesOrderTableProps {
  orders: SaleOrder[];
  onOpenModal: (order: SaleOrder) => void;
  onPrint: (order: SaleOrder) => void;
  onReturn: (order: SaleOrder) => void;
  onCancel: (order: SaleOrder) => void;
  onDelete: (order: SaleOrder) => void;
  setActiveMenu?: (menu: string) => void;
}

export function SalesOrderTable({ 
  orders, 
  onOpenModal, 
  onPrint, 
  onReturn, 
  onCancel, 
  onDelete,
  setActiveMenu 
}: SalesOrderTableProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <th className="py-4 px-6">Pedido</th>
              <th className="py-4 px-6">Cliente</th>
              <th className="py-4 px-6">Data</th>
              <th className="py-4 px-6">Logística</th>
              <th className="py-4 px-6 text-right">Valor Final</th>
              <th className="py-4 px-6 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {orders.map(order => (
              <tr 
                key={order.id} 
                onClick={() => onOpenModal(order)}
                className="hover:bg-blue-50/20 transition-colors cursor-pointer group"
              >
                <td className="py-4 px-6">
                  <span className="font-mono text-xs font-bold text-slate-500">{order.number}</span>
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-[#202eac]" />
                    </div>
                    <span className="font-bold text-slate-800 text-sm whitespace-nowrap">{order.client_name}</span>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-700">{new Date(order.created_at).toLocaleDateString()}</span>
                    <span className="text-[10px] text-slate-400">{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </td>
                <td className="py-4 px-6">
                   <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold border ${order.delivery_method === 'entrega' ? 'bg-cyan-50 text-cyan-700 border-cyan-100' : 'bg-indigo-50 text-indigo-700 border-indigo-100'}`}>
                     {order.delivery_method === 'entrega' ? <Truck className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                     {order.delivery_method.toUpperCase()}
                   </div>
                </td>
                <td className="py-4 px-6 text-right">
                  <span className="font-black text-slate-800">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.final_value)}</span>
                </td>
                <td className="py-4 px-6 relative text-center">
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border ${getStatusConfig(order.status).color}`}>
                    {getStatusConfig(order.status).icon}
                    {getStatusConfig(order.status).label}
                  </div>

                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100 bg-white/80 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200 shadow-xl z-20">
                    {(order.status === 'producao' || order.status === 'reproducao') && setActiveMenu && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setActiveMenu('producao'); }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                        title="Ver na Produção"
                      >
                        <Factory className="w-4 h-4" />
                      </button>
                    )}

                    <button 
                      onClick={(e) => { e.stopPropagation(); onPrint(order); }}
                      className="p-2 text-slate-400 hover:text-[#202eac] hover:bg-blue-50 rounded-xl transition-all"
                      title="Imprimir Pedido"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    
                    <div className="w-px h-4 bg-slate-100 mx-1"></div>
                    
                    {(order.status === 'recebido' || order.status === 'transito' || order.status === 'retirada') && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); onReturn(order); }}
                        className="p-2 text-purple-500 hover:bg-purple-50 rounded-xl transition-all flex items-center gap-2 pr-3"
                      >
                        <Undo2 className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-tight">Devolver</span>
                      </button>
                    )}

                    {order.status !== 'recebido' && order.status !== 'cancelado' && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); onCancel(order); }}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all flex items-center gap-2 pr-3"
                      >
                        <X className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-tight">Cancelar</span>
                      </button>
                    )}

                    <button 
                      onClick={(e) => { e.stopPropagation(); onOpenModal(order); }}
                      className="p-2 text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <div className="w-px h-4 bg-slate-100 mx-1"></div>

                    <button 
                      onClick={(e) => { e.stopPropagation(); onDelete(order); }}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
