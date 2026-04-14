import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from './dashboard/Toast';
import { generateId } from '../lib/id';
import {
  useProporcaoData,
  useSimulation,
  useCalculation,
  useProporcaoFilters,
  useProporcaoUI,
  ProporcaoSummary,
  MemorialComposicao,
  ProporcaoGallery,
  ProporcaoCalculatorHeader,
  ProporcaoCalculatorSidebar,
  Formula,
  CalculationMode,
  Simulation,
} from './ProporcaoComponents';
import { SuccessModal } from './InsumosComponents';
import { ErrorBoundary } from './shared/ErrorBoundary';

export default function Proporcao() {
  const { showToast } = useToast();
  
  // Data State
  const { formulas, packagingOptions, isLoading, hiddenFormulas } = useProporcaoData();
  const { recentSimulations, saveSimulation, fetchSimulations } = useSimulation();

  // Filters and UI State
  const {
    searchTerm, setSearchTerm,
    statusFilter,
    sortField, sortOrder,
    filteredFormulas,
    handleSort
  } = useProporcaoFilters(formulas, hiddenFormulas);

  const {
    viewMode,
    currentPage, setCurrentPage,
    totalPages,
    showSuccessModal, setShowSuccessModal,
    successModalInfo, openSuccessModal
  } = useProporcaoUI(filteredFormulas.length);

  // Editor/Calculation State
  const [selectedFormula, setSelectedFormula] = useState<Formula | null>(null);
  const [batchSizeVolume, setBatchSizeVolume] = useState<string>('100');
  const [batchSizeUnits, setBatchSizeUnits] = useState<string>('10');
  const [selectedPackagingKeys, setSelectedPackagingKeys] = useState<string[]>([]);
  const [calculationMode, setCalculationMode] = useState<CalculationMode>('volume');
  const [isSaving, setIsSaving] = useState(false);
  const [showAllSimulations, setShowAllSimulations] = useState(false);
  const [allSimulations, setAllSimulations] = useState<Simulation[]>([]);
  const [selectedAssemblyOptionId, setSelectedAssemblyOptionId] = useState<string | null>(null);

  const currentBatchSizeInput = calculationMode === 'volume' ? batchSizeVolume : batchSizeUnits;

  const calculation = useCalculation(
    packagingOptions,
    currentBatchSizeInput,
    selectedPackagingKeys,
    calculationMode,
    selectedFormula?.base_volume || 0,
    selectedFormula?.formula_ingredients || []
  );

  const selectedPackagingCapacity = React.useMemo(() => {
    if (selectedPackagingKeys.length === 0 || packagingOptions.length === 0) return null;
    const firstKey = selectedPackagingKeys[0];
    const pkg = packagingOptions.find(p => `${p.id}_${p.variant_id || 'base'}` === firstKey);
    return pkg?.capacity || null;
  }, [selectedPackagingKeys, packagingOptions]);

  // Handlers
  const handleBatchSizeChange = (value: string) => {
    if (calculationMode === 'volume') setBatchSizeVolume(value);
    else setBatchSizeUnits(value);
    setSelectedPackagingKeys([]);
    setSelectedAssemblyOptionId(null);
  };

  const handleCalculationModeChange = (mode: CalculationMode) => {
    setCalculationMode(mode);
    setSelectedPackagingKeys([]);
    setSelectedAssemblyOptionId(null);
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
    const labelKeywords = ['rótulo', 'etiqueta', 'adesivo', 'tag', 'label'];
    const isLabel = (name: string) => labelKeywords.some(k => name.toLowerCase().includes(k));

    opt.items.forEach(item => {
      const pkgs = calculation.packagingOptionsByCapacity[item.capacity] || [];
      if (pkgs.length > 0) {
        const primaryPkg = pkgs.find(p => !isLabel(p.name));
        const labelPkg = pkgs.find(p => isLabel(p.name));
        if (primaryPkg) keys.push(`${primaryPkg.id}_${primaryPkg.variant_id || primaryPkg.name}`);
        if (labelPkg) keys.push(`${labelPkg.id}_${labelPkg.variant_id || labelPkg.name}`);
        if (!primaryPkg && !labelPkg) keys.push(`${pkgs[0].id}_${pkgs[0].variant_id || pkgs[0].name}`);
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
      const modePrefix = calculationMode === 'volume' ? '[VOLUME]' : '[UNIDADES]';
      const detailedName = `${modePrefix} ${selectedFormula.name} (${versionStr.toUpperCase()}) • ${calculation.currentBatchSize}L • ${totalUnits} un`;

      const isDuplicate = allSimulations.some(sim => 
        sim.formulaVersion.toLowerCase() === versionStr &&
        Math.abs(sim.targetVolume - calculation.currentBatchSize) < 0.001 &&
        sim.targetQuantity === totalUnits &&
        sim.calculationMode === calculationMode
      );

      if (isDuplicate) {
        openSuccessModal('Simulação já Existente', 'Esta exata proporção já foi salva no seu Memorial de Cálculo anteriormente.', detailedName, 'warning');
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
      openSuccessModal('Relatório Arquivado', `A proporção de ${calculation.currentBatchSize}L para um total de ${totalUnits} unidades foi registrada com sucesso no Memorial de Cálculo.`, sim.displayName);
    } catch {
      showToast('error', 'Erro ao Salvar', 'Não foi possível salvar a simulação.');
    } finally {
      setIsSaving(false);
    }
  };

  // Effects
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
    if (!selectedFormula || calculation.assemblyOptions.length === 0 || selectedPackagingKeys.length > 0) return;
    handleSelectOption(calculation.assemblyOptions[0]);
  }, [selectedFormula, calculation.assemblyOptions, selectedPackagingKeys, handleSelectOption]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('input[placeholder="Buscar fórmula..."]')?.focus();
      }
      if (e.key === 'Escape' && selectedFormula) setSelectedFormula(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedFormula]);

  return (
    <ErrorBoundary moduleName="Proporção">
      <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
        {selectedFormula ? (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <ProporcaoCalculatorHeader
              selectedFormula={selectedFormula}
              onBack={() => setSelectedFormula(null)}
              onSave={handleSaveProportion}
              isSaving={isSaving}
            />

            <div className="flex-1 overflow-auto bg-slate-50/50 p-8 pt-6">
              <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <ProporcaoCalculatorSidebar
                  calculationMode={calculationMode}
                  onCalculationModeChange={handleCalculationModeChange}
                  currentBatchSize={currentBatchSizeInput}
                  onBatchSizeChange={handleBatchSizeChange}
                  assemblyOptions={calculation.assemblyOptions}
                  onSelectOption={handleSelectOption}
                  selectedOptionId={selectedAssemblyOptionId}
                  packagingOptionsByCapacity={calculation.packagingOptionsByCapacity}
                  selectedPackagingKeys={selectedPackagingKeys}
                  onTogglePackagingKey={handleTogglePackagingKey}
                  recentSimulations={recentSimulations}
                  allSimulations={allSimulations}
                  showAllSimulations={showAllSimulations}
                  setShowAllSimulations={setShowAllSimulations}
                />

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
          <ProporcaoGallery
            formulas={formulas}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            filteredFormulas={filteredFormulas}
            handleSort={handleSort}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            totalPages={totalPages}
            handleSelectFormula={handleSelectFormula}
          />
        )}

        <SuccessModal 
          isOpen={showSuccessModal}
          onClose={() => {
            setShowSuccessModal(false);
            if (successModalInfo.type === 'success') setSelectedFormula(null);
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
