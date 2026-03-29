import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useStorageMode } from '../contexts/StorageModeContext';
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
  Package,
  List,
  LayoutGrid,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
  History,
  Box
} from 'lucide-react';
import { generateId } from '../lib/id';

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
  status: 'active' | 'draft' | 'archived';
  formula_ingredients: FormulaIngredient[];
}

interface PackagingOption {
  id: string;
  variant_id: string | null;
  name: string;
  cost: number;
  capacity: number;
}

interface AssemblyOption {
  id: string;
  name: string;
  items: { capacity: number; quantity: number }[];
  isSuggested?: boolean;
}

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
  const [recentSimulations, setRecentSimulations] = useState<any[]>([]);
  const { mode } = useStorageMode();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [hiddenFormulas, setHiddenFormulas] = useState<{ name: string, version: string }[]>([]);
  const [notification, setNotification] = useState<{ show: boolean; type: 'success' | 'error' | 'info'; title: string; message: string; }>({ show: false, type: 'info', title: '', message: '' });

  const showNotify = (type: 'success' | 'error' | 'info', title: string, message: string) => setNotification({ show: true, type, title, message });

  // 1. Fetch Functions
  const fetchRecentSimulations = () => {
    if (!selectedFormula) return;
    const raw = localStorage.getItem('local_proportions');
    const all = raw ? JSON.parse(raw) : [];
    setRecentSimulations(Array.isArray(all) ? all.filter(p => p.formulaId === selectedFormula.id).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5) : []);
  };

  const fetchFormulas = async () => {
    setIsLoading(true);
    try {
      let data: Formula[] = [];
      if (mode === 'supabase') {
        const { data: res, error } = await supabase.from('formulas').select('*, formula_ingredients(*, ingredients(*), variants(*))').eq('status', 'active');
        if (error) throw error;
        data = res as Formula[];
      } else {
        data = JSON.parse(localStorage.getItem('local_formulas') || '[]').filter((f: any) => f.status === 'active');
      }
      const map: Record<string, Formula> = {};
      data.forEach(f => {
        const b = getBaseFormulaName(f.name);
        if (!map[b] || compareVersions(f.version, map[b].version) > 0) map[b] = f;
      });
      setFormulas(Object.values(map));
    } catch (err) { showNotify('error', 'Erro', 'Falha ao carregar fórmulas.'); }
    finally { setIsLoading(false); }
  };

  const fetchPackaging = async () => {
    try {
      let flattened: PackagingOption[] = [];
      const processIng = (ing: any) => {
        const m = ing.name.match(/(\d+[.,]?\d*)\s*(L|ml|LT|KG|G)/i);
        let cap = m ? parseFloat(m[1].replace(',', '.')) : 0;
        if (m && m[2].toLowerCase() === 'ml') cap /= 1000;
        if (cap > 0) flattened.push({ id: ing.id, variant_id: null, name: ing.name, cost: ing.cost_per_unit, capacity: cap });
        ing.variants?.forEach((v: any) => {
          const vm = v.name.match(/(\d+[.,]?\d*)\s*(L|ml|LT|KG|G)/i);
          let vcap = vm ? parseFloat(vm[1].replace(',', '.')) : cap;
          if (vm && vm[2].toLowerCase() === 'ml') vcap /= 1000;
          if (vcap > 0) flattened.push({ id: ing.id, variant_id: v.id, name: `${ing.name} - ${v.name}`, cost: v.cost_per_unit || ing.cost_per_unit, capacity: vcap });
        });
      };
      if (mode === 'supabase') {
        const { data } = await supabase.from('ingredients').select('*, variants(*)').eq('produto_quimico', false);
        data?.forEach(processIng);
      } else {
        JSON.parse(localStorage.getItem('local_ingredients') || '[]').filter((i: any) => !i.produto_quimico).forEach(processIng);
      }
      setPackagingOptions(flattened);
    } catch (e) { console.error(e); }
  };

  // 2. Memoized Calculations
  const packagingOptionsByCapacity = useMemo(() => {
    const g: Record<number, PackagingOption[]> = {};
    packagingOptions.forEach(p => { if (!g[p.capacity]) g[p.capacity] = []; g[p.capacity].push(p); });
    return g;
  }, [packagingOptions]);

  const uniqueCapacities = useMemo(() => Object.keys(packagingOptionsByCapacity).map(Number).sort((a,b) => b-a), [packagingOptionsByCapacity]);

  const assemblyOptions = useMemo(() => {
    const val = parseFloat(batchSize.replace(',', '.')) || 0;
    if (val <= 0 || uniqueCapacities.length === 0) return [];

    if (calculationMode === 'volume') {
      const options: { items: { capacity: number; quantity: number }[] }[] = [];
      const findCombinations = (remaining: number, capacityIdx: number, current: { capacity: number; quantity: number }[]) => {
        if (options.length >= 5) return;
        if (Math.abs(remaining) < 0.001) { options.push({ items: [...current] }); return; }
        if (capacityIdx >= uniqueCapacities.length) return;
        
        const cap = uniqueCapacities[capacityIdx];
        const maxUnits = Math.min(Math.floor(remaining / cap), 1000);
        for (let q = maxUnits; q >= 0; q--) {
          if (q > 0) current.push({ capacity: cap, quantity: q });
          findCombinations(remaining - (q * cap), capacityIdx + 1, current);
          if (q > 0) current.pop();
          if (options.length >= 5) break;
        }
      };
      findCombinations(val, 0, []);
      return options.sort((a,b) => a.items.length - b.items.length).map((opt, idx) => ({ 
        ...opt, 
        id: `opt-${idx}`, 
        name: `Opção ${idx + 1}`, 
        isSuggested: opt.items.length === 1 
      }));
    } else {
      // QTD PEÇAS Mode: Each suggestion is simply "N units of Capacity X"
      return uniqueCapacities.map((cap, idx) => ({
        id: `unit-opt-${idx}`,
        name: `${val} UNIDADES DE ${cap >= 1 ? cap + 'L' : cap * 1000 + 'ml'}`,
        items: [{ capacity: cap, quantity: val }],
        isSuggested: idx === 0 // Recommend largest capacity by default in units mode
      }));
    }
  }, [batchSize, uniqueCapacities, calculationMode]);

  const packagingAllocation = useMemo(() => {
    const alloc: Record<number, number> = {};
    const selectedCaps = uniqueCapacities.filter(cap => packagingOptionsByCapacity[cap].some(p => selectedPackagingKeys.includes(`${p.id}_${p.variant_id || 'base'}`)));
    
    if (selectedCaps.length > 0) {
      if (calculationMode === 'volume') {
        let rem = parseFloat(batchSize.replace(',', '.')) || 0;
        selectedCaps.sort((a,b)=>b-a).forEach((cap, idx) => {
          if (idx === selectedCaps.length - 1) alloc[cap] = Math.ceil(rem / cap);
          else { const q = Math.floor(rem / cap); alloc[cap] = q; rem -= q * cap; }
        });
      } else {
        const qty = parseInt(batchSize) || 0;
        // In Units mode, we use the quantity directly for the selected capacity
        selectedCaps.forEach(cap => { alloc[cap] = qty; });
      }
    }
    return alloc;
  }, [batchSize, selectedPackagingKeys, uniqueCapacities, calculationMode, packagingOptionsByCapacity]);

  const currentBatchSize = useMemo(() => {
    if (calculationMode === 'volume') return parseFloat(batchSize.replace(',', '.')) || 0;
    let t = 0;
    Object.entries(packagingAllocation).forEach(([c, q]) => t += Number(c) * q);
    return t;
  }, [batchSize, packagingAllocation, calculationMode]);

  const calculatedIngredients = useMemo(() => {
    if (!selectedFormula || currentBatchSize <= 0) return { ingredients: [], nonChemicalCosts: [] };
    const s = currentBatchSize / selectedFormula.base_volume;
    const ings = selectedFormula.formula_ingredients.map(fi => ({ ...fi, calculatedQuantity: fi.quantity * s }));
    const pkgs: any[] = [];
    Object.entries(packagingAllocation).forEach(([cap, qty]) => {
      if (qty <= 0) return;
      // All items matching this capacity (Bottle, Label, etc)
      packagingOptionsByCapacity[Number(cap)]?.filter(p => selectedPackagingKeys.includes(`${p.id}_${p.variant_id || 'base'}`)).forEach(p => {
        pkgs.push({ name: `${p.name}`, quantity: qty, cost: p.cost, total: qty * p.cost });
      });
    });
    return { ingredients: ings, nonChemicalCosts: pkgs };
  }, [selectedFormula, currentBatchSize, packagingAllocation, selectedPackagingKeys, packagingOptionsByCapacity]);

  const chemicalCost = useMemo(() => {
    return calculatedIngredients.ingredients.reduce((acc: number, fi: any) => acc + (fi.calculatedQuantity * (fi.variants?.cost_per_unit ?? (fi.ingredients.cost_per_unit || 0))), 0);
  }, [calculatedIngredients]);

  const totalCost = useMemo(() => {
    return chemicalCost + calculatedIngredients.nonChemicalCosts.reduce((acc, p) => acc + p.total, 0);
  }, [chemicalCost, calculatedIngredients.nonChemicalCosts]);

  const filteredFormulas = useMemo(() => {
    return formulas.filter(f => !hiddenFormulas.some(h => h.name === f.name) && (f.name.toLowerCase().includes(searchTerm.toLowerCase()) || f.lm_code?.toLowerCase().includes(searchTerm.toLowerCase())))
      .sort((a,b) => sortOrder === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name));
  }, [formulas, searchTerm, sortOrder, hiddenFormulas]);

  // 3. Effects
  useEffect(() => {
    fetchFormulas(); fetchPackaging();
    const saved = localStorage.getItem('microsaas_hidden_formulas_proporcao');
    if (saved) setHiddenFormulas(JSON.parse(saved));
  }, [mode]);

  useEffect(() => { fetchRecentSimulations(); }, [selectedFormula]);

  // Auto-selection of Option 1
  useEffect(() => {
    if (!selectedFormula || assemblyOptions.length === 0 || selectedPackagingKeys.length > 0) return;
    handleSelectOption(assemblyOptions[0]);
  }, [batchSize, selectedFormula, assemblyOptions]);

  const handleSelectOption = (opt: AssemblyOption) => {
    const keys: string[] = [];
    opt.items.forEach(item => {
      packagingOptionsByCapacity[item.capacity]?.forEach(p => keys.push(`${p.id}_${p.variant_id || 'base'}`));
    });
    setSelectedPackagingKeys(keys);
  };

  const handleSaveProportion = () => {
    if (!selectedFormula || currentBatchSize <= 0) return;
    try {
      const saved = JSON.parse(localStorage.getItem('local_proportions') || '[]');
      const ingredientsData = [
        ...calculatedIngredients.ingredients.map((fi: any) => ({
          id: fi.id, name: fi.ingredients.name, quantity: fi.calculatedQuantity, unit: fi.ingredients.unit,
          cost: fi.calculatedQuantity * (fi.variants?.cost_per_unit ?? (fi.ingredients.cost_per_unit || 0)), isChemical: true
        })),
        ...calculatedIngredients.nonChemicalCosts.map((item: any) => ({
          id: `pkg_${item.name}`, name: item.name, quantity: item.quantity, unit: 'un', cost: item.total, isChemical: false
        }))
      ];
      const versionStr = (selectedFormula.version || 'V1').startsWith('V') ? selectedFormula.version : `V${selectedFormula.version}`;
      const sim = {
        id: generateId(), formulaId: selectedFormula.id, formulaName: selectedFormula.name, formulaVersion: selectedFormula.version,
        targetVolume: currentBatchSize, totalCost, createdAt: new Date().toISOString(),
        displayName: `${selectedFormula.name} -- ${currentBatchSize.toLocaleString('pt-BR')}L -- ${versionStr}`,
        ingredients: ingredientsData
      };
      localStorage.setItem('local_proportions', JSON.stringify([sim, ...saved]));
      fetchRecentSimulations();
      showNotify('success', 'Simulação Arquivada!', 'Os dados foram persistidos no seu Memorial de Cálculo com sucesso.');
    } catch (err: any) { showNotify('error', 'Erro ao Salvar', 'Não foi possível salvar a simulação.'); }
  };

  const handleSelectFormula = (f: Formula) => { setSelectedFormula(f); setBatchSize(f.base_volume.toString()); setSelectedPackagingKeys([]); setCalculationMode('volume'); };
  
  const togglePackagingGroup = (cap: number) => {
    const keys = packagingOptions.filter(p => p.capacity === cap).map(p => `${p.id}_${p.variant_id || 'base'}`);
    const all = keys.every(k => selectedPackagingKeys.includes(k));
    if (all) setSelectedPackagingKeys(prev => prev.filter(k => !keys.includes(k)));
    else setSelectedPackagingKeys(prev => [...prev.filter(k => !keys.includes(k)), ...keys]);
  };

  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const NotificationModal = () => (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
      <div className={`max-w-md w-full bg-white rounded-[40px] shadow-2xl border ${notification.type === 'success' ? 'border-emerald-100' : 'border-blue-100'} p-10 text-center animate-in zoom-in-95`}>
        <div className={`w-20 h-20 rounded-[28px] flex items-center justify-center mx-auto mb-6 ${notification.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-[#202eac]'}`}>
          {notification.type === 'success' ? <CheckCircle2 className="w-10 h-10" /> : <Info className="w-10 h-10" />}
        </div>
        <h3 className="text-2xl font-black text-slate-900 mb-2">{notification.title}</h3>
        <p className="text-slate-500 font-medium mb-8 leading-relaxed">{notification.message}</p>
        <button onClick={() => setNotification({ ...notification, show: false })} className={`w-full py-4 rounded-2xl font-black text-white shadow-lg ${notification.type === 'success' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-[#202eac] hover:bg-blue-800'}`}>Entendi</button>
      </div>
    </div>
  );

  if (selectedFormula) {
    const rawVer = selectedFormula.version || 'V1';
    const verBadge = rawVer.startsWith('V') ? rawVer : `V${rawVer}`;
    return (
      <div className="flex flex-col h-full bg-slate-50 relative font-sans">
        <header className="bg-white border-b border-slate-200 px-8 py-6 shrink-0 z-10">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => setSelectedFormula(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><ArrowLeft className="w-6 h-6 text-slate-600" /></button>
              <div>
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3 tracking-tighter uppercase"><Calculator className="w-7 h-7 text-[#202eac]" /> Calculadora</h2>
                <div className="flex items-center gap-2 text-slate-500 font-bold text-sm tracking-tight">{selectedFormula.name} <span className="bg-[#202eac] text-white px-3 py-1 rounded-full text-[10px] shadow-sm">{verBadge}</span></div>
              </div>
            </div>
            <button onClick={handleSaveProportion} className="bg-[#202eac] text-white px-8 py-3.5 rounded-2xl font-black transition-all shadow-xl shadow-blue-100/50 flex items-center gap-2 hover:scale-[1.02] active:scale-95"><FileText className="w-5 h-5" /> Salvar Simulação</button>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">
            <aside className="lg:col-span-4 space-y-8">
              <div className="bg-white p-8 rounded-[48px] border border-slate-200 shadow-2xl space-y-8 ring-1 ring-slate-100/50">
                <div className="flex p-1.5 bg-slate-100 rounded-3xl">
                  <button onClick={() => setCalculationMode('volume')} className={`flex-1 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all ${calculationMode === 'volume' ? 'bg-white text-[#202eac] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Volume Fixo</button>
                  <button onClick={() => setCalculationMode('units')} className={`flex-1 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all ${calculationMode === 'units' ? 'bg-white text-[#202eac] shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Qtd Peças</button>
                </div>

                <div className="space-y-6">
                  <div className="relative">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4 ml-1">Meta de Produção</label>
                    <input type="text" value={batchSize} onChange={e => { setBatchSize(e.target.value); setSelectedPackagingKeys([]); }} className="w-full bg-slate-50 border-2 border-slate-100 rounded-[28px] px-8 py-6 text-4xl font-black text-slate-800 focus:border-[#202eac] outline-none transition-all pr-24 shadow-inner" placeholder="0.00" />
                    <span className="absolute right-8 top-[55%] font-black text-slate-400 text-sm">{calculationMode === 'volume' ? 'L/KG' : 'UNI/L'}</span>
                  </div>

                  {assemblyOptions.length > 0 && (
                    <div className="pt-6 border-t border-slate-100 space-y-4">
                      <div className="flex items-center gap-2 mb-2 ml-1 text-[#202eac]"><Calculator className="w-5 h-5" /><h4 className="text-[13px] font-black uppercase tracking-tight">Sugestões de Montagem (Sem Sobra)</h4></div>
                      <div className="grid grid-cols-1 gap-3">
                        {assemblyOptions.map(opt => (
                          <button key={opt.id} onClick={() => handleSelectOption(opt)} className="p-4 bg-white border-2 border-slate-100 rounded-[24px] hover:border-[#202eac] transition-all text-left flex items-center justify-between group active:scale-95 shadow-sm">
                            <div className="flex flex-col">
                              <span className="text-[15px] font-black text-slate-800">{opt.name} {opt.isSuggested && <span className="ml-2 text-[10px] bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full">Recomendado</span>}</span>
                              <span className="text-[12px] text-slate-400 font-bold mt-1">{opt.items.map(i => `${i.quantity}x ${i.capacity}L`).join(' + ')}</span>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-[#202eac] group-hover:translate-x-1 transition-all" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {recentSimulations.length > 0 && (
                  <div className="pt-6 border-t border-slate-100 animate-in slide-in-from-bottom-4">
                    <div className="flex items-center gap-2 mb-5 ml-1"><History className="w-5 h-5 text-[#202eac]" /><h4 className="text-[11px] font-black text-slate-800 uppercase tracking-tight">Recentes</h4></div>
                    <div className="space-y-3">
                      {recentSimulations.map(sim => (
                        <div key={sim.id} className="p-4 bg-slate-50 border border-slate-100 rounded-3xl flex items-center justify-between hover:bg-white hover:shadow-lg transition-all border-l-4 border-l-[#202eac] group">
                          <div className="flex flex-col"><span className="text-[11px] font-black text-slate-700 leading-tight mb-1">{sim.displayName.split(' -- ')[1]}</span><span className="text-[9px] text-slate-400 font-bold">{new Date(sim.createdAt).toLocaleTimeString('pt-BR')}</span></div>
                          <span className="text-xs font-black text-[#202eac] group-hover:scale-110 transition-transform">{formatCurrency(sim.totalCost)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </aside>

            <main className="lg:col-span-8 space-y-10">
              <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-[#202eac] p-8 rounded-[48px] text-white flex flex-col justify-center shadow-2xl relative overflow-hidden group">
                  <div className="absolute -right-6 -bottom-6 opacity-10 group-hover:scale-110 transition-transform"><Scale className="w-32 h-32" /></div>
                  <span className="text-[11px] font-black uppercase tracking-widest opacity-80 mb-1">Custo Total Lote</span>
                  <div className="text-3xl font-black">{formatCurrency(totalCost)}</div>
                </div>
                <div className="bg-white p-8 rounded-[48px] border border-slate-200 flex flex-col justify-center shadow-xl ring-1 ring-slate-100 relative overflow-hidden group">
                  <div className="absolute -right-6 -bottom-6 opacity-5 group-hover:scale-110 transition-transform"><Calculator className="w-32 h-32 text-slate-900" /></div>
                  <span className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1">Produção Final</span>
                  <div className="text-3xl font-black text-slate-800">{currentBatchSize.toLocaleString('pt-BR')} <span className="text-lg opacity-30 ml-1">{calculationMode === 'volume' ? 'L/KG' : 'LITROS'}</span></div>
                </div>
                <div className="bg-[#202eac]/5 p-8 rounded-[48px] border border-blue-100 flex flex-col justify-center relative overflow-hidden group">
                  <div className="absolute -right-6 -bottom-6 opacity-5 group-hover:scale-110 transition-transform"><DollarSign className="w-32 h-32 text-[#202eac]" /></div>
                  <span className="text-[11px] font-black uppercase tracking-widest text-[#202eac] opacity-60 mb-1">Custo por Litro/Kg</span>
                   <div className="text-2xl font-black text-[#202eac]">{formatCurrency(totalCost / (currentBatchSize || 1))}<span className="text-lg opacity-30 ml-1">/L</span></div>
                </div>
                <div className="bg-emerald-50 p-8 rounded-[48px] border border-emerald-100 flex flex-col justify-center relative overflow-hidden group">
                   <div className="absolute -right-6 -bottom-6 opacity-5 group-hover:scale-110 transition-transform"><Beaker className="w-32 h-32 text-emerald-600" /></div>
                   <span className="text-[11px] font-black uppercase tracking-widest text-emerald-600 opacity-60 mb-1">Custo S/ Embalagem</span>
                   <div className="text-2xl font-black text-emerald-600">{formatCurrency(chemicalCost)}</div>
                </div>
              </section>

              <section className="bg-white rounded-[56px] border border-slate-200 shadow-2xl overflow-hidden flex flex-col ring-1 ring-slate-100">
                <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between"><h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Memorial de Composição Completo</h3></div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] shadow-sm">
                        <th className="py-7 px-10">Componente</th>
                        <th className="py-7 px-10 text-center">Quantidade</th>
                        <th className="py-7 px-10 text-center">% GERAL</th>
                        <th className="py-7 px-10 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {calculatedIngredients.ingredients.map((fi: any, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/40 transition-colors">
                          <td className="py-6 px-10"><span className="font-black text-slate-800 block text-lg">{fi.ingredients.name}</span>{fi.variants && <span className="text-[10px] text-[#202eac] font-black uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded-md mt-1 inline-block">Variante: {fi.variants.name}</span>}</td>
                          <td className="py-6 px-10 text-center font-mono text-sm font-black text-slate-700">{(fi.calculatedQuantity || 0).toLocaleString('pt-BR', { minimumFractionDigits: 3 })} {fi.ingredients.unit}</td>
                          <td className="py-6 px-10 text-center"><span className="font-mono text-xs font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">{(((fi.calculatedQuantity * (fi.variants?.cost_per_unit || fi.ingredients.cost_per_unit)) / (totalCost || 1)) * 100).toFixed(2)}%</span></td>
                          <td className="py-6 px-10 text-right font-mono text-sm font-black text-slate-900">{formatCurrency(fi.calculatedQuantity * (fi.variants?.cost_per_unit || (fi.ingredients.cost_per_unit || 0)))}</td>
                        </tr>
                      ))}
                      {calculatedIngredients.nonChemicalCosts.map((p, idx) => (
                        <tr key={`pkg-${idx}`} className="bg-slate-50/50 hover:bg-slate-100/50 transition-colors">
                          <td className="py-6 px-10"><span className="text-slate-700 flex items-center gap-3 text-lg font-black"><Box className="w-5 h-5 text-[#202eac]" /> {p.name}</span></td>
                          <td className="py-6 px-10 text-center text-slate-600 font-black">{p.quantity} UN</td>
                          <td className="py-6 px-10 text-center"><span className="font-mono text-xs font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">{((p.total / (totalCost || 1)) * 100).toFixed(2)}%</span></td>
                          <td className="py-6 px-10 text-right text-slate-800 font-black">{formatCurrency(p.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </main>
          </div>
        </div>
        {notification.show && <NotificationModal />}
      </div>
    );
  }

  // Gallery/List View
  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden font-sans">
      <header className="bg-white border-b border-slate-200 px-10 py-8 flex items-center justify-between shrink-0 z-20 shadow-xl">
        <div><h1 className="text-4xl font-black text-slate-800 tracking-tighter flex items-center gap-4 uppercase"><Beaker className="w-10 h-10 text-[#202eac]" /> Proporção</h1><p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.3em] mt-2">Inteligência Operacional Ohana Clean</p></div>
        <div className="flex items-center gap-6">
          <div className="relative w-80 group"><Search className="w-6 h-6 absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#202eac] transition-all" /><input type="text" placeholder="Pesquisar catálogo..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="bg-slate-100 border-2 border-transparent focus:border-[#202eac] focus:bg-white rounded-[24px] pl-16 pr-6 py-4.5 text-sm font-bold shadow-inner" /></div>
          <div className="flex bg-slate-100 p-1.5 rounded-[20px] shadow-inner">
            <button onClick={() => setViewMode('grid')} className={`p-3.5 rounded-2xl transition-all ${viewMode === 'grid' ? 'bg-white text-[#202eac] shadow-md' : 'text-slate-400'}`}><LayoutGrid className="w-6 h-6" /></button>
            <button onClick={() => setViewMode('list')} className={`p-3.5 rounded-2xl transition-all ${viewMode === 'list' ? 'bg-white text-[#202eac] shadow-md' : 'text-slate-400'}`}><List className="w-6 h-6" /></button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-12 bg-white/50">
        <div className="max-w-[1700px] mx-auto">
          {isLoading ? <div className="p-20 text-center font-black text-slate-300 text-3xl animate-pulse uppercase tracking-widest mt-20">Sincronizando Sistema...</div> : filteredFormulas.length === 0 ? <div className="bg-white rounded-[60px] border-4 border-dashed border-slate-100 p-40 text-center flex flex-col items-center gap-6 mt-10"><Beaker className="w-24 h-24 opacity-10" /><p className="font-black text-2xl text-slate-300 uppercase tracking-[0.2em]">Fórmula não localizada no catálogo</p></div> : (
            <div className={`grid gap-12 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
              {filteredFormulas.map(f => {
                const rawV = f.version || 'V1';
                const badge = rawV.startsWith('V') ? rawV : `V${rawV}`;
                return (
                  <div key={f.id} onClick={() => handleSelectFormula(f)} className="bg-white rounded-[64px] border border-slate-200 p-12 hover:shadow-[0_45px_100px_rgba(32,46,172,0.12)] hover:border-[#202eac]/60 transition-all cursor-pointer group relative overflow-hidden ring-1 ring-slate-100 active:scale-[0.98]">
                    <div className="absolute -right-12 -bottom-12 opacity-[0.04] group-hover:scale-[1.15] group-hover:rotate-12 transition-all duration-700"><Calculator className="w-56 h-56 text-[#202eac]" /></div>
                    <div className="flex items-center justify-between mb-10">
                      <span className="text-[11px] bg-[#202eac] text-white px-4 py-1.5 rounded-full font-black shadow-lg shadow-blue-100">{badge}</span>
                      <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{f.lm_code || 'LABORD'}</span>
                    </div>
                    <h3 className="text-3xl font-black text-slate-900 group-hover:text-[#202eac] mb-4 leading-tight transition-colors">{f.name}</h3>
                    <div className="flex items-center gap-6 text-[11px] font-black text-slate-400 mb-12 uppercase"><span className="flex items-center gap-2.5"><Beaker className="w-5 h-5 text-emerald-500" /> {f.base_volume}L</span><span className="flex items-center gap-2.5"><Scale className="w-5 h-5 text-[#202eac]" /> {f.formula_ingredients?.length || 0} Itens</span></div>
                    <div className="p-6 bg-slate-50 rounded-[32px] group-hover:bg-[#202eac] transition-all flex items-center justify-center gap-4 font-black group-hover:text-white group-hover:translate-y-[-6px] shadow-sm group-hover:shadow-2xl group-hover:shadow-blue-200"><Calculator className="w-6 h-6" /><span className="uppercase tracking-widest text-[11px]">Dimensionar</span><ChevronRight className="w-5 h-5 group-hover:translate-x-2 transition-all" /></div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {notification.show && <NotificationModal />}
    </div>
  );
}
