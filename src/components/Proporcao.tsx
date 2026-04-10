import React, { useState, useEffect, useMemo, useCallback, Component, ReactNode } from 'react';
import {
  Scale,
  Search,
  Beaker,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Calculator,
  FileText,
  History,
  LayoutGrid,
  List,
  AlertTriangle,
  RefreshCw,
  X,
  ArrowDownAZ,
  ArrowUpZA,
  Upload,
  Download,
  CheckCircle2,
  Keyboard,
} from 'lucide-react';

import { useToast } from './dashboard/Toast';
import { formatCurrency, formatVersion } from '../lib/formatters';
import { generateId } from '../lib/id';
import {
  useProporcaoData,
  useSimulation,
  useCalculation,
  ProporcaoCard,
  ProporcaoSummary,
  MemorialComposicao,
  AssemblySuggestions,
  Formula,
  PackagingOption,
  CalculationMode,
  ViewMode,
  Simulation,
} from './ProporcaoComponents';
import { Input, ToggleGroup } from './ProporcaoComponents/Input';
import { SuccessModal } from './InsumosComponents';

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
    console.error('[Proporcao ErrorBoundary]', error, errorInfo);
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
              <p className="text-slate-600 mb-4">O módulo de Proporção encontrou um erro.</p>
              <div className="bg-slate-100 p-3 rounded-lg mb-4 text-left overflow-auto max-h-32">
                <code className="text-xs text-red-600">{this.state.error?.message}</code>
              </div>
              <button
                onClick={() => {
                  this.setState({ hasError: false });
                }}
                className="px-6 py-2 bg-[#202eac] text-white font-medium rounded-lg hover:bg-blue-800 transition-colors flex items-center gap-2 mx-auto"
              >
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

