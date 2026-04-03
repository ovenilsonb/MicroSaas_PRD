import React, { useState, useEffect, useMemo, useCallback, Component, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useStorageMode } from '../contexts/StorageModeContext';
import { Plus, Package, AlertTriangle, Keyboard, Upload, Download, RefreshCw } from 'lucide-react';
import { exportToJson, importFromJson, getBackupFilename } from '../lib/backupUtils';
import { generateId } from '../lib/id';
import { useToast } from './dashboard/Toast';
import { TableSkeleton, CardSkeleton } from './Skeleton';
import {
  Ingredient, Variant,
  useInsumosData, StockMovement,
  InsumoStats, InsumoFilters, InsumoTable, InsumoGrid,
  InsumoModal, InsumoPagination, DeleteConfirmDialog,
} from './InsumosComponents';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<{children: ReactNode}, ErrorBoundaryState> {
  constructor(props: {children: ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[Insumos ErrorBoundary]', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="bg-white rounded-2xl border border-red-200 shadow-lg p-8 max-w-md text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Algo deu errado</h2>
              <p className="text-slate-600 mb-4">O módulo de Insumos encontrou um erro.</p>
              <div className="bg-slate-100 p-3 rounded-lg mb-4 text-left overflow-auto max-h-32">
                <code className="text-xs text-red-600">{this.state.error?.message}</code>
              </div>
              <button onClick={() => this.setState({ hasError: false })}
                className="px-6 py-2 bg-[#202eac] text-white font-medium rounded-lg hover:bg-blue-800 transition-colors flex items-center gap-2 mx-auto">
                <RefreshCw className="w-4 h-4" /> Tentar Novamente
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

export default function Insumos() {
  const { showToast } = useToast();
  const { mode } = useStorageMode();
  const {
    ingredients, suppliers, isLoading, fetchIngredients,
    saveIngredient, deleteIngredient, addStockMovement, getStockMovements,
    exportStockMovements,
  } = useInsumosData();

  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
    try {
      const saved = localStorage.getItem('insumosViewMode');
      return (saved as 'list' | 'grid') || 'list';
    } catch { return 'list'; }
  });
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    try {
      const saved = localStorage.getItem('insumosItemsPerPage');
      return saved ? Number(saved) : 10;
    } catch { return 10; }
  });

  const [sortField, setSortField] = useState<keyof Ingredient>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [filterType, setFilterType] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('');
  const [filterStock, setFilterStock] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; id: string; name: string; formulas: any[]; isLoading: boolean }>({
    isOpen: false, id: '', name: '', formulas: [], isLoading: false
  });

  const [usageFormulas, setUsageFormulas] = useState<any[]>([]);
  const [isLoadingUsage, setIsLoadingUsage] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [isLoadingMovements, setIsLoadingMovements] = useState(false);
  const [dateFilter, setDateFilter] = useState<{ startDate: string; endDate: string } | null>(null);

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const handleSetViewMode = (m: 'list' | 'grid') => {
    setViewMode(m);
    localStorage.setItem('insumosViewMode', m);
  };

  const handleSetItemsPerPage = (count: number) => {
    setItemsPerPage(count);
    setCurrentPage(1);
    localStorage.setItem('insumosItemsPerPage', String(count));
  };

  const handleFilterTypeChange = (value: string) => {
    setFilterType(value);
    setFilterSupplier('');
    setFilterStock('');
    setCurrentPage(1);
  };

  const handleFilterSupplierChange = (value: string) => { setCurrentPage(1); setFilterSupplier(value); };
  const handleFilterStockChange = (value: string) => { setCurrentPage(1); setFilterStock(value); };
  const handleSearchChange = (value: string) => { setCurrentPage(1); setSearchTerm(value); };

  const clearAllFilters = () => {
    setFilterType(''); setFilterSupplier(''); setFilterStock(''); setSearchTerm(''); setCurrentPage(1);
  };

  const handleSort = (field: keyof Ingredient) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleExport = () => {
    try {
      const filename = getBackupFilename('Insumos');
      exportToJson(filename, ingredients);
      showToast('success', 'Exportação Concluída', `O backup "${filename}" foi gerado com sucesso.`);
    } catch {
      showToast('error', 'Erro na Exportação', 'Não foi possível gerar o arquivo de backup.');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await importFromJson(file);
      if (!Array.isArray(data)) throw new Error('Formato de dados inválido.');
      if (data.length > 0) {
        const firstItem = data[0];
        if (!firstItem.id || !firstItem.name) throw new Error('Dados inválidos. Cada item deve ter id e name.');
      }
      if (mode === 'supabase') {
        showToast('info', 'Importando...', 'Sincronizando dados com o Supabase...');
        for (const item of data) {
          const { error } = await supabase.from('ingredients').upsert({ ...item, variants: undefined });
          if (error) throw error;
          if (item.variants && Array.isArray(item.variants)) {
            for (const variant of item.variants) {
              await supabase.from('ingredient_variants').upsert({ ...variant, ingredient_id: item.id });
            }
          }
        }
        await fetchIngredients();
      } else {
        const localData = JSON.parse(localStorage.getItem('local_ingredients') || '[]');
        const newData = [...localData];
        data.forEach((item: any) => {
          if (!item.id || !item.name) return;
          const sanitizedItem = {
            ...item,
            estoque_atual: parseFloat(item.estoque_atual) || 0,
            estoque_minimo: parseFloat(item.estoque_minimo) || 0,
            cost_per_unit: typeof item.cost_per_unit === 'string' ? parseFloat(item.cost_per_unit.replace(',', '.')) || 0 : parseFloat(item.cost_per_unit) || 0,
            variants: Array.isArray(item.variants) ? item.variants : []
          };
          const index = newData.findIndex(i => i.id === sanitizedItem.id);
          if (index >= 0) newData[index] = sanitizedItem;
          else newData.push(sanitizedItem);
        });
        localStorage.setItem('local_ingredients', JSON.stringify(newData));
        await fetchIngredients();
      }
      showToast('success', 'Importação Concluída', `${data.length} insumos foram processados.`);
    } catch (err: any) {
      showToast('error', 'Erro na Importação', err.message || 'Falha ao importar arquivo.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleOpenModal = async (ingredient?: Ingredient) => {
    setEditingIngredient(ingredient || null);
    setUsageFormulas([]);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingIngredient(null);
    setIsSaving(false);
  };

  const handleSave = async (payload: any) => {
    setIsSaving(true);
    try {
      const success = await saveIngredient(payload);
      if (success) {
        handleCloseModal();
        showToast('success', 'Sucesso!', payload.id ? 'Insumo atualizado com sucesso.' : 'Insumo cadastrado com sucesso.');
      } else {
        showToast('error', 'Erro ao Salvar', 'Não foi possível salvar o insumo.');
      }
    } catch (err) {
      console.error('[Insumos] Error saving:', err);
      showToast('error', 'Erro ao Salvar', 'Não foi possível salvar o insumo.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDuplicate = async (ing: Ingredient) => {
    setEditingIngredient(null);
    let variantsToCopy: Variant[] = [];
    if (ing.tem_variantes) {
      try { variantsToCopy = await getIngredientVariants(ing.id); }
      catch (err) { console.error('[Insumos] Error loading variants for duplicate:', err); }
    }
    const newPayload = {
      name: `${ing.name || ''} (Cópia)`,
      codigo: ing.codigo ? `${ing.codigo}-COPY` : '',
      apelido: ing.apelido || '',
      unit: ing.unit || 'L',
      cost_per_unit: ing.cost_per_unit || 0,
      fornecedor: ing.fornecedor || '',
      validade_indeterminada: ing.validade_indeterminada ?? true,
      expiry_date: ing.expiry_date || '',
      estoque_atual: 0,
      estoque_minimo: ing.estoque_minimo || 0,
      produto_quimico: ing.produto_quimico ?? true,
      tem_variantes: ing.tem_variantes ?? false,
      peso_especifico: ing.peso_especifico || '',
      ph: ing.ph || '',
      temperatura: ing.temperatura || '',
      viscosidade: ing.viscosidade || '',
      solubilidade: ing.solubilidade || '',
      risco: ing.risco || '',
      variants: variantsToCopy.map(v => ({ name: v.name, codigo: v.codigo, cost_per_unit: v.cost_per_unit }))
    };
    const success = await saveIngredient(newPayload);
    if (success) {
      showToast('success', 'Insumo Duplicado', `Uma cópia de "${ing.name}" foi criada.`);
    }
  };

  const confirmDelete = async (id: string, name: string) => {
    setDeleteDialog({ isOpen: true, id, name, formulas: [], isLoading: true });
    try {
      if (mode === 'supabase') {
        const { data, error } = await supabase
          .from('formula_ingredients')
          .select(`formula_id, formulas(id, name, version)`)
          .eq('ingredient_id', id);
        if (error) throw error;
        const formulas = data?.map(d => d.formulas).filter(Boolean) || [];
        setDeleteDialog({ isOpen: true, id, name, formulas, isLoading: false });
      } else {
        const localFormulas = JSON.parse(localStorage.getItem('local_formulas') || '[]');
        const formulasUsing = localFormulas.filter((f: any) =>
          f.formula_ingredients?.some((fi: any) => fi.ingredient_id === id)
        ).map((f: any) => ({ id: f.id, name: f.name, version: f.version }));
        setDeleteDialog({ isOpen: true, id, name, formulas: formulasUsing, isLoading: false });
      }
    } catch (err) {
      console.error('[Insumos] Error checking formula usage:', err);
      setDeleteDialog({ isOpen: true, id, name, formulas: [], isLoading: false });
    }
  };

  const executeDelete = async () => {
    try {
      const success = await deleteIngredient(deleteDialog.id);
      if (success) {
        setDeleteDialog({ isOpen: false, id: '', name: '', formulas: [], isLoading: false });
        showToast('success', 'Excluído', 'O insumo foi removido com sucesso.');
      } else {
        showToast('error', 'Erro ao Excluir', 'Não foi possível excluir o insumo.');
      }
    } catch (err) {
      console.error('[Insumos] Error deleting:', err);
      showToast('error', 'Erro ao Excluir', 'Não foi possível excluir o insumo.');
    }
  };

  const handleAddMovement = async (movement: any) => {
    return await addStockMovement(movement);
  };

  const loadStockMovements = async (ingredientId: string): Promise<StockMovement[]> => {
    setIsLoadingMovements(true);
    try {
      const movements = await getStockMovements(
        ingredientId,
        dateFilter?.startDate || undefined,
        dateFilter?.endDate || undefined
      );
      setStockMovements(movements);
      return movements;
    } catch (err) {
      console.error('[Insumos] Error loading movements:', err);
      setStockMovements([]);
      return [];
    } finally {
      setIsLoadingMovements(false);
    }
  };

  const handleExportMovements = () => {
    exportStockMovements(stockMovements);
  };

  const handleDragStart = (id: string) => { setDraggedId(id); };
  const handleDragOver = (e: React.DragEvent, id: string) => { e.preventDefault(); setDragOverId(id); };
  const handleDrop = (targetId: string) => {
    if (!draggedId || draggedId === targetId) { setDraggedId(null); setDragOverId(null); return; }
    if (mode === 'supabase') {
      const localIngredients = JSON.parse(localStorage.getItem('local_ingredients') || '[]');
      const draggedIdx = localIngredients.findIndex((i: Ingredient) => i.id === draggedId);
      const targetIdx = localIngredients.findIndex((i: Ingredient) => i.id === targetId);
      if (draggedIdx === -1 || targetIdx === -1) return;
      const [removed] = localIngredients.splice(draggedIdx, 1);
      localIngredients.splice(targetIdx, 0, removed);
      localIngredients.forEach((item: Ingredient, idx: number) => {
        supabase.from('ingredients').update({ sort_order: idx }).eq('id', item.id);
      });
      localStorage.setItem('local_ingredients', JSON.stringify(localIngredients));
    } else {
      const localIngredients = JSON.parse(localStorage.getItem('local_ingredients') || '[]');
      const draggedIdx = localIngredients.findIndex((i: Ingredient) => i.id === draggedId);
      const targetIdx = localIngredients.findIndex((i: Ingredient) => i.id === targetId);
      if (draggedIdx === -1 || targetIdx === -1) return;
      const [removed] = localIngredients.splice(draggedIdx, 1);
      localIngredients.splice(targetIdx, 0, removed);
      localStorage.setItem('local_ingredients', JSON.stringify(localIngredients));
    }
    setDraggedId(null); setDragOverId(null);
    fetchIngredients();
  };
  const handleDragEnd = () => { setDraggedId(null); setDragOverId(null); };

  const getIngredientVariants = async (ingredientId: string): Promise<Variant[]> => {
    if (mode === 'supabase') {
      const { data } = await supabase.from('ingredient_variants').select('*').eq('ingredient_id', ingredientId);
      return data || [];
    } else {
      const localIngredients = JSON.parse(localStorage.getItem('local_ingredients') || '[]');
      const localIng = localIngredients.find((i: any) => i.id === ingredientId);
      return localIng?.variants || [];
    }
  };

  const loadUsageFormulas = async (ingredientId: string): Promise<any[]> => {
    setIsLoadingUsage(true);
    try {
      if (mode === 'supabase') {
        const { data, error } = await supabase
          .from('formula_ingredients')
          .select(`formula_id, formulas(id, name, version)`)
          .eq('ingredient_id', ingredientId);
        if (!error && data) {
          const formulas = data.map(d => d.formulas).filter(Boolean);
          setUsageFormulas(formulas);
          return formulas;
        }
      } else {
        const localFormulas = JSON.parse(localStorage.getItem('local_formulas') || '[]');
        const formulasUsing = localFormulas.filter((f: any) =>
          f.formula_ingredients?.some((fi: any) => fi.ingredient_id === ingredientId)
        ).map((f: any) => ({ id: f.id, name: f.name, version: f.version || 'v1.0' }));
        setUsageFormulas(formulasUsing);
        return formulasUsing;
      }
    } catch (err) {
      console.error('[Insumos] Error loading usage formulas:', err);
    } finally {
      setIsLoadingUsage(false);
    }
    return [];
  };

  const formatCurrency = useCallback((value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }, []);

  const filteredIngredients = useMemo(() => {
    const result = ingredients.filter(ing => {
      const matchesSearch = ing.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ing.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ing.fornecedor?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = !filterType ||
        (filterType === 'quimico' && ing.produto_quimico) ||
        (filterType === 'embalagem' && !ing.produto_quimico);
      const matchesSupplier = !filterSupplier || ing.fornecedor === filterSupplier;
      let matchesStock = true;
      if (filterStock) {
        const atual = ing.estoque_atual || 0;
        const minimo = ing.estoque_minimo || 0;
        if (filterStock === 'baixo') matchesStock = atual <= minimo;
        else if (filterStock === 'medio') matchesStock = atual > minimo && atual <= minimo * 2;
        else if (filterStock === 'alto') matchesStock = atual > minimo * 2;
      }
      return matchesSearch && matchesType && matchesSupplier && matchesStock;
    });

    result.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      if (aValue === bValue) return 0;
      if (aValue === undefined || aValue === null) return sortOrder === 'asc' ? 1 : -1;
      if (bValue === undefined || bValue === null) return sortOrder === 'asc' ? -1 : 1;
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [ingredients, searchTerm, sortField, sortOrder, filterType, filterSupplier, filterStock]);

  const totalPages = Math.ceil(filteredIngredients.length / itemsPerPage);
  const paginatedIngredients = filteredIngredients.slice(
    (currentPage - 1) * itemsPerPage, currentPage * itemsPerPage
  );

  const stats = useMemo(() => {
    const total = ingredients.length;
    const lowStock = ingredients.filter(ing => (ing.estoque_atual || 0) <= (ing.estoque_minimo || 0) && total > 0).length;
    const chemical = ingredients.filter(ing => ing.produto_quimico).length;
    const investment = ingredients.reduce((acc, ing) => acc + ((ing.estoque_atual || 0) * (typeof ing.cost_per_unit === 'number' ? ing.cost_per_unit : 0)), 0);
    return { total, lowStock, chemical, investment };
  }, [ingredients]);

  const activeFiltersCount = [filterType, filterSupplier, filterStock].filter(Boolean).length;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'n' || e.key === 'N') { e.preventDefault(); handleOpenModal(); }
        if (e.key === 'f' || e.key === 'F') { e.preventDefault(); document.querySelector<HTMLInputElement>('input[placeholder="Buscar..."]')?.focus(); }
      }
      if (e.key === 'Escape' && isModalOpen) handleCloseModal();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  return (
    <ErrorBoundary>
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-7xl mx-auto space-y-6">

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <Package className="w-6 h-6 text-[#202eac]" /> Insumos
                </h2>
                <span className="text-sm text-slate-500">{stats.total} itens cadastrados</span>
                <span className="text-xs text-slate-400 flex items-center gap-1" title="Ctrl+N: Novo | Ctrl+F: Buscar | Esc: Fechar modal">
                  <Keyboard className="w-3.5 h-3.5" /> Atalhos
                </span>
              </div>
              <div className="flex items-center gap-3">
                <label className="cursor-pointer px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 hover:border-slate-300 font-medium flex items-center gap-2 transition-all shadow-sm">
                  <Upload className="w-4 h-4 text-emerald-600" />
                  <span className="hidden sm:inline">Importar</span>
                  <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} aria-label="Importar insumos" />
                </label>
                <button onClick={handleExport}
                  className="px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 hover:border-slate-300 font-medium flex items-center gap-2 transition-all shadow-sm"
                  aria-label="Exportar insumos">
                  <Download className="w-4 h-4 text-[#202eac]" />
                  <span className="hidden sm:inline">Exportar</span>
                </button>
                <button onClick={() => handleOpenModal()}
                  className="px-5 py-2.5 bg-gradient-to-r from-[#202eac] to-[#4b5ce8] text-white rounded-xl hover:shadow-lg hover:shadow-indigo-500/25 font-medium flex items-center gap-2 transition-all"
                  aria-label="Adicionar novo insumo">
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Adicionar</span>
                </button>
              </div>
            </div>

            <InsumoStats
              total={stats.total} lowStock={stats.lowStock} chemical={stats.chemical}
              investment={stats.investment} suppliersCount={suppliers.length}
            />

            <InsumoFilters
              searchTerm={searchTerm} onSearchChange={handleSearchChange}
              filterType={filterType} onFilterTypeChange={handleFilterTypeChange}
              filterSupplier={filterSupplier} onFilterSupplierChange={handleFilterSupplierChange}
              filterStock={filterStock} onFilterStockChange={handleFilterStockChange}
              suppliers={suppliers}
              viewMode={viewMode} onViewModeChange={handleSetViewMode}
              sortOrder={sortOrder} onSortOrderToggle={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              activeFiltersCount={activeFiltersCount} onClearFilters={clearAllFilters}
              sortConfigsCount={1} onClearSorts={() => { setSortField('name'); setSortOrder('asc'); }}
            />

            {isLoading ? (
              <div className="space-y-4"><CardSkeleton count={4} /><TableSkeleton rows={8} /></div>
            ) : filteredIngredients.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-600 font-medium">Nenhum insumo encontrado</p>
                <p className="text-slate-400 text-sm mt-1">Clique em "Adicionar Insumo" para começar</p>
              </div>
            ) : viewMode === 'list' ? (
              <>
                <InsumoTable
                  ingredients={paginatedIngredients}
                  sortField={sortField} sortOrder={sortOrder} onSort={handleSort}
                  onOpenModal={handleOpenModal} onDuplicate={handleDuplicate} onDelete={confirmDelete}
                  onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDrop} onDragEnd={handleDragEnd}
                  draggedId={draggedId} dragOverId={dragOverId} formatCurrency={formatCurrency}
                />
                <InsumoPagination
                  currentPage={currentPage} totalPages={totalPages} totalItems={filteredIngredients.length}
                  itemsPerPage={itemsPerPage} onPageChange={setCurrentPage}
                  onItemsPerPageChange={handleSetItemsPerPage} availablePageSizes={ITEMS_PER_PAGE_OPTIONS}
                />
              </>
            ) : (
              <>
                <InsumoGrid
                  ingredients={paginatedIngredients}
                  onOpenModal={handleOpenModal} onDuplicate={handleDuplicate} onDelete={confirmDelete}
                  formatCurrency={formatCurrency}
                />
                <InsumoPagination
                  currentPage={currentPage} totalPages={totalPages} totalItems={filteredIngredients.length}
                  itemsPerPage={itemsPerPage} onPageChange={setCurrentPage}
                  onItemsPerPageChange={handleSetItemsPerPage} availablePageSizes={ITEMS_PER_PAGE_OPTIONS}
                />
              </>
            )}
          </div>
        </div>

        <InsumoModal
          isOpen={isModalOpen}
          ingredient={editingIngredient}
          suppliers={suppliers}
          usageFormulas={usageFormulas}
          isLoadingUsage={isLoadingUsage}
          stockMovements={stockMovements}
          isLoadingMovements={isLoadingMovements}
          isSaving={isSaving}
          onClose={handleCloseModal}
          onSave={handleSave}
          onLoadVariants={getIngredientVariants}
          onLoadUsage={loadUsageFormulas}
          onLoadMovements={loadStockMovements}
          onAddMovement={handleAddMovement}
          onExportMovements={handleExportMovements}
          dateFilter={dateFilter || undefined}
          onDateFilterChange={setDateFilter}
        />

        <DeleteConfirmDialog
          isOpen={deleteDialog.isOpen}
          ingredientName={deleteDialog.name}
          formulas={deleteDialog.formulas}
          isLoading={deleteDialog.isLoading}
          onConfirm={executeDelete}
          onCancel={() => setDeleteDialog({ isOpen: false, id: '', name: '', formulas: [], isLoading: false })}
        />
      </div>
    </ErrorBoundary>
  );
}
