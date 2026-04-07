import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useStorageMode } from '../../contexts/StorageModeContext';
import { generateId } from '../../lib/id';
import { Formula, PackagingOption, Simulation, CalculationMode, CalculationResult } from './types';

const compareVersions = (v1: string, v2: string) => {
  if (!v1) return -1;
  const parse = (v: string) => v.toLowerCase().replace(/[^\d.]/g, '').split('.').map(Number);
  const p1 = parse(v1);
  const p2 = parse(v2 || '0');
  for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
    const n1 = p1[i] || 0;
    const n2 = p2[i] || 0;
    if (n1 !== n2) return n1 - n2;
  }
  return 0;
};

const getBaseFormulaName = (name: string): string => name.trim().replace(/\s*\([^)]*\)\s*$/g, '').trim().toUpperCase();

interface UseProporcaoDataReturn {
  formulas: Formula[];
  packagingOptions: PackagingOption[];
  isLoading: boolean;
  hiddenFormulas: { name: string; version: string }[];
  hideFormula: (name: string, version: string) => void;
  showFormula: (name: string, version: string) => void;
  fetchFormulas: () => Promise<void>;
  fetchPackaging: () => Promise<void>;
}

export function useProporcaoData(): UseProporcaoDataReturn {
  const { mode } = useStorageMode();
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [packagingOptions, setPackagingOptions] = useState<PackagingOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hiddenFormulas, setHiddenFormulas] = useState<{ name: string; version: string }[]>([]);

  const fetchFormulas = useCallback(async () => {
    setIsLoading(true);
    try {
      let data: Formula[] = [];
      if (mode === 'supabase') {
        const { data: res, error } = await supabase
          .from('formulas')
          .select('*, formula_ingredients(*, ingredients(*), variants(*))')
          .eq('status', 'active');
        if (error) throw error;
        data = res as Formula[];
      } else {
        const localData = JSON.parse(localStorage.getItem('local_formulas') || '[]') as Formula[];
        data = localData.filter((f) => f.status === 'active');
      }
      const map: Record<string, Formula> = {};
      data.forEach(f => {
        const b = getBaseFormulaName(f.name);
        if (!map[b] || compareVersions(f.version, map[b].version) > 0) map[b] = f;
      });
      setFormulas(Object.values(map));
    } catch {
      // Silently handle fetch error
    } finally {
      setIsLoading(false);
    }
  }, [mode]);

  const fetchPackaging = useCallback(async () => {
    try {
      const flattened: PackagingOption[] = [];
      interface IngWithVariants {
        name: string;
        cost_per_unit: number;
        produto_quimico?: boolean;
        variants?: { name: string; cost_per_unit: number | null; id: string }[];
        id: string;
      }
      const processIng = (ing: IngWithVariants) => {
        const m = ing.name.match(/(\d+[.,]?\d*)\s*(L|ml|LT|KG|G)/i);
        let cap = m ? parseFloat(m[1].replace(',', '.')) : 0;
        if (m && m[2].toLowerCase() === 'ml') cap /= 1000;
        if (cap > 0)
          flattened.push({
            id: ing.id,
            variant_id: null,
            name: ing.name,
            cost: ing.cost_per_unit,
            capacity: cap,
          });
        ing.variants?.forEach((v) => {
          const vm = v.name.match(/(\d+[.,]?\d*)\s*(L|ml|LT|KG|G)/i);
          let vcap = vm ? parseFloat(vm[1].replace(',', '.')) : cap;
          if (vm && vm[2].toLowerCase() === 'ml') vcap /= 1000;
          if (vcap > 0)
            flattened.push({
              id: ing.id,
              variant_id: v.id || v.name,
              name: `${ing.name} - ${v.name}`,
              cost: v.cost_per_unit || ing.cost_per_unit,
              capacity: vcap,
            });
        });
      };
      if (mode === 'supabase') {
        const { data } = await supabase
          .from('ingredients')
          .select('*, variants(*)')
          .eq('produto_quimico', false);
        data?.forEach(processIng);
      } else {
        const localIngredients = JSON.parse(localStorage.getItem('local_ingredients') || '[]') as IngWithVariants[];
        localIngredients
          .filter((i) => !i.produto_quimico)
          .forEach(processIng);
      }
      setPackagingOptions(flattened);
    } catch {
      // Silently handle packaging fetch error
    }
  }, [mode]);

  const hideFormula = useCallback((name: string, version: string) => {
    setHiddenFormulas(prev => {
      const updated = [...prev, { name, version }];
      localStorage.setItem('microsaas_hidden_formulas_proporcao', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const showFormula = useCallback((name: string, version: string) => {
    setHiddenFormulas(prev => {
      const updated = prev.filter(h => !(h.name === name && h.version === version));
      localStorage.setItem('microsaas_hidden_formulas_proporcao', JSON.stringify(updated));
      return updated;
    });
  }, []);

  useEffect(() => {
    fetchFormulas();
    fetchPackaging();
    const saved = localStorage.getItem('microsaas_hidden_formulas_proporcao');
    if (saved) setHiddenFormulas(JSON.parse(saved));
  }, [mode, fetchFormulas, fetchPackaging]);

  return {
    formulas,
    packagingOptions,
    isLoading,
    hiddenFormulas,
    hideFormula,
    showFormula,
    fetchFormulas,
    fetchPackaging,
  };
}

interface UseSimulationReturn {
  recentSimulations: Simulation[];
  saveSimulation: (simulation: Omit<Simulation, 'id' | 'createdAt'>) => void;
  fetchSimulations: (formulaId: string) => void;
}

export function useSimulation(): UseSimulationReturn {
  const [recentSimulations, setRecentSimulations] = useState<Simulation[]>([]);

  const saveSimulation = useCallback((simulation: Omit<Simulation, 'id' | 'createdAt'>) => {
    const saved = JSON.parse(localStorage.getItem('local_proportions') || '[]');
    const newSim: Simulation = {
      ...simulation,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem('local_proportions', JSON.stringify([newSim, ...saved]));
  }, []);

  const fetchSimulations = useCallback((formulaId: string) => {
    const raw = localStorage.getItem('local_proportions');
    const all = raw ? JSON.parse(raw) : [];
    setRecentSimulations(
      Array.isArray(all)
        ? all
            .filter(p => p.formulaId === formulaId)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 5)
        : []
    );
  }, []);

  return {
    recentSimulations,
    saveSimulation,
    fetchSimulations,
  };
}

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
