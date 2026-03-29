import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useStorageMode } from '../contexts/StorageModeContext';
import {
  Scale,
  Search,
  Beaker,
  ChevronRight,
  ArrowLeft,
  Eye,
  EyeOff,
  Calculator,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Package,
  Download,
  Upload,
  List,
  LayoutGrid,
  ArrowDownAZ,
  ArrowUpZA,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  Layout,
  Info,
  X,
  ArrowRightLeft
} from 'lucide-react';
import { exportToJson, importFromJson, getBackupFilename } from '../lib/backupUtils';

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  cost_per_unit: number;
  produto_quimico: boolean;
}

interface FormulaIngredient {
  id: string;
  ingredient_id: string;
  variant_id: string | null;
  quantity: number;
  ingredients: Ingredient;
  variants?: {
    name: string;
    cost_per_unit: number | null;
  };
}

interface Formula {
  id: string;
  name: string;
  version: string;
  lm_code: string | null;
  base_volume: number;
  status: 'draft' | 'active' | 'archived';
  formula_ingredients: FormulaIngredient[];
}

interface PackagingOption {
  id: string;
  variant_id: string | null;
  name: string;
  cost: number;
  capacity: number;
}

function getExactCombinations(targetVolume: number, capacities: number[], maxResults = 10) {
  if (targetVolume <= 0 || capacities.length === 0) return [];
  const multiplier = 100;
  const target = Math.round(targetVolume * multiplier);
  const sortedCaps = [...new Set(capacities)].sort((a, b) => b - a);
  const intCaps = sortedCaps.map(c => Math.round(c * multiplier));
  const results: Record<number, number>[] = [];

  function backtrack(index: number, currentRemainder: number, currentCombo: Record<number, number>) {
    if (results.length >= maxResults) return;
    if (currentRemainder === 0) {
      results.push({ ...currentCombo });
      return;
    }
    if (index >= intCaps.length) return;

    const cap = intCaps[index];
    const realCap = sortedCaps[index];
    if (cap <= 0) return;

    const maxQty = Math.floor(currentRemainder / cap);

    for (let i = maxQty; i >= 0; i--) {
      currentCombo[realCap] = i;
      backtrack(index + 1, currentRemainder - (i * cap), currentCombo);
    }
  }

  backtrack(0, target, {});
  return results;
}

function getVolumeCombinations(targetUnits: number, capacities: number[], maxResults = 10) {
  if (targetUnits <= 0 || capacities.length === 0) return [];
  const sortedCaps = [...new Set(capacities)].sort((a, b) => b - a);
  const results: { volume: number; counts: Record<number, number> }[] = [];

  function backtrack(index: number, remainingUnits: number, currentCombo: Record<number, number>, currentVolume: number) {
    if (results.length >= 1000) return; // Cap raw variations
    if (remainingUnits === 0) {
      results.push({ volume: currentVolume, counts: { ...currentCombo } });
      return;
    }
    if (index >= sortedCaps.length) return;

    const cap = sortedCaps[index];
    for (let i = remainingUnits; i >= 0; i--) {
      currentCombo[cap] = i;
      backtrack(index + 1, remainingUnits - i, currentCombo, currentVolume + (i * cap));
    }
  }

  backtrack(0, targetUnits, {}, 0);
  results.sort((a, b) => b.volume - a.volume);

  const uniqueResults = [];
  const seenVols = new Set();
  for (const res of results) {
    if (!seenVols.has(res.volume)) {
      seenVols.add(res.volume);
      uniqueResults.push(res);
    }
  }

  if (uniqueResults.length <= maxResults) return uniqueResults;
  const sampled = [];
  const step = (uniqueResults.length - 1) / (maxResults - 1);
  for (let i = 0; i < maxResults; i++) {
    const idx = i === maxResults - 1 ? uniqueResults.length - 1 : Math.round(i * step);
    sampled.push(uniqueResults[idx]);
  }
  return sampled;
}

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

/**
 * Extracts the base product name by stripping ANY trailing parenthetical
 * suffixes like "(Cópia)", "(Nova Versão)", "(V2)", "(Revisão 3)" etc.
 * This allows the system to group all versions of a product together,
 * regardless of what suffix was added during duplication.
 * 
 * Examples:
 *   "AMACIANTE DOWNIE (Cópia)"    → "AMACIANTE DOWNIE"
 *   "SABÃO LÍQUIDO (Nova Versão)" → "SABÃO LÍQUIDO"
 *   "DETERGENTE (V2)"             → "DETERGENTE"
 *   "DETERGENTE"                  → "DETERGENTE"
 */
const getBaseFormulaName = (name: string): string => {
  return name
    .trim()
    .replace(/\s*\([^)]*\)\s*$/g, '')
    .trim()
    .toUpperCase();
};


