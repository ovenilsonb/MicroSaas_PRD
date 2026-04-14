import React, { useState, useEffect } from 'react';
import { 
  Plus, Beaker, ArrowLeft, Copy, Save, AlertTriangle, 
  CheckCircle2, LayoutGrid, FileText 
} from 'lucide-react';
import { useStorageMode } from '../contexts/StorageModeContext';
import { useToast } from './dashboard/Toast';
import { ConfirmModal } from './shared/ConfirmModal';
import SuccessModal from './InsumosComponents/SuccessModal';

// Components
import FormulaCard from './FormulasComponents/FormulaCard';
import { FormulaStats } from './FormulasComponents/FormulaStats';
import { FormulaFiltersBar } from './FormulasComponents/FormulaFiltersBar';
import { FormulaTable } from './FormulasComponents/FormulaTable';
import { FormulaEditorGeneral } from './FormulasComponents/FormulaEditorGeneral';
import { FormulaEditorProduction } from './FormulasComponents/FormulaEditorProduction';
import { FormulaCompositionSection } from './FormulasComponents/FormulaCompositionSection';
import { CategoryManagerModal } from './FormulasComponents/CategoryManagerModal';

// Hooks & Utils
import { useFormulasData } from './FormulasComponents/useFormulasData';
import { useFormulaFilters } from './FormulasComponents/useFormulaFilters';
import { useFormulaEditor } from './FormulasComponents/useFormulaEditor';
import { formatCurrency, calculateTotalCost, calculateTotalVolume } from './FormulasComponents/formulaUtils';
import { Formula } from './FormulasComponents/types';

