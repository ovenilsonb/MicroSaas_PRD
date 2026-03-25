import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Scale, 
  Search, 
  Beaker, 
  ChevronRight, 
  ArrowLeft, 
  Calculator,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Package
} from 'lucide-react';

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

export default function Proporcao() {
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [packagingOptions, setPackagingOptions] = useState<PackagingOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFormula, setSelectedFormula] = useState<Formula | null>(null);
  const [batchSize, setBatchSize] = useState<string>('100');
  const [unitQuantity, setUnitQuantity] = useState<string>('1');
  const [selectedPackagingKeys, setSelectedPackagingKeys] = useState<string[]>([]);
  const [calculationMode, setCalculationMode] = useState<'volume' | 'units'>('volume');

  useEffect(() => {
    fetchInitialData();
  }, []);

  async function fetchInitialData() {
    setIsLoading(true);
    await Promise.all([
      fetchFormulas(),
      fetchPackaging()
    ]);
    setIsLoading(false);
  }

  async function fetchPackaging() {
    try {
      const { data, error } = await supabase
        .from('ingredients')
        .select(`
          *,
          variants:ingredient_variants (*)
        `)
        .eq('produto_quimico', false)
        .order('name');

      if (error) throw error;

      const flattened: PackagingOption[] = [];
      data?.forEach(ing => {
        const parseCost = (val: any): number => {
          if (val === undefined || val === null) return 0;
          if (typeof val === 'number') return val;
          if (typeof val === 'string') {
            return parseFloat(val.replace(/\./g, '').replace(',', '.')) || 0;
          }
          return 0;
        };

        if (ing.variants && ing.variants.length > 0) {
          ing.variants.forEach((v: any) => {
            flattened.push({
              id: ing.id,
              variant_id: v.id,
              name: `${ing.name} - ${v.name}`,
              cost: parseCost(v.cost_per_unit),
              capacity: extractCapacity(`${ing.name} ${v.name}`)
            });
          });
        } else {
          flattened.push({
            id: ing.id,
            variant_id: null,
            name: ing.name,
            cost: parseCost(ing.cost_per_unit),
            capacity: extractCapacity(ing.name)
          });
        }
      });
      setPackagingOptions(flattened);
    } catch (err) {
      console.error('Erro ao buscar embalagens:', err);
    }
  }

  // Helper to extract capacity from name (e.g., "Frasco 2L" -> 2, "Pote 500ml" -> 0.5)
  const extractCapacity = (name: string): number => {
    const lowerName = name.toLowerCase();
    
    // Match patterns like "500ml", "500 ml", "0.5l", "2lt", "2 lt", "1l"
    const mlMatch = lowerName.match(/(\d+(?:[.,]\d+)?)\s*ml/);
    if (mlMatch) {
      return parseFloat(mlMatch[1].replace(',', '.')) / 1000;
    }
    
    const lMatch = lowerName.match(/(\d+(?:[.,]\d+)?)\s*(?:l|lt|litro)/);
    if (lMatch) {
      return parseFloat(lMatch[1].replace(',', '.'));
    }
    
    return 1; // Default to 1 if not found
  };

  async function fetchFormulas() {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('formulas')
        .select(`
          *,
          formula_ingredients (
            *,
            ingredients (*),
            variants:ingredient_variants (name, cost_per_unit)
          )
        `)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;
      setFormulas(data || []);
    } catch (err) {
      console.error('Erro ao buscar fórmulas:', err);
    } finally {
      setIsLoading(false);
    }
  }

  const filteredFormulas = useMemo(() => {
    return formulas.filter(f => 
      f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.lm_code?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [formulas, searchTerm]);

  const handleSelectFormula = (formula: Formula) => {
    setSelectedFormula(formula);
    setBatchSize(formula.base_volume.toString().replace('.', ','));
    setUnitQuantity('1');
    
    // Do NOT auto-select anything, let the user choose
    setSelectedPackagingKeys([]);
    setCalculationMode('volume');
  };

  const togglePackagingGroup = (capacity: number) => {
    const keysInGroup = packagingOptions
      .filter(p => p.capacity === capacity)
      .map(p => `${p.id}_${p.variant_id || 'base'}`);
    
    const isGroupSelected = keysInGroup.every(k => selectedPackagingKeys.includes(k));

    if (isGroupSelected) {
      // Deselect all in group
      setSelectedPackagingKeys(prev => prev.filter(k => !keysInGroup.includes(k)));
    } else {
      // Select all in group
      setSelectedPackagingKeys(prev => {
        const otherKeys = prev.filter(k => !keysInGroup.includes(k));
        return [...otherKeys, ...keysInGroup];
      });
    }
  };

  const groupedPackaging = useMemo(() => {
    const groups: { [capacity: number]: PackagingOption[] } = {};
    packagingOptions.forEach(pkg => {
      if (!groups[pkg.capacity]) groups[pkg.capacity] = [];
      groups[pkg.capacity].push(pkg);
    });
    return groups;
  }, [packagingOptions]);

  const calculatedIngredients = useMemo(() => {
    if (!selectedFormula) return [];
    
    let size = 0;
    let units = 0;

    // We need a reference packaging to calculate total volume if in units mode
    // Usually the first selected item that has a capacity
    const selectedPkgs = packagingOptions.filter(p => selectedPackagingKeys.includes(`${p.id}_${p.variant_id || 'base'}`));
    const referencePkg = selectedPkgs[0];

    if (calculationMode === 'units' && referencePkg) {
      units = parseFloat(unitQuantity.replace(',', '.')) || 0;
      size = units * referencePkg.capacity;
    } else {
      size = parseFloat(batchSize.replace(',', '.')) || 0;
    }

    const ratio = size / selectedFormula.base_volume;

    // Chemical ingredients from the formula
    const chemicals = selectedFormula.formula_ingredients
      .filter(item => item.ingredients.produto_quimico)
      .map(item => {
        const quantity = item.quantity * ratio;
        let cost = 0;
        const variantCost = item.variants?.cost_per_unit;
        const ingredientCost = item.ingredients?.cost_per_unit;

        const parseCost = (val: any): number => {
          if (val === undefined || val === null) return 0;
          if (typeof val === 'number') return val;
          if (typeof val === 'string') {
            return parseFloat(val.replace(/\./g, '').replace(',', '.')) || 0;
          }
          return 0;
        };

        if (variantCost !== undefined && variantCost !== null) {
          cost = parseCost(variantCost);
        } else if (ingredientCost !== undefined && ingredientCost !== null) {
          cost = parseCost(ingredientCost);
        }

        return {
          ...item,
          calculatedQuantity: quantity,
          calculatedCost: quantity * cost
        };
      });

    // Add all selected packaging/labels
    selectedPkgs.forEach(pkg => {
      let pkgQuantity = 0;
      if (calculationMode === 'units') {
        pkgQuantity = parseFloat(unitQuantity.replace(',', '.')) || 0;
      } else {
        // In volume mode, calculate how many units of this item are needed
        // If it's a label, it should probably match the bottle count
        // We use the item's own capacity to determine its count
        pkgQuantity = pkg.capacity > 0 ? size / pkg.capacity : 0;
      }

      chemicals.push({
        id: `pkg_${pkg.id}_${pkg.variant_id || 'base'}`,
        ingredient_id: pkg.id,
        variant_id: pkg.variant_id,
        quantity: 0,
        ingredients: {
          id: pkg.id,
          name: pkg.name,
          unit: 'un',
          cost_per_unit: pkg.cost,
          produto_quimico: false
        },
        calculatedQuantity: pkgQuantity,
        calculatedCost: pkgQuantity * pkg.cost
      } as any);
    });

    return chemicals;
  }, [selectedFormula, batchSize, unitQuantity, selectedPackagingKeys, calculationMode, packagingOptions]);

  const currentBatchSize = useMemo(() => {
    const selectedPkgs = packagingOptions.filter(p => selectedPackagingKeys.includes(`${p.id}_${p.variant_id || 'base'}`));
    const referencePkg = selectedPkgs[0];
    if (calculationMode === 'units' && referencePkg) {
      return (parseFloat(unitQuantity.replace(',', '.')) || 0) * referencePkg.capacity;
    }
    return parseFloat(batchSize.replace(',', '.')) || 0;
  }, [batchSize, unitQuantity, selectedPackagingKeys, calculationMode, packagingOptions]);

  const totalCost = useMemo(() => {
    return calculatedIngredients.reduce((sum, item) => sum + item.calculatedCost, 0);
  }, [calculatedIngredients]);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatQuantity = (value: number, isChemical: boolean = true) => {
    if (!isChemical) {
      return Math.ceil(value).toString();
    }
    return value.toLocaleString('pt-BR', { 
      minimumFractionDigits: 3, 
      maximumFractionDigits: 3 
    });
  };

  if (selectedFormula) {
    return (
      <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSelectedFormula(null)}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                <Scale className="w-6 h-6 text-[#202eac]" />
                Cálculo de Proporção
              </h1>
              <p className="text-sm text-slate-500 mt-1">Fórmula: <span className="font-semibold text-slate-700">{selectedFormula.name}</span></p>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Calculation Controls */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {/* Mode Selection */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex gap-2">
                  <button
                    onClick={() => setCalculationMode('volume')}
                    className={`flex-1 py-2 px-4 rounded-xl font-bold text-sm transition-all ${
                      calculationMode === 'volume' 
                        ? 'bg-[#202eac] text-white shadow-md' 
                        : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    Calcular por Volume Total
                  </button>
                  <button
                    onClick={() => setCalculationMode('units')}
                    className={`flex-1 py-2 px-4 rounded-xl font-bold text-sm transition-all ${
                      calculationMode === 'units' 
                        ? 'bg-[#202eac] text-white shadow-md' 
                        : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    Cálculo por Embalagem
                  </button>
                </div>

                {/* Inputs */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  {calculationMode === 'volume' ? (
                    <div className="space-y-4">
                      <label className="block text-sm font-semibold text-slate-700">Volume Total do Lote (L/kg)</label>
                      <div className="relative">
                        <input 
                          type="text"
                          value={batchSize}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9,]/g, '');
                            setBatchSize(val);
                          }}
                          className="w-full pl-4 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] text-2xl font-black text-[#202eac] outline-none transition-all"
                          placeholder="Ex: 500"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">L/kg</div>
                      </div>
                      {calculationMode === 'volume' && (
                        <div className="mt-6">
                          <div className="flex items-center justify-between mb-3">
                            <label className="text-sm font-semibold text-slate-700">Escolha o Conjunto de Envase (Embalagem + Rótulo)</label>
                            {selectedPackagingKeys.length > 0 && (
                              <button 
                                onClick={() => setSelectedPackagingKeys([])}
                                className="text-[10px] font-bold text-[#202eac] uppercase hover:underline"
                              >
                                Limpar Seleção
                              </button>
                            )}
                          </div>
                          <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                            {Object.entries(groupedPackaging)
                              .map(([cap, pkgs]) => ({ capacity: parseFloat(cap), items: pkgs }))
                              .filter(group => {
                                const totalVol = parseFloat(batchSize.replace(',', '.')) || 0;
                                // Only show corresponding packaging (capacity <= volume)
                                if (group.capacity > totalVol) return false;
                                
                                // If something is selected, only show the selected group
                                if (selectedPackagingKeys.length > 0) {
                                  return group.items.some(p => selectedPackagingKeys.includes(`${p.id}_${p.variant_id || 'base'}`));
                                }
                                return true;
                              })
                              .sort((a, b) => b.capacity - a.capacity)
                              .map(group => {
                                const isGroupSelected = group.items.every(p => selectedPackagingKeys.includes(`${p.id}_${p.variant_id || 'base'}`));
                                const totalVol = parseFloat(batchSize.replace(',', '.')) || 0;
                                const unitsNeeded = group.capacity > 0 ? Math.ceil(totalVol / group.capacity) : 0;

                                return (
                                  <div 
                                    key={group.capacity}
                                    onClick={() => togglePackagingGroup(group.capacity)}
                                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col gap-3 ${
                                      isGroupSelected 
                                        ? 'border-[#202eac] bg-blue-50/50 ring-2 ring-blue-100' 
                                        : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <div className={`p-1.5 rounded-lg ${isGroupSelected ? 'bg-[#202eac] text-white' : 'bg-slate-200 text-slate-500'}`}>
                                          <Package className="w-4 h-4" />
                                        </div>
                                        <span className={`font-bold text-sm ${isGroupSelected ? 'text-[#202eac]' : 'text-slate-700'}`}>
                                          Conjunto de {group.capacity}L
                                        </span>
                                      </div>
                                      <span className={`text-xs font-black ${isGroupSelected ? 'text-[#202eac]' : 'text-slate-500'}`}>
                                        Necessário: {unitsNeeded} un
                                      </span>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-2">
                                      {group.items.map(item => (
                                        <div key={item.id + (item.variant_id || '')} className="flex items-center gap-2 bg-white/50 p-2 rounded-lg border border-slate-200/50">
                                          <div className={`w-1.5 h-1.5 rounded-full ${isGroupSelected ? 'bg-[#202eac]' : 'bg-slate-300'}`}></div>
                                          <span className="text-[10px] font-medium text-slate-600 truncate" title={item.name}>
                                            {item.name}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Quantidade de Unidades</label>
                        <input 
                          type="text"
                          value={unitQuantity}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9,]/g, '');
                            setUnitQuantity(val);
                          }}
                          className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] text-2xl font-black text-[#202eac] outline-none transition-all"
                          placeholder="Ex: 10"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <label className="text-sm font-semibold text-slate-700">Escolha o Conjunto de Envase (Embalagem + Rótulo)</label>
                          {selectedPackagingKeys.length > 0 && (
                            <button 
                              onClick={() => setSelectedPackagingKeys([])}
                              className="text-[10px] font-bold text-[#202eac] uppercase hover:underline"
                            >
                              Limpar Seleção
                            </button>
                          )}
                        </div>
                        <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                          {Object.entries(groupedPackaging)
                            .map(([cap, pkgs]) => ({ capacity: parseFloat(cap), items: pkgs }))
                            .filter(group => {
                              // If something is selected, only show the selected group
                              if (selectedPackagingKeys.length > 0) {
                                return group.items.some(p => selectedPackagingKeys.includes(`${p.id}_${p.variant_id || 'base'}`));
                              }
                              return true;
                            })
                            .sort((a, b) => b.capacity - a.capacity)
                            .map(group => {
                              const isGroupSelected = group.items.every(p => selectedPackagingKeys.includes(`${p.id}_${p.variant_id || 'base'}`));
                              const totalVol = (parseFloat(unitQuantity.replace(',', '.')) || 0) * group.capacity;

                              return (
                                <div 
                                  key={group.capacity}
                                  onClick={() => togglePackagingGroup(group.capacity)}
                                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col gap-3 ${
                                    isGroupSelected 
                                      ? 'border-[#202eac] bg-blue-50/50 ring-2 ring-blue-100' 
                                      : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <div className={`p-1.5 rounded-lg ${isGroupSelected ? 'bg-[#202eac] text-white' : 'bg-slate-200 text-slate-500'}`}>
                                        <Package className="w-4 h-4" />
                                      </div>
                                      <span className={`font-bold text-sm ${isGroupSelected ? 'text-[#202eac]' : 'text-slate-700'}`}>
                                        Conjunto de {group.capacity}L
                                      </span>
                                    </div>
                                    <span className={`text-xs font-black ${isGroupSelected ? 'text-[#202eac]' : 'text-slate-500'}`}>
                                      Total: {totalVol.toLocaleString('pt-BR')} L
                                    </span>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-2">
                                    {group.items.map(item => (
                                      <div key={item.id + (item.variant_id || '')} className="flex items-center gap-2 bg-white/50 p-2 rounded-lg border border-slate-200/50">
                                        <div className={`w-1.5 h-1.5 rounded-full ${isGroupSelected ? 'bg-[#202eac]' : 'bg-slate-300'}`}></div>
                                        <span className="text-[10px] font-medium text-slate-600 truncate" title={item.name}>
                                          {item.name}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Summary Cards */}
              <div className="space-y-4">
                <div className="bg-emerald-600 p-6 rounded-2xl shadow-lg shadow-emerald-100 text-white">
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-80 block mb-1">Custo Total do Lote</span>
                  <div className="text-3xl font-black">{formatCurrency(totalCost)}</div>
                </div>
                
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Custo por Litro/kg</span>
                  <div className="text-2xl font-black text-slate-800">{formatCurrency(totalCost / (currentBatchSize || 1))}</div>
                </div>

                <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Volume Calculado</span>
                    <Scale className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="text-2xl font-black text-blue-700">{currentBatchSize.toLocaleString('pt-BR')} <span className="text-sm font-bold">L/kg</span></div>
                </div>
              </div>
            </div>

            {/* Ingredients Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-[#202eac]" />
                  Quantidades Necessárias
                </h3>
                <span className="text-xs text-slate-500">
                  {calculationMode === 'units' 
                    ? `Calculado para ${unitQuantity} unidades` 
                    : `Calculado proporcionalmente ao lote de ${batchSize} L/kg`}
                </span>
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white border-b border-slate-100 text-slate-500 text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-6 font-bold">Insumo</th>
                    <th className="py-3 px-6 font-bold text-right">Qtd. Original ({selectedFormula.base_volume}L)</th>
                    <th className="py-3 px-6 font-bold text-right bg-blue-50/30 text-[#202eac]">Qtd. Necessária</th>
                    <th className="py-3 px-6 font-bold text-right">Custo Proporcional</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {calculatedIngredients.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${item.ingredients.produto_quimico ? 'bg-amber-400' : 'bg-blue-400'}`}></div>
                          <div className="font-bold text-slate-800">{item.ingredients.name}</div>
                        </div>
                        {item.variants && (
                          <div className="text-[10px] text-slate-500 mt-0.5 ml-4 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" /> {item.variants.name}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right text-slate-500 font-mono text-sm">
                        {formatQuantity(item.quantity, item.ingredients.produto_quimico)} {item.ingredients.unit}
                      </td>
                      <td className="py-4 px-6 text-right font-black text-[#202eac] bg-blue-50/10 font-mono text-lg">
                        {formatQuantity(item.calculatedQuantity, item.ingredients.produto_quimico)} {item.ingredients.unit}
                      </td>
                      <td className="py-4 px-6 text-right font-bold text-emerald-600 font-mono">
                        {formatCurrency(item.calculatedCost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl text-blue-700 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>Este cálculo é puramente matemático baseado na proporção linear. Verifique se alterações de escala afetam a química ou o processo de produção.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      <header className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <Scale className="w-6 h-6 text-[#202eac]" />
            Cálculo de Proporção
          </h1>
          <p className="text-sm text-slate-500 mt-1">Selecione uma fórmula para calcular as quantidades do lote</p>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Search */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
            <Search className="w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar fórmula por nome ou código..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 outline-none text-slate-700"
            />
          </div>

          {isLoading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 shadow-sm">
              Carregando fórmulas...
            </div>
          ) : filteredFormulas.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 shadow-sm">
              Nenhuma fórmula encontrada.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredFormulas.map((formula) => (
                <button
                  key={formula.id}
                  onClick={() => handleSelectFormula(formula)}
                  className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-[#202eac] hover:shadow-md transition-all text-left flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 text-[#202eac] rounded-xl flex items-center justify-center group-hover:bg-[#202eac] group-hover:text-white transition-colors">
                      <Beaker className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 group-hover:text-[#202eac] transition-colors">{formula.name}</h3>
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                        <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-mono">{formula.lm_code || 'S/C'}</span>
                        <span>•</span>
                        <span>Base: {formula.base_volume} L</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-[#202eac] transition-all group-hover:translate-x-1" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
