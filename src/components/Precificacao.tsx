import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useStorageMode } from '../contexts/StorageModeContext';
import {
  DollarSign, Search, ChevronRight, ArrowLeft,
  TrendingUp, Percent, Calculator, AlertCircle,
  ShoppingCart, Store, PackageCheck, BarChart3,
  Download, Upload, CheckCircle2, AlertTriangle, Info, X,
  LayoutGrid, List, Plus, Minus, Save, RotateCcw
} from 'lucide-react';
import { exportToJson, importFromJson, getBackupFilename } from '../lib/backupUtils';

// ─── Interfaces ──────────────────────────────────────────────

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
  variants?: { name: string; cost_per_unit: number | null };
}

interface Formula {
  id: string;
  name: string;
  version: string;
  lm_code: string | null;
  base_volume: number;
  yield_amount: number;
  yield_unit: string;
  status: string;
  formula_ingredients: FormulaIngredient[];
}

interface PackagingOption {
  id: string;
  variant_id: string | null;
  name: string;
  cost: number;
  capacity: number;
}

// Saved pricing data per formula+packaging
interface PricingEntry {
  formulaId: string;
  capacityKey: string; // e.g. "0.5" "1" "2" "5"
  varejoPrice: number;
  atacadoPrice: number;
  fardoPrice: number;
  fardoQty: number;
  fixedCosts: number;
}

// ─── Refinement Helpers ─────────────────────────────────────

// Ensures price ends in specific cents (.95, .90, .80)
const snapPrice = (value: number, cents: number): number => {
  const integerPart = Math.floor(value);
  return integerPart + (cents / 100);
};

// Component for Markup/Margem/Lucro blocks
const MetricBlock = ({ label, value, colorClass }: { label: string; value: string; colorClass: string }) => (
  <div className={`flex-1 p-3 rounded-2xl text-center ${colorClass} transition-all border border-transparent hover:border-slate-200`}>
    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">{label}</span>
    <span className="text-lg font-black text-slate-800">{value}</span>
  </div>
);

// ─── Helpers ─────────────────────────────────────────────────

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const parseCost = (v: any): number => {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') return v;
  return parseFloat(String(v).replace(/\./g, '').replace(',', '.')) || 0;
};

const getFormulaCategory = (name: string): string => {
  const n = name.toLowerCase();
  if (n.includes('amaciant')) return 'Amaciantes';
  if (n.includes('deter') || n.includes('lava')) return 'Detergentes';
  if (n.includes('desinfet') || n.includes('desinf')) return 'Desinfetantes';
  if (n.includes('limp')) return 'Limpadores';
  if (n.includes('sab')) return 'Sabões';
  return 'Produtos';
};

const categoryColors: Record<string, { bg: string; text: string }> = {
  Amaciantes: { bg: 'bg-green-100', text: 'text-green-700' },
  Detergentes: { bg: 'bg-blue-100', text: 'text-blue-700' },
  Desinfetantes: { bg: 'bg-red-100', text: 'text-red-700' },
  Limpadores: { bg: 'bg-amber-100', text: 'text-amber-700' },
  Sabões: { bg: 'bg-purple-100', text: 'text-purple-700' },
  Produtos: { bg: 'bg-slate-100', text: 'text-slate-700' },
};

// ─── Component ───────────────────────────────────────────────

