import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';
import { useStorageMode } from '../../../contexts/StorageModeContext';
import { ProductionOrder, Formula, PackagingOption } from '../types/production';
import { getBaseFormulaName, compareVersions } from '../utils/productionUtils';

export function useProductionData() {
  const { mode } = useStorageMode();
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [packagingOptions, setPackagingOptions] = useState<PackagingOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    try {
      if (mode === 'supabase') {
        const { data, error } = await supabase
          .from('production_orders')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        const localExt: Record<string, any> = JSON.parse(localStorage.getItem('production_orders_ext') || '{}');
        const merged = (data || []).map((o: any) => ({ ...o, ...localExt[o.id] }));
        setOrders(merged);
      } else {
        const d = localStorage.getItem('local_production_orders');
        setOrders(d ? JSON.parse(d) : []);
      }
    } catch (err) {
      console.error('Erro ao buscar ordens:', err);
    }
  }, [mode]);

  const fetchFormulas = useCallback(async () => {
    try {
      if (mode === 'supabase') {
        const { data, error } = await supabase
          .from('formulas')
          .select(`*, groups(name), formula_ingredients(*, ingredients(name, unit, cost_per_unit, produto_quimico, risco), variants:ingredient_variants(name, cost_per_unit))`)
          .order('name');
        if (error) throw error;
        setFormulas((data || []).filter((f: any) =>
          f.status?.toLowerCase().startsWith('ativ') || f.status?.toLowerCase() === 'active'
        ));
      } else {
        const d = localStorage.getItem('local_formulas');
        if (d) {
          const all = JSON.parse(d);
          setFormulas(all.filter((f: any) =>
            f.status?.toLowerCase().startsWith('ativ') || f.status?.toLowerCase() === 'active'
          ));
        }
      }
    } catch (err) {
      console.error('Erro ao buscar fórmulas:', err);
    }
  }, [mode]);

  const fetchPackaging = useCallback(async () => {
    try {
      if (mode === 'supabase') {
        const { data: ingredients, error } = await supabase
          .from('ingredients')
          .select('id, name, cost_per_unit, produto_quimico, variants(id, name, cost_per_unit)')
          .eq('produto_quimico', false);
        if (error) throw error;
        const flattened: PackagingOption[] = [];
        ingredients.forEach(ing => {
          const ingCapMatch = ing.name.match(/(\d+[.,]?\d*)\s*(L|ml|LT)/i);
          let baseCapacity = 0;
          if (ingCapMatch) {
            baseCapacity = parseFloat(ingCapMatch[1].replace(',', '.'));
            if (ingCapMatch[2].toLowerCase() === 'ml') baseCapacity /= 1000;
          }
          if (baseCapacity > 0) {
            flattened.push({ id: ing.id, variant_id: null, name: ing.name, cost: ing.cost_per_unit, capacity: baseCapacity });
          }
          if (ing.variants) {
            ing.variants.forEach((v: any) => {
              const varCapMatch = v.name.match(/(\d+[.,]?\d*)\s*(L|ml|LT)/i);
              let capacity = baseCapacity;
              if (varCapMatch) { capacity = parseFloat(varCapMatch[1].replace(',', '.')); if (varCapMatch[2].toLowerCase() === 'ml') capacity /= 1000; }
              if (capacity > 0) { flattened.push({ id: ing.id, variant_id: v.id, name: `${ing.name} - ${v.name}`, cost: v.cost_per_unit || ing.cost_per_unit, capacity }); }
            });
          }
        });
        setPackagingOptions(flattened);
      } else {
        const localData = localStorage.getItem('local_ingredients');
        if (localData) {
          const ingredients = JSON.parse(localData);
          const flattened: PackagingOption[] = [];
          ingredients.filter((i: any) => !i.produto_quimico).forEach((ing: any) => {
            const ingCapMatch = ing.name.match(/(\d+[.,]?\d*)\s*(L|ml|LT)/i);
            let baseCapacity = 0;
            if (ingCapMatch) { baseCapacity = parseFloat(ingCapMatch[1].replace(',', '.')); if (ingCapMatch[2].toLowerCase() === 'ml') baseCapacity /= 1000; }
            if (baseCapacity > 0) { flattened.push({ id: ing.id, variant_id: null, name: ing.name, cost: ing.cost_per_unit, capacity: baseCapacity }); }
            if (ing.variants) {
              ing.variants.forEach((v: any) => {
                const varCapMatch = v.name.match(/(\d+[.,]?\d*)\s*(L|ml|LT)/i);
                let capacity = baseCapacity;
                if (varCapMatch) { capacity = parseFloat(varCapMatch[1].replace(',', '.')); if (varCapMatch[2].toLowerCase() === 'ml') capacity /= 1000; }
                if (capacity > 0) { flattened.push({ id: ing.id, variant_id: v.id, name: `${ing.name} - ${v.name}`, cost: v.cost_per_unit || ing.cost_per_unit, capacity }); }
              });
            }
          });
          setPackagingOptions(flattened);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar embalagens:', error);
    }
  }, [mode]);

  const refreshAction = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([fetchOrders(), fetchFormulas(), fetchPackaging()]);
    setIsLoading(false);
  }, [fetchOrders, fetchFormulas, fetchPackaging]);

  useEffect(() => {
    refreshAction();
  }, [refreshAction]);

  const latestFormulas = useMemo(() => {
    const latestVersions: Record<string, Formula> = {};
    formulas.forEach(f => {
      const baseName = getBaseFormulaName(f.name);
      const existing = latestVersions[baseName];
      if (!existing || compareVersions(f.version, existing.version) > 0) {
        latestVersions[baseName] = f;
      }
    });
    return Object.values(latestVersions).sort((a, b) => a.name.localeCompare(b.name));
  }, [formulas]);

  return {
    orders,
    setOrders,
    formulas,
    latestFormulas,
    packagingOptions,
    isLoading,
    refreshAction
  };
}
