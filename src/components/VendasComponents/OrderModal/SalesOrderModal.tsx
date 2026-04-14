import React, { useState } from 'react';
import { X, ShoppingBag, Users, Package, Truck, Save, CheckCircle2, History } from 'lucide-react';
import { SaleOrder, StatusConfig } from '../types';
import { OrderGeralTab } from './OrderGeralTab';
import { OrderItensTab } from './OrderItensTab';
import { OrderLogisticaTab } from './OrderLogisticaTab';

interface SalesOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentOrder: Partial<SaleOrder>;
  setCurrentOrder: (order: any) => void;
  isEditable: boolean;
  statusConfig: StatusConfig;
  clients: any[];
  setIsClientSearchOpen: (open: boolean) => void;
  setIsProductSearchOpen: (open: boolean) => void;
  linkedProductionOrder: any;
  setActiveMenu?: (menu: string) => void;
  sellableCatalog: any[];
  showToast: (type: any, title: string, message: string) => void;
  onSave: (order: SaleOrder) => void;
  onCheckStockAndConfirm: (order: SaleOrder) => void;
  onFinishSeparation: (order: SaleOrder) => void;
  onFinalizeDelivery: (order: SaleOrder) => void;
  ordersCount: number;
}

export function SalesOrderModal({
  isOpen,
  onClose,
  currentOrder,
  setCurrentOrder,
  isEditable,
  statusConfig,
  clients,
  setIsClientSearchOpen,
  setIsProductSearchOpen,
  linkedProductionOrder,
  setActiveMenu,
  sellableCatalog,
  showToast,
  onSave,
  onCheckStockAndConfirm,
  onFinishSeparation,
  onFinalizeDelivery,
  ordersCount
}: SalesOrderModalProps) {
  const [activeTab, setActiveTab] = useState<'geral' | 'itens' | 'logistica'>('geral');

  if (!isOpen || !currentOrder) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-8 py-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 text-[#202eac]" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight">
                {currentOrder.id && ordersCount > 0 ? 'Editar Pedido' : 'Novo Pedido de Venda'}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-bold text-[#202eac] bg-blue-50 px-2 py-0.5 rounded-md uppercase tracking-wider">{currentOrder.number}</span>
                <span className="text-xs text-slate-400 font-medium">• {new Date(currentOrder.created_at || '').toLocaleDateString()}</span>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white hover:text-red-500 rounded-xl transition-all text-slate-400 border border-transparent hover:border-slate-100"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 bg-white sticky top-0 px-8">
          <button 
            onClick={() => setActiveTab('geral')}
            className={`py-4 px-6 text-sm font-bold transition-all relative ${activeTab === 'geral' ? 'text-[#202eac]' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" /> Dados do Cliente
            </div>
            {activeTab === 'geral' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#202eac] rounded-t-full" />}
          </button>
          <button 
            onClick={() => setActiveTab('itens')}
            className={`py-4 px-6 text-sm font-bold transition-all relative ${activeTab === 'itens' ? 'text-[#202eac]' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4" /> Itens e Preços
            </div>
            {activeTab === 'itens' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#202eac] rounded-t-full" />}
          </button>
          <button 
            onClick={() => setActiveTab('logistica')}
            className={`py-4 px-6 text-sm font-bold transition-all relative ${activeTab === 'logistica' ? 'text-[#202eac]' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4" /> Logística e Notas
            </div>
            {activeTab === 'logistica' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#202eac] rounded-t-full" />}
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/20">
          {activeTab === 'geral' && (
            <OrderGeralTab 
              currentOrder={currentOrder}
              setCurrentOrder={setCurrentOrder}
              isEditable={isEditable}
              statusConfig={statusConfig}
              clients={clients}
              setIsClientSearchOpen={setIsClientSearchOpen}
              linkedProductionOrder={linkedProductionOrder}
              setActiveMenu={setActiveMenu}
              sellableCatalog={sellableCatalog}
              showToast={showToast}
            />
          )}
          {activeTab === 'itens' && (
            <OrderItensTab 
              currentOrder={currentOrder}
              setCurrentOrder={setCurrentOrder}
              isEditable={isEditable}
              setIsProductSearchOpen={setIsProductSearchOpen}
            />
          )}
          {activeTab === 'logistica' && (
            <OrderLogisticaTab 
              currentOrder={currentOrder}
              setCurrentOrder={setCurrentOrder}
            />
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-8 py-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
           <button 
             onClick={onClose}
             className="px-6 py-3 bg-white border border-slate-200 text-slate-500 font-bold rounded-2xl hover:bg-slate-100 transition-all text-sm uppercase tracking-widest"
           >
             Cancelar
           </button>

           <div className="flex items-center gap-3">
             {currentOrder.status === 'rascunho' && (
               <>
                <button 
                  onClick={() => onSave(currentOrder as SaleOrder)}
                  className="px-8 py-3 bg-white border border-[#202eac]/30 text-[#202eac] font-bold rounded-2xl hover:bg-indigo-50 transition-all text-sm uppercase tracking-widest flex items-center gap-2"
                >
                  <Save className="w-4 h-4" /> Salvar Rascunho
                </button>
                 <button 
                   className="px-10 py-3 bg-[#202eac] text-white font-black rounded-2xl hover:bg-blue-800 transition-all text-sm uppercase tracking-[0.1em] shadow-xl shadow-blue-200 flex items-center gap-2"
                   onClick={() => {
                     if (!currentOrder.client_id || (currentOrder.items || []).length === 0) {
                       showToast('warning', 'Atenção', 'Selecione o cliente e adicione itens antes de confirmar.');
                       return;
                     }
                     onCheckStockAndConfirm(currentOrder as SaleOrder);
                   }}
                 >
                   <CheckCircle2 className="w-5 h-5" /> Confirmar Pedido
                 </button>
               </>
             )}

             {currentOrder.status === 'separacao' && (
               <button 
                 className="px-10 py-3 bg-emerald-500 text-white font-black rounded-2xl hover:bg-emerald-600 transition-all text-sm uppercase tracking-[0.1em] shadow-xl shadow-emerald-200 flex items-center gap-2"
                 onClick={() => onFinishSeparation(currentOrder as SaleOrder)}
               >
                 <Package className="w-5 h-5" /> Finalizar Separação
               </button>
             )}

             {(currentOrder.status === 'transito' || currentOrder.status === 'retirada') && (
               <button 
                 className="px-10 py-3 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-all text-sm uppercase tracking-[0.1em] shadow-xl shadow-blue-200 flex items-center gap-2"
                 onClick={() => onFinalizeDelivery(currentOrder as SaleOrder)}
               >
                 <Truck className="w-5 h-5" /> Confirmar Entrega
               </button>
             )}

             {currentOrder.status === 'producao' && (
               <div className="px-6 py-3 bg-amber-50 border border-amber-200 text-amber-600 font-bold rounded-2xl animate-pulse text-xs uppercase tracking-widest flex items-center gap-2">
                 <History className="w-4 h-4" /> Produto em Produção
               </div>
             )}

             {currentOrder.status === 'recebido' && (
               <div className="px-6 py-3 bg-emerald-50 border border-emerald-100 text-emerald-600 font-bold rounded-2xl text-xs uppercase tracking-widest flex items-center gap-2">
                 <CheckCircle2 className="w-4 h-4" /> Pedido Concluído
               </div>
             )}
           </div>
        </div>
      </div>
    </div>
  );
}
