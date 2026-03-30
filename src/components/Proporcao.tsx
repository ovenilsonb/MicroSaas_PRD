import React, { useState, useEffect, useMemo } from 'react';
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

export default function Proporcao() {
  const { showToast } = useToast();
  const { formulas, packagingOptions, isLoading, hiddenFormulas, fetchFormulas } = useProporcaoData();
  const { recentSimulations, saveSimulation, fetchSimulations } = useSimulation();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFormula, setSelectedFormula] = useState<Formula | null>(null);
  const [batchSize, setBatchSize] = useState<string>('100');
  const [selectedPackagingKeys, setSelectedPackagingKeys] = useState<string[]>([]);
  const [calculationMode, setCalculationMode] = useState<CalculationMode>('volume');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const calculation = useCalculation(
    packagingOptions,
    batchSize,
    selectedPackagingKeys,
    calculationMode,
    selectedFormula?.base_volume || 0,
    selectedFormula?.formula_ingredients || []
  );

  const filteredFormulas = useMemo(() => {
    return formulas
      .filter(
        f =>
          !hiddenFormulas.some(h => h.name === f.name) &&
          (f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            f.lm_code?.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      .sort((a, b) =>
        sortOrder === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
      );
  }, [formulas, searchTerm, sortOrder, hiddenFormulas]);

  useEffect(() => {
    if (selectedFormula) {
      fetchSimulations(selectedFormula.id);
    }
  }, [selectedFormula, fetchSimulations]);

  useEffect(() => {
    if (!selectedFormula || calculation.assemblyOptions.length === 0 || selectedPackagingKeys.length > 0)
      return;
    handleSelectOption(calculation.assemblyOptions[0]);
  }, [batchSize, selectedFormula, calculation.assemblyOptions]);

  const handleSelectFormula = (f: Formula) => {
    setSelectedFormula(f);
    setBatchSize(f.base_volume.toString());
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
      const versionStr = (selectedFormula.version || 'V1').startsWith('V')
        ? selectedFormula.version
        : `V${selectedFormula.version}`;
      const sim = {
        formulaId: selectedFormula.id,
        formulaName: selectedFormula.name,
        formulaVersion: selectedFormula.version,
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
      <div className="flex flex-col h-full bg-slate-50 relative font-sans">
        <header className="bg-white border-b border-slate-200 px-8 py-6 shrink-0 z-10">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSelectedFormula(null)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <ArrowLeft className="w-6 h-6 text-slate-600" />
              </button>
              <div>
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3 tracking-tighter uppercase">
                  <Calculator className="w-7 h-7 text-[#202eac]" /> Calculadora
                </h2>
                <div className="flex items-center gap-2 text-slate-500 font-bold text-sm tracking-tight">
                  {selectedFormula.name}{' '}
                  <span className="bg-[#202eac] text-white px-3 py-1 rounded-full text-[10px] shadow-sm">
                    {verBadge}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={handleSaveProportion}
              className="bg-[#202eac] text-white px-8 py-3.5 rounded-2xl font-black transition-all shadow-xl shadow-blue-100/50 flex items-center gap-2 hover:scale-[1.02] active:scale-95"
            >
              <FileText className="w-5 h-5" /> Salvar Simulação
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">
            <aside className="lg:col-span-4 space-y-8">
              <div className="bg-white p-8 rounded-[48px] border border-slate-200 shadow-2xl space-y-8 ring-1 ring-slate-100/50">
                <ToggleGroup
                  value={calculationMode}
                  onChange={(v) => setCalculationMode(v as CalculationMode)}
                  options={[
                    { value: 'volume', label: 'Volume Fixo' },
                    { value: 'units', label: 'Qtd Peças' },
                  ]}
                />

                <div className="space-y-6">
                  <Input
                    label="Meta de Produção"
                    type="text"
                    value={batchSize}
                    onChange={e => {
                      setBatchSize(e.target.value);
                      setSelectedPackagingKeys([]);
                    }}
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
              />
            </main>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden font-sans">
      <header className="bg-white border-b border-slate-200 px-10 py-8 flex items-center justify-between shrink-0 z-20 shadow-xl">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tighter flex items-center gap-4 uppercase">
            <Beaker className="w-10 h-10 text-[#202eac]" /> Proporção
          </h1>
          <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.3em] mt-2">
            Inteligência Operacional Ohana Clean
          </p>
        </div>
        <div className="flex items-center gap-6">
          <div className="relative w-80 group">
            <Search className="w-6 h-6 absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#202eac] transition-all" />
            <input
              type="text"
              placeholder="Pesquisar catálogo..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-slate-100 border-2 border-transparent focus:border-[#202eac] focus:bg-white rounded-[24px] pl-16 pr-6 py-4.5 text-sm font-bold shadow-inner"
            />
          </div>
          <div className="flex bg-slate-100 p-1.5 rounded-[20px] shadow-inner">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-3.5 rounded-2xl transition-all ${
                viewMode === 'grid' ? 'bg-white text-[#202eac] shadow-md' : 'text-slate-400'
              }`}
            >
              <LayoutGrid className="w-6 h-6" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-3.5 rounded-2xl transition-all ${
                viewMode === 'list' ? 'bg-white text-[#202eac] shadow-md' : 'text-slate-400'
              }`}
            >
              <List className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-12 bg-white/50">
        <div className="max-w-[1700px] mx-auto">
          {isLoading ? (
            <div className="p-20 text-center font-black text-slate-300 text-3xl animate-pulse uppercase tracking-widest mt-20">
              Sincronizando Sistema...
            </div>
          ) : filteredFormulas.length === 0 ? (
            <div className="bg-white rounded-[60px] border-4 border-dashed border-slate-100 p-40 text-center flex flex-col items-center gap-6 mt-10">
              <Beaker className="w-24 h-24 opacity-10" />
              <p className="font-black text-2xl text-slate-300 uppercase tracking-[0.2em]">
                Fórmula não localizada no catálogo
              </p>
            </div>
          ) : (
            <div
              className={`grid gap-12 ${
                viewMode === 'grid'
                  ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                  : 'grid-cols-1'
              }`}
            >
              {filteredFormulas.map(f => (
                <ProporcaoCard key={f.id} formula={f} onClick={() => handleSelectFormula(f)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
