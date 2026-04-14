import { useMemo } from 'react';
import { PackagingOption, CalculationMode, CalculationResult } from './types';

interface UseCalculationReturn {
  packagingOptionsByCapacity: Record<number, PackagingOption[]>;
  uniqueCapacities: number[];
  assemblyOptions: { id: string; name: string; items: { capacity: number; quantity: number }[]; isSuggested?: boolean }[];
  packagingAllocation: Record<number, number>;
  currentBatchSize: number;
  calculationResult: CalculationResult;
  chemicalCost: number;
  totalCost: number;
}

type FormulaIngredientInput = {
  id?: string;
  ingredient_id?: string;
  variant_id?: string | null;
  quantity: number;
  ingredients: { cost_per_unit: number; name?: string; unit?: string };
  variants?: { name: string; cost_per_unit: number | null };
};

type FormulaIngredientOutput = FormulaIngredientInput & { calculatedQuantity: number };

export function useCalculation(
  packagingOptions: PackagingOption[],
  batchSize: string,
  selectedPackagingKeys: string[],
  calculationMode: CalculationMode,
  baseVolume: number,
  formulaIngredients: FormulaIngredientInput[]
): UseCalculationReturn {
  const packagingOptionsByCapacity = useMemo(() => {
    const g: Record<number, PackagingOption[]> = {};
    packagingOptions.forEach(p => {
      if (!g[p.capacity]) g[p.capacity] = [];
      g[p.capacity].push(p);
    });
    return g;
  }, [packagingOptions]);

  const uniqueCapacities = useMemo(
    () => Object.keys(packagingOptionsByCapacity).map(Number).sort((a, b) => a - b),
    [packagingOptionsByCapacity]
  );

  const assemblyOptions = useMemo(() => {
    const val = parseFloat(batchSize.replace(',', '.'));
    if (isNaN(val) || val <= 0 || uniqueCapacities.length === 0) return [];

    if (calculationMode === 'volume') {
      const options: { items: { capacity: number; quantity: number }[] }[] = [];
      
      for (const cap of uniqueCapacities) {
        const qty = Math.round(val / cap);
        const remainder = val - (qty * cap);
        
        if (Math.abs(remainder) < 0.001 && qty > 0) {
          options.push({ items: [{ capacity: cap, quantity: qty }] });
        }
      }

      if (options.length === 0) {
        return [{
          id: 'no-packaging',
          name: 'Volume sem embalagem disponível',
          items: [],
          isSuggested: false,
        }];
      }

      return options
        .sort((a, b) => a.items[0].capacity - b.items[0].capacity)
        .map((opt, idx) => ({
          ...opt,
          id: `opt-${idx}`,
          name: `${opt.items[0].quantity}x ${opt.items[0].capacity}L`,
          isSuggested: idx === 0,
        }));
    } else {
      return uniqueCapacities.map((cap, idx) => ({
        id: `unit-opt-${idx}`,
        name: `${val} UNIDADES DE ${cap >= 1 ? cap + 'L' : cap * 1000 + 'ml'}`,
        items: [{ capacity: cap, quantity: val }],
        isSuggested: idx === 0,
      }));
    }
  }, [batchSize, uniqueCapacities, calculationMode]);

  const packagingAllocation = useMemo(() => {
    const alloc: Record<number, number> = {};
    const selectedCaps = uniqueCapacities.filter(cap =>
      packagingOptionsByCapacity[cap].some(p => selectedPackagingKeys.includes(`${p.id}_${p.variant_id || p.name}`))
    );

    if (selectedCaps.length > 0) {
      if (calculationMode === 'volume') {
        const parsed = parseFloat(batchSize.replace(',', '.'));
        if (isNaN(parsed) || parsed <= 0) return alloc;
        let rem = parsed;
        selectedCaps
          .sort((a, b) => b - a)
          .forEach((cap, idx) => {
            if (idx === selectedCaps.length - 1) alloc[cap] = Math.ceil(rem / cap);
            else {
              const q = Math.floor(rem / cap);
              alloc[cap] = q;
              rem -= q * cap;
            }
          });
      } else {
        const qty = parseInt(batchSize) || 0;
        selectedCaps.forEach(cap => {
          alloc[cap] = qty;
        });
      }
    }
    return alloc;
  }, [batchSize, selectedPackagingKeys, uniqueCapacities, calculationMode, packagingOptionsByCapacity]);

  const currentBatchSize = useMemo(() => {
    if (calculationMode === 'volume') {
      const parsed = parseFloat(batchSize.replace(',', '.'));
      return isNaN(parsed) ? 0 : parsed;
    }
    let t = 0;
    Object.entries(packagingAllocation).forEach(([c, q]) => {
      t += Number(c) * q;
    });
    return t;
  }, [batchSize, packagingAllocation, calculationMode]);

  const calculationResult = useMemo(() => {
    if (baseVolume <= 0 || currentBatchSize <= 0)
      return { ingredients: [], nonChemicalCosts: [] };
    const s = currentBatchSize / baseVolume;
    const ings: FormulaIngredientOutput[] = formulaIngredients.map((fi) => ({
      ...fi,
      calculatedQuantity: fi.quantity * s,
    }));
    const pkgs: { name: string; quantity: number; cost: number; total: number }[] = [];
    Object.entries(packagingAllocation).forEach(([cap, qty]) => {
      if (qty <= 0) return;
      packagingOptionsByCapacity[Number(cap)]
        ?.filter(p => selectedPackagingKeys.includes(`${p.id}_${p.variant_id || p.name}`))
        .forEach(p => {
          pkgs.push({ name: `${p.name}`, quantity: qty, cost: p.cost, total: qty * p.cost });
        });
    });
    return { 
      ingredients: ings as unknown as CalculationResult['ingredients'], 
      nonChemicalCosts: pkgs 
    };
  }, [baseVolume, currentBatchSize, packagingAllocation, selectedPackagingKeys, packagingOptionsByCapacity, formulaIngredients]);

  const chemicalCost = useMemo(() => {
    return calculationResult.ingredients.reduce(
      (acc, fi) =>
        acc + fi.calculatedQuantity * ((fi.variants?.cost_per_unit ?? fi.ingredients.cost_per_unit) || 0),
      0
    );
  }, [calculationResult]);

  const totalCost = useMemo(() => {
    return chemicalCost + calculationResult.nonChemicalCosts.reduce((acc, p) => acc + p.total, 0);
  }, [chemicalCost, calculationResult]);

  return {
    packagingOptionsByCapacity,
    uniqueCapacities,
    assemblyOptions,
    packagingAllocation,
    currentBatchSize,
    calculationResult,
    chemicalCost,
    totalCost,
  };
}
