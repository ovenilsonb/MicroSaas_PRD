import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useStorageMode } from '../../contexts/StorageModeContext';
import { Formula, PackagingOption, PricingEntry } from './types';

const parseCost = (v: any): number => {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') return v;
  const s = String(v).trim();
  if (!s) return 0;
  if (s.includes(',')) {
    return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
  }
  const dotCount = (s.match(/\./g) || []).length;
  if (dotCount > 1) {
    return parseFloat(s.replace(/\./g, '')) || 0;
  }
  return parseFloat(s) || 0;
};

const compareVersions = (v1: string, v2: string) => {
  if (!v1) return -1;
  if (!v2) return 1;
  const parse = (v: string) => v.toLowerCase().replace(/[^\d.]/g, '').split('.').map(Number);
  const p1 = parse(v1);
  const p2 = parse(v2);
  for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
    const num1 = p1[i] || 0;
    const num2 = p2[i] || 0;
    if (num1 !== num2) return num1 - num2;
  }
  return 0;
};

const getBaseFormulaName = (name: string): string => {
  return name.toLowerCase()
    .replace(/\s*-\s*[vV]?\d+(?:\.\d+)?.*$/i, '')
    .replace(/\s*v\d+(?:\.\d+)?.*$/i, '')
    .trim();
};

export const categoryColors: Record<string, { bg: string; text: string }> = {
  Amaciantes: { bg: 'bg-green-100', text: 'text-green-700' },
  Detergentes: { bg: 'bg-blue-100', text: 'text-blue-700' },
  Desinfetantes: { bg: 'bg-red-100', text: 'text-red-700' },
  Limpadores: { bg: 'bg-amber-100', text: 'text-amber-700' },
  Sabões: { bg: 'bg-purple-100', text: 'text-purple-700' },
  Produtos: { bg: 'bg-slate-100', text: 'text-slate-700' },
};

export const getFormulaCategory = (name: string): string => {
  const n = name.toLowerCase();
  if (n.includes('amaciant')) return 'Amaciantes';
  if (n.includes('deter') || n.includes('lava')) return 'Detergentes';
  if (n.includes('desinfet') || n.includes('desinf')) return 'Desinfetantes';
  if (n.includes('limp')) return 'Limpadores';
  if (n.includes('sab')) return 'Sabões';
  return 'Produtos';
};

interface UsePrecificacaoDataReturn {
  formulas: Formula[];
  packagingOptions: PackagingOption[];
  isLoading: boolean;
  savedPricing: PricingEntry[];
  uniqueCapacities: number[];
  savePricing: (entry: PricingEntry) => void;
  getSavedEntry: (formulaId: string, cap: number) => PricingEntry | undefined;
  fetchFormulas: () => Promise<void>;
  fetchPackaging: () => Promise<void>;
}

