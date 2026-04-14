import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useStorageMode } from '../../contexts/StorageModeContext';
import { Formula, PackagingOption } from './types';
import { compareVersions, getBaseFormulaName } from './ProporcaoUtils';

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
