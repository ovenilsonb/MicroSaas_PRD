import React from 'react';
import { Package, Trash2, Plus } from 'lucide-react';
import { SaleOrder } from '../types';

interface OrderItensTabProps {
  currentOrder: Partial<SaleOrder>;
  setCurrentOrder: (order: any) => void;
  isEditable: boolean;
  setIsProductSearchOpen: (open: boolean) => void;
}

export function OrderItensTab({
  currentOrder,
  setCurrentOrder,
  isEditable,
  setIsProductSearchOpen
}: OrderItensTabProps) {
  const handleUpdateQuantity = (index: number, qty: number) => {
    const q = Math.max(1, qty);
    const newItems = [...(currentOrder.items || [])];
    newItems[index].quantity = q;
    newItems[index].subtotal = q * newItems[index].unit_price;
    const total = newItems.reduce((acc, curr) => acc + curr.subtotal, 0);
    setCurrentOrder((prev: any) => ({ 
      ...prev, 
      items: newItems, 
      total_value: total, 
      final_value: total - (prev?.discount || 0) 
    }));
  };

  const handleUpdatePrice = (index: number, price: number) => {
    const newItems = [...(currentOrder.items || [])];
    newItems[index].unit_price = price;
    newItems[index].subtotal = (currentOrder.items || [])[index].quantity * price;
    const total = newItems.reduce((acc, curr) => acc + curr.subtotal, 0);
    setCurrentOrder((prev: any) => ({ 
      ...prev, 
      items: newItems, 
      total_value: total, 
      final_value: total - (prev?.discount || 0) 
    }));
  };

  const handleRemoveItem = (index: number) => {
    const newItems = (currentOrder.items || []).filter((_, i) => i !== index);
    const total = newItems.reduce((acc, curr) => acc + curr.subtotal, 0);
    setCurrentOrder((prev: any) => ({ 
      ...prev, 
      items: newItems, 
      total_value: total, 
      final_value: total - (prev?.discount || 0) 
    }));
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="border border-slate-200 rounded-3xl overflow-hidden shadow-sm bg-white">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
              <th className="py-4 px-6 text-left">Produto</th>
              <th className="py-4 px-6 w-32">Qtd</th>
              <th className="py-4 px-6 w-40">Vlr Unt.</th>
              <th className="py-4 px-6 w-40">Subtotal</th>
              <th className="py-4 px-4 w-16"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(currentOrder.items || []).map((item, index) => (
               <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-800">{item.name}</span>
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">CÓD: {item.finished_good_id.slice(0,8)}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <input 
                      type="number" 
                      readOnly={!isEditable}
                      className={`w-full h-10 bg-slate-50 border border-slate-200 rounded-xl text-center outline-none transition-all font-bold text-slate-700 ${isEditable ? 'focus:border-[#202eac] focus:ring-2 focus:ring-blue-50' : 'opacity-60 cursor-not-allowed'}`}
                      value={item.quantity}
                      min="1"
                      onChange={(e) => handleUpdateQuantity(index, Number(e.target.value))}
                    />
                  </td>
                  <td className="py-4 px-6 text-center">
                    <div className="relative group">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-300">R$</span>
                      <input 
                        type="number" 
                        step="0.01"
                        readOnly={!isEditable}
                        className={`w-full h-10 bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 text-right outline-none transition-all font-bold text-slate-600 ${isEditable ? 'focus:border-[#202eac]' : 'opacity-60 cursor-not-allowed'}`}
                        value={item.unit_price}
                        onChange={(e) => handleUpdatePrice(index, Number(e.target.value))}
                      />
                    </div>
                  </td>
                  <td className="py-4 px-6 text-right font-black text-slate-800 tracking-tighter">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.subtotal)}
                  </td>
                  <td className="py-4 px-4 text-center">
                      {isEditable && (
                        <button 
                          onClick={() => handleRemoveItem(index)}
                          className="p-2 text-slate-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                  </td>
               </tr>
            ))}
            {(!currentOrder.items || currentOrder.items.length === 0) && (
              <tr>
                <td colSpan={5} className="py-16 text-center text-slate-300 font-bold uppercase tracking-widest text-xs italic bg-slate-50/20">
                  <div className="flex flex-col items-center gap-3">
                    <Package className="w-8 h-8 opacity-20" />
                    Nenhum item no carrinho
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col md:flex-row items-start justify-between gap-6">
        <div className="relative w-full md:w-80">
          {isEditable && (
            <button 
              onClick={() => setIsProductSearchOpen(true)}
              className="w-full h-12 bg-gradient-to-br from-[#202eac] to-[#4b5ce8] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-200 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" /> Buscar Produto (F10)
            </button>
          )}
        </div>

        <div className="flex-1 max-w-sm w-full space-y-3">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Bruto:</span>
               <span className="text-sm font-bold text-slate-500 font-mono italic">
                 {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentOrder.total_value || 0)}
               </span>
            </div>
            <div className="flex items-center justify-between px-6 py-4 bg-[#202eac]/5 rounded-2xl border-2 border-dashed border-[#202eac]/20">
               <span className="text-xs font-black text-[#202eac] uppercase tracking-widest">Valor Final</span>
               <span className="text-3xl font-black text-[#202eac] tracking-tighter">
                 {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentOrder.final_value || 0)}
               </span>
            </div>
        </div>
      </div>
    </div>
  );
}
