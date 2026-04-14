import React, { useState, useEffect } from 'react';
import { useToast } from './dashboard/Toast';
import { useStorageMode } from '../contexts/StorageModeContext';
import {
  usePricingData,
  usePricingFilters,
  usePricingEditor,
  PricingStats,
  PricingFiltersBar,
  PricingGrid,
  PricingTable,
  PricingEditorHeader,
  PricingCostComposition,
  PricingAdjusterSection,
  PricingAnalytics,
  PricingResetModal,
  PricingAvailabilityToggle
} from './PrecificacaoComponents';
import { SuccessModal } from './InsumosComponents';
import { ErrorBoundary } from './shared/ErrorBoundary';

export default function Precificacao() {
  const { showToast } = useToast();
  const { mode: storageMode } = useStorageMode();

  // 1. Data Layer
  const { 
    formulas, 
    uniqueCapacities, 
    packagingOptions,
    savedPricing, 
    isLoading, 
    savePricingEntry, 
    deletePricingForFormula,
    resetPricingEntry,
    importData
  } = usePricingData(storageMode as 'supabase' | 'local');

  // 2. Filter & Gallery Layer
  const {
    searchTerm, setSearchTerm,
    viewMode, setViewMode,
    statusFilter, setStatusFilter,
    sortColumn, sortOrder, handleSort,
    columns, setColumns,
    filteredFormulas,
    stats,
    getVolumePricingStatus,
    getFormulaPrices
  } = usePricingFilters(formulas, savedPricing, uniqueCapacities);

  // 3. Editor Layer
  const editor = usePricingEditor(packagingOptions);

  // 4. UI States
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successInfo, setSuccessInfo] = useState({ title: '', message: '', itemName: '', type: 'success' as 'success' | 'warning' });

  // Handlers
  const handleSave = async () => {
    if (!editor.selectedFormula || !editor.selectedCapacity) return;
    
    try {
      const entry = {
        formulaId: editor.selectedFormula.id,
        capacityKey: String(editor.selectedCapacity),
        varejoPrice: editor.varejoPrice,
        atacadoPrice: editor.atacadoPrice,
        fardoPrice: editor.fardoPrice,
        fardoQty: editor.fardoQty,
        fixedCosts: editor.fixedCostsPerUnit,
        varejoDisabled: editor.isVarejoDisabled,
        atacadoDisabled: editor.isAtacadoDisabled,
        fardoDisabled: editor.isFardoDisabled
      };

      await savePricingEntry(entry);
      
      setSuccessInfo({
        title: 'Preço Atualizado',
        message: `Os valores para ${editor.selectedFormula.name} (${editor.selectedCapacity}L) foram salvos com sucesso.`,
        itemName: `${editor.selectedFormula.name} - ${editor.selectedCapacity}L`,
        type: 'success'
      });
      setShowSuccessModal(true);
    } catch {
      showToast('error', 'Erro ao Salvar', 'Não foi possível salvar as alterações.');
    }
  };

  const handleReset = async () => {
    if (!editor.selectedFormula || !editor.selectedCapacity) return;
    try {
      await resetPricingEntry(editor.selectedFormula.id, String(editor.selectedCapacity));
      editor.handleOpenEditor(editor.selectedFormula, editor.selectedCapacity, null); // Refresh editor
      showToast('success', 'Resetado', 'Valores voltaram ao padrão sugerido.');
    } catch {
      showToast('error', 'Erro ao Resetar', 'Não foi possível resetar os valores.');
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        if (editor.selectedFormula) {
          e.preventDefault();
          handleSave();
        }
      }
      if (e.key === 'Escape' && editor.selectedFormula) {
        editor.handleCloseEditor();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editor.selectedFormula, editor.selectedCapacity, editor.varejoPrice, editor.atacadoPrice, editor.fardoPrice]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#202eac] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-slate-600 font-medium">Carregando Precificações...</span>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary moduleName="Precificação">
      <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
        {editor.selectedFormula ? (
          /* MODO EDITOR */
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <PricingEditorHeader 
              formula={editor.selectedFormula}
              onBack={editor.handleCloseEditor}
              onSave={handleSave}
            />

            <div className="flex-1 overflow-auto bg-slate-50/50 p-8 pt-6">
              <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Coluna Esquerda: Configuradores */}
                <aside className="lg:col-span-8 space-y-6">
                  <PricingCostComposition 
                    formula={editor.selectedFormula}
                    selectedCapacity={editor.selectedCapacity}
                    capacities={uniqueCapacities}
                    onCapacityChange={editor.setSelectedCapacity}
                    detailCalc={editor.detailCalc}
                    showIngredients={editor.showIngredients}
                    onToggleIngredients={() => editor.setShowIngredients(!editor.showIngredients)}
                  />

                  <PricingAdjusterSection editor={editor} />
                </aside>

                {/* Coluna Direita: Analytics & Ações */}
                <aside className="lg:col-span-4 space-y-6">
                  <PricingAnalytics editor={editor} />
                  
                  <PricingAvailabilityToggle editor={editor} />

                  <PricingResetModal onReset={handleReset} />
                </aside>
              </div>
            </div>
          </div>
        ) : (
          /* MODO GALERIA */
          <div className="flex-1 overflow-auto p-8">
            <div className="max-w-7xl mx-auto space-y-6">
              <PricingStats stats={stats} />

              <PricingFiltersBar 
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                onImport={importData}
              />

              <div className="min-h-[400px]">
                {viewMode === 'grid' ? (
                  <PricingGrid 
                    formulas={filteredFormulas}
                    uniqueCapacities={uniqueCapacities}
                    savedPricing={savedPricing}
                    onOpenFormula={editor.handleOpenEditor}
                    getVolumePricingStatus={getVolumePricingStatus}
                  />
                ) : (
                  <PricingTable 
                    formulas={filteredFormulas}
                    columns={columns}
                    sortColumn={sortColumn}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                    getVolumePricingStatus={getVolumePricingStatus}
                    getFormulaPrices={getFormulaPrices}
                    onOpenFormula={editor.handleOpenEditor}
                    onColumnDragEnd={(e) => {
                      const { active, over } = e;
                      if (active.id !== over.id) {
                        const oldIndex = columns.findIndex(c => c.id === active.id);
                        const newIndex = columns.findIndex(c => c.id === over.id);
                        const newColumns = [...columns];
                        const [moved] = newColumns.splice(oldIndex, 1);
                        newColumns.splice(newIndex, 0, moved);
                        setColumns(newColumns);
                      }
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        <SuccessModal 
          isOpen={showSuccessModal}
          onClose={() => setShowSuccessModal(false)}
          type={successInfo.type}
          title={successInfo.title}
          message={successInfo.message}
          itemName={successInfo.itemName}
        />
      </div>
    </ErrorBoundary>
  );
}
