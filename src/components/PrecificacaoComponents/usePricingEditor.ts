import { useState, useMemo, useCallback, useEffect } from 'react';
import { Formula, PricingEntry, PackagingOption } from './types';
import { calcIngredientCost, parseCost, calculateMargins } from './pricingUtils';

export function usePricingEditor(allPackagingOptions: PackagingOption[]) {
  const [selectedFormula, setSelectedFormula] = useState<Formula | null>(null);
  const [selectedCapacity, setSelectedCapacity] = useState<number>(0);
  const [selectedPriceType, setSelectedPriceType] = useState<'varejo' | 'atacado' | 'fardo'>('varejo');

  const [varejoPrice, setVarejoPrice] = useState(0);
  const [atacadoPrice, setAtacadoPrice] = useState(0);
  const [fardoPrice, setFardoPrice] = useState(0);
  const [fardoQty, setFardoQty] = useState(6);
  const [fixedCostsPerUnit, setFixedCostsPerUnit] = useState(0);
  
  const [isVarejoDisabled, setIsVarejoDisabled] = useState(false);
  const [isAtacadoDisabled, setIsAtacadoDisabled] = useState(false);
  const [isFardoDisabled, setIsFardoDisabled] = useState(false);

  const [showIngredients, setShowIngredients] = useState(false);

  const loadPricingForCapacity = useCallback((formulaId: string, cap: number, savedPricing: PricingEntry[]) => {
    const entry = savedPricing.find(e => e.formulaId === formulaId && e.capacityKey === String(cap));
    if (entry) {
      setVarejoPrice(entry.varejoPrice);
      setAtacadoPrice(entry.atacadoPrice);
      setFardoPrice(entry.fardoPrice);
      setFardoQty(entry.fardoQty || 6);
      setFixedCostsPerUnit(entry.fixedCosts || 0);
      setIsVarejoDisabled(entry.varejoDisabled || entry.notAvailable || false);
      setIsAtacadoDisabled(entry.atacadoDisabled || entry.notAvailable || false);
      setIsFardoDisabled(entry.fardoDisabled || entry.notAvailable || false);
    } else {
      setVarejoPrice(0);
      setAtacadoPrice(0);
      setFardoPrice(0);
      setFardoQty(6);
      setFixedCostsPerUnit(0);
      setIsVarejoDisabled(false);
      setIsAtacadoDisabled(false);
      setIsFardoDisabled(false);
    }
  }, []);

  const detailCalc = useMemo(() => {
    if (!selectedFormula) return null;

    const totalIngCost = calcIngredientCost(selectedFormula);
    const baseVol = selectedFormula.base_volume || 1;
    const costPerLiter = totalIngCost / baseVol;
    const liquidCost = costPerLiter * selectedCapacity;
    const rendimento = Math.floor(baseVol / selectedCapacity);

    // Packaging lookup
    const variantId = selectedFormula.packaging_variant_id;
    let pkg = variantId
      ? allPackagingOptions.find(p => p.variant_id === variantId && p.capacity === selectedCapacity)
      : null;
    if (!pkg) {
      pkg = allPackagingOptions.find(p => p.capacity === selectedCapacity);
    }

    // Label lookup
    const labelVariantId = selectedFormula.label_variant_id;
    let labelOpt = labelVariantId
      ? allPackagingOptions.find(p => p.variant_id === labelVariantId)
      : null;
    if (!labelOpt) {
      labelOpt = allPackagingOptions.find(p => p.name.toLowerCase().includes('rótulo') || p.name.toLowerCase().includes('etiqueta'));
    }

    const pkgCost = pkg ? parseCost(pkg.cost) : 0;
    const labelCost = labelOpt ? parseCost(labelOpt.cost) : 0;
    const custoUnidade = liquidCost + pkgCost + labelCost;
    const custoTotal = custoUnidade + fixedCostsPerUnit;

    const varejo = calculateMargins(varejoPrice, custoTotal);
    const atacado = calculateMargins(atacadoPrice, custoTotal);
    
    const custoFardo = custoTotal * fardoQty;
    const fardo = calculateMargins(fardoPrice, custoFardo);

    const margins = [
      varejoPrice > 0 ? varejo.margem : null,
      atacadoPrice > 0 ? atacado.margem : null,
      fardoPrice > 0 ? fardo.margem : null,
    ].filter((m): m is number => m !== null);
    
    const margemMedia = margins.length > 0 ? margins.reduce((a, b) => a + b, 0) / margins.length : 0;
    const atacadoDesc = varejoPrice > 0 ? ((1 - atacadoPrice / varejoPrice) * 100) : 0;
    const fardoDesc = varejoPrice > 0 && fardoQty > 0 ? ((1 - (fardoPrice / fardoQty) / varejoPrice) * 100) : 0;

    return {
      totalIngCost, costPerLiter, liquidCost, rendimento,
      pkgCost, labelCost, custoUnidade, custoTotal,
      varejo, atacado, fardo,
      custoFardo, fardoPricePerUnit: fardoQty > 0 ? fardoPrice / fardoQty : 0,
      margemMedia, atacadoDesc, fardoDesc
    };
  }, [selectedFormula, selectedCapacity, varejoPrice, atacadoPrice, fardoPrice, fardoQty, fixedCostsPerUnit, allPackagingOptions]);

  const handleOpenEditor = useCallback((formula: Formula, capacities: number[], savedPricing: PricingEntry[]) => {
    setSelectedFormula(formula);
    const firstCap = capacities[0] || 0;
    setSelectedCapacity(firstCap);
    loadPricingForCapacity(formula.id, firstCap, savedPricing);
  }, [loadPricingForCapacity]);

  const handleCloseEditor = useCallback(() => {
    setSelectedFormula(null);
  }, []);

  return {
    selectedFormula, setSelectedFormula,
    selectedCapacity, setSelectedCapacity,
    selectedPriceType, setSelectedPriceType,
    varejoPrice, setVarejoPrice,
    atacadoPrice, setAtacadoPrice,
    fardoPrice, setFardoPrice,
    fardoQty, setFardoQty,
    fixedCostsPerUnit, setFixedCostsPerUnit,
    isVarejoDisabled, setIsVarejoDisabled,
    isAtacadoDisabled, setIsAtacadoDisabled,
    isFardoDisabled, setIsFardoDisabled,
    showIngredients, setShowIngredients,
    detailCalc,
    loadPricingForCapacity,
    handleOpenEditor,
    handleCloseEditor
  };
}
