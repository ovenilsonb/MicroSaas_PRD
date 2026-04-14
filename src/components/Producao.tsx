import React, { useMemo } from 'react';
import { Factory, Plus, Search, ArrowLeft } from 'lucide-react';

// Hooks
import { useProductionData } from './ProducaoComponents/hooks/useProductionData';
import { useProductionActions } from './ProducaoComponents/hooks/useProductionActions';
import { useProductionState } from './ProducaoComponents/hooks/useProductionState';

// Components
import { ProductionStats } from './ProducaoComponents/ProductionStats';
import { ProductionTable } from './ProducaoComponents/ProductionTable';
import { ProductionOrderForm } from './ProducaoComponents/ProductionOrderForm';
import { ProductionDetailsView } from './ProducaoComponents/ProductionDetailsView';
import { ConfirmModal } from './shared/ConfirmModal';
import { CardSkeleton, TableSkeleton } from './Skeleton';

// Constants & Types
import { DEFAULT_STEPS } from './ProducaoComponents/utils/productionConstants';
import { generateId } from '../lib/id';
import { supabase } from '../lib/supabase';
import { useStorageMode } from '../contexts/StorageModeContext';

export default function Producao() {
  const { mode } = useStorageMode();
  const { 
    orders, setOrders, formulas, latestFormulas, 
    packagingOptions, isLoading, refreshAction 
  } = useProductionData();
  
  const { 
    executeAdvance, toggleStep, updateBatch, 
    deleteOrder, getScaledIngredients, saveOrdersLocal 
  } = useProductionActions(orders, setOrders, formulas);

  const {
    viewMode, setViewMode,
    selectedOrder, setSelectedOrder,
    searchTerm, setSearchTerm,
    confirmModal, setConfirmModal,
    isSaving, setIsSaving
  } = useProductionState();

  // Computed Stats
  const stats = useMemo(() => ({
    total: orders.length,
    planned: orders.filter(o => o.status === 'planned').length,
    inProgress: orders.filter(o => ['weighing', 'mixing', 'homogenizing'].includes(o.status)).length,
    inQuality: orders.filter(o => o.status === 'quality_check').length,
    completed: orders.filter(o => o.status === 'completed').length,
  }), [orders]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return orders.filter(o => {
      const formula = o.formulaSnapshot || formulas.find(f => f.id === o.formula_id);
      return (
        o.batch_number?.toLowerCase().includes(term) ||
        formula?.name?.toLowerCase().includes(term)
      );
    });
  }, [orders, searchTerm, formulas]);

  const handleCreateNewOrder = async (orderData: any) => {
    setIsSaving(true);
    try {
      const newOrder: any = {
        id: generateId(),
        formula_id: orderData.targetFormulaId,
        batch_number: orderData.batch_number,
        planned_volume: parseFloat(orderData.plannedVolume),
        status: 'planned',
        operatorName: orderData.operatorName,
        equipmentId: orderData.equipmentId,
        created_at: new Date().toISOString(),
        steps: DEFAULT_STEPS.map(s => ({ ...s })),
        ingredientBatches: orderData.formula?.formula_ingredients?.map((fi: any) => ({
          ingredientId: fi.ingredient_id,
          supplierBatch: '',
          quantityUsed: 0,
          verified: false
        })) || [],
        formulaSnapshot: orderData.formula,
        packagingPlan: Object.entries(orderData.packagingQty)
          .filter(([, q]) => (q as number) > 0)
          .map(([key, q]) => {
            const [id, vid] = key.split('_');
            const opt = packagingOptions.find(p => p.id === id && (p.variant_id === (vid === 'base' ? null : vid)));
            return {
              packagingId: id,
              variantId: vid === 'base' ? null : vid,
              name: opt?.name || 'Item de Envase',
              capacity: opt?.capacity || 0,
              quantity: q as number,
              cost: opt?.cost || 0,
              unit: 'un'
            };
          })
      };

      if (mode === 'supabase') {
        const { error } = await supabase.from('production_orders').insert([{
          id: newOrder.id,
          formula_id: newOrder.formula_id,
          batch_number: newOrder.batch_number,
          planned_volume: newOrder.planned_volume,
          status: 'planned',
          start_date: null,
          end_date: null
        }]);
        if (error) throw error;
      }

      const updated = [newOrder, ...orders];
      setOrders(updated);
      saveOrdersLocal(updated);
      setViewMode('list');
      refreshAction();
    } catch (err) {
      console.error('Erro ao criar OF:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="w-64 h-8 bg-slate-200 animate-pulse rounded-lg" />
            <div className="w-48 h-4 bg-slate-200 animate-pulse rounded-lg" />
          </div>
        </div>
        <CardSkeleton count={5} />
        <div className="h-10 bg-white border border-slate-200 rounded-xl animate-pulse" />
        <TableSkeleton rows={8} />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
              <Factory className="w-8 h-8 text-[#202eac]" /> Produção Industrial
            </h1>
            <p className="text-slate-500 font-medium mt-1">Gestão de Ordens, Rastreabilidade e Processos.</p>
          </div>
          <div className="flex items-center gap-3">
            {viewMode !== 'list' ? (
              <button 
                onClick={() => setViewMode('list')}
                className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" /> Voltar
              </button>
            ) : (
              <button 
                onClick={() => setViewMode('create')}
                className="px-6 py-3 bg-[#202eac] hover:bg-blue-800 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-100 flex items-center gap-2"
              >
                <Plus className="w-5 h-5" /> Nova OF
              </button>
            )}
          </div>
        </div>

        {viewMode === 'list' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <ProductionStats stats={stats} />
            
            <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
              <Search className="w-5 h-5 text-slate-400 ml-2" />
              <input 
                type="text" 
                placeholder="Buscar por lote ou fórmula..." 
                className="flex-1 outline-none text-sm p-1" 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
              />
            </div>

            <ProductionTable 
              orders={filteredOrders}
              onSelect={(o) => { setSelectedOrder(o); setViewMode('details'); }}
              onDelete={(id) => setConfirmModal({
                isOpen: true,
                title: 'Excluir OF',
                message: 'Deseja realmente excluir esta ordem de fabricação?',
                type: 'danger',
                onConfirm: () => deleteOrder(id)
              })}
              onAddNew={() => setViewMode('create')}
            />
          </div>
        )}

        {viewMode === 'create' && (
          <ProductionOrderForm 
            latestFormulas={latestFormulas}
            packagingOptions={packagingOptions}
            isSaving={isSaving}
            onSubmit={handleCreateNewOrder}
          />
        )}

        {viewMode === 'details' && selectedOrder && (
          <ProductionDetailsView 
            order={selectedOrder}
            formula={selectedOrder.formulaSnapshot || formulas.find(f => f.id === selectedOrder.formula_id)}
            scaledIngredients={getScaledIngredients(selectedOrder)}
            onAdvance={() => executeAdvance(selectedOrder, 
              selectedOrder.status === 'planned' ? 'weighing' :
              selectedOrder.status === 'weighing' ? 'mixing' :
              selectedOrder.status === 'mixing' ? 'homogenizing' :
              selectedOrder.status === 'homogenizing' ? 'quality_check' : 'completed'
            )}
            onToggleStep={(key) => toggleStep(selectedOrder.id, key)}
            onUpdateBatch={(ingId, batch) => updateBatch(selectedOrder.id, ingId, batch)}
          />
        )}
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onConfirm={() => {
          confirmModal.onConfirm();
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
      />
    </div>
  );
}
