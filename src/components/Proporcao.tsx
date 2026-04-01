import React, { useState, useEffect, useMemo, Component, ReactNode } from 'react';
import {
  Scale,
  Search,
  Beaker,
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
} from 'lucide-react';

import { useToast } from './dashboard/Toast';
import { formatCurrency, formatVersion } from '../lib/formatters';
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
    console.error('[ErrorBoundary] Erro capturado:', error.message, error.stack);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Erro detalhado:', error, errorInfo.componentStack);
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
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [sortField, setSortField] = useState<'name' | 'lm_code' | 'base_volume' | 'version'>('name');

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
  };

  const handleCalculationModeChange = (mode: CalculationMode) => {
    setCalculationMode(mode);
    setSelectedPackagingKeys([]);
  };

  const filteredFormulas = useMemo(() => {
    return formulas
      .filter(
        f =>
          !hiddenFormulas.some(h => h.name === f.name) &&
          (f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            f.lm_code?.toLowerCase().includes(searchTerm.toLowerCase()))
      )
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
  }, [formulas, searchTerm, sortOrder, sortField, hiddenFormulas]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  useEffect(() => {
    if (selectedFormula) {
      fetchSimulations(selectedFormula.id);
    }
  }, [selectedFormula, fetchSimulations]);

  useEffect(() => {
    if (!selectedFormula || calculation.assemblyOptions.length === 0 || selectedPackagingKeys.length > 0)
      return;
    handleSelectOption(calculation.assemblyOptions[0]);
  }, [currentBatchSize, selectedFormula, calculation.assemblyOptions]);

  const handleSelectFormula = (f: Formula) => {
    setSelectedFormula(f);
    setBatchSizeVolume(f.base_volume.toString());
    setBatchSizeUnits('10');
    setSelectedPackagingKeys([]);
    setCalculationMode('volume');
  };

  const handleSelectOption = (opt: { items: { capacity: number; quantity: number }[] }) => {
    const keys: string[] = [];
    opt.items.forEach(item => {
      calculation.packagingOptionsByCapacity[item.capacity]?.forEach(p =>
        keys.push(`${p.id}_${p.variant_id || 'base'}`)
      );
    });
    setSelectedPackagingKeys(keys);
  };

  const handleSaveProportion = () => {
    if (!selectedFormula || calculation.currentBatchSize <= 0) return;
    try {
      const ingredientsData = [
        ...calculation.calculationResult.ingredients.map((fi: any) => ({
          id: fi.id,
          name: fi.ingredients.name,
          quantity: fi.calculatedQuantity,
          unit: fi.ingredients.unit,
          cost: fi.calculatedQuantity * ((fi.variants?.cost_per_unit ?? fi.ingredients.cost_per_unit) || 0),
          isChemical: true,
        })),
        ...calculation.calculationResult.nonChemicalCosts.map((item: any) => ({
          id: `pkg_${item.name}`,
          name: item.name,
          quantity: item.quantity,
          unit: 'un',
          cost: item.total,
          isChemical: false,
        })),
      ];
      const versionStr = (selectedFormula.version || 'v1.0').toLowerCase();
      const sim = {
        formulaId: selectedFormula.id,
        formulaName: selectedFormula.name,
        formulaVersion: versionStr,
        targetVolume: calculation.currentBatchSize,
        totalCost: calculation.totalCost,
        displayName: `${selectedFormula.name} -- ${calculation.currentBatchSize.toLocaleString('pt-BR')}L -- ${versionStr}`,
        ingredients: ingredientsData,
      };
      saveSimulation(sim as any);
      showToast('success', 'Simulação Arquivada!', 'Os dados foram persistidos no seu Memorial de Cálculo com sucesso.');
    } catch (err: any) {
      showToast('error', 'Erro ao Salvar', 'Não foi possível salvar a simulação.');
    }
  };

  if (selectedFormula) {
    const verBadge = formatVersion(selectedFormula.version);

    return (
      <ErrorBoundary>
        <div className="flex-1 flex flex-col h-full bg-slate-50">
          {/* Calculadora Header */}
          <div className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSelectedFormula(null)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <ArrowLeft className="w-6 h-6 text-slate-600" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-[#202eac]" />
                  Calculadora
                </h2>
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                  {selectedFormula.name}
                  <span className="text-[10px] font-bold bg-gradient-to-r from-[#202eac] to-[#4b5ce8] text-white px-2 py-0.5 rounded">
                    {verBadge.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={handleSaveProportion}
              className="px-5 py-2.5 bg-[#202eac] hover:bg-blue-800 text-white font-medium rounded-xl transition-colors flex items-center gap-2 shadow-sm"
            >
              <FileText className="w-4 h-4" />
              Salvar Simulação
            </button>
          </div>

        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">
            <aside className="lg:col-span-4 space-y-8">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <ToggleGroup
                  value={calculationMode}
                  onChange={(v) => handleCalculationModeChange(v as CalculationMode)}
                  options={[
                    { value: 'volume', label: 'Volume Fixo' },
                    { value: 'units', label: 'Qtd Peças' },
                  ]}
                />

                <div className="space-y-6">
                  <Input
                    label="Meta de Produção"
                    type="text"
                    value={currentBatchSize}
                    onChange={e => handleBatchSizeChange(e.target.value)}
                    suffix={calculationMode === 'volume' ? 'L/KG' : 'UNI/L'}
                  />

                  <AssemblySuggestions
                    assemblyOptions={calculation.assemblyOptions}
                    onSelectOption={handleSelectOption}
                  />
                </div>

                {recentSimulations.length > 0 && (
                  <div className="pt-6 border-t border-slate-100 animate-in slide-in-from-bottom-4">
                    <div className="flex items-center gap-2 mb-5 ml-1">
                      <History className="w-5 h-5 text-[#202eac]" />
                      <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-tight">
                        Recentes
                      </h4>
                    </div>
                    <div className="space-y-3">
                      {recentSimulations.map((sim: Simulation) => (
                        <div
                          key={sim.id}
                          className="p-4 bg-slate-50 border border-slate-100 rounded-3xl flex items-center justify-between hover:bg-white hover:shadow-lg transition-all border-l-4 border-l-[#202eac] group"
                        >
                          <div className="flex flex-col">
                            <span className="text-[11px] font-black text-slate-700 leading-tight mb-1">
                              {sim.displayName.split(' -- ')[1]}
                            </span>
                            <span className="text-[9px] text-slate-400 font-bold">
                              {new Date(sim.createdAt).toLocaleTimeString('pt-BR')}
                            </span>
                          </div>
                          <span className="text-xs font-black text-[#202eac] group-hover:scale-110 transition-transform">
                            {formatCurrency(sim.totalCost)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </aside>

            <main className="lg:col-span-8 space-y-10">
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
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
        {/* Main Content */}
        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-7xl mx-auto space-y-6">

            {/* Action Bar */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <Calculator className="w-6 h-6 text-[#202eac]" />
                  Proporção
                </h2>
                <span className="text-sm text-slate-500">{formulas.length} fórmulas ativas</span>
              </div>
            </div>

            {/* Module Header - Elaborate */}
            <div className="bg-gradient-to-br from-white via-slate-50 to-slate-100 rounded-2xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-start gap-5">
                {/* Icon */}
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25 shrink-0">
                  <Calculator className="w-8 h-8 text-white" />
                </div>
                
                {/* Content */}
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    Calculadora de Proporções
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Módulo Principal</span>
                  </h2>
                  <p className="text-slate-600 text-sm mt-1.5 leading-relaxed max-w-3xl">
                    Calcule as proporções exatas para produção em escala. Defina o volume alvo e receba sugestões de montagem de embalagens.
                  </p>
                  
                  {/* Stats Badges */}
                  <div className="flex items-center gap-3 mt-4 flex-wrap">
                    <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg">
                      <Beaker className="w-4 h-4 text-blue-600" />
                      <span className="text-slate-700 text-sm font-medium uppercase">{formulas.length} fórmulas ativas</span>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg">
                      <FileText className="w-4 h-4 text-purple-600" />
                      <span className="text-slate-700 text-sm font-medium uppercase">{recentSimulations.length} simulações</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Search and Controls Bar */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Search - Compact */}
              <div className="bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2 w-64 focus-within:border-[#202eac] focus-within:ring-2 focus-within:ring-[#202eac]/10 transition-all">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Buscar fórmula..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 outline-none text-sm text-slate-700 placeholder:text-slate-400 min-w-0"
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="text-slate-400 hover:text-slate-600 shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Spacer */}
              <div className="flex-1"></div>

              {/* View Mode */}
              <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-all duration-200 ${viewMode === 'list' ? 'bg-gradient-to-br from-[#202eac] to-[#4b5ce8] text-white shadow-md' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                  title="Lista"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-all duration-200 ${viewMode === 'grid' ? 'bg-gradient-to-br from-[#202eac] to-[#4b5ce8] text-white shadow-md' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                  title="Blocos"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-64">
                  <div className="w-10 h-10 border-4 border-blue-200 border-t-[#202eac] rounded-full animate-spin mb-4"></div>
                  <p className="text-slate-500 font-medium">Carregando fórmulas...</p>
                </div>
              ) : filteredFormulas.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calculator className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-slate-600 font-medium">Nenhuma fórmula encontrada</p>
                  <p className="text-slate-400 text-sm mt-1">Certifique-se de ter fórmulas ativas cadastradas</p>
                </div>
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 p-6">
                  {filteredFormulas.map(f => (
                    <ProporcaoCard key={f.id} formula={f} onClick={() => handleSelectFormula(f)} />
                  ))}
                </div>
              ) : viewMode === 'list' ? (
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4 text-left text-xs font-bold text-slate-500 uppercase cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('name')}>
                          <div className="flex items-center gap-1">
                            Fórmula
                            {sortField === 'name' && (sortOrder === 'asc' ? <ArrowDownAZ className="w-3 h-3" /> : <ArrowUpZA className="w-3 h-3" />)}
                          </div>
                        </th>
                        <th className="py-3 px-4 text-left text-xs font-bold text-slate-500 uppercase cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('lm_code')}>
                          <div className="flex items-center gap-1">
                            LM
                            {sortField === 'lm_code' && (sortOrder === 'asc' ? <ArrowDownAZ className="w-3 h-3" /> : <ArrowUpZA className="w-3 h-3" />)}
                          </div>
                        </th>
                        <th className="py-3 px-4 text-right text-xs font-bold text-slate-500 uppercase cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('base_volume')}>
                          <div className="flex items-center justify-end gap-1">
                            Volume
                            {sortField === 'base_volume' && (sortOrder === 'asc' ? <ArrowDownAZ className="w-3 h-3" /> : <ArrowUpZA className="w-3 h-3" />)}
                          </div>
                        </th>
                        <th className="py-3 px-4 text-center text-xs font-bold text-slate-500 uppercase cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('version')}>
                          <div className="flex items-center justify-center gap-1">
                            Versão
                            {sortField === 'version' && (sortOrder === 'asc' ? <ArrowDownAZ className="w-3 h-3" /> : <ArrowUpZA className="w-3 h-3" />)}
                          </div>
                        </th>
                        <th className="py-3 px-4 text-center text-xs font-bold text-slate-500 uppercase">
                          Insumos
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredFormulas.map((f) => (
                        <tr 
                          key={f.id} 
                          className="hover:bg-slate-50 transition-colors cursor-pointer group"
                          onClick={() => handleSelectFormula(f)}
                        >
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-800 group-hover:text-[#202eac] transition-colors">{f.name}</div>
                          </td>
                          <td className="py-3 px-4 text-slate-600 font-mono text-sm">
                            {f.lm_code || '-'}
                          </td>
                          <td className="py-3 px-4 text-slate-600 font-medium text-right">
                            {f.base_volume}L
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="text-[10px] font-bold bg-gradient-to-r from-[#202eac] to-[#4b5ce8] text-white px-1.5 py-0.5 rounded shadow-sm">
                              {(f.version || 'v1.0').toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-[10px] font-bold">
                              {f.formula_ingredients?.length || 0} itens
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 p-6">
                  {filteredFormulas.map(f => (
                    <ProporcaoCard key={f.id} formula={f} onClick={() => handleSelectFormula(f)} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