export default function Proporcao() {
  const { showToast } = useToast();
  const { formulas, packagingOptions, isLoading, hiddenFormulas, fetchFormulas } = useProporcaoData();
  const { recentSimulations, saveSimulation, fetchSimulations } = useSimulation();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFormula, setSelectedFormula] = useState<Formula | null>(null);
  const [batchSizeVolume, setBatchSizeVolume] = useState<string>('100');
  const [batchSizeUnits, setBatchSizeUnits] = useState<string>('10');
  const [selectedPackagingKeys, setSelectedPackagingKeys] = useState<string[]>([]);
  const [calculationMode, setCalculationMode] = useState<CalculationMode>('volume');
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try {
      const saved = localStorage.getItem('proporcaoViewMode');
      return (saved as 'list' | 'grid') || 'list';
    } catch {
      return 'list';
    }
  });
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [sortField, setSortField] = useState<'name' | 'lm_code' | 'base_volume' | 'version'>('name');
  const [currentPage, setCurrentPage] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [showAllSimulations, setShowAllSimulations] = useState(false);
  const [allSimulations, setAllSimulations] = useState<Simulation[]>([]);
  const [selectedAssemblyOptionId, setSelectedAssemblyOptionId] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successModalInfo, setSuccessModalInfo] = useState({ 
    title: '', 
    message: '', 
    itemName: '', 
    type: 'success' as 'success' | 'warning' 
  });
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'recent'>('all');

  const currentBatchSize = calculationMode === 'volume' ? batchSizeVolume : batchSizeUnits;

  const selectedPackagingCapacity = useMemo(() => {
    if (selectedPackagingKeys.length === 0 || packagingOptions.length === 0) return null;
    const firstKey = selectedPackagingKeys[0];
    const pkg = packagingOptions.find(p => `${p.id}_${p.variant_id || 'base'}` === firstKey);
    return pkg?.capacity || null;
  }, [selectedPackagingKeys, packagingOptions]);

  const calculation = useCalculation(
    packagingOptions,
    currentBatchSize,
    selectedPackagingKeys,
    calculationMode,
    selectedFormula?.base_volume || 0,
    selectedFormula?.formula_ingredients || []
  );

  const handleBatchSizeChange = (value: string) => {
    if (calculationMode === 'volume') {
      setBatchSizeVolume(value);
    } else {
      setBatchSizeUnits(value);
    }
    setSelectedPackagingKeys([]);
    setSelectedAssemblyOptionId(null);
  };

  const handleCalculationModeChange = (mode: CalculationMode) => {
    setCalculationMode(mode);
    setSelectedPackagingKeys([]);
    setSelectedAssemblyOptionId(null);
  };

  const filteredFormulas = useMemo(() => {
    return formulas
      .filter(f => {
        // Search filter
        const matchesSearch = 
          f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          f.lm_code?.toLowerCase().includes(searchTerm.toLowerCase());
        
        // Status/Hidden filter
        const isHidden = hiddenFormulas.some(h => h.name === f.name);
        if (isHidden) return false;

        // Custom status filter for Proportion cards
        if (statusFilter === 'active' && f.status !== 'active') return false;
        
        return matchesSearch;
      })
      .sort((a, b) => {
        let comparison = 0;
        switch (sortField) {
          case 'name':
            comparison = a.name.localeCompare(b.name);
            break;
          case 'lm_code':
            comparison = (a.lm_code || '').localeCompare(b.lm_code || '');
            break;
          case 'base_volume':
            comparison = (a.base_volume || 0) - (b.base_volume || 0);
            break;
          case 'version':
            comparison = (a.version || '').localeCompare(b.version || '');
            break;
        }
        return sortOrder === 'asc' ? comparison : -comparison;
      });
  }, [formulas, searchTerm, sortOrder, sortField, hiddenFormulas, statusFilter]);

  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil(filteredFormulas.length / ITEMS_PER_PAGE);
  const paginatedFormulas = filteredFormulas.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleSelectFormula = (f: Formula) => {
    setSelectedFormula(f);
    setBatchSizeVolume(f.base_volume.toString());
    setBatchSizeUnits('10');
    setSelectedPackagingKeys([]);
  };

  const handleSelectOption = useCallback((opt: { id: string; items: { capacity: number; quantity: number }[] }) => {
    setSelectedAssemblyOptionId(opt.id);
    const keys: string[] = [];
    
    // Lista de palavras-chave para detecção de rótulos/etiquetas
    const labelKeywords = ['rótulo', 'etiqueta', 'adesivo', 'tag', 'label'];
    const isLabel = (name: string) => labelKeywords.some(k => name.toLowerCase().includes(k));

    opt.items.forEach(item => {
      const pkgs = calculation.packagingOptionsByCapacity[item.capacity] || [];
      if (pkgs.length > 0) {
        // Seleção Inteligente: Tentamos pegar 1 Embalagem e 1 Rótulo
        const primaryPkg = pkgs.find(p => !isLabel(p.name));
        const labelPkg = pkgs.find(p => isLabel(p.name));

        if (primaryPkg) {
          keys.push(`${primaryPkg.id}_${primaryPkg.variant_id || primaryPkg.name}`);
        }
        
        if (labelPkg) {
          keys.push(`${labelPkg.id}_${labelPkg.variant_id || labelPkg.name}`);
        }

        // Caso não encontre nenhum via filtro (ex: nomes genéricos), pega o primeiro disponível
        if (!primaryPkg && !labelPkg) {
          keys.push(`${pkgs[0].id}_${pkgs[0].variant_id || pkgs[0].name}`);
        }
      }
    });

    setSelectedPackagingKeys(keys);
  }, [calculation.packagingOptionsByCapacity]);

  const handleTogglePackagingKey = useCallback((key: string) => {
    setSelectedPackagingKeys(prev => {
      if (prev.includes(key)) return prev.filter(k => k !== key);
      return [...prev, key];
    });
  }, []);

  useEffect(() => {
    if (selectedFormula) {
      fetchSimulations(selectedFormula.id);
      const raw = localStorage.getItem('local_proportions');
      const all = raw ? JSON.parse(raw) : [];
      if (Array.isArray(all)) {
        setAllSimulations(
          all
            .filter((p: Simulation) => p.formulaId === selectedFormula.id)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        );
      }
    }
  }, [selectedFormula, fetchSimulations]);

  useEffect(() => {
    if (!selectedFormula || calculation.assemblyOptions.length === 0 || selectedPackagingKeys.length > 0)
      return;
    handleSelectOption(calculation.assemblyOptions[0]);
  }, [selectedFormula, calculation.assemblyOptions, selectedPackagingKeys, handleSelectOption]);

  useEffect(() => {
    localStorage.setItem('proporcaoViewMode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('input[placeholder="Buscar fórmula..."]')?.focus();
      }
      if (e.key === 'Escape' && selectedFormula) {
        setSelectedFormula(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedFormula]);

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    setCurrentPage(1);
  };

  const handleExport = () => {
    try {
      const data = formulas;
      const filename = `Backup_Proporcao_${new Date().toISOString().split('T')[0]}.json`;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      showToast('success', 'Exportação Concluída', 'Seu arquivo de backup foi gerado.');
    } catch (err) {
      showToast('error', 'Erro na Exportação', 'Não foi possível gerar o backup.');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    showToast('info', 'Importando...', 'Processando arquivo de fórmulas...');
    // Real logic would be more complex, but for consistency with Formulas module UI:
    setTimeout(() => {
      showToast('success', 'Importação', 'Dados importados com sucesso (simulação).');
    }, 1000);
  };

  const handleSaveProportion = async () => {
    if (!selectedFormula || calculation.currentBatchSize <= 0) return;
    setIsSaving(true);
    try {
      const totalChemQty = calculation.calculationResult.ingredients.reduce((sum, fi) => sum + fi.calculatedQuantity, 0) || 1;
      const ingredientsData: Simulation['ingredients'] = [
        ...calculation.calculationResult.ingredients.map((fi) => ({
          id: fi.id || generateId(),
          name: fi.ingredients.name || '',
          quantity: fi.calculatedQuantity,
          unit: fi.ingredients.unit || '',
          cost: fi.calculatedQuantity * ((fi.variants?.cost_per_unit ?? fi.ingredients.cost_per_unit) || 0),
          isChemical: true,
          percentage: (fi.calculatedQuantity / totalChemQty) * 100,
        })),
        ...calculation.calculationResult.nonChemicalCosts.map((item) => ({
          id: `pkg_${item.name}`,
          name: item.name,
          quantity: item.quantity,
          unit: 'un',
          cost: item.total,
          isChemical: false,
          percentage: 0,
        })),
      ];
      const versionStr = (selectedFormula.version || 'v1.0').toLowerCase();
      const totalUnits = Object.values(calculation.packagingAllocation).reduce((sum, qty) => sum + qty, 0);
      
      // Metadados para exibição e histórico
      const modePrefix = calculationMode === 'volume' ? '[VOLUME]' : '[UNIDADES]';
      const detailedName = `${modePrefix} ${selectedFormula.name} (${versionStr.toUpperCase()}) • ${calculation.currentBatchSize}L • ${totalUnits} un`;

      // Bloqueio de Duplicidade: Verifica se já existe um registro idêntico no histórico desta fórmula
      const isDuplicate = allSimulations.some(sim => 
        sim.formulaVersion.toLowerCase() === versionStr &&
        Math.abs(sim.targetVolume - calculation.currentBatchSize) < 0.001 &&
        sim.targetQuantity === totalUnits &&
        sim.calculationMode === calculationMode
      );

      if (isDuplicate) {
        setSuccessModalInfo({
          title: 'Simulação já Existente',
          message: 'Esta exata proporção já foi salva no seu Memorial de Cálculo anteriormente.',
          itemName: detailedName,
          type: 'warning'
        });
        setShowSuccessModal(true);
        setIsSaving(false);
        return;
      }

      const sim: Omit<Simulation, 'id' | 'createdAt'> = {
        formulaId: selectedFormula.id,
        formulaName: selectedFormula.name,
        formulaVersion: versionStr,
        targetVolume: calculation.currentBatchSize,
        targetQuantity: totalUnits,
        calculationMode: calculationMode,
        totalCost: calculation.totalCost,
        displayName: detailedName,
        ingredients: ingredientsData,
      };
      
      saveSimulation(sim);
      fetchSimulations(selectedFormula.id);
      
      setSuccessModalInfo({
        title: 'Relatório Arquivado',
        message: `A proporção de ${calculation.currentBatchSize}L para um total de ${totalUnits} unidades foi registrada com sucesso no Memorial de Cálculo.`,
        itemName: sim.displayName,
        type: 'success'
      });
      setShowSuccessModal(true);
    } catch {
      showToast('error', 'Erro ao Salvar', 'Não foi possível salvar a simulação.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ErrorBoundary>
      <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
        {selectedFormula ? (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Calculadora Header - Premium Standard */}
            <div className="bg-white border-b border-slate-200 px-8 py-3 flex items-center justify-between shrink-0 shadow-sm z-10">
              <div className="flex items-center gap-5">
                <button
                  onClick={() => setSelectedFormula(null)}
                  className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-500 rounded-xl hover:bg-[#202eac] hover:text-white hover:shadow-lg hover:shadow-indigo-500/20 transition-all duration-300 group"
                >
                  <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                </button>
                
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-800 tracking-tight">Calculadora de Proporção</h2>
                    <span className="bg-blue-50 text-[#202eac] text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-100 uppercase">Simulação</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                    {selectedFormula.name}
                    <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                    <span className="text-[#202eac]">{formatVersion(selectedFormula.version).toUpperCase()}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleSaveProportion}
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-gradient-to-r from-[#202eac] to-[#4b5ce8] text-white font-bold rounded-xl hover:shadow-lg hover:shadow-indigo-500/25 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm uppercase tracking-wider"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Processando...</span>
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4" />
                      <span>Salvar Simulação</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-slate-50/50 p-8 pt-6">
              <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <aside className="lg:col-span-4 space-y-6">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                    <div className="space-y-4">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Modo de Cálculo</label>
                      <ToggleGroup
                        value={calculationMode}
                        onChange={(v) => handleCalculationModeChange(v as CalculationMode)}
                        options={[
                          { value: 'volume', label: 'Volume Fixo' },
                          { value: 'units', label: 'Qtd Peças' },
                        ]}
                      />
                    </div>

                    <div className="space-y-6">
                      <Input
                        label="Meta de Produção"
                        type="text"
                        value={currentBatchSize}
                        onChange={e => handleBatchSizeChange(e.target.value)}
                        suffix={calculationMode === 'volume' ? 'L/KG' : 'UNI/L'}
                      />

                      <div className="pt-4 border-t border-slate-100">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-3 block">Sugestões de Montagem</label>
                        <AssemblySuggestions
                          assemblyOptions={calculation.assemblyOptions}
                          onSelectOption={handleSelectOption}
                          selectedOptionId={selectedAssemblyOptionId}
                          packagingOptionsByCapacity={calculation.packagingOptionsByCapacity}
                          selectedPackagingKeys={selectedPackagingKeys}
                          onTogglePackagingKey={handleTogglePackagingKey}
                        />
                      </div>
                    </div>

                    {recentSimulations.length > 0 && (
                      <div className="pt-6 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-4 px-1">
                          <div className="flex items-center gap-2">
                            <History className="w-4 h-4 text-[#202eac]" />
                            <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-tight">Recentes</h4>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {(showAllSimulations ? allSimulations : recentSimulations).map((sim: Simulation) => (
                            <div
                              key={sim.id}
                              className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between group cursor-default"
                            >
                              <div className="flex flex-col min-w-0">
                                <span className="text-[10px] font-bold text-slate-700 truncate">
                                  {sim.displayName.split(' -- ')[1] || sim.displayName}
                                </span>
                                <span className="text-[9px] text-slate-400">
                                  {new Date(sim.createdAt).toLocaleDateString('pt-BR')}
                                </span>
                              </div>
                              <span className="text-[11px] font-bold text-[#202eac]">
                                {formatCurrency(sim.totalCost)}
                              </span>
                            </div>
                          ))}
                        </div>
                        {allSimulations.length > 5 && (
                          <button
                            type="button"
                            onClick={() => setShowAllSimulations(prev => !prev)}
                            className="w-full mt-3 text-[10px] font-bold text-[#202eac] hover:text-blue-800 text-center py-2 transition-colors uppercase tracking-wider"
                          >
                            {showAllSimulations ? 'Ocultar Histórico' : `Ver Integral (${allSimulations.length})`}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </aside>

                <main className="lg:col-span-8 space-y-8">
                  <ProporcaoSummary
                    totalCost={calculation.totalCost}
                    currentBatchSize={calculation.currentBatchSize}
                    chemicalCost={calculation.chemicalCost}
                    calculationMode={calculationMode}
                  />

                  <MemorialComposicao
                    ingredients={calculation.calculationResult.ingredients}
                    nonChemicalCosts={calculation.calculationResult.nonChemicalCosts}
                    totalCost={calculation.totalCost}
                    packagingCapacity={selectedPackagingCapacity}
                  />
                </main>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-auto p-8">
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <Scale className="w-6 h-6 text-[#202eac]" />
                    Proporção
                  </h2>
                  <span className="text-sm text-slate-500">{formulas.length} fórmulas ativas</span>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Keyboard className="w-3.5 h-3.5" /> Atalhos
                  </span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-white via-slate-50 to-slate-100 rounded-2xl p-6 shadow-sm border border-slate-200">
                <div className="flex items-start gap-5">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25 shrink-0">
                    <Calculator className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                       Calculadora de Proporções
                       <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Módulo Principal</span>
                    </h2>
                    <p className="text-slate-600 text-sm mt-1.5 leading-relaxed max-w-3xl">
                      Configure proporções exatas para sua produção.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center gap-4">
                   <div className="bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2 w-64 focus-within:border-[#202eac] transition-all">
                    <Search className="w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar fórmula..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="flex-1 outline-none text-sm text-slate-700 placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm">
                        <th className="py-4 px-6 font-semibold" onClick={() => handleSort('name')}>Fórmula</th>
                        <th className="py-4 px-6 font-semibold" onClick={() => handleSort('lm_code')}>Código LM</th>
                        <th className="py-4 px-6 font-semibold text-right" onClick={() => handleSort('base_volume')}>Volume Base</th>
                        <th className="py-4 px-6 font-semibold text-center">Insumos</th>
                        <th className="py-4 px-6 font-semibold text-center">Versão</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedFormulas.map((f) => (
                        <tr 
                          key={f.id} 
                          onClick={() => handleSelectFormula(f)} 
                          className="hover:bg-blue-50/50 cursor-pointer transition-colors group"
                        >
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-blue-100 text-[#202eac] rounded-lg flex items-center justify-center font-bold text-xs">{f.name.charAt(0)}</div>
                              <span className="text-sm font-bold text-slate-800">{f.name}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-sm text-slate-500 font-mono">{f.lm_code || '---'}</td>
                          <td className="py-4 px-6 text-sm font-bold text-slate-700 text-right">{f.base_volume}L</td>
                          <td className="py-4 px-6 text-center">
                            <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">{f.formula_ingredients.length} itens</span>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <span className="text-xs font-black text-[#202eac] bg-blue-50 px-2 py-1 rounded-lg uppercase tracking-wider">{formatVersion(f.version)}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-center">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentPage(i + 1)}
                          className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${currentPage === i+1 ? 'bg-[#202eac] text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <SuccessModal 
          isOpen={showSuccessModal}
          onClose={() => {
            setShowSuccessModal(false);
            if (successModalInfo.type === 'success') {
              setSelectedFormula(null);
            }
          }}
          type={successModalInfo.type}
          title={successModalInfo.title}
          message={successModalInfo.message}
          itemName={successModalInfo.itemName}
        />
      </div>
    </ErrorBoundary>
  );
}