export default function Proporcao() {
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [packagingOptions, setPackagingOptions] = useState<PackagingOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFormula, setSelectedFormula] = useState<Formula | null>(null);
  const [batchSize, setBatchSize] = useState<string>('100');
  const [unitQuantity, setUnitQuantity] = useState<string>('1');
  const [selectedPackagingKeys, setSelectedPackagingKeys] = useState<string[]>([]);
  const [multiSelectPackaging, setMultiSelectPackaging] = useState(false);
  const [calculationMode, setCalculationMode] = useState<'volume' | 'units'>('volume');
  const [activeKitIndex, setActiveKitIndex] = useState<number | null>(null);
  const { mode } = useStorageMode();

  const [notification, setNotification] = useState<{
    show: boolean;
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
    isUpdate?: boolean;
    updates?: { name: string, old: string, new: string }[];
  }>({
    show: false,
    type: 'info',
    title: '',
    message: ''
  });

  const showNotify = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    setNotification({ show: true, type, title, message });
    if (type !== 'error') {
      setTimeout(() => setNotification(prev => ({ ...prev, show: false })), 5000);
    }
  };

  const handleExport = () => {
    try {
      const filename = getBackupFilename('Proporcao_Formulas');
      exportToJson(filename, formulas);
      showNotify('success', 'Exportação Concluída', `O backup "${filename}" foi gerado com sucesso.`);
    } catch (err) {
      showNotify('error', 'Erro na Exportação', 'Não foi possível gerar o arquivo de backup.');
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await importFromJson(file);
      if (!Array.isArray(data)) {
        throw new Error('Formato de dados inválido.');
      }

      const confirmMsg = `Você está prestes a importar ${data.length} fórmulas. Se houver fórmulas com o mesmo ID, elas serão atualizadas. Deseja continuar?`;
      if (!window.confirm(confirmMsg)) return;

      if (mode === 'supabase') {
        showNotify('info', 'Importando...', 'Sincronizando dados com o Supabase...');
        for (const item of data) {
          const { formula_ingredients, groups, ...cleanFormula } = item;
          const { error } = await supabase.from('formulas').upsert(cleanFormula);
          if (error) console.error(`Erro ao importar fórmula ${item.name}:`, error);
        }
        await fetchFormulas();
      } else {
        const localData = JSON.parse(localStorage.getItem('local_formulas') || '[]');
        const newData = [...localData];

        data.forEach((item: any) => {
          const index = newData.findIndex(i => i.id === item.id);
          if (index >= 0) {
            newData[index] = item;
          } else {
            newData.push(item);
          }
        });

        localStorage.setItem('local_formulas', JSON.stringify(newData));
        setFormulas(newData);
      }

      showNotify('success', 'Importação Concluída', `${data.length} fórmulas foram processadas.`);
    } catch (err: any) {
      showNotify('error', 'Erro na Importação', err.message || 'Falha ao importar arquivo.');
    } finally {
      if (e.target) e.target.value = '';
    }
  };


  // UI State
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortField, setSortField] = useState<'name' | 'volume'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [hiddenFormulas, setHiddenFormulas] = useState<{ name: string, version: string }[]>([]);
  const [showHidden, setShowHidden] = useState(false);

  useEffect(() => {
    const savedHidden = localStorage.getItem('microsaas_hidden_formulas_proporcao');
    if (savedHidden) {
      try {
        setHiddenFormulas(JSON.parse(savedHidden));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const toggleHideFormula = (e: React.MouseEvent, formula: Formula) => {
    e.stopPropagation();
    setHiddenFormulas(prev => {
      const isHidden = prev.some(h => h.name === formula.name);
      let next;
      if (isHidden) {
        const hiddenConfig = prev.find(h => h.name === formula.name);
        if (hiddenConfig && compareVersions(formula.version, hiddenConfig.version) > 0) {
          alert(`Atenção: Há uma nova versão para a fórmula "${formula.name}". A versão antiga (${hiddenConfig.version}) estava oculta, e agora a versão atualizada (${formula.version}) será exibida.`);
        }
        next = prev.filter(h => h.name !== formula.name);
      } else {
        next = [...prev, { name: formula.name, version: formula.version }];
      }
      localStorage.setItem('microsaas_hidden_formulas_proporcao', JSON.stringify(next));
      return next;
    });
  };

  useEffect(() => {
    fetchFormulas();
    fetchPackaging();
  }, [mode]);

  const fetchFormulas = async () => {
    setIsLoading(true);
    try {
      let allFormulas: Formula[] = [];
      if (mode === 'supabase') {
        const { data, error } = await supabase
          .from('formulas')
          .select('*, formula_ingredients(*, ingredients(*), variants(*))')
          .filter('status', 'eq', 'active');
        if (error) throw error;
        allFormulas = data || [];
      } else {
        const local = localStorage.getItem('local_formulas');
        allFormulas = local ? JSON.parse(local).filter((f: any) => f.status === 'active') : [];
      }

      // Tracking latest version per name (Robust normalization)
      const latestMap: Record<string, Formula> = {};
      const updatesDetected: { name: string, old: string, new: string }[] = [];
      const lastKnownVersionsStr = localStorage.getItem('microsaas_proporcao_known_versions');
      const lastKnownVersions: Record<string, string> = lastKnownVersionsStr ? JSON.parse(lastKnownVersionsStr) : {};

      allFormulas.forEach(formula => {
        const baseName = getBaseFormulaName(formula.name);
        const currentLatest = latestMap[baseName];
        if (!currentLatest || compareVersions(formula.version, currentLatest.version) > 0) {
          latestMap[baseName] = formula;
        }
      });

      const latestFormulas = Object.values(latestMap);
      
      // Detection of updates compared to the user's last session
      latestFormulas.forEach(formula => {
        const baseName = getBaseFormulaName(formula.name);
        const lastVersion = lastKnownVersions[baseName];
        if (lastVersion && compareVersions(formula.version, lastVersion) > 0) {
          updatesDetected.push({
            name: formula.name,
            old: lastVersion,
            new: formula.version
          });
        }
        lastKnownVersions[baseName] = formula.version;
      });

      localStorage.setItem('microsaas_proporcao_known_versions', JSON.stringify(lastKnownVersions));

      if (updatesDetected.length > 0) {
        setNotification({
          show: true,
          type: 'info',
          title: 'Fórmulas Atualizadas',
          message: 'Novas versões foram detectadas. O sistema carregou automaticamente as fórmulas mais recentes.',
          isUpdate: true,
          updates: updatesDetected
        });
      }

      setFormulas(latestFormulas);
    } catch (err) {
      console.error('Erro ao buscar fórmulas:', err);
      showNotify('error', 'Erro', 'Falha ao carregar fórmulas.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPackaging = async () => {
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

          // If base has capacity, add it
          if (baseCapacity > 0) {
            flattened.push({
              id: ing.id,
              variant_id: null,
              name: ing.name,
              cost: ing.cost_per_unit,
              capacity: baseCapacity
            });
          }

          // Check variants
          if (ing.variants) {
            ing.variants.forEach((v: any) => {
              const varCapMatch = v.name.match(/(\d+[.,]?\d*)\s*(L|ml|LT)/i);
              let capacity = baseCapacity;

              if (varCapMatch) {
                capacity = parseFloat(varCapMatch[1].replace(',', '.'));
                if (varCapMatch[2].toLowerCase() === 'ml') capacity /= 1000;
              }

              if (capacity > 0) {
                flattened.push({
                  id: ing.id,
                  variant_id: v.id,
                  name: `${ing.name} - ${v.name}`,
                  cost: v.cost_per_unit || ing.cost_per_unit,
                  capacity
                });
              }
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
            if (ingCapMatch) {
              baseCapacity = parseFloat(ingCapMatch[1].replace(',', '.'));
              if (ingCapMatch[2].toLowerCase() === 'ml') baseCapacity /= 1000;
            }

            if (baseCapacity > 0) {
              flattened.push({
                id: ing.id,
                variant_id: null,
                name: ing.name,
                cost: ing.cost_per_unit,
                capacity: baseCapacity
              });
            }

            if (ing.variants) {
              ing.variants.forEach((v: any) => {
                const varCapMatch = v.name.match(/(\d+[.,]?\d*)\s*(L|ml|LT)/i);
                let capacity = baseCapacity;

                if (varCapMatch) {
                  capacity = parseFloat(varCapMatch[1].replace(',', '.'));
                  if (varCapMatch[2].toLowerCase() === 'ml') capacity /= 1000;
                }

                if (capacity > 0) {
                  flattened.push({
                    id: ing.id,
                    variant_id: v.id,
                    name: `${ing.name} - ${v.name}`,
                    cost: v.cost_per_unit || ing.cost_per_unit,
                    capacity
                  });
                }
              });
            }
          });
          setPackagingOptions(flattened);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar embalagens:', error);
    }
  };

  const consolidatedActiveFormulas = useMemo(() => {
    const latestVersions: Record<string, Formula> = {};
    
    // Group by BASE product name (strips "(Cópia)" etc.) and keep only the highest version
    formulas.forEach(f => {
      const baseName = getBaseFormulaName(f.name);
      const existing = latestVersions[baseName];
      if (!existing || compareVersions(f.version, existing.version) > 0) {
        latestVersions[baseName] = f;
      }
    });

    return Object.values(latestVersions);
  }, [formulas]);

  const packagingOptionsByCapacity = useMemo(() => {
    const groups: Record<number, PackagingOption[]> = {};
    packagingOptions.forEach(p => {
      if (!groups[p.capacity]) groups[p.capacity] = [];
      groups[p.capacity].push(p);
    });
    return groups;
  }, [packagingOptions]);

  const uniqueCapacities = useMemo(() => {
    return Object.keys(packagingOptionsByCapacity)
      .map(Number)
      .sort((a, b) => a - b);
  }, [packagingOptionsByCapacity]);

  const formulasWithCostPerLiter = useMemo(() => {
    const costs: Record<string, number> = {};
    formulas.forEach(f => {
      let totalCost = 0;
      f.formula_ingredients.forEach(fi => {
        const cost = fi.variants?.cost_per_unit ?? fi.ingredients.cost_per_unit;
        totalCost += (fi.quantity * cost);
      });
      costs[f.id] = f.base_volume > 0 ? totalCost / f.base_volume : 0;
    });
    return costs;
  }, [formulas]);

  const packagingKitsCost = useMemo(() => {
    const kitCosts: Record<number, number> = {};
    Object.entries(packagingOptionsByCapacity).forEach(([cap, options]) => {
      const frasco = options.find(o => o.name.toLowerCase().includes('frasco') || o.name.toLowerCase().includes('garrafa'));
      const rotulo = options.find(o => o.name.toLowerCase().includes('rótulo') || o.name.toLowerCase().includes('etiqueta'));
      kitCosts[Number(cap)] = (frasco?.cost || 0) + (rotulo?.cost || 0);
    });
    return kitCosts;
  }, [packagingOptionsByCapacity]);

  const filteredFormulas = useMemo(() => {
    let consolidatedList = consolidatedActiveFormulas;
    if (showHidden) {
      consolidatedList = consolidatedList.filter(f => hiddenFormulas.some(h => h.name === f.name));
    } else {
      consolidatedList = consolidatedList.filter(f => !hiddenFormulas.some(h => h.name === f.name));
    }

    return consolidatedList
      .filter(f =>
        f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.lm_code?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => {
        let aValue: any;
        let bValue: any;
        switch (sortField) {
          case 'name': aValue = a.name; bValue = b.name; break;
          case 'volume': aValue = a.base_volume; bValue = b.base_volume; break;
          default: aValue = a.name; bValue = b.name;
        }
        if (aValue === bValue) return 0;
        if (aValue === undefined || aValue === null) return 1;
        if (bValue === undefined || bValue === null) return -1;
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
        }
        return sortOrder === 'asc' ? (aValue < bValue ? -1 : 1) : (aValue > bValue ? -1 : 1);
      });
  }, [consolidatedActiveFormulas, searchTerm, sortField, sortOrder, showHidden, hiddenFormulas]);

  const handleSelectFormula = (formula: Formula) => {
    setSelectedFormula(formula);
    setBatchSize(formula.base_volume.toString().replace('.', ','));
    setUnitQuantity('1');
    setSelectedPackagingKeys([]);
    setActiveKitIndex(null);
    setCalculationMode('volume');
  };

  const handleSort = (field: 'name' | 'volume') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };
  const handleKitSelection = (idx: number, kit: Record<string, number>) => {
    setActiveKitIndex(idx);

    // Auto-select packaging items that match the capacities in the kit
    const capacitiesInKit = Object.keys(kit).map(Number);
    const newSelectedKeys: string[] = [];

    capacitiesInKit.forEach(cap => {
      if (kit[cap] > 0) {
        const options = packagingOptions.filter(p => p.capacity === cap);
        if (options.length > 0) {
          // Select all options for this capacity to be safe or just the first one?
          // Since the logic currently uses ANY matching option, selecting ALL in the group is clearest visually.
          options.forEach(p => newSelectedKeys.push(`${p.id}_${p.variant_id || 'base'}`));
        }
      }
    });

    // If not multi-select, we just set these. If multi-select, we might want to keep others, 
    // but usually picking a kit means you want EXACTLY that combination.
    setSelectedPackagingKeys(newSelectedKeys);
  };

  const togglePackagingGroup = (capacity: number) => {
    setActiveKitIndex(null);
    const keysInGroup = packagingOptions
      .filter(p => p.capacity === capacity)
      .map(p => `${p.id}_${p.variant_id || 'base'}`);
    const isGroupSelected = keysInGroup.every(k => selectedPackagingKeys.includes(k));

    if (multiSelectPackaging) {
      if (isGroupSelected) {
        setSelectedPackagingKeys(prev => prev.filter(k => !keysInGroup.includes(k)));
      } else {
        setSelectedPackagingKeys(prev => [...prev.filter(k => !keysInGroup.includes(k)), ...keysInGroup]);
      }
    } else {
      setSelectedPackagingKeys(isGroupSelected ? [] : keysInGroup);
    }
  };

  const exactKitOptions = useMemo(() => {
    if (calculationMode !== 'volume') return [];
    const size = parseFloat(batchSize.replace(',', '.')) || 0;
    if (size <= 0) return [];
    return getExactCombinations(size, uniqueCapacities);
  }, [batchSize, uniqueCapacities, calculationMode]);

  const fixedUnitVolumeOptions = useMemo(() => {
    if (calculationMode !== 'units') return [];
    const target = parseInt(unitQuantity) || 0;
    if (target <= 0) return [];
    return getVolumeCombinations(target, uniqueCapacities);
  }, [unitQuantity, uniqueCapacities, calculationMode]);

  const packagingAllocation = useMemo(() => {
    const size = parseFloat(batchSize.replace(',', '.')) || 0;
    const allocation: Record<number, number> = {};

    if (calculationMode === 'units' && activeKitIndex !== null && fixedUnitVolumeOptions[activeKitIndex]) {
      return fixedUnitVolumeOptions[activeKitIndex].counts;
    }

    if (calculationMode === 'volume' && activeKitIndex !== null && exactKitOptions[activeKitIndex]) {
      return exactKitOptions[activeKitIndex];
    }

    const selectedCapacities = uniqueCapacities
      .filter(cap => packagingOptionsByCapacity[cap].every(p => selectedPackagingKeys.includes(`${p.id}_${p.variant_id || 'base'}`)))
      .sort((a, b) => b - a);

    if (selectedCapacities.length === 0) return {};

    let remainingVolume = size;
    selectedCapacities.forEach((cap, idx) => {
      if (idx === selectedCapacities.length - 1) {
        allocation[cap] = Math.ceil(remainingVolume / cap);
      } else {
        const qty = Math.floor(remainingVolume / cap);
        allocation[cap] = qty;
        remainingVolume -= (qty * cap);
      }
    });

    return allocation;
  }, [batchSize, selectedPackagingKeys, uniqueCapacities, calculationMode, activeKitIndex, exactKitOptions, fixedUnitVolumeOptions]);

  const currentBatchSize = useMemo(() => {
    if (calculationMode === 'volume') return parseFloat(batchSize.replace(',', '.')) || 0;
    let totalVol = 0;
    Object.entries(packagingAllocation).forEach(([cap, qty]) => {
      totalVol += parseFloat(cap) * (qty as number);
    });
    return totalVol;
  }, [batchSize, packagingAllocation, calculationMode]);

  const calculatedIngredients = useMemo(() => {
    if (!selectedFormula || currentBatchSize <= 0) return [];
    const scale = currentBatchSize / selectedFormula.base_volume;
    const ingredients = selectedFormula.formula_ingredients.map(fi => ({
      ...fi,
      calculatedQuantity: fi.quantity * scale
    }));

    const nonChemicalCosts: { name: string, quantity: number, unit: string, cost: number, total: number }[] = [];
    Object.entries(packagingAllocation).forEach(([cap, qty]) => {
      const q = qty as number;
      if (q <= 0) return;
      const options = packagingOptionsByCapacity[parseFloat(cap)];
      options?.forEach(opt => {
        if (selectedPackagingKeys.includes(`${opt.id}_${opt.variant_id || 'base'}`)) {
          nonChemicalCosts.push({
            name: `${opt.name} (${parseFloat(cap) >= 1 ? cap + 'L' : parseFloat(cap) * 1000 + 'ml'})`,
            quantity: q,
            unit: 'un',
            cost: opt.cost,
            total: q * opt.cost
          });
        }
      });
    });

    return { ingredients, nonChemicalCosts };
  }, [selectedFormula, currentBatchSize, packagingAllocation, selectedPackagingKeys, packagingOptionsByCapacity]);

  const totalCost = useMemo(() => {
    let total = 0;
    const { ingredients, nonChemicalCosts } = calculatedIngredients as any;
    if (ingredients) {
      ingredients.forEach((fi: any) => {
        const cost = fi.variants?.cost_per_unit ?? fi.ingredients.cost_per_unit;
        total += (fi.calculatedQuantity * cost);
      });
    }
    if (nonChemicalCosts) {
      nonChemicalCosts.forEach((item: any) => {
        total += item.total;
      });
    }
    return total;
  }, [calculatedIngredients]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const handleExportProportion = () => {
    if (!selectedFormula) return;
    const data = {
      formula: selectedFormula.name,
      version: selectedFormula.version,
      batchSize: currentBatchSize,
      totalCost,
      ingredients: calculatedIngredients,
      date: new Date().toISOString()
    };
    const filename = `Proporcao_${selectedFormula.name}_${selectedFormula.version}.json`;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (selectedFormula) {
    return (
      <div className="flex flex-col h-full bg-slate-50">
        <header className="bg-white border-b border-slate-200 px-8 py-6 shrink-0">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => setSelectedFormula(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <ArrowLeft className="w-6 h-6 text-slate-600" />
              </button>
              <div>
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                  <Calculator className="w-6 h-6 text-[#202eac]" /> Calculadora de Proporção
                </h2>
                <div className="flex items-center gap-2 text-slate-500 font-medium">
                  {selectedFormula.name} <span className="text-[10px] bg-[#202eac] text-white px-2 py-0.5 rounded-full font-bold ml-1">V{selectedFormula.version.toString().replace(/^v/i, '')}</span>
                </div>
              </div>
            </div>
            <button onClick={handleExportProportion} className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-slate-50 font-bold transition-all shadow-sm">
              <Download className="w-4 h-4" /> Exportar Cálculo
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4 space-y-8">
              <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm space-y-8 h-fit">
                <div className="flex p-1 bg-slate-100 rounded-2xl">
                  <button onClick={() => { setCalculationMode('volume'); setActiveKitIndex(null); }} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${calculationMode === 'volume' ? 'bg-white text-[#202eac] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Volume Total</button>
                  <button onClick={() => { setCalculationMode('units'); setActiveKitIndex(null); }} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${calculationMode === 'units' ? 'bg-white text-[#202eac] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Qtd Peças (Fixo)</button>
                </div>

                {calculationMode === 'volume' ? (
                  <div>
                    <label className="text-[12px] font-bold text-slate-400 uppercase tracking-widest block mb-4 px-1">Volume Final Desejado (L/kg)</label>
                    <div className="relative">
                      <input type="text" value={batchSize} onChange={(e) => { setBatchSize(e.target.value); setActiveKitIndex(null); }} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-2xl font-black text-slate-800 focus:border-[#202eac] focus:bg-white outline-none transition-all pr-16" placeholder="0,00" />
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">L/kg</div>
                    </div>
                    {exactKitOptions.length > 0 && (
                      <div className="mt-6 space-y-3">
                        <h3 className="text-[12px] font-bold text-slate-400 uppercase tracking-widest px-1">Sugestões de Montagem (Sem Sobras)</h3>
                        <div className="flex gap-2 py-4 overflow-x-auto custom-scrollbar">
                          {exactKitOptions.map((kit, idx) => (
                            <button key={idx} onClick={() => handleKitSelection(idx, kit as any)} className={`shrink-0 p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 min-w-[120px] ${activeKitIndex === idx ? 'border-[#202eac] bg-blue-50 shadow-md transform scale-105' : 'border-slate-100 bg-white hover:border-slate-200 shadow-sm'}`}>
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">OPÇÃO {idx + 1}</span>
                              <div className="flex gap-1.5 flex-wrap justify-center">
                                {Object.entries(kit).map(([cap, qty]) => qty > 0 && (
                                  <span key={cap} className="text-[12px] font-black text-[#202eac]">{qty}x{Number(cap) >= 1 ? cap + 'L' : Number(cap) * 1000 + 'ml'}</span>
                                ))}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="text-[12px] font-bold text-slate-400 uppercase tracking-widest block mb-4 px-1">Quantidade de Embalagens</label>
                    <div className="relative">
                      <input type="number" value={unitQuantity} onChange={(e) => { setUnitQuantity(e.target.value); setActiveKitIndex(null); }} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-2xl font-black text-slate-800 focus:border-[#202eac] focus:bg-white outline-none transition-all pr-16" placeholder="1" />
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">un</div>
                    </div>
                    {fixedUnitVolumeOptions.length > 0 && (
                      <div className="mt-6 space-y-3">
                        <h3 className="text-[12px] font-bold text-slate-400 uppercase tracking-widest px-1">Diferentes Volumes para {unitQuantity} un</h3>
                        <div className="flex gap-2 py-4 overflow-x-auto custom-scrollbar">
                          {fixedUnitVolumeOptions.map((opt, idx) => (
                            <button key={idx} onClick={() => handleKitSelection(idx, opt.counts as any)} className={`shrink-0 p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 min-w-[120px] ${activeKitIndex === idx ? 'border-[#202eac] bg-blue-50 shadow-md transform scale-105' : 'border-slate-100 bg-white hover:border-slate-200 shadow-sm'}`}>
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">VOL: {opt.volume >= 1 ? opt.volume + 'L' : opt.volume * 1000 + 'ml'}</span>
                              <div className="flex gap-1.5 flex-wrap justify-center">
                                {Object.entries(opt.counts).map(([cap, qty]) => (qty as number) > 0 && (
                                  <span key={cap} className="text-[12px] font-black text-emerald-600">{(qty as number)}x{Number(cap) >= 1 ? cap + 'L' : Number(cap) * 1000 + 'ml'}</span>
                                ))}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex flex-col flex-1">
                      <div className="flex items-center gap-2">
                        <label className="text-base font-black text-slate-800">Conjunto de Envase</label>
                        {activeKitIndex !== null ? (
                          <span className="text-[11px] bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full font-bold border border-emerald-100 flex items-center gap-1.5 animate-pulse">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Kit Sugerido Ativo
                          </span>
                        ) : (
                          <span className="text-[11px] bg-slate-50 text-slate-500 px-3 py-1 rounded-full font-bold border border-slate-100">
                            Distribuição Livre
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1">
                        {activeKitIndex !== null
                          ? "As embalagens foram selecionadas automaticamente."
                          : "Marque o que você tem em estoque para distribuir o volume."}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 relative group/info">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Múltiplo</span>
                        <button onClick={() => { setMultiSelectPackaging(!multiSelectPackaging); setActiveKitIndex(null); }} className={`w-8 h-4 rounded-full relative transition-colors ${multiSelectPackaging ? 'bg-[#202eac]' : 'bg-slate-300'}`}>
                          <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${multiSelectPackaging ? 'left-4.5' : 'left-0.5'}`} />
                        </button>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 text-white text-[9px] rounded-lg opacity-0 pointer-events-none group-hover/info:opacity-100 transition-opacity shadow-xl z-30 leading-tight">
                          Permite distribuir o volume total entre vários tamanhos de embalagem simultaneamente.
                        </div>
                      </div>
                      {selectedPackagingKeys.length > 0 && (
                        <button onClick={() => setSelectedPackagingKeys([])} className="text-[11px] font-bold text-[#202eac] border-b-2 border-transparent hover:border-[#202eac] transition-all uppercase px-1">Limpar</button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                    {Object.entries(packagingOptionsByCapacity)
                      .map(([cap, pkgs]) => ({ capacity: parseFloat(cap), items: pkgs }))
                      .filter(group => {
                        if (selectedPackagingKeys.length > 0 && !multiSelectPackaging) {
                          return group.items.some(p => selectedPackagingKeys.includes(`${p.id}_${p.variant_id || 'base'}`));
                        }
                        return true;
                      })
                      .sort((a, b) => b.capacity - a.capacity)
                      .map(group => {
                        const isGroupSelected = group.items.every(p => selectedPackagingKeys.includes(`${p.id}_${p.variant_id || 'base'}`));
                        const mappedUnits = packagingAllocation[group.capacity] || 0;
                        return (
                          <div key={group.capacity} onClick={() => togglePackagingGroup(group.capacity)} className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col gap-3 ${isGroupSelected ? 'border-[#202eac] bg-blue-50/50 shadow-sm' : 'border-slate-100 hover:border-slate-200'}`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isGroupSelected ? 'bg-[#202eac] text-white' : 'bg-slate-100 text-slate-400'}`}><Package className="w-5 h-5" /></div>
                                <span className="text-lg font-black text-slate-700">{group.capacity >= 1 ? group.capacity.toString().replace('.', ',') + ' L' : (group.capacity * 1000) + ' ml'}</span>
                              </div>
                              {isGroupSelected ? <CheckCircle2 className="w-5 h-5 text-[#202eac]" /> : <div className="w-5 h-5 border-2 border-slate-200 rounded-full" />}
                            </div>
                            {isGroupSelected && mappedUnits > 0 && (
                              <div className="flex items-center justify-between text-xs font-bold text-[#202eac] bg-white/60 p-2 rounded-lg border border-[#202eac]/10">
                                <span>Necessário: {mappedUnits} un</span>
                                <div>{formatCurrency(packagingKitsCost[group.capacity] * mappedUnits)}</div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-8 flex flex-col gap-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-emerald-600 p-8 rounded-[32px] shadow-lg shadow-emerald-100 text-white">
                  <span className="text-[12px] font-bold uppercase tracking-widest opacity-80 block mb-2">Custo Total Estimado</span>
                  <div className="text-4xl font-black">{formatCurrency(totalCost)}</div>
                </div>
                <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
                  <span className="text-[12px] font-bold uppercase tracking-widest text-slate-400 block mb-2">Custo Unidade (Líquido)</span>
                  <div className="text-2xl font-black text-slate-800">{formatCurrency(formulasWithCostPerLiter[selectedFormula.id] || 0)}/L</div>
                </div>
                <div className="bg-[#202eac]/5 border border-[#202eac]/10 p-8 rounded-[32px]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[12px] font-bold uppercase tracking-widest text-[#202eac] opacity-60">Volume Selecionado</span>
                    <Scale className="w-5 h-5 text-[#202eac] opacity-40" />
                  </div>
                  <div className="text-3xl font-black text-[#202eac]">{currentBatchSize.toLocaleString('pt-BR')} <span className="text-sm font-bold opacity-60">L/kg</span></div>
                </div>
              </div>

              <div className="bg-white rounded-[32px] border border-slate-200 shadow-xl overflow-hidden flex flex-col flex-1">
                <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Composição Proporcional</h3>
                </div>
                <div className="flex-1 overflow-auto bg-white">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <th className="py-4 px-6">Insumo</th>
                        <th className="py-4 px-6 text-center">Quantidade</th>
                        <th className="py-4 px-6 text-right">Custo Unit.</th>
                        <th className="py-4 px-6 text-right">Custo Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(calculatedIngredients as any).ingredients?.map((fi: any) => {
                        const cost = fi.variants?.cost_per_unit ?? fi.ingredients.cost_per_unit;
                        return (
                          <tr key={fi.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="py-4 px-6 font-bold text-slate-800">{fi.ingredients.name} {fi.variants && <small className="block text-slate-400 uppercase text-[9px] tracking-tighter">Variante: {fi.variants.name}</small>}</td>
                            <td className="py-4 px-6 text-center font-mono text-xs font-black text-slate-600">
                              {fi.calculatedQuantity.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} {fi.ingredients.unit}
                            </td>
                            <td className="py-4 px-6 text-right text-slate-500 font-mono text-xs">{formatCurrency(cost)}</td>
                            <td className="py-4 px-6 text-right font-black text-slate-800 font-mono text-xs">{formatCurrency(fi.calculatedQuantity * cost)}</td>
                          </tr>
                        );
                      })}
                      {(calculatedIngredients as any).nonChemicalCosts?.map((item: any, idx: number) => (
                        <tr key={idx} className="bg-emerald-50/30 hover:bg-emerald-50/50 transition-colors">
                          <td className="py-4 px-6 font-bold text-emerald-800">{item.name}</td>
                          <td className="py-4 px-6 text-center font-mono text-xs font-black text-emerald-600">{item.quantity} un</td>
                          <td className="py-4 px-6 text-right text-emerald-500 font-mono text-xs">{formatCurrency(item.cost)}</td>
                          <td className="py-4 px-6 text-right font-black text-emerald-800 font-mono text-xs">{formatCurrency(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-8 py-6 shrink-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
              <Beaker className="w-8 h-8 text-[#202eac]" /> PROPORÇÃO
            </h1>
            <p className="text-slate-500 font-medium text-sm mt-1">Cálculos inteligentes de kits de envase e custos de produção</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-sm mr-2">
              <label className="bg-[#202eac] text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-[#1a258c] font-bold transition-all shadow-sm cursor-pointer text-sm">
                <Upload className="w-4 h-4" /> Importar
                <input type="file" className="hidden" accept=".json" onChange={handleImport} />
              </label>
              <button onClick={handleExport} className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-slate-50 font-bold transition-all shadow-sm text-sm">
                <Download className="w-4 h-4" /> Exportar
              </button>
            </div>
            <div className="relative group">
              <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#202eac] transition-colors" />
              <input type="text" placeholder="Buscar fórmula..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-slate-100 border-2 border-transparent focus:border-[#202eac] focus:bg-white rounded-2xl pl-12 pr-4 py-3 text-sm font-medium outline-none transition-all w-full md:w-64" />
            </div>
            <div className="flex bg-slate-100 p-1 rounded-2xl">
              <button onClick={() => setViewMode('grid')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white text-[#202eac] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><LayoutGrid className="w-5 h-5" /></button>
              <button onClick={() => setViewMode('list')} className={`p-2.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-white text-[#202eac] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><List className="w-5 h-5" /></button>
            </div>
          </div>
        </div>
      </header>

      <div className="px-8 pt-8 shrink-0">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-blue-50 text-[#202eac] rounded-xl flex items-center justify-center shrink-0"><FileText className="w-6 h-6" /></div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Fórmulas Disponíveis</p>
              <h3 className="text-2xl font-black text-slate-800">{consolidatedActiveFormulas.filter(f => !hiddenFormulas.some(h => h.name === f.name)).length}</h3>
            </div>
          </div>

          <div onClick={() => setShowHidden(!showHidden)} className={`p-5 rounded-2xl border cursor-pointer hover:shadow-md transition-all flex items-center gap-4 ${showHidden ? 'bg-slate-800 border-slate-700 shadow-md' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${showHidden ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-500'}`}>{showHidden ? <Eye className="w-6 h-6" /> : <EyeOff className="w-6 h-6" />}</div>
            <div>
              <p className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${showHidden ? 'text-slate-400' : 'text-slate-500'}`}>Fórmulas Ocultas</p>
              <h3 className={`text-2xl font-black transition-colors ${showHidden ? 'text-white' : 'text-slate-800'}`}>{consolidatedActiveFormulas.filter(f => hiddenFormulas.some(h => h.name === f.name)).length}</h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0"><Package className="w-6 h-6" /></div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Opções de Envase</p>
              <h3 className="text-2xl font-black text-slate-800">{packagingOptions.length}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {isLoading ? <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 shadow-sm">Carregando fórmulas...</div> : filteredFormulas.length === 0 ? <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 shadow-sm">Nenhuma fórmula encontrada.</div> : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredFormulas.map((formula) => (
                <div key={formula.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-[#202eac]/50 transition-all overflow-hidden flex flex-col group cursor-pointer relative" onClick={() => handleSelectFormula(formula)}>
                  <button onClick={(e) => toggleHideFormula(e, formula)} className="absolute top-4 right-4 p-2 bg-slate-50 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-full transition-colors z-10">{showHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}</button>
                  <div className="p-5 border-b border-slate-100 flex-1 relative pr-12">
                    <div className="flex flex-col">
                      <h3 className="text-lg font-bold text-slate-800 leading-tight group-hover:text-[#202eac] transition-colors">{formula.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {formula.lm_code && <span className="text-[10px] text-slate-400 font-mono">LM: {formula.lm_code}</span>}
                        <span className="text-[10px] bg-[#202eac] text-white px-1.5 py-0.5 rounded font-black border border-blue-100/50 shadow-sm">V{formula.version.replace(/^v/i, '')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-4 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 font-medium">
                        <Beaker className="w-4 h-4 text-blue-500" />
                        <span>{formula.base_volume} L</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 font-medium">
                        <span className="font-bold text-slate-500">{formula.formula_ingredients?.length || 0} Insumos</span>
                      </div>
                    </div>
                    {uniqueCapacities.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-2">
                        {uniqueCapacities.slice(0, 4).map(cap => {
                          const chemCost = (formulasWithCostPerLiter[formula.id] || 0) * cap;
                          const kitCost = packagingKitsCost[cap] || 0;
                          return (
                            <div key={cap} className="flex flex-col">
                              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">{cap >= 1 ? cap.toFixed(1).replace('.', ',') + ' L' : cap.toString().replace('.', ',') + ' LT'}</span>
                              <span className="text-[11px] font-black text-emerald-600 font-mono">{formatCurrency(chemCost + kitCost)}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="p-3 bg-slate-100 group-hover:bg-[#202eac] flex items-center justify-center transition-colors">
                    <span className="font-bold text-slate-600 group-hover:text-white text-xs flex items-center gap-2"><Calculator className="w-4 h-4" /> Calcular Proporção <ChevronRight className="w-4 h-4" /></span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm">
                    <th className="py-4 px-6 font-semibold cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('name')}>
                      <div className="flex items-center gap-2">Nome da Fórmula {sortField === 'name' && (sortOrder === 'asc' ? <ArrowDownAZ className="w-3.5 h-3.5" /> : <ArrowUpZA className="w-3.5 h-3.5" />)}</div>
                    </th>
                    <th className="py-4 px-6 font-semibold cursor-pointer hover:bg-slate-100 transition-colors text-right" onClick={() => handleSort('volume')}>
                      <div className="flex items-center justify-end gap-2">Volume Base {sortField === 'volume' && (sortOrder === 'asc' ? <ArrowDownAZ className="w-3.5 h-3.5" /> : <ArrowUpZA className="w-3.5 h-3.5" />)}</div>
                    </th>
                    <th className="py-4 px-6 font-semibold text-center">Versão</th>
                    <th className="py-4 px-6 font-semibold text-center">Insumos</th>
                    {uniqueCapacities.map(cap => (
                      <th key={cap} className="py-4 px-6 font-semibold text-right whitespace-nowrap">{cap >= 1 ? cap.toFixed(1).replace('.', ',') + ' L' : cap.toString().replace('.', ',') + ' LT'}</th>
                    ))}
                    <th className="py-4 px-6 font-semibold text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredFormulas.map((formula) => (
                    <tr key={formula.id} className="hover:bg-blue-50/50 transition-colors group cursor-pointer" onClick={() => handleSelectFormula(formula)}>
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-800 group-hover:text-[#202eac] transition-colors">{formula.name}</div>
                        {formula.lm_code && <div className="text-[10px] text-slate-400 font-mono">LM: {formula.lm_code}</div>}
                      </td>
                      <td className="py-4 px-6 text-slate-600 font-medium text-right">{formula.base_volume} L</td>
                      <td className="py-4 px-6 text-center"><span className="bg-[#202eac] text-white px-2 py-0.5 rounded-md text-[10px] font-black border border-blue-100/50 shadow-sm">V{formula.version.replace(/^v/i, '')}</span></td>
                      <td className="py-4 px-6 text-center"><span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-[10px] font-bold">{formula.formula_ingredients?.length || 0} itens</span></td>
                      {uniqueCapacities.map(cap => {
                        const chemCost = (formulasWithCostPerLiter[formula.id] || 0) * cap;
                        const kitCost = packagingKitsCost[cap] || 0;
                        return (
                          <td key={cap} className="py-4 px-6 text-right font-mono text-xs font-bold text-emerald-600 whitespace-nowrap">{formatCurrency(chemCost + kitCost)}</td>
                        );
                      })}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={(e) => toggleHideFormula(e, formula)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors">{showHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}</button>
                          <span className="inline-flex items-center gap-1 font-bold text-[#202eac] text-xs opacity-0 group-hover:opacity-100 transition-opacity"><Calculator className="w-4 h-4" /> Calcular</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      {notification.show && (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300`}>
          <div className={`max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200`}>
            {notification.isUpdate ? (
              <div className="p-8">
                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                  <TrendingUp className="w-8 h-8 text-[#202eac]" />
                </div>
                <h3 className="text-xl font-black text-slate-800 text-center mb-2">{notification.title}</h3>
                <p className="text-sm text-slate-500 text-center mb-6 leading-relaxed">{notification.message}</p>
                
                <div className="space-y-3 mb-8 bg-slate-50 p-4 rounded-2xl border border-slate-100 max-h-48 overflow-auto">
                  {notification.updates?.map((u, i) => (
                    <div key={i} className="flex flex-col gap-1 py-2 border-b border-slate-100 last:border-0">
                      <span className="font-bold text-slate-700 text-sm">{u.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 font-mono line-through">{u.old}</span>
                        <ChevronRight className="w-3 h-3 text-slate-300" />
                        <span className="text-[10px] font-black text-[#202eac] font-mono bg-blue-50 px-1.5 py-0.5 rounded uppercase tracking-wider">Nova: {u.new}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={() => setNotification(prev => ({ ...prev, show: false }))} 
                  className="w-full py-4 bg-[#202eac] hover:bg-blue-800 text-white font-black rounded-2xl transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2 group"
                >
                  Entendi e Continuar
                  <ArrowRightLeft className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            ) : (
              <div className="p-6 flex gap-4">
                <div className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center ${
                  notification.type === 'success' ? 'bg-emerald-50' :
                  notification.type === 'error' ? 'bg-rose-50' : 'bg-blue-50'
                }`}>
                  {notification.type === 'success' ? <CheckCircle2 className="w-6 h-6 text-emerald-600" /> :
                    notification.type === 'error' ? <AlertTriangle className="w-6 h-6 text-rose-600" /> :
                      <Info className="w-6 h-6 text-[#202eac]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-slate-900 leading-tight mb-1">{notification.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed font-medium">{notification.message}</p>
                </div>
                <button 
                  onClick={() => setNotification(prev => ({ ...prev, show: false }))} 
                  className="shrink-0 p-2 hover:bg-slate-50 rounded-xl transition-colors h-fit text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