export default function Formulas() {
  const { mode } = useStorageMode();
  const { showToast } = useToast();
  
  // Data Hook
  const {
    formulas,
    groups,
    allIngredients,
    packagingVariants,
    isLoading,
    fetchData,
    saveFormula,
    deleteFormula,
    duplicateFormula,
    saveGroup,
    deleteGroup,
    importData
  } = useFormulasData();

  // Filters Hook
  const {
    searchTerm, setSearchTerm,
    statusFilter, setStatusFilter,
    sortField,
    sortOrder, setSortOrder,
    viewMode, setViewMode,
    filteredFormulas,
    stats,
    handleSort
  } = useFormulaFilters(formulas, groups);

  // Editor Hook
  const {
    currentFormula, setCurrentFormula,
    currentIngredients,
    isSaving, setIsSaving,
    ingSearchTerm, setIngSearchTerm,
    selectedIngId, setSelectedIngId,
    ingQuantity, setIngQuantity,
    isIngDropdownOpen, setIsIngDropdownOpen,
    highlightedIndex, setHighlightedIndex,
    filteredAndSortedIngredients,
    qtyInputRef,
    handleOpenEditor,
    handleCloseEditor,
    handleAddIngredientToFormula,
    handleRemoveIngredientFromFormula,
    totals
  } = useFormulaEditor(allIngredients);

  // Local UI State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successModalInfo, setSuccessModalInfo] = useState({ title: '', message: '', itemName: '' });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: '', name: '' });
  const [confirmModal, setConfirmModal] = useState<any>({ isOpen: false });

  // Persistence for View Mode
  useEffect(() => {
    const saved = localStorage.getItem('formulasViewMode');
    if (saved && (saved === 'grid' || saved === 'list')) {
      setViewMode(saved as 'grid' | 'list');
    }
  }, [setViewMode]);

  const handleSetViewMode = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    localStorage.setItem('formulasViewMode', mode);
  };

  // Handlers
  const onSaveFormula = async () => {
    if (!currentFormula?.name) {
      showToast('error', 'Nome Obrigatório', 'Por favor, informe o nome da fórmula.');
      return;
    }
    setIsSaving(true);
    const success = await saveFormula(currentFormula, currentIngredients);
    if (success) {
      setSuccessModalInfo({
        title: currentFormula.id ? 'Fórmula Atualizada' : 'Fórmula Criada',
        message: `A fórmula "${currentFormula.name}" foi salva com sucesso.`,
        itemName: currentFormula.name
      });
      setShowSuccessModal(true);
    } else {
      showToast('error', 'Erro ao Salvar', 'Não foi possível salvar a fórmula.');
    }
    setIsSaving(false);
  };

  const onSaveAsNewVersion = async () => {
    if (!currentFormula || !currentFormula.name) return;
    
    const nextVersion = (v: string) => {
      const match = v.match(/v(\d+)\.(\d+)/i);
      if (match) {
        const major = parseInt(match[1]);
        const minor = parseInt(match[2]) + 1;
        return `V${major}.${minor}`;
      }
      return 'V2.0';
    };

    const newVersion = nextVersion(currentFormula.version || 'V1.0');
    
    setIsSaving(true);
    const success = await saveFormula({
      ...currentFormula,
      id: undefined, // New ID will be generated
      version: newVersion,
      created_at: undefined,
      updated_at: undefined
    }, currentIngredients);

    if (success) {
      setSuccessModalInfo({
        title: 'Nova Versão Criada',
        message: `A versão ${newVersion} da fórmula foi gerada com sucesso.`,
        itemName: currentFormula.name
      });
      setShowSuccessModal(true);
    } else {
      showToast('error', 'Erro ao Salvar', 'Não foi possível criar a nova versão.');
    }
    setIsSaving(false);
  };

  const onDuplicate = async (formula: Formula) => {
    const success = await duplicateFormula(formula);
    if (success) {
      showToast('success', 'Duplicado', 'Fórmula duplicada com sucesso.');
    } else {
      showToast('error', 'Erro', 'Falha ao duplicar fórmula.');
    }
  };

  const onDeleteFormula = async (id: string) => {
    const success = await deleteFormula(id);
    if (success) {
      showToast('success', 'Excluído', 'Fórmula removida com sucesso.');
      setDeleteModal({ isOpen: false, id: '', name: '' });
    } else {
      showToast('error', 'Erro', 'Falha ao excluir fórmula.');
    }
  };

  const onExport = () => {
    const data = {
      formulas,
      ingredients: allIngredients,
      groups: groups,
      export_date: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_formulas_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    showToast('success', 'Exportado', 'Backup das fórmulas gerado com sucesso.');
  };

  const onImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const success = await importData(data);
      if (success) {
        showToast('success', 'Importado', 'Dados importados com sucesso.');
      } else {
        showToast('error', 'Erro na Importação', 'O arquivo não é compatível.');
      }
    } catch (error) {
      showToast('error', 'Erro', 'Falha ao ler o arquivo.');
    }
  };

  // Status Helpers
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'draft': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'archived': return 'bg-slate-100 text-slate-700 border-slate-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Ativa';
      case 'draft': return 'Rascunho';
      case 'archived': return 'Arquivada';
      default: return status;
    }
  };

  let mainContent;
  if (currentFormula) {
    // EDITOR VIEW
    mainContent = (
      <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden relative">
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 z-10 shadow-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={handleCloseEditor}
              className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-lg transition-colors border border-slate-200 shadow-sm"
              title="Voltar"
            >
              <ArrowLeft className="w-4 h-4 text-slate-500" />
              Voltar
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                {currentFormula.id ? 'Editar Fórmula' : 'Nova Fórmula'}
                <span className="text-sm font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                  Versão: {currentFormula.version || 'V1.0'}
                </span>
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {currentFormula.id && (
              <button
                onClick={onSaveAsNewVersion}
                disabled={isSaving}
                className="px-4 py-2 text-amber-600 font-medium hover:bg-amber-50 rounded-lg transition-colors flex items-center gap-2 border border-amber-200 disabled:opacity-50"
              >
                <Copy className="w-4 h-4" />
                Salvar como Nova Versão
              </button>
            )}
            <button
              onClick={handleCloseEditor}
              className="px-4 py-2 bg-white border border-slate-300 text-slate-600 font-medium hover:bg-slate-50 hover:border-slate-400 rounded-lg transition-colors shadow-sm"
            >
              Cancelar
            </button>
            <button
              onClick={onSaveFormula}
              disabled={isSaving}
              className="px-6 py-2 bg-[#202eac] hover:bg-blue-800 text-white font-bold rounded-lg transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Salvando...' : currentFormula.id ? 'Salvar Alterações' : 'Criar Fórmula'}
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 space-y-6">
              <FormulaEditorGeneral 
                currentFormula={currentFormula}
                setCurrentFormula={setCurrentFormula}
                categories={groups}
                packagingVariants={packagingVariants}
                onOpenCategoryModal={() => setIsCategoryModalOpen(true)}
              />
              <FormulaEditorProduction 
                currentFormula={currentFormula}
                setCurrentFormula={setCurrentFormula}
              />
            </div>
            
            <div className="lg:col-span-8 space-y-6 flex flex-col">
              <FormulaCompositionSection 
                currentFormula={currentFormula}
                currentIngredients={currentIngredients}
                totals={totals}
                ingSearchTerm={ingSearchTerm}
                setIngSearchTerm={setIngSearchTerm}
                selectedIngId={selectedIngId}
                setSelectedIngId={setSelectedIngId}
                ingQuantity={ingQuantity}
                setIngQuantity={setIngQuantity}
                isIngDropdownOpen={isIngDropdownOpen}
                setIsIngDropdownOpen={setIsIngDropdownOpen}
                highlightedIndex={highlightedIndex}
                setHighlightedIndex={setHighlightedIndex}
                filteredAndSortedIngredients={filteredAndSortedIngredients}
                qtyInputRef={qtyInputRef}
                onAddIngredient={handleAddIngredientToFormula}
                onRemoveIngredient={handleRemoveIngredientFromFormula}
                onEditIngredient={(item, idx) => {
                   const uniqueId = item.variant_id ? `${item.ingredient_id}|${item.variant_id}` : `${item.ingredient_id}|`;
                   setSelectedIngId(uniqueId);
                   setIngSearchTerm(item.ingredients?.name + (item.variants?.name ? ` (${item.variants.name})` : ''));
                   setIngQuantity(item.quantity.toString());
                   setIsIngDropdownOpen(false);
                }}
              />

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h2 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                  <FileText className="w-4 h-4 text-[#202eac]" /> Observações / Modo de Preparo
                </h2>
                <textarea
                  value={currentFormula.instructions || ''}
                  onChange={e => setCurrentFormula({ ...currentFormula, instructions: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all resize-none text-sm outline-none"
                  placeholder="Instruções de preparo passo a passo..."
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  } else {
    // GALLERY VIEW
    mainContent = (
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Beaker className="w-6 h-6 text-[#202eac]" />
                Fórmulas
              </h2>
              <span className="text-sm text-slate-500">{formulas.length} fórmulas cadastradas</span>
            </div>
            <button
              onClick={() => handleOpenEditor()}
              className="px-5 py-2.5 bg-gradient-to-r from-[#202eac] to-[#4b5ce8] text-white rounded-xl hover:shadow-lg hover:shadow-indigo-500/25 font-medium flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nova Fórmula</span>
            </button>
          </div>

          {/* Elaborate Header */}
          <div className="bg-gradient-to-br from-white via-slate-50 to-slate-100 rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-start gap-5">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25 shrink-0">
                <Beaker className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  Gestão de Fórmulas e Receitas
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Módulo Principal</span>
                </h2>
                <p className="text-slate-600 text-sm mt-1.5 leading-relaxed max-w-3xl">
                  Gerencie todas as formulações utilizadas na produção. Controle versões, custos, rendimentos e instruções de preparo.
                </p>
                <div className="flex items-center gap-3 mt-4 flex-wrap">
                  <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-100 shadow-sm">
                    <Beaker className="w-4 h-4 text-blue-600" />
                    <span className="text-slate-700 text-xs font-bold uppercase">{stats.total} fórmulas</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-100 shadow-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-slate-700 text-xs font-bold uppercase">{stats.active} ativas</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <FormulaStats 
            stats={stats} 
            statusFilter={statusFilter} 
            onStatusFilterChange={setStatusFilter}
            onOpenCategoryModal={() => setIsCategoryModalOpen(true)}
          />

          <FormulaFiltersBar 
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            viewMode={viewMode}
            onViewModeChange={handleSetViewMode}
            sortOrder={sortOrder}
            onSortOrderChange={setSortOrder}
            onImport={onImport}
            onExport={onExport}
          />

          <div className={`transition-all duration-300 ${viewMode === 'list' ? 'bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden' : ''}`}>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-64">
                <div className="w-10 h-10 border-4 border-blue-200 border-t-[#202eac] rounded-full animate-spin mb-4"></div>
                <p className="text-slate-500 font-medium">Carregando fórmulas...</p>
              </div>
            ) : filteredFormulas.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <Beaker className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>Nenhuma fórmula encontrada.</p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredFormulas.map(f => (
                  <FormulaCard 
                    key={f.id} 
                    formula={f} 
                    onClick={() => handleOpenEditor(f)}
                    onEdit={() => handleOpenEditor(f)}
                    onDuplicate={() => onDuplicate(f)}
                    onDelete={() => setDeleteModal({ isOpen: true, id: f.id, name: f.name })}
                  />
                ))}
              </div>
            ) : (
              <FormulaTable 
                formulas={filteredFormulas}
                sortField={sortField}
                sortOrder={sortOrder}
                onSort={handleSort}
                onEdit={handleOpenEditor}
                onDuplicate={onDuplicate}
                onDelete={(id, name) => setDeleteModal({ isOpen: true, id, name })}
                getStatusColor={getStatusColor}
                getStatusText={getStatusText}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 relative">
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          handleCloseEditor();
        }}
        title={successModalInfo.title}
        message={successModalInfo.message}
        itemName={successModalInfo.itemName}
      />
      
      {mainContent}

      <CategoryManagerModal 
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categories={groups}
        onSave={saveGroup}
        onDelete={deleteGroup}
      />

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Excluir Fórmula?</h3>
              <p className="text-slate-500 mb-6">
                Tem certeza que deseja excluir a fórmula <strong>{deleteModal.name}</strong>? Esta ação removerá todos os registros associados.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteModal({ isOpen: false, id: '', name: '' })}
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => onDeleteFormula(deleteModal.id)}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors"
                >
                  Sim, Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmModal.isOpen && (
        <ConfirmModal 
          {...confirmModal}
          onCancel={() => setConfirmModal({ isOpen: false })}
        />
      )}
    </div>
  );
}
