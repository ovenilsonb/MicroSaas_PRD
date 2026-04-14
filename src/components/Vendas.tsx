import React, { useState } from 'react';
import { ShoppingBag, Plus } from 'lucide-react';

import { useCompanySettings } from '../hooks/useCompanySettings';
import { ConfirmModal } from './shared/ConfirmModal';
import { ErrorBoundary } from './shared/ErrorBoundary';

// Modular Components
import { SalesStats } from './VendasComponents/SalesStats';
import { SalesFiltersBar } from './VendasComponents/SalesFiltersBar';
import { SalesOrderCard } from './VendasComponents/SalesOrderCard';
import { SalesOrderTable } from './VendasComponents/SalesOrderTable';
import { SalesOrderModal } from './VendasComponents/OrderModal/SalesOrderModal';
import { ClientSearchModal } from './VendasComponents/SearchModals/ClientSearchModal';
import { ProductSearchModal } from './VendasComponents/SearchModals/ProductSearchModal';

// Modular Hooks
import { useSalesData } from './VendasComponents/hooks/useSalesData';
import { useSalesFilters } from './VendasComponents/hooks/useSalesFilters';
import { useSalesActions } from './VendasComponents/hooks/useSalesActions';
import { useSalesInventory } from './VendasComponents/hooks/useSalesInventory';
import { useSalesProductionLink } from './VendasComponents/hooks/useSalesProductionLink';

// Utils / Services
import { getStatusConfig } from './VendasComponents/salesUtils';
import { handlePrintSaleOrder } from './VendasComponents/services/salesPrintService';
import { SaleOrder } from './VendasComponents/types';

