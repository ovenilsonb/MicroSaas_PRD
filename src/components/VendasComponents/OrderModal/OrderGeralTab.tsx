import React from 'react';
import { Info, Users, Search, MapPin, Zap, Factory } from 'lucide-react';
import { SaleOrder, StatusConfig } from '../types';

interface OrderGeralTabProps {
  currentOrder: Partial<SaleOrder>;
  setCurrentOrder: (order: any) => void;
  isEditable: boolean;
  statusConfig: StatusConfig;
  clients: any[];
  setIsClientSearchOpen: (open: boolean) => void;
  linkedProductionOrder: any;
  setActiveMenu?: (menu: string) => void;
  sellableCatalog: any[];
  showToast: (type: any, title: string, message: string) => void;
}

export function OrderGeralTab({
  currentOrder,
  setCurrentOrder,
  isEditable,
  statusConfig,
  clients,
  setIsClientSearchOpen,
  linkedProductionOrder,
  setActiveMenu,
  sellableCatalog,
  showToast
}: OrderGeralTabProps) {
  const selectedClient = clients.find(c => c.id === currentOrder.client_id);

  const handleTableChange = (table: 'varejo' | 'atacado' | 'fardo') => {
    const newItems = (currentOrder.items || []).map(item => {
      const catalogItem = sellableCatalog.find(c => c.id === item.finished_good_id);
      if (!catalogItem) return item;
      
      let newPrice = 0;
      if (table === 'varejo') newPrice = catalogItem.pricing.varejoPrice;
      else if (table === 'atacado') newPrice = catalogItem.pricing.atacadoPrice;
      else newPrice = catalogItem.pricing.fardoPrice;

      return { 
        ...item, 
        unit_price: newPrice, 
        subtotal: item.quantity * newPrice 
      };
    });

    const newTotal = newItems.reduce((acc, curr) => acc + curr.subtotal, 0);

    setCurrentOrder((prev: any) => ({ 
      ...prev, 
      price_table: table,
      items: newItems,
      total_value: newTotal,
      final_value: newTotal - (prev?.discount || 0)
    }));

    showToast('info', 'Tabela Atualizada', `Preços recalibrados para ${table.toUpperCase()}`);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {currentOrder.status !== 'rascunho' && (
        <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <Info className="w-5 h-5 text-[#202eac]" />
          <p className="text-xs text-blue-700 font-medium">
            Este pedido está em status <strong className="uppercase">{statusConfig.label}</strong>. 
            A edição de dados críticos está bloqueada.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente do Pedido *</label>
          <div className="relative group">
            <button 
              type="button"
              disabled={!isEditable}
              onClick={() => setIsClientSearchOpen(true)}
              className={`w-full h-12 bg-white border border-slate-200 rounded-2xl px-4 outline-none transition-all font-semibold shadow-sm flex items-center justify-between group ${isEditable ? 'hover:border-[#202eac]/50 focus:border-[#202eac] focus:ring-4 focus:ring-blue-50' : 'bg-slate-50 text-slate-400 cursor-not-allowed'}`}
            >
              <span className={currentOrder.client_name ? "text-slate-700" : "text-slate-400"}>
                {currentOrder.client_name || 'Pesquisar cliente...'}
              </span>
              <Search className="w-4 h-4 text-slate-400 group-hover:text-[#202eac]" />
            </button>
          </div>
        </div>

        <div className="md:col-span-2 p-5 bg-white border border-slate-100 rounded-[32px] shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-3 text-[#202eac]">
             <MapPin className="w-5 h-5" />
             <h3 className="text-sm font-black uppercase tracking-widest">Endereço de Entrega</h3>
          </div>
          
          {currentOrder.client_id ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-left-2">
               <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Logradouro</span>
                  <p className="text-sm font-bold text-slate-700">
                    {selectedClient?.address || 'Não informado'}
                    {selectedClient?.number ? `, ${selectedClient.number}` : ''}
                  </p>
               </div>
               <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bairro</span>
                  <p className="text-sm font-bold text-slate-700">{selectedClient?.neighborhood || 'Não informado'}</p>
               </div>
               <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Localidade</span>
                  <p className="text-sm font-bold text-slate-700">
                    {selectedClient?.city || 'Cidade'} / {selectedClient?.state || 'UF'}
                  </p>
               </div>
            </div>
          ) : (
            <div className="py-2 text-center text-slate-400 text-xs italic">
              Selecione um cliente para visualizar o endereço cadastrado.
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tabela de Preços Aplicada</label>
          <div className="flex bg-white border border-slate-200 rounded-2xl p-1 shadow-sm">
            {(['varejo', 'atacado', 'fardo'] as const).map((table) => (
              <button
                key={table}
                type="button"
                disabled={!isEditable}
                onClick={() => handleTableChange(table)}
                className={`flex-1 py-2.5 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  currentOrder.price_table === table 
                    ? 'bg-[#202eac] text-white shadow-md' 
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                } ${!isEditable ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {table}
              </button>
            ))}
          </div>
        </div>

        {linkedProductionOrder && setActiveMenu && (
          <div className="md:col-span-2 p-6 bg-gradient-to-br from-slate-900 to-slate-800 rounded-[32px] shadow-xl border border-white/10 overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
              <Factory className="w-24 h-24 text-white" />
            </div>
            
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-blue-500/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-blue-500/30">
                  <Zap className="w-7 h-7 text-blue-400 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-white font-black uppercase tracking-widest text-sm flex items-center gap-2">
                    Rastreabilidade Industrial
                    <span className="bg-blue-500 text-[10px] px-2 py-0.5 rounded-full">ATIVO</span>
                  </h3>
                  <p className="text-slate-400 text-xs font-medium mt-1">
                    Lote vinculado: <span className="text-blue-300 font-bold">{linkedProductionOrder.batch_number}</span> • 
                    Status OF: <span className="text-blue-100 font-black uppercase italic ml-1">{linkedProductionOrder.status.replace('_', ' ')}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                {linkedProductionOrder.status === 'quality_check' || linkedProductionOrder.status === 'completed' ? (
                  <button 
                    onClick={() => setActiveMenu('qualidade')}
                    className="flex-1 md:flex-none px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                  >
                    <Factory className="w-4 h-4" /> CQ / QUALIDADE
                  </button>
                ) : (
                  <button 
                    onClick={() => setActiveMenu('producao')}
                    className="flex-1 md:flex-none px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                  >
                    <Factory className="w-4 h-4" /> VER NA PRODUÇÃO
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