export function usePrecificacaoData(): UsePrecificacaoDataReturn {
  const { mode } = useStorageMode();
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [packagingOptions, setPackagingOptions] = useState<PackagingOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savedPricing, setSavedPricing] = useState<PricingEntry[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('precificacao_entries') || '[]');
    } catch { return []; }
  });

  const fetchFormulas = useCallback(async () => {
    setIsLoading(true);
    try {
      if (mode === 'supabase') {
        const { data, error } = await supabase
          .from('formulas')
          .select(`*, formula_ingredients(*, ingredients(*), variants:ingredient_variants(name, cost_per_unit))`)
          .order('name');
        if (error) throw error;
        const dataMap: Record<string, Formula> = {};
        (data || []).forEach((f: any) => {
          const b = getBaseFormulaName(f.name);
          if (!dataMap[b] || compareVersions(f.version, dataMap[b].version) > 0) {
            dataMap[b] = f;
          }
        });
        setFormulas(Object.values(dataMap));
      } else {
        const d = localStorage.getItem('local_formulas');
        if (d) {
          const parsed = JSON.parse(d);
          const dataMap: Record<string, Formula> = {};
          parsed.forEach((f: Formula) => {
            const b = getBaseFormulaName(f.name);
            if (!dataMap[b] || compareVersions(f.version, dataMap[b].version) > 0) {
              dataMap[b] = f;
            }
          });
          setFormulas(Object.values(dataMap));
        }
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
        if (cap > 0) flattened.push({ id: ing.id, variant_id: null, name: ing.name, cost: parseCost(ing.cost_per_unit), capacity: cap });
        if (ing.variants) {
          ing.variants.forEach((v: any) => {
            const vm = v.name?.match(/(\d+[.,]?\d*)\s*(L|ml|LT)/i);
            let vc = cap;
            if (vm) { 
              vc = parseFloat(vm[1].replace(',', '.')); 
              if (vm[2].toLowerCase() === 'ml') vc /= 1000; 
            }
            if (vc > 0) flattened.push({ id: ing.id, variant_id: v.id, name: v.name || ing.name, cost: parseCost(v.cost_per_unit || ing.cost_per_unit), capacity: vc });
          });
        }
      });
      flattened.sort((a, b) => a.capacity - b.capacity);
      setPackagingOptions(flattened);
    } catch (error) {
      console.error('Erro ao buscar embalagens:', error);
    }
  }, [mode]);

  const uniqueCapacities = useMemo(() => {
    const caps = [...new Set(packagingOptions.map(p => p.capacity))].sort((a, b) => a - b);
    return caps;
  }, [packagingOptions]);

  const savePricing = useCallback((entry: PricingEntry) => {
    setSavedPricing(prev => {
      const filtered = prev.filter(e => !(e.formulaId === entry.formulaId && e.capacityKey === entry.capacityKey));
      const updated = [entry, ...filtered];
      localStorage.setItem('precificacao_entries', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const getSavedEntry = useCallback((formulaId: string, cap: number): PricingEntry | undefined => {
    return savedPricing.find(e => e.formulaId === formulaId && e.capacityKey === String(cap));
  }, [savedPricing]);

  useEffect(() => {
    fetchFormulas();
    fetchPackaging();
  }, [mode, fetchFormulas, fetchPackaging]);

  return {
    formulas,
    packagingOptions,
    isLoading,
    savedPricing,
    uniqueCapacities,
    savePricing,
    getSavedEntry,
    fetchFormulas,
    fetchPackaging,
  };
}

export function usePriceCalculation(
  formula: Formula | null,
  selectedCapacity: number,
  packagingOptions: PackagingOption[],
  fixedCostsPerUnit: number,
  targetMargin?: number
) {
  const calculateForCapacity = useCallback((capacity: number, fixedCosts: number, targetMargem?: number) => {
    if (!formula || formula.base_volume <= 0) {
      return { custoUnitario: 0, custoEmbalagem: 0, custoTotal: 0, markup: 0, margem: 0, lucro: 0, custoFixo: 0, precoVarejo: 0, precoAtacado: 0, precoFardo: 0, precoCusto: 0, precoLucro: 0 };
    }

    const scale = capacity / formula.base_volume;
    
    const custoQuimicos = formula.formula_ingredients.reduce((sum, item) => {
      const vc = parseCost(item.variants?.cost_per_unit);
      const ic = parseCost(item.ingredients?.cost_per_unit);
      return sum + (item.quantity * scale * (vc || ic));
    }, 0);

    const custoEmbalagem = packagingOptions
      .filter(p => p.capacity === capacity)
      .reduce((sum, p) => sum + p.cost, 0);

    const custoTotal = custoQuimicos + custoEmbalagem;
    const custoFixo = fixedCosts;

    const custoComFixo = custoTotal + custoFixo;

    let precoVarejo = custoComFixo;
    if (targetMargem !== undefined && targetMargem > 0) {
      precoVarejo = custoComFixo / (1 - targetMargem / 100);
    } else {
      precoVarejo = custoComFixo * 3;
    }

    const lucro = precoVarejo - custoComFixo;
    const margem = custoComFixo > 0 ? (lucro / precoVarejo) * 100 : 0;
    const markup = custoComFixo > 0 ? (lucro / custoComFixo) * 100 : 0;

    const precoAtacado = precoVarejo * 0.85;
    const precoFardo = precoAtacado * 6 * 0.90;

    return {
      custoUnitario: custoQuimicos,
      custoEmbalagem,
      custoTotal,
      markup,
      margem,
      lucro,
      custoFixo,
      precoVarejo,
      precoAtacado,
      precoFardo,
      precoCusto: custoComFixo,
      precoLucro: lucro,
    };
  }, [formula, packagingOptions]);

  const calculation = useMemo(() => {
    return calculateForCapacity(selectedCapacity, fixedCostsPerUnit, targetMargin);
  }, [calculateForCapacity, selectedCapacity, fixedCostsPerUnit, targetMargin]);

  return {
    calculation,
    calculateForCapacity,
  };
}