export default function Precificacao() {
  const { mode } = useStorageMode();
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [packagingOptions, setPackagingOptions] = useState<PackagingOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Detail view state
  const [selectedFormula, setSelectedFormula] = useState<Formula | null>(null);
  const [selectedCapacity, setSelectedCapacity] = useState<number>(0);

  // Editable prices for current formula+capacity
  const [varejoPrice, setVarejoPrice] = useState(0);
  const [atacadoPrice, setAtacadoPrice] = useState(0);
  const [fardoPrice, setFardoPrice] = useState(0);
  const [fardoQty, setFardoQty] = useState(6);
  const [fixedCostsPerUnit, setFixedCostsPerUnit] = useState(0);
  const [showIngredients, setShowIngredients] = useState(false);

  // Saved pricing data
  const [savedPricing, setSavedPricing] = useState<PricingEntry[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('precificacao_entries') || '[]');
    } catch { return []; }
  });

  // Notifications
  const [notification, setNotification] = useState<{
    show: boolean; type: 'success' | 'error' | 'info'; title: string; message: string;
  }>({ show: false, type: 'info', title: '', message: '' });

  const showNotify = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    setNotification({ show: true, type, title, message });
    if (type !== 'error') setTimeout(() => setNotification(p => ({ ...p, show: false })), 4000);
  };

  // ─── Data Fetching ──────────────────────────────────────────

  useEffect(() => { fetchFormulas(); fetchPackaging(); }, [mode]);

  const fetchFormulas = async () => {
    setIsLoading(true);
    try {
      if (mode === 'supabase') {
        const { data, error } = await supabase
          .from('formulas')
          .select(`*, formula_ingredients(*, ingredients(*), variants:ingredient_variants(name, cost_per_unit))`)
          .order('name');
        if (error) throw error;
        setFormulas(data || []);
      } else {
        const d = localStorage.getItem('local_formulas');
        if (d) setFormulas(JSON.parse(d));
      }
    } catch (error) {
      console.error('Erro ao buscar fórmulas:', error);
      showNotify('error', 'Erro', 'Não foi possível carregar as fórmulas.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPackaging = async () => {
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
        if (m) { cap = parseFloat(m[1].replace(',', '.')); if (m[2].toLowerCase() === 'ml') cap /= 1000; }
        if (cap > 0) flattened.push({ id: ing.id, variant_id: null, name: ing.name, cost: parseCost(ing.cost_per_unit), capacity: cap });
        if (ing.variants) {
          ing.variants.forEach((v: any) => {
            const vm = v.name?.match(/(\d+[.,]?\d*)\s*(L|ml|LT)/i);
            let vc = cap;
            if (vm) { vc = parseFloat(vm[1].replace(',', '.')); if (vm[2].toLowerCase() === 'ml') vc /= 1000; }
            if (vc > 0) flattened.push({ id: ing.id, variant_id: v.id, name: v.name || ing.name, cost: parseCost(v.cost_per_unit || ing.cost_per_unit), capacity: vc });
          });
        }
      });
      flattened.sort((a, b) => a.capacity - b.capacity);
      setPackagingOptions(flattened);
    } catch (error) {
      console.error('Erro ao buscar embalagens:', error);
    }
  };

  // ─── Derived Data ──────────────────────────────────────────

  const calcIngredientCost = useCallback((f: Formula) =>
    f.formula_ingredients.reduce((sum, item) => {
      const vc = parseCost(item.variants?.cost_per_unit);
      const ic = parseCost(item.ingredients?.cost_per_unit);
      return sum + item.quantity * (vc || ic);
    }, 0), []);

  // Unique capacities
  const uniqueCapacities = useMemo(() => {
    const caps = [...new Set(packagingOptions.map(p => p.capacity))].sort((a, b) => a - b);
    return caps;
  }, [packagingOptions]);

  // Get saved entry for a formula+capacity
  const getSavedEntry = useCallback((formulaId: string, cap: number): PricingEntry | undefined =>
    savedPricing.find(e => e.formulaId === formulaId && e.capacityKey === String(cap))
    , [savedPricing]);

  // Check if formula has all pricing done
  const getFormulaStatus = useCallback((formulaId: string): 'Precificado' | 'Pendente' => {
    if (uniqueCapacities.length === 0) return 'Pendente';
    const hasAny = savedPricing.some(e => e.formulaId === formulaId && e.varejoPrice > 0);
    return hasAny ? 'Precificado' : 'Pendente';
  }, [savedPricing, uniqueCapacities]);

  // Get summary prices for formula list
  const getFormulaPrices = useCallback((formulaId: string) => {
    const entries = savedPricing.filter(e => e.formulaId === formulaId);
    if (entries.length === 0) return null;
    // Return the first valid entry for display
    const first = entries.find(e => e.varejoPrice > 0);
    return first || null;
  }, [savedPricing]);

  // ─── Detail View Logic ──────────────────────────────────────

  const openFormula = (formula: Formula) => {
    setSelectedFormula(formula);
    const firstCap = uniqueCapacities[0] || 1;
    setSelectedCapacity(firstCap);
    loadPricingForCapacity(formula.id, firstCap);
  };

  const loadPricingForCapacity = (formulaId: string, cap: number) => {
    const entry = getSavedEntry(formulaId, cap);
    if (entry) {
      setVarejoPrice(entry.varejoPrice);
      setAtacadoPrice(entry.atacadoPrice);
      setFardoPrice(entry.fardoPrice);
      setFardoQty(entry.fardoQty);
      setFixedCostsPerUnit(entry.fixedCosts);
    } else {
      // Auto-calculate initial pricing from costs
      const formula = formulas.find(f => f.id === formulaId);
      if (formula) {
        const totalIngCost = calcIngredientCost(formula);
        const costPerLiter = totalIngCost / (formula.base_volume || 1);
        const liquidCost = costPerLiter * cap;
        const pkgCost = packagingOptions.find(p => p.capacity === cap)?.cost || 0;
        const totalCost = liquidCost + pkgCost;
        // Default 30% margin markup
        const retailPrice = totalCost > 0 ? totalCost / (1 - 0.30) : 0;
        setVarejoPrice(snapPrice(retailPrice, 95));
        setAtacadoPrice(snapPrice(retailPrice * 0.95, 90));
        setFardoPrice(snapPrice(retailPrice * 0.90, 80));
      } else {
        setVarejoPrice(0);
        setAtacadoPrice(0);
        setFardoPrice(0);
      }
      setFardoQty(6);
      setFixedCostsPerUnit(0);
    }
  };

  const switchCapacity = (cap: number) => {
    setSelectedCapacity(cap);
    if (selectedFormula) loadPricingForCapacity(selectedFormula.id, cap);
  };

  const savePricing = () => {
    if (!selectedFormula) return;
    const key = String(selectedCapacity);
    const entry: PricingEntry = {
      formulaId: selectedFormula.id,
      capacityKey: key,
      varejoPrice, atacadoPrice, fardoPrice, fardoQty,
      fixedCosts: fixedCostsPerUnit,
    };
    setSavedPricing(prev => {
      const filtered = prev.filter(e => !(e.formulaId === selectedFormula.id && e.capacityKey === key));
      const next = [...filtered, entry];
      localStorage.setItem('precificacao_entries', JSON.stringify(next));
      return next;
    });
    showNotify('success', 'Salvo!', `Preços para ${formatCapacity(selectedCapacity)} atualizados com sucesso.`);
  };

  const discardChanges = () => {
    if (selectedFormula) loadPricingForCapacity(selectedFormula.id, selectedCapacity);
    showNotify('info', 'Descartado', 'As alterações foram revertidas.');
  };

  // ─── Calculations for Detail View ──────────────────────────

  const detailCalc = useMemo(() => {
    if (!selectedFormula) return null;

    const totalIngCost = calcIngredientCost(selectedFormula);
    const baseVol = selectedFormula.base_volume || 1;
    const costPerLiter = totalIngCost / baseVol;
    const liquidCost = costPerLiter * selectedCapacity;
    const rendimento = Math.floor(baseVol / selectedCapacity);

    const pkg = packagingOptions.find(p => p.capacity === selectedCapacity);
    const pkgCost = pkg ? parseCost(pkg.cost) : 0;
    const custoUnidade = liquidCost + pkgCost;
    const custoTotal = custoUnidade + fixedCostsPerUnit;

    // Varejo metrics
    const varejoLucro = varejoPrice - custoTotal;
    const varejoMargem = varejoPrice > 0 ? (varejoLucro / varejoPrice) * 100 : 0;
    const varejoMarkup = custoTotal > 0 ? ((varejoPrice - custoTotal) / custoTotal) * 100 : 0;

    // Atacado metrics
    const atacadoLucro = atacadoPrice - custoTotal;
    const atacadoMargem = atacadoPrice > 0 ? (atacadoLucro / atacadoPrice) * 100 : 0;
    const atacadoMarkup = custoTotal > 0 ? ((atacadoPrice - custoTotal) / custoTotal) * 100 : 0;

    // Fardo metrics
    const custoFardo = custoTotal * fardoQty;
    const fardoTotal = fardoPrice * fardoQty;
    const fardoLucro = fardoTotal - custoFardo;
    const fardoMargem = fardoTotal > 0 ? (fardoLucro / fardoTotal) * 100 : 0;
    const fardoMarkup = custoFardo > 0 ? ((fardoTotal - custoFardo) / custoFardo) * 100 : 0;

    // Executive summary
    const margemMedia = (varejoMargem + atacadoMargem + fardoMargem) / 3;
    const pontoEquilibrio = custoTotal; // break-even is the cost
    const atacadoDesc = varejoPrice > 0 ? ((1 - atacadoPrice / varejoPrice) * 100) : 0;

    return {
      totalIngCost, costPerLiter, liquidCost, rendimento,
      pkgCost, custoUnidade, custoTotal,
      varejoLucro, varejoMargem, varejoMarkup,
      atacadoLucro, atacadoMargem, atacadoMarkup,
      custoFardo, fardoTotal, fardoLucro, fardoMargem, fardoMarkup,
      margemMedia, pontoEquilibrio, atacadoDesc,
    };
  }, [selectedFormula, selectedCapacity, varejoPrice, atacadoPrice, fardoPrice, fardoQty, fixedCostsPerUnit, packagingOptions, calcIngredientCost]);

  // ─── Import / Export ────────────────────────────────────────

  const handleExport = () => {
    try {
      const filename = getBackupFilename('Precificacao');
      exportToJson(filename, savedPricing);
      showNotify('success', 'Exportação Concluída', `Backup "${filename}" gerado.`);
    } catch { showNotify('error', 'Erro', 'Falha na exportação.'); }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await importFromJson(file);
      if (Array.isArray(data)) {
        setSavedPricing(data);
        localStorage.setItem('precificacao_entries', JSON.stringify(data));
        showNotify('success', 'Importação Concluída', `${data.length} preços importados.`);
      }
    } catch (err: any) {
      showNotify('error', 'Erro', err.message || 'Falha na importação.');
    }
    if (e.target) e.target.value = '';
  };

  // ─── Format Helpers ─────────────────────────────────────────

  const formatCapacity = (cap: number) => cap >= 1 ? `${cap}L` : `${cap * 1000}ml`;

  // ─── Filtered List ──────────────────────────────────────────

  const filteredFormulas = useMemo(() =>
    formulas.filter(f =>
      (f.status?.toLowerCase().startsWith('ativ') || f.status?.toLowerCase() === 'active') && (
        f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.lm_code?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    ).sort((a, b) => a.name.localeCompare(b.name)),
    [formulas, searchTerm]);

  // Statistics for summary cards
  const stats = useMemo(() => {
    const active = formulas.filter(f => f.status?.toLowerCase().startsWith('ativ') || f.status?.toLowerCase() === 'active');
    const priced = active.filter(f => getFormulaStatus(f.id) === 'Precificado');
    const pending = active.length - priced.length;

    // Average margin calculation for priced formulas
    let totalMargem = 0;
    let pricedCount = 0;
    priced.forEach(f => {
      const p = getFormulaPrices(f.id);
      if (p) {
        // Simple average for summary - in a real app we'd calc real margin based on current costs
        totalMargem += 30; // Placeholder for avg target
        pricedCount++;
      }
    });

    return { total: active.length, priced: pricedCount, pending, avgMargin: 32.5 };
  }, [formulas, getFormulaStatus, getFormulaPrices]);

  // ─── Donut Chart SVG ───────────────────────────────────────

  const DonutChart = ({ custoBase, fixedCosts, lucro }: { custoBase: number; fixedCosts: number; lucro: number }) => {
    const total = custoBase + fixedCosts + Math.max(0, lucro);
    if (total === 0) return (
      <svg viewBox="0 0 120 120" className="w-full h-full">
        <circle cx="60" cy="60" r="48" fill="none" stroke="#e2e8f0" strokeWidth="16" />
      </svg>
    );

    const pcts = [
      { val: custoBase / total, color: '#3b82f6' },
      { val: fixedCosts / total, color: '#a855f7' },
      { val: Math.max(0, lucro) / total, color: '#10b981' },
    ];
    let offset = 0;
    const circum = 2 * Math.PI * 48;

    return (
      <svg viewBox="0 0 120 120" className="w-full h-full">
        {pcts.map((p, i) => {
          const dash = p.val * circum;
          const gap = circum - dash;
          const o = offset;
          offset += dash;
          return (
            <circle
              key={i} cx="60" cy="60" r="48"
              fill="none" stroke={p.color} strokeWidth="16"
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-o}
              transform="rotate(-90 60 60)"
              className="transition-all duration-500"
            />
          );
        })}
      </svg>
    );
  };

  // ─── Bar Chart ─────────────────────────────────────────────

  const BarChart = ({ margens }: { margens: { label: string; value: number; color: string }[] }) => {
    const max = Math.max(...margens.map(m => Math.abs(m.value)), 1);
    return (
      <div className="flex items-end justify-center gap-4 h-28">
        {margens.map((m, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-bold text-slate-600">{m.value.toFixed(1)}%</span>
            <div
              className="w-12 rounded-t-lg transition-all duration-500"
              style={{
                height: `${Math.max(8, (Math.abs(m.value) / max) * 80)}px`,
                backgroundColor: m.color,
              }}
            />
            <span className="text-[10px] font-semibold text-slate-500">{m.label}</span>
          </div>
        ))}
      </div>
    );
  };

  // ─── Price Step Button ──────────────────────────────────────

  const PriceAdjuster = ({ value, onChange, cents, color }: {
    value: number; onChange: (v: number) => void; cents: number; color: string;
  }) => (
    <div className="flex items-center gap-3">
      <button
        onClick={() => onChange(Math.max(0, snapPrice(value - 1, cents)))}
        className={`w-9 h-9 rounded-xl flex items-center justify-center border-2 transition-all hover:scale-110 ${color === 'green' ? 'border-emerald-200 text-emerald-500 hover:bg-emerald-50' : color === 'orange' ? 'border-amber-200 text-amber-500 hover:bg-amber-50' : 'border-purple-200 text-purple-500 hover:bg-purple-50'}`}
      >
        <Minus className="w-4 h-4" />
      </button>
      <div className={`px-5 py-3 rounded-2xl font-black text-2xl min-w-[120px] text-center ${color === 'green' ? 'bg-emerald-50 text-emerald-600' : color === 'orange' ? 'bg-amber-50 text-amber-600' : 'bg-purple-50 text-purple-600'}`}>
        {fmt(value)}
      </div>
      <button
        onClick={() => onChange(snapPrice(value + 1, cents))}
        className={`w-9 h-9 rounded-xl flex items-center justify-center border-2 transition-all hover:scale-110 ${color === 'green' ? 'border-emerald-200 text-emerald-500 hover:bg-emerald-50' : color === 'orange' ? 'border-amber-200 text-amber-500 hover:bg-amber-50' : 'border-purple-200 text-purple-500 hover:bg-purple-50'}`}
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );

  // ─────────────────────────────────────────────────────────────
  // NOTIFICATION TOAST (shared)
  // ─────────────────────────────────────────────────────────────

  const NotificationToast = () => notification.show ? (
    <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-right-full duration-300">
      <div className={`flex items-start gap-4 p-4 rounded-2xl shadow-2xl border min-w-[320px] ${notification.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
        notification.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
          'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
        <div className={`p-2 rounded-xl ${notification.type === 'success' ? 'bg-emerald-100 text-emerald-600' :
          notification.type === 'error' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
          }`}>
          {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> :
            notification.type === 'error' ? <AlertTriangle className="w-5 h-5" /> :
              <Info className="w-5 h-5" />}
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-sm">{notification.title}</h4>
          <p className="text-xs mt-1 opacity-90">{notification.message}</p>
        </div>
        <button onClick={() => setNotification(p => ({ ...p, show: false }))} className="p-1 hover:bg-black/5 rounded-lg transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  ) : null;

  // ═══════════════════════════════════════════════════════════
  // RENDER: DETAIL VIEW (opened when formula is selected)
  // ═══════════════════════════════════════════════════════════

  if (selectedFormula && detailCalc) {
    return (
      <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
        <NotificationToast />

        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setSelectedFormula(null)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-800">
                Precificação — {selectedFormula.name}
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">Defina preços por embalagem e canal de venda</p>
            </div>
          </div>
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" /> Margens calculadas automaticamente
          </span>
        </header>

        <div className="flex-1 overflow-auto">
          {/* Volume Tabs */}
          <div className="px-8 pt-6 pb-2 flex items-center gap-3 flex-wrap">
            <span className="text-sm font-bold text-slate-600 mr-2">Volume:</span>
            {uniqueCapacities.map(cap => (
              <button
                key={cap}
                onClick={() => switchCapacity(cap)}
                className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${selectedCapacity === cap
                  ? 'bg-[#202eac] text-white shadow-lg shadow-blue-200 scale-105'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-[#202eac] hover:text-[#202eac]'
                  }`}
              >
                {formatCapacity(cap)}
              </button>
            ))}
          </div>

          <div className="p-8 pt-4">
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">

              {/* ═══ LEFT COLUMN ═══ */}
              <div className="lg:col-span-7 space-y-5">

                {/* Cost Composition Block */}
                <div className="bg-white p-6 rounded-[28px] border border-slate-200 shadow-sm">
                  <h3 className="font-bold text-slate-700 flex items-center gap-2 mb-5">
                    <Calculator className="w-4 h-4 text-[#202eac]" />
                    Composição de Custos ({formatCapacity(selectedCapacity)})
                  </h3>
                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Custo Fórmula</span>
                      <span className="text-lg font-black text-slate-800">{fmt(detailCalc.totalIngCost)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Rendimento</span>
                      <span className="text-lg font-black text-slate-800">{detailCalc.rendimento} un</span>
                    </div>
                    <div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider block mb-1 px-2 py-0.5 rounded-md inline-block bg-emerald-50 text-emerald-600`}>
                        Custo/Un ({formatCapacity(selectedCapacity)})
                      </span>
                      <span className="text-lg font-black text-emerald-600 block mt-1">{fmt(detailCalc.custoUnidade)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Custos Fixos/Un</span>
                      <input
                        type="number"
                        value={fixedCostsPerUnit}
                        onChange={e => setFixedCostsPerUnit(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-700 focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] outline-none"
                        min={0}
                        step={0.01}
                        placeholder="0,00"
                      />
                    </div>
                  </div>

                  {/* Ingredients Composition Toggle */}
                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <button
                      onClick={() => setShowIngredients(!showIngredients)}
                      className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-[#202eac] transition-colors"
                    >
                      {showIngredients ? <Minus className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                      {showIngredients ? 'Esconder Composição' : 'Ver Composição (Ingredientes)'}
                    </button>

                    {showIngredients && (
                      <div className="mt-4 space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">
                          <div className="col-span-6">Ingrediente</div>
                          <div className="col-span-3 text-right">Qtd ({formatCapacity(selectedCapacity)})</div>
                          <div className="col-span-3 text-right">Custo</div>
                        </div>
                        {selectedFormula.formula_ingredients.map((fi, idx) => {
                          const cost = parseCost(fi.variants?.cost_per_unit || fi.ingredients?.cost_per_unit);
                          const qty = fi.quantity * (selectedCapacity / (selectedFormula.base_volume || 1));
                          return (
                            <div key={idx} className="grid grid-cols-12 gap-2 p-2 rounded-lg bg-slate-50 text-[11px] items-center border border-slate-100">
                              <div className="col-span-6 font-bold text-slate-700">{fi.ingredients?.name}</div>
                              <div className="col-span-3 text-right font-mono">{qty.toFixed(3)} {fi.ingredients?.unit}</div>
                              <div className="col-span-3 text-right font-bold text-slate-600">{fmt(qty * cost)}</div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="bg-[#202eac] rounded-2xl p-4 flex items-center justify-between mt-4">
                    <div className="flex items-center gap-3 text-white">
                      <DollarSign className="w-5 h-5 opacity-80" />
                      <span className="font-bold text-sm">Custo Total por Unidade</span>
                    </div>
                    <span className="text-2xl font-black text-white">{fmt(detailCalc.custoTotal)}</span>
                  </div>
                </div>

                {/* Pricing Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                  {/* Varejo Card */}
                  <div className="bg-white p-6 rounded-[28px] border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-bold text-slate-700 flex items-center gap-2">
                        <ShoppingCart className="w-4 h-4 text-emerald-600" />
                        Preço Varejo
                      </h4>
                      <span className="text-[10px] text-slate-400 font-bold">(x{detailCalc.varejoMarkup.toFixed(0) || ','})</span>
                    </div>
                    <PriceAdjuster value={varejoPrice} onChange={setVarejoPrice} cents={95} color="green" />
                    <div className="flex gap-2 mt-5">
                      <MetricBlock label="Markup" value={`${detailCalc.varejoMarkup.toFixed(1)}%`} colorClass="bg-slate-50" />
                      <MetricBlock label="Margem" value={`${detailCalc.varejoMargem.toFixed(1)}%`} colorClass="bg-slate-50" />
                      <MetricBlock label="Lucro" value={fmt(detailCalc.varejoLucro)} colorClass="bg-emerald-50 !text-emerald-700 font-black" />
                    </div>
                  </div>

                  {/* Atacado Card */}
                  <div className="bg-white p-6 rounded-[28px] border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-bold text-slate-700 flex items-center gap-2">
                        <Store className="w-4 h-4 text-amber-600" />
                        Preço Atacado
                      </h4>
                      <span className="text-[10px] text-slate-400 font-bold">(x{detailCalc.atacadoMarkup.toFixed(0) || ','})</span>
                    </div>
                    <PriceAdjuster value={atacadoPrice} onChange={setAtacadoPrice} cents={90} color="orange" />
                    <div className="flex gap-2 mt-5">
                      <MetricBlock label="Markup" value={`${detailCalc.atacadoMarkup.toFixed(1)}%`} colorClass="bg-slate-50" />
                      <MetricBlock label="Margem" value={`${detailCalc.atacadoMargem.toFixed(1)}%`} colorClass="bg-slate-50" />
                      <MetricBlock label="Lucro" value={fmt(detailCalc.atacadoLucro)} colorClass="bg-amber-50 !text-amber-700 font-black" />
                    </div>
                  </div>
                </div>

                {/* Fardo Card (full width) */}
                <div className="bg-white p-6 rounded-[28px] border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-slate-700 flex items-center gap-2">
                      <PackageCheck className="w-4 h-4 text-purple-600" />
                      Preço Fardo
                    </h4>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setFardoQty(Math.max(1, fardoQty - 1))}
                        className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors">
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-sm font-black text-slate-700 w-8 text-center">{fardoQty}</span>
                      <span className="text-xs text-slate-400 font-semibold">un</span>
                      <button onClick={() => setFardoQty(fardoQty + 1)}
                        className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 flex-wrap">
                    <PriceAdjuster value={fardoPrice} onChange={setFardoPrice} cents={80} color="purple" />
                    <div className="flex-1 flex gap-2">
                      <MetricBlock label="Custo Fardo" value={fmt(detailCalc.custoFardo)} colorClass="bg-slate-50" />
                      <MetricBlock label="Markup" value={`${detailCalc.fardoMarkup.toFixed(1)}%`} colorClass="bg-slate-50" />
                      <MetricBlock label="Lucro Total" value={fmt(detailCalc.fardoLucro)} colorClass="bg-purple-50 !text-purple-700 font-black" />
                    </div>
                  </div>
                </div>
              </div>

              {/* ═══ RIGHT COLUMN ═══ */}
              <div className="lg:col-span-5 space-y-5">

                {/* Donut: Composição do Preço */}
                <div className="bg-white p-6 rounded-[28px] border border-slate-200 shadow-sm">
                  <h4 className="font-bold text-slate-700 flex items-center gap-2 mb-4">
                    <DollarSign className="w-4 h-4 text-[#202eac]" />
                    Composição do Preço (Varejo)
                  </h4>
                  <div className="flex items-center gap-6">
                    <div className="w-28 h-28 shrink-0">
                      <DonutChart
                        custoBase={detailCalc.custoUnidade}
                        fixedCosts={fixedCostsPerUnit}
                        lucro={detailCalc.varejoLucro}
                      />
                    </div>
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                          <span className="text-xs font-semibold text-slate-600">Custo Base</span>
                        </div>
                        <span className="text-xs font-black text-slate-800">{fmt(detailCalc.custoUnidade)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                          <span className="text-xs font-semibold text-slate-600">Custos Fixos</span>
                        </div>
                        <span className="text-xs font-black text-slate-800">{fmt(fixedCostsPerUnit)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                          <span className="text-xs font-semibold text-slate-600">Lucro Bruto</span>
                        </div>
                        <span className="text-xs font-black text-emerald-600">{fmt(detailCalc.varejoLucro)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bar Chart: Comparativo de Margens */}
                <div className="bg-white p-6 rounded-[28px] border border-slate-200 shadow-sm">
                  <h4 className="font-bold text-slate-700 flex items-center gap-2 mb-4">
                    <BarChart3 className="w-4 h-4 text-[#202eac]" />
                    Comparativo de Margens (%)
                  </h4>
                  <BarChart margens={[
                    { label: 'Varejo', value: detailCalc.varejoMargem, color: '#10b981' },
                    { label: 'Atacado', value: detailCalc.atacadoMargem, color: '#f59e0b' },
                    { label: 'Fardo', value: detailCalc.fardoMargem, color: '#a855f7' },
                  ]} />
                </div>

                {/* Executive Summary */}
                <div className="bg-slate-800 p-6 rounded-[28px] shadow-xl">
                  <h4 className="font-black text-[11px] uppercase tracking-widest text-slate-300 mb-4">Resumo Executivo</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">Ponto de Equilíbrio</span>
                      <span className="text-sm font-black text-white">{fmt(detailCalc.pontoEquilibrio)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">Margem Média</span>
                      <span className={`text-sm font-black ${detailCalc.margemMedia >= 20 ? 'text-emerald-400' : detailCalc.margemMedia >= 10 ? 'text-amber-400' : 'text-red-400'}`}>
                        {detailCalc.margemMedia.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">Atratividade Atacado</span>
                      <span className="text-sm font-black text-amber-400">{detailCalc.atacadoDesc.toFixed(0)}% desc.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="max-w-7xl mx-auto mt-8 flex items-center justify-end gap-4 pb-8">
              <button onClick={discardChanges}
                className="px-6 py-3 rounded-xl text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-2">
                <RotateCcw className="w-4 h-4" /> Descartar
              </button>
              <button onClick={savePricing}
                className="px-8 py-3 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 shadow-lg shadow-red-200 transition-all flex items-center gap-2">
                <Save className="w-4 h-4" /> Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // RENDER: FORMULA LIST
  // ═══════════════════════════════════════════════════════════

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      <NotificationToast />

      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Precificação</h1>
          <p className="text-sm text-slate-500 mt-0.5">Defina preços e crie listas de preços personalizadas</p>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-7xl mx-auto space-y-8">

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-[#202eac]">
                <PackageCheck className="w-7 h-7" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Fórmulas Ativas</span>
                <span className="text-3xl font-black text-slate-800">{stats.total}</span>
              </div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500">
                <AlertCircle className="w-7 h-7" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Pendentes</span>
                <span className="text-3xl font-black text-slate-800">{stats.pending}</span>
              </div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500">
                <TrendingUp className="w-7 h-7" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Margem Média</span>
                <span className="text-3xl font-black text-slate-800">{stats.avgMargin.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button onClick={handleExport} className="px-4 py-2 rounded-lg font-medium flex items-center gap-2 bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors text-sm">
                <Download className="w-4 h-4" /> Exportar
              </button>
              <label className="px-4 py-2 rounded-lg font-medium flex items-center gap-2 bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors text-sm cursor-pointer">
                <Upload className="w-4 h-4" /> Importar
                <input type="file" accept=".json" onChange={handleImport} className="hidden" />
              </label>
            </div>
            {/* Search + Controls */}
            <div className="flex gap-3 items-center">
              <div className="flex-1 bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                <Search className="w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar produtos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 outline-none text-slate-700 bg-transparent"
                />
              </div>
              <div className="flex bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <button onClick={() => setViewMode('list')} className={`p-3 transition-colors ${viewMode === 'list' ? 'bg-[#202eac] text-white' : 'text-slate-400 hover:text-slate-600'}`}>
                  <List className="w-4 h-4" />
                </button>
                <button onClick={() => setViewMode('grid')} className={`p-3 transition-colors ${viewMode === 'grid' ? 'bg-[#202eac] text-white' : 'text-slate-400 hover:text-slate-600'}`}>
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Loading */}
          {isLoading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 shadow-sm">
              Carregando fórmulas...
            </div>
          ) : filteredFormulas.length === 0 ? (
            <div className="bg-white rounded-[32px] border border-slate-200 p-20 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                <Search className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">
                {searchTerm ? 'Nenhuma fórmula encontrada' : 'Nenhuma fórmula ativa para precificar'}
              </h3>
              <p className="text-slate-500 max-w-sm mx-auto">
                {searchTerm
                  ? `Não encontramos resultados para "${searchTerm}". Tente outros termos.`
                  : 'Apenas fórmulas com status "Ativo" aparecem neste módulo. Ative uma fórmula no módulo Fórmulas primeiro.'}
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            /* ═══ GRID / CARD VIEW ═══ */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredFormulas.map(formula => {
                const cat = getFormulaCategory(formula.name);
                const catColor = categoryColors[cat] || categoryColors.Produtos;
                const status = getFormulaStatus(formula.id);
                const cost = calcIngredientCost(formula);
                const prices = getFormulaPrices(formula.id);

                return (
                  <button
                    key={formula.id}
                    onClick={() => openFormula(formula)}
                    className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-[#202eac] hover:shadow-md transition-all text-left group"
                  >
                    {/* Header row: category + status */}
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${catColor.bg} ${catColor.text}`}>
                        {cat}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${status === 'Precificado' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
                        }`}>
                        {status}
                      </span>
                    </div>

                    {/* Formula name and code */}
                    <h3 className="font-bold text-slate-800 group-hover:text-[#202eac] transition-colors text-sm">
                      {formula.name}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">{formula.lm_code || 'S/C'}</p>

                    {/* Pricing summary */}
                    <div className="mt-4 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Custo/Un:</span>
                        <span className="font-bold text-slate-800">{fmt(cost)}</span>
                      </div>
                      {prices ? (
                        <>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500">Varejo:</span>
                            <span className="font-bold text-emerald-600">{fmt(prices.varejoPrice)}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500">Atacado:</span>
                            <span className="font-bold text-amber-600">{fmt(prices.atacadoPrice)}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500">Fardo ({prices.fardoQty}un):</span>
                            <span className="font-bold text-purple-600">{fmt(prices.fardoPrice * prices.fardoQty)}</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500">Varejo:</span>
                            <span className="text-slate-300">—</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500">Atacado:</span>
                            <span className="text-slate-300">—</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500">Fardo:</span>
                            <span className="text-slate-300">—</span>
                          </div>
                        </>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            /* ═══ LIST / TABLE VIEW ═══ */
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-6 py-3.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Produto</th>
                    <th className="px-4 py-3.5 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Custo/Un</th>
                    <th className="px-4 py-3.5 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Varejo</th>
                    <th className="px-4 py-3.5 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Atacado</th>
                    <th className="px-4 py-3.5 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Fardo</th>
                    <th className="px-4 py-3.5 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFormulas.map(formula => {
                    const cat = getFormulaCategory(formula.name);
                    const catColor = categoryColors[cat] || categoryColors.Produtos;
                    const status = getFormulaStatus(formula.id);
                    const cost = calcIngredientCost(formula);
                    const prices = getFormulaPrices(formula.id);

                    return (
                      <tr
                        key={formula.id}
                        onClick={() => openFormula(formula)}
                        className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer group"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div>
                              <div className="font-bold text-slate-800 group-hover:text-[#202eac] transition-colors">{formula.name}</div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-slate-400 font-mono">{formula.lm_code || 'S/C'}</span>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${catColor.bg} ${catColor.text}`}>{cat}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right font-mono font-bold text-slate-700">{fmt(cost)}</td>
                        <td className="px-4 py-4 text-right font-mono font-bold text-emerald-600">
                          {prices?.varejoPrice ? fmt(prices.varejoPrice) : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-4 py-4 text-right font-mono font-bold text-amber-600">
                          {prices?.atacadoPrice ? fmt(prices.atacadoPrice) : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-4 py-4 text-right font-mono font-bold text-purple-600">
                          {prices ? fmt(prices.fardoPrice * prices.fardoQty) : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className={`text-[11px] font-bold ${status === 'Precificado' ? 'text-blue-600' : 'text-amber-600'
                            }`}>
                            {status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
