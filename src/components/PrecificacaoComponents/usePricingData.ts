import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { Formula, PackagingOption, PricingEntry } from './types';
import { parseCost } from './pricingUtils';

export function usePricingData(mode: 'supabase' | 'local') {
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [packagingOptions, setPackagingOptions] = useState<PackagingOption[]>([]);
  const [savedPricing, setSavedPricing] = useState<PricingEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFormulas = useCallback(async () => {
    setIsLoading(true);
    try {
      if (mode === 'supabase') {
        const { data, error } = await supabase
          .from('formulas')
          .select(`*, groups (name), formula_ingredients(*, ingredients(*), variants:ingredient_variants(name, cost_per_unit))`)
          .order('name');
        if (error) throw error;
        setFormulas(data || []);
      } else {
        const d = localStorage.getItem('local_formulas');
        if (d) setFormulas(JSON.parse(d));
      }
    } catch (error) {
      console.error('Erro ao buscar fórmulas:', error);
    } finally {
      setIsLoading(false);
    }
  }, [mode]);

  const fetchPackaging = useCallback(async () => {
    try {
      let rawIngs: any[] = [];
      if (mode === 'supabase') {
        const { data, error } = await supabase
          .from('ingredients')
          .select('id, name, cost_per_unit, produto_quimico, variants:ingredient_variants(id, name, cost_per_unit)')
          .eq('produto_quimico', false);
        if (error) throw error;
        rawIngs = data || [];
      } else {
        rawIngs = JSON.parse(localStorage.getItem('local_ingredients') || '[]').filter((i: any) => !i.produto_quimico);
      }

      const flattened: PackagingOption[] = [];
      rawIngs.forEach((ing: any) => {
        const m = ing.name.match(/(\d+[.,]?\d*)\s*(L|ml|LT)/i);
        let cap = 0;
        if (m) {
          cap = parseFloat(m[1].replace(',', '.'));
          if (m[2].toLowerCase() === 'ml') cap /= 1000;
        }
        if (cap > 0) {
          flattened.push({ 
            id: ing.id, 
            variant_id: null, 
            name: ing.name, 
            cost: parseCost(ing.cost_per_unit), 
            capacity: cap 
          });
        }
        
        if (ing.variants) {
          ing.variants.forEach((v: any) => {
            const vm = v.name?.match(/(\d+[.,]?\d*)\s*(L|ml|LT)/i);
            let vc = cap;
            if (vm) {
              vc = parseFloat(vm[1].replace(',', '.'));
              if (vm[2].toLowerCase() === 'ml') vc /= 1000;
            }
            if (vc > 0) {
              flattened.push({ 
                id: ing.id, 
                variant_id: v.id, 
                name: v.name || ing.name, 
                cost: parseCost(v.cost_per_unit || ing.cost_per_unit), 
                capacity: vc 
              });
            }
          });
        }
      });
      flattened.sort((a, b) => a.capacity - b.capacity);
      setPackagingOptions(flattened);
    } catch (error) {
      console.error('Erro ao buscar embalagens:', error);
    }
  }, [mode]);

  const loadSavedPricing = useCallback(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('precificacao_entries') || '[]');
      setSavedPricing(saved);
    } catch {
      setSavedPricing([]);
    }
  }, []);

  useEffect(() => {
    fetchFormulas();
    fetchPackaging();
    loadSavedPricing();
  }, [fetchFormulas, fetchPackaging, loadSavedPricing]);

  const savePricingEntry = useCallback((entry: PricingEntry) => {
    setSavedPricing(prev => {
      const filtered = prev.filter(e => !(e.formulaId === entry.formulaId && e.capacityKey === entry.capacityKey));
      const next = [...filtered, entry];
      localStorage.setItem('precificacao_entries', JSON.stringify(next));
      return next;
    });
  }, []);

  const deletePricingForFormula = useCallback((formulaId: string) => {
    setSavedPricing(prev => {
      const next = prev.filter(e => e.formulaId !== formulaId);
      localStorage.setItem('precificacao_entries', JSON.stringify(next));
      return next;
    });
  }, []);

  const resetPricingEntry = useCallback((formulaId: string, capKey: string, priceType?: 'varejo' | 'atacado' | 'fardo') => {
    setSavedPricing(prev => {
      let next;
      if (!priceType) {
        // Reset full entry for this capacity
        next = prev.filter(e => !(e.formulaId === formulaId && e.capacityKey === capKey));
      } else {
        // Reset only specific type
        next = prev.map(e => {
          if (e.formulaId === formulaId && e.capacityKey === capKey) {
            const updated = { ...e };
            if (priceType === 'varejo') updated.varejoPrice = 0;
            if (priceType === 'atacado') updated.atacadoPrice = 0;
            if (priceType === 'fardo') updated.fardoPrice = 0;
            return updated;
          }
          return e;
        });
      }
      localStorage.setItem('precificacao_entries', JSON.stringify(next));
      return next;
    });
  }, []);

  const importData = useCallback((data: any) => {
    if (Array.isArray(data)) {
      setSavedPricing(data);
      localStorage.setItem('precificacao_entries', JSON.stringify(data));
      return true;
    }
    return false;
  }, []);

  const uniqueCapacities = useMemo(() => {
    return [...new Set(packagingOptions.map(p => p.capacity))].sort((a, b) => a - b);
  }, [packagingOptions]);

  return {
    formulas,
    packagingOptions,
    uniqueCapacities,
    savedPricing,
    isLoading,
    fetchFormulas,
    savePricingEntry,
    deletePricingForFormula,
    resetPricingEntry,
    importData
  };
}