export function Vendas({ setActiveMenu }: { setActiveMenu?: (menu: string) => void }) {
  const { settings } = useCompanySettings();
  
  // 1. Data Layer
  const data = useSalesData();
  
  // 2. Filter / UI State Layer
  const filters = useSalesFilters(data.orders);
  
  // 3. Inventory & Logistics Layer
  const inventory = useSalesInventory(
    data.orders, 
    data.setOrders, 
    data.finishedGoods, 
    data.setFinishedGoods
  );
  
  // 4. Action Layer
  const actions = useSalesActions(
    data.orders, 
    data.setOrders, 
    data.sellableCatalog,
    inventory.persistOrder
  );

  // 5. Production Link Layer (OF Generation)
  const production = useSalesProductionLink(
    data.sellableCatalog,
    data.finishedGoods,
    data.ingredients,
    data.formulas,
    inventory.persistOrder,
    data.setFinishedGoods,
    () => actions.setIsModalOpen(false),
    actions.setConfirmModal
  );

  // Advanced Search Modals State
  const [isClientSearchOpen, setIsClientSearchOpen] = useState(false);
  const [isProductSearchOpen, setIsProductSearchOpen] = useState(false);

  if (data.isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Carregando Vendas...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50">
        <header className="bg-white border-b border-slate-200 px-8 py-6 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-50 p-2 rounded-lg">
                <ShoppingBag className="w-6 h-6 text-[#202eac]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Vendas e Pedidos</h1>
                <p className="text-sm text-slate-500">Gestão comercial, logística e recebimentos</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => actions.handleOpenModal()}
                className="flex items-center gap-2 px-4 py-2 bg-[#202eac] text-white font-bold rounded-lg hover:bg-blue-800 transition-all shadow-md shadow-blue-200 active:scale-95 text-sm"
              >
                <Plus className="w-4 h-4" />
                Novo Pedido
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-8 bg-slate-50/50">
          <div className="max-w-7xl mx-auto space-y-6">
            
            <SalesStats 
              orders={data.orders} 
              statusFilter={filters.statusFilter} 
              setStatusFilter={filters.setStatusFilter} 
            />

            <SalesFiltersBar 
              searchTerm={filters.searchTerm} 
              setSearchTerm={filters.setSearchTerm} 
              viewMode={filters.viewMode} 
              setViewMode={filters.setViewMode} 
            />

            {filters.filteredOrders.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-20 text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ShoppingBag className="w-10 h-10 text-slate-300" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Nenhum pedido encontrado</h3>
                <p className="text-slate-500 mb-8 max-w-sm mx-auto">
                  {filters.searchTerm || filters.statusFilter !== 'todos' 
                    ? 'Não encontramos resultados para os filtros selecionados.' 
                    : 'Comece a vender agora mesmo criando seu primeiro pedido de venda.'}
                </p>
                <button
                  onClick={() => actions.handleOpenModal()}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#202eac] text-white font-bold rounded-2xl hover:bg-blue-800 transition-all active:scale-95"
                >
                  <Plus className="w-5 h-5" />
                  Criar Pedido nº {data.orders.length + 1}
                </button>
              </div>
            ) : filters.viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filters.filteredOrders.map(order => (
                  <SalesOrderCard 
                    key={order.id} 
                    order={order} 
                    onClick={() => actions.handleOpenModal(order)}
                    onCancel={(e) => { e.stopPropagation(); inventory.handleCancelOrder(order); }}
                    onDelete={(e) => { e.stopPropagation(); actions.handleDeleteOrder(order); }}
                  />
                ))}
              </div>
            ) : (
              <SalesOrderTable 
                orders={filters.filteredOrders}
                onOpenModal={actions.handleOpenModal}
                onPrint={(order) => handlePrintSaleOrder(order, data.clients, settings)}
                onReturn={inventory.handleReturnOrder}
                onCancel={inventory.handleCancelOrder}
                onDelete={actions.handleDeleteOrder}
                setActiveMenu={setActiveMenu}
              />
            )}
          </div>
        </main>

        <SalesOrderModal 
          isOpen={actions.isModalOpen}
          onClose={() => actions.setIsModalOpen(false)}
          currentOrder={actions.currentOrder || {}}
          setCurrentOrder={actions.setCurrentOrder}
          isEditable={!actions.currentOrder || actions.currentOrder.status === 'rascunho'}
          statusConfig={getStatusConfig(actions.currentOrder?.status || 'rascunho')}
          clients={data.clients}
          setIsClientSearchOpen={setIsClientSearchOpen}
          setIsProductSearchOpen={setIsProductSearchOpen}
          linkedProductionOrder={data.productionOrders.find(po => po.reference_sale_order_id === actions.currentOrder?.id && po.status !== 'cancelled')}
          setActiveMenu={setActiveMenu}
          sellableCatalog={data.sellableCatalog}
          showToast={data.fetchData as any} // Mocking toast for now or use useToast inside
          onSave={actions.handleSaveOrder}
          onCheckStockAndConfirm={production.checkStockAndConfirm}
          onFinishSeparation={inventory.handleFinishSeparation}
          onFinalizeDelivery={inventory.handleFinalizeDelivery}
          ordersCount={data.orders.length}
        />

        {isClientSearchOpen && (
          <ClientSearchModal 
            clients={data.clients}
            lastPurchaseMap={data.lastPurchaseMap}
            onClose={() => setIsClientSearchOpen(false)}
            onSelect={(client) => {
              actions.setCurrentOrder(prev => ({ 
                ...prev, 
                client_id: client.id, 
                client_name: client.nome || client.name,
                price_table: (client.tabela_preco?.toLowerCase() as any) || prev?.price_table || 'varejo'
              }));
              setIsClientSearchOpen(false);
            }}
          />
        )}

        {isProductSearchOpen && (
          <ProductSearchModal 
            sellableCatalog={data.sellableCatalog}
            categories={data.categories}
            priceTable={actions.currentOrder?.price_table || 'varejo'}
            onClose={() => setIsProductSearchOpen(false)}
            onAddBulk={(selections) => {
              actions.handleBulkAddItems(selections, actions.currentOrder?.price_table || 'varejo');
              setIsProductSearchOpen(false);
            }}
          />
        )}

        {actions.confirmModal.isOpen && (
          <ConfirmModal
            isOpen={actions.confirmModal.isOpen}
            title={actions.confirmModal.title}
            message={actions.confirmModal.message}
            detail={actions.confirmModal.detail}
            type={actions.confirmModal.type}
            confirmLabel={actions.confirmModal.confirmLabel}
            onConfirm={actions.confirmModal.onConfirm}
            onCancel={() => actions.setConfirmModal(prev => ({ ...prev, isOpen: false }))}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}

export default Vendas;
