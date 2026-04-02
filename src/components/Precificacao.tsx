import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useStorageMode } from '../contexts/StorageModeContext';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  DollarSign, Search, ChevronRight, ArrowLeft,
  TrendingUp, Percent, Calculator, AlertCircle,
  ShoppingCart, Store, PackageCheck, BarChart3,
  Download, Upload, CheckCircle2, AlertTriangle, Info, X,
  LayoutGrid, List, Plus, Minus, Save, RotateCcw, ArrowDownAZ, ArrowUpZA, GripVertical, Settings, Package
} from 'lucide-react';
import { exportToJson, importFromJson, getBackupFilename } from '../lib/backupUtils';
import { useToast } from './dashboard/Toast';

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
  group_id?: string;
  groups?: { name: string };
  packaging_variant_id?: string;
  label_variant_id?: string;
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
  updatedAt?: string; // Data de atualização
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

// ─── Interfaces for Column Configuration ───────────────────────────

interface ColumnConfig {
  id: string;
  label: string;
  visible: boolean;
}

// ─── Sortable Header Component ───────────────────────────────────

interface SortableHeaderProps {
  id: string;
  label: string;
  sortColumn: string;
  sortOrder: 'asc' | 'desc';
  onSort: (column: any) => void;
}

function SortableHeader({ id, label, sortColumn, sortOrder, onSort }: SortableHeaderProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 'auto',
  };

  const getTextAlign = () => 'text-center';
  const getPadding = () => 'px-3';

  return (
    <th
      ref={setNodeRef}
      style={style}
      className={`${getPadding()} py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 select-none text-center`}
      onClick={() => onSort(id)}
    >
      <div className="flex items-center justify-center gap-2">
        <span
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500"
        >
          <GripVertical className="w-3 h-3" />
        </span>
        <span>
          {label} {sortColumn === id && (sortOrder === 'asc' ? '↑' : '↓')}
        </span>
      </div>
    </th>
  );
}

// ─── Column Settings Modal Component ────────────────────────────

interface ColumnSettingsModalProps {
  columns: ColumnConfig[];
  onToggleVisibility: (id: string) => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
  onReset: () => void;
  onClose: () => void;
}

function ColumnSettingsModal({ columns, onToggleVisibility, onMove, onReset, onClose }: ColumnSettingsModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-800">Configurar Colunas</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-5 space-y-2 max-h-[60vh] overflow-y-auto">
          {columns.map((col, index) => (
            <div
              key={col.id}
              className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors"
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={col.visible}
                  onChange={() => onToggleVisibility(col.id)}
                  className="w-4 h-4 rounded border-slate-300 text-[#202eac] focus:ring-[#202eac]"
                />
                <span className={`text-sm font-medium ${col.visible ? 'text-slate-700' : 'text-slate-400'}`}>
                  {col.label}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onMove(col.id, 'up')}
                  disabled={index === 0}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ArrowUpZA className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onMove(col.id, 'down')}
                  disabled={index === columns.length - 1}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ArrowDownAZ className="w-4 h-4 rotate-180" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="p-5 border-t border-slate-100 flex justify-center">
          <button
            onClick={onReset}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-[#202eac] transition-colors"
          >
            Resetar para Padrão
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────

export default function Precificacao() {
  const { showToast } = useToast();
  const { mode } = useStorageMode();
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [packagingOptions, setPackagingOptions] = useState<PackagingOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  // Sorting state
  const [sortColumn, setSortColumn] = useState<'name' | 'version' | 'group' | 'lm_code' | 'cost' | 'varejo' | 'atacado' | 'status'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (column: typeof sortColumn) => {
    if (sortColumn === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortOrder('asc');
    }
  };

  // Column configuration state
  const DEFAULT_COLUMNS: ColumnConfig[] = [
    { id: 'name', label: 'Produto', visible: true },
    { id: 'version', label: 'Versão', visible: true },
    { id: 'group', label: 'Grupo', visible: true },
    { id: 'lm_code', label: 'Código', visible: true },
    { id: 'cost', label: 'Custo/L', visible: true },
    { id: 'varejo', label: 'Varejo', visible: true },
    { id: 'atacado', label: 'Atacado', visible: true },
    { id: 'status', label: 'Status', visible: true },
  ];

  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    try {
      const saved = localStorage.getItem('precificacao_columns');
      return saved ? JSON.parse(saved) : DEFAULT_COLUMNS;
    } catch { return DEFAULT_COLUMNS; }
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Save columns to localStorage when changed
  useEffect(() => {
    localStorage.setItem('precificacao_columns', JSON.stringify(columns));
  }, [columns]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleColumnDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setColumns((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over?.id);
        const newItems = [...items];
        const [moved] = newItems.splice(oldIndex, 1);
        newItems.splice(newIndex, 0, moved);
        return newItems;
      });
    }
  };

  const toggleColumnVisibility = (id: string) => {
    setColumns(cols => cols.map(c => c.id === id ? { ...c, visible: !c.visible } : c));
  };

  const moveColumn = (id: string, direction: 'up' | 'down') => {
    setColumns(cols => {
      const index = cols.findIndex(c => c.id === id);
      if (index === -1) return cols;
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= cols.length) return cols;
      const newCols = [...cols];
      [newCols[index], newCols[newIndex]] = [newCols[newIndex], newCols[index]];
      return newCols;
    });
  };

  const resetColumns = () => {
    setColumns(DEFAULT_COLUMNS);
  };

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



  // ─── Data Fetching ──────────────────────────────────────────

  useEffect(() => { fetchFormulas(); fetchPackaging(); }, [mode]);

  const fetchFormulas = async () => {
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
      showToast('error', 'Erro', 'Não foi possível carregar as fórmulas.');
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
      updatedAt: new Date().toISOString(),
    };
    setSavedPricing(prev => {
      const filtered = prev.filter(e => !(e.formulaId === selectedFormula.id && e.capacityKey === key));
      const next = [...filtered, entry];
      localStorage.setItem('precificacao_entries', JSON.stringify(next));
      return next;
    });
    showToast('success', 'Salvo!', `Preços para ${formatCapacity(selectedCapacity)} atualizados com sucesso.`);
  };

  const discardChanges = () => {
    if (selectedFormula) loadPricingForCapacity(selectedFormula.id, selectedCapacity);
    showToast('info', 'Descartado', 'As alterações foram revertidas.');
  };

  // ─── Calculations for Detail View ──────────────────────────

  const detailCalc = useMemo(() => {
    if (!selectedFormula) return null;

    const totalIngCost = calcIngredientCost(selectedFormula);
    const baseVol = selectedFormula.base_volume || 1;
    const costPerLiter = totalIngCost / baseVol;
    const liquidCost = costPerLiter * selectedCapacity;
    const rendimento = Math.floor(baseVol / selectedCapacity);

    // Busca embalagem por variante vinculada + capacidade
    const variantId = selectedFormula.packaging_variant_id;
    let pkg = variantId 
      ? packagingOptions.find(p => p.variant_id === variantId && p.capacity === selectedCapacity)
      : null;
    
    // Fallback: busca apenas por capacidade se não encontrar por variante
    if (!pkg) {
      pkg = packagingOptions.find(p => p.capacity === selectedCapacity);
    }
    
    // Busca rótulo por variante vinculada
    const labelVariantId = selectedFormula.label_variant_id;
    let labelOpt = labelVariantId
      ? packagingOptions.find(p => p.variant_id === labelVariantId)
      : null;
    
    // Fallback: busca rótulo genérico se não encontrar por variante
    if (!labelOpt) {
      labelOpt = packagingOptions.find(p => p.name.toLowerCase().includes('rótulo') || p.name.toLowerCase().includes('etiqueta') || p.name.toLowerCase().includes('label'));
    }

    const pkgCost = pkg ? parseCost(pkg.cost) : 0;
    const labelCost = labelOpt ? parseCost(labelOpt.cost) : 0;
    const custoUnidade = liquidCost + pkgCost + labelCost;
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
      pkgCost, labelCost, custoUnidade, custoTotal,
      varejoPrice: varejoPrice, varejoLucro, varejoMargem, varejoMarkup,
      atacadoPrice: atacadoPrice, atacadoLucro, atacadoMargem, atacadoMarkup,
      custoFardo, fardoTotal, fardoLucro, fardoMargem, fardoMarkup,
      margemMedia, pontoEquilibrio, atacadoDesc,
    };
  }, [selectedFormula, selectedCapacity, varejoPrice, atacadoPrice, fardoPrice, fardoQty, fixedCostsPerUnit, packagingOptions, calcIngredientCost]);

  const retailPrice = detailCalc?.varejoPrice || 0;
  const wholesalePrice = detailCalc?.atacadoPrice || 0;

  // ─── Import / Export ────────────────────────────────────────

  const handleExport = () => {
    try {
      const filename = getBackupFilename('Precificacao');
      exportToJson(filename, savedPricing);
      showToast('success', 'Exportação Concluída', `Backup "${filename}" gerado.`);
    } catch { showToast('error', 'Erro', 'Falha na exportação.'); }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await importFromJson(file);
      if (Array.isArray(data)) {
        setSavedPricing(data);
        localStorage.setItem('precificacao_entries', JSON.stringify(data));
        showToast('success', 'Importação Concluída', `${data.length} preços importados.`);
      }
    } catch (err: any) {
      showToast('error', 'Erro', err.message || 'Falha na importação.');
    }
    if (e.target) e.target.value = '';
  };

  // ─── Format Helpers ─────────────────────────────────────────

  const formatCapacity = (cap: number) => cap >= 1 ? `${cap}L` : `${cap * 1000}ml`;

  // Color scheme per capacity for visual differentiation
  const capacityColors: Record<number, { bg: string; text: string; border: string }> = {
    0.5: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
    1: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    2: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    5: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  };
  const getCapColor = (cap: number) => capacityColors[cap] || { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' };

  // Count how many volumes are priced for a formula
  const getVolumePricingStatus = (formulaId: string) => {
    const total = uniqueCapacities.length;
    const priced = uniqueCapacities.filter(cap => {
      const entry = savedPricing.find(e => e.formulaId === formulaId && e.capacityKey === String(cap));
      return entry && entry.varejoPrice > 0;
    }).length;
    return { total, priced };
  };

  // ─── Filtered List ──────────────────────────────────────────

  // Consolidate formulas keeping only the newest active version for each base name
  const consolidatedFormulas = useMemo(() => {
    const latestVersions: Record<string, Formula> = {};
    formulas.forEach(f => {
      if (f.status?.toLowerCase().startsWith('ativ') || f.status?.toLowerCase() === 'active') {
        const baseName = getBaseFormulaName(f.name);
        const existing = latestVersions[baseName];
        if (!existing || compareVersions(f.version, existing.version) > 0) {
          latestVersions[baseName] = f;
        } else if (compareVersions(f.version, existing.version) === 0) {
          if (f.id > existing.id) latestVersions[baseName] = f;
        }
      }
    });
    return Object.values(latestVersions);
  }, [formulas]);

  const filteredFormulas = useMemo(() => {
    const filtered = consolidatedFormulas.filter(f =>
      (
        f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.lm_code?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );

    return filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortColumn) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'version':
          aValue = a.version || '';
          bValue = b.version || '';
          break;
        case 'group':
          aValue = a.groups?.name || '';
          bValue = b.groups?.name || '';
          break;
        case 'lm_code':
          aValue = a.lm_code || '';
          bValue = b.lm_code || '';
          break;
        case 'cost':
          aValue = calcIngredientCost(a);
          bValue = calcIngredientCost(b);
          break;
        case 'varejo':
          aValue = getFormulaPrices(a.id)?.varejoPrice || 0;
          bValue = getFormulaPrices(b.id)?.varejoPrice || 0;
          break;
        case 'atacado':
          aValue = getFormulaPrices(a.id)?.atacadoPrice || 0;
          bValue = getFormulaPrices(b.id)?.atacadoPrice || 0;
          break;
        case 'status':
          aValue = getFormulaStatus(a.id) === 'Precificado' ? 1 : 0;
          bValue = getFormulaStatus(b.id) === 'Precificado' ? 1 : 0;
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }

      if (aValue === bValue) return 0;
      if (aValue === undefined || aValue === null) return 1;
      if (bValue === undefined || bValue === null) return -1;

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }

      return sortOrder === 'asc' ? (aValue < bValue ? -1 : 1) : (aValue > bValue ? -1 : 1);
    });
  }, [consolidatedFormulas, searchTerm, sortColumn, sortOrder, calcIngredientCost, getFormulaPrices, getFormulaStatus]);

  // Statistics for summary cards
  const stats = useMemo(() => {
    const active = consolidatedFormulas;
    const priced = active.filter(f => getFormulaStatus(f.id) === 'Precificado');
    const pending = active.length - priced.length;

    // Average margin calculation for priced formulas
    let totalMargem = 0;
    let pricedCount = 0;
    priced.forEach(f => {
      const p = getFormulaPrices(f.id);
      if (p && p.varejoPrice > 0) {
        // Calculate real margin: (price - cost) / price * 100
        // Note: This uses ingredient cost only, not including packaging
        const custoBase = calcIngredientCost(f);
        const margem = custoBase > 0 ? ((p.varejoPrice - custoBase) / p.varejoPrice) * 100 : 0;
        totalMargem += Math.max(0, margem);
        pricedCount++;
      }
    });

    const avgMargin = pricedCount > 0 ? totalMargem / pricedCount : 0;
    return { total: active.length, priced: pricedCount, pending, avgMargin };
  }, [formulas, getFormulaStatus, getFormulaPrices, calcIngredientCost]);

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

  // ═══════════════════════════════════════════════════════════
  // RENDER: DETAIL VIEW (opened when formula is selected)
  // ═══════════════════════════════════════════════════════════

  if (selectedFormula && detailCalc) {
    return (
      <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">

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
          {/* Volume Tabs with saved indicators */}
          <div className="px-8 pt-6 pb-2 flex items-center gap-3 flex-wrap">
            <span className="text-sm font-bold text-slate-600 mr-2">Volume:</span>
            {uniqueCapacities.map(cap => {
              const isSaved = savedPricing.some(e => e.formulaId === selectedFormula.id && e.capacityKey === String(cap) && e.varejoPrice > 0);
              const capColor = getCapColor(cap);
              return (
                <button
                  key={cap}
                  onClick={() => switchCapacity(cap)}
                  className={`px-5 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${selectedCapacity === cap
                    ? 'bg-[#202eac] text-white shadow-lg shadow-blue-200 scale-105'
                    : `bg-white text-slate-600 border ${capColor.border} hover:border-[#202eac] hover:text-[#202eac]`
                    }`}
                >
                  {formatCapacity(cap)}
                  {isSaved
                    ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    : <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  }
                </button>
              );
            })}
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

                  <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 mt-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3 text-white">
                        <DollarSign className="w-5 h-5 opacity-80" />
                        <span className="font-bold text-sm">Custo por Unidade</span>
                      </div>
                      <span className="text-2xl font-black text-white">{fmt(detailCalc.custoTotal)}</span>
                    </div>
                    
                    {/* Breakdown de custos */}
                    <div className="grid grid-cols-1 gap-2 bg-white/10 rounded-xl p-3">
                      <div className="flex justify-between items-center text-white/80 text-xs">
                        <span className="flex items-center gap-2">
                          <Package className="w-3.5 h-3.5" />
                          Ingredientes
                        </span>
                        <span className="font-mono font-bold">{fmt(detailCalc.liquidCost)}</span>
                      </div>
                      <div className="flex justify-between items-center text-white/80 text-xs">
                        <span className="flex items-center gap-2">
                          <Package className="w-3.5 h-3.5" />
                          Embalagem
                        </span>
                        <span className="font-mono font-bold">{fmt(detailCalc.pkgCost)}</span>
                      </div>
                      {detailCalc.labelCost > 0 && (
                        <div className="flex justify-between items-center text-white/80 text-xs">
                          <span className="flex items-center gap-2">
                            <Package className="w-3.5 h-3.5" />
                            Rótulo
                          </span>
                          <span className="font-mono font-bold">{fmt(detailCalc.labelCost)}</span>
                        </div>
                      )}
                      {fixedCostsPerUnit > 0 && (
                        <div className="flex justify-between items-center text-white/80 text-xs">
                          <span className="flex items-center gap-2">
                            <Calculator className="w-3.5 h-3.5" />
                            Custos Fixos
                          </span>
                          <span className="font-mono font-bold">{fmt(fixedCostsPerUnit)}</span>
                        </div>
                      )}
                      <div className="border-t border-white/20 pt-2 mt-1 flex justify-between items-center text-white text-xs font-bold">
                        <span>Total</span>
                        <span className="font-mono">{fmt(detailCalc.custoTotal)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pricing Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Varejo Card */}
                  <div className="bg-white p-6 rounded-[28px] border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                          <ShoppingCart className="w-4 h-4 text-emerald-600" />
                        </div>
                        <h4 className="font-bold text-slate-700">Preço Varejo</h4>
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-2 py-1 rounded-md">x{detailCalc.varejoMarkup.toFixed(0)}</span>
                    </div>
                    <PriceAdjuster value={varejoPrice} onChange={setVarejoPrice} cents={95} color="green" />
                    <div className="flex gap-2 mt-5">
                      <MetricBlock label="Markup" value={`${detailCalc.varejoMarkup.toFixed(1)}%`} colorClass="bg-slate-50" />
                      <MetricBlock label="Margem" value={`${detailCalc.varejoMargem.toFixed(1)}%`} colorClass={`${detailCalc.varejoMargem >= 20 ? 'bg-emerald-50 text-emerald-600' : detailCalc.varejoMargem >= 10 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}`} />
                      <MetricBlock label="Lucro" value={fmt(detailCalc.varejoLucro)} colorClass="bg-emerald-50 !text-emerald-700 font-black" />
                    </div>
                  </div>

                  {/* Atacado Card */}
                  <div className="bg-white p-6 rounded-[28px] border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                          <Store className="w-4 h-4 text-amber-600" />
                        </div>
                        <h4 className="font-bold text-slate-700">Preço Atacado</h4>
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-2 py-1 rounded-md">x{detailCalc.atacadoMarkup.toFixed(0)}</span>
                    </div>
                    <PriceAdjuster value={atacadoPrice} onChange={setAtacadoPrice} cents={90} color="orange" />
                    <div className="flex gap-2 mt-5">
                      <MetricBlock label="Markup" value={`${detailCalc.atacadoMarkup.toFixed(1)}%`} colorClass="bg-slate-50" />
                      <MetricBlock label="Margem" value={`${detailCalc.atacadoMargem.toFixed(1)}%`} colorClass={`${detailCalc.atacadoMargem >= 20 ? 'bg-emerald-50 text-emerald-600' : detailCalc.atacadoMargem >= 10 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}`} />
                      <MetricBlock label="Lucro" value={fmt(detailCalc.atacadoLucro)} colorClass="bg-amber-50 !text-amber-700 font-black" />
                    </div>
                  </div>
                </div>

                {/* Fardo Card (full width) */}
                <div className="bg-white p-6 rounded-[28px] border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                        <PackageCheck className="w-4 h-4 text-purple-600" />
                      </div>
                      <h4 className="font-bold text-slate-700">Preço Fardo</h4>
                    </div>
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
                      <MetricBlock label="Markup" value={`${detailCalc.fardoMarkup.toFixed(1)}%`} colorClass={`${detailCalc.fardoMarkup >= 20 ? 'bg-emerald-50 text-emerald-600' : detailCalc.fardoMarkup >= 10 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}`} />
                      <MetricBlock label="Lucro Total" value={fmt(detailCalc.fardoLucro)} colorClass="bg-purple-50 !text-purple-700 font-black" />
                    </div>
                  </div>
                  {/* Comparison Blocks */}
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="flex gap-3">
                      <div className="flex-1 bg-blue-50 rounded-xl p-3 text-center">
                        <div className="text-[10px] font-bold text-blue-500 uppercase tracking-wide">Unit.</div>
                        <div className="text-lg font-black text-blue-700">{fmt(fardoPrice / fardoQty)}</div>
                      </div>
                      <div className="flex-1 bg-emerald-50 rounded-xl p-3 text-center">
                        <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-wide">vs Varejo</div>
                        <div className="text-lg font-black text-emerald-700">-{fmt(retailPrice - (fardoPrice / fardoQty))}</div>
                      </div>
                      <div className="flex-1 bg-amber-50 rounded-xl p-3 text-center">
                        <div className="text-[10px] font-bold text-amber-500 uppercase tracking-wide">vs Atacado</div>
                        <div className="text-lg font-black text-amber-700">-{fmt(wholesalePrice - (fardoPrice / fardoQty))}</div>
                      </div>
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
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-7xl mx-auto space-y-8">

          {/* Module Header - Elaborate */}
          <div className="bg-gradient-to-br from-white via-slate-50 to-slate-100 rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-start gap-5">
              {/* Icon */}
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/25 shrink-0">
                <DollarSign className="w-8 h-8 text-white" />
              </div>
              
              {/* Content */}
              <div className="flex-1">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  Precificação e Formação de Preços
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Módulo Estratégico</span>
                </h2>
                <p className="text-slate-600 text-sm mt-1.5 leading-relaxed max-w-3xl">
                  Defina preços de venda para diferentes canais (varejo, ataque, fardo). 
                  Calcule margens, markup e lucratividade por produto e embalagem.
                </p>
                
                {/* Stats Badges */}
                <div className="flex items-center gap-3 mt-4 flex-wrap">
                  <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg">
                    <PackageCheck className="w-4 h-4 text-blue-600" />
                    <span className="text-slate-700 text-sm font-medium uppercase">{stats.total} fórmulas</span>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-slate-700 text-sm font-medium uppercase">{stats.priced} precificadas</span>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span className="text-slate-700 text-sm font-medium uppercase">{stats.pending} pendentes</span>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg">
                    <TrendingUp className="w-4 h-4 text-purple-600" />
                    <span className="text-slate-700 text-sm font-medium uppercase">{stats.avgMargin.toFixed(1)}% média</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

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
            {/* Search + Controls - Left Side */}
            <div className="flex gap-3 items-center flex-1">
              <div className="flex-1 bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 max-w-md">
                <Search className="w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar produtos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 outline-none text-slate-700 bg-transparent"
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-all duration-200 ${viewMode === 'list' ? 'bg-gradient-to-br from-[#202eac] to-[#4b5ce8] text-white shadow-md' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                  title="Lista"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-all duration-200 ${viewMode === 'grid' ? 'bg-gradient-to-br from-[#202eac] to-[#4b5ce8] text-white shadow-md' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                  title="Blocos"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all bg-white border border-slate-200 shadow-sm"
                title="Configurar Colunas"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>

            {/* Export/Import - Right Side */}
            <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
              <label className="cursor-pointer px-3 py-2 rounded-lg transition-all font-medium flex items-center gap-2 text-slate-600 hover:text-[#202eac] hover:bg-slate-50">
                <Upload className="w-4 h-4 text-emerald-600" />
                <span className="hidden sm:inline">Importar</span>
                <input type="file" accept=".json" onChange={handleImport} className="hidden" />
              </label>
              <button
                onClick={handleExport}
                className="px-3 py-2 rounded-lg transition-all font-medium flex items-center gap-2 bg-gradient-to-r from-[#202eac] to-[#4b5ce8] text-white shadow-md hover:shadow-lg hover:shadow-indigo-500/25"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Exportar</span>
              </button>
            </div>

            {/* Column Settings Modal */}
            {isSettingsOpen && (
              <ColumnSettingsModal
                columns={columns}
                onToggleVisibility={toggleColumnVisibility}
                onMove={moveColumn}
                onReset={resetColumns}
                onClose={() => setIsSettingsOpen(false)}
              />
            )}
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
            /* ═══ GRID / CARD VIEW — Mini-tabela por volume ═══ */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredFormulas.map(formula => {
                const cat = getFormulaCategory(formula.name);
                const catColor = categoryColors[cat] || categoryColors.Produtos;
                const volStatus = getVolumePricingStatus(formula.id);

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
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${volStatus.priced === volStatus.total && volStatus.total > 0 ? 'bg-emerald-50 text-emerald-600' : volStatus.priced > 0 ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                        {volStatus.priced}/{volStatus.total} volumes
                      </span>
                    </div>

                    {/* Formula name and code */}
                    <h3 className="font-bold text-slate-800 group-hover:text-[#202eac] transition-colors text-base flex flex-wrap items-center gap-2">
                      {formula.name}
                      <span className="text-[10px] bg-[#202eac] text-white px-1.5 py-0.5 rounded font-black border border-blue-100/50 shadow-sm shrink-0">V{(formula.version || '1').replace(/^v/i, '')}</span>
                    </h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{formula.lm_code || 'S/C'}</p>

                    {/* Mini pricing table per volume */}
                    <div className="mt-4 space-y-0 rounded-xl overflow-hidden border border-slate-100">
                      {/* Header */}
                      <div className="grid grid-cols-4 gap-0 text-[9px] font-black text-slate-400 uppercase tracking-wider bg-slate-50 px-3 py-2 border-b border-slate-100">
                        <div>Volume</div>
                        <div className="text-right">Varejo</div>
                        <div className="text-right">Atacado</div>
                        <div className="text-right">Fardo</div>
                      </div>
                      {/* Rows per capacity */}
                      {uniqueCapacities.map(cap => {
                        const entry = savedPricing.find(e => e.formulaId === formula.id && e.capacityKey === String(cap));
                        const hasPricing = entry && entry.varejoPrice > 0;
                        const cc = getCapColor(cap);
                        return (
                          <div key={cap} className={`grid grid-cols-4 gap-0 text-[11px] px-3 py-2 border-b border-slate-50 last:border-b-0 ${cc.bg}`}>
                            <div className={`font-black ${cc.text}`}>{formatCapacity(cap)}</div>
                            {hasPricing ? (
                              <>
                                <div className="text-right font-bold text-emerald-600">{fmt(entry!.varejoPrice)}</div>
                                <div className="text-right font-bold text-amber-600">{fmt(entry!.atacadoPrice)}</div>
                                <div className="text-right font-bold text-purple-600">{fmt(entry!.fardoPrice)}</div>
                              </>
                            ) : (
                              <>
                                <div className="text-right flex items-center justify-end"><AlertTriangle className="w-3 h-3 text-amber-400" /></div>
                                <div className="text-right flex items-center justify-end"><AlertTriangle className="w-3 h-3 text-amber-400" /></div>
                                <div className="text-right flex items-center justify-end"><AlertTriangle className="w-3 h-3 text-amber-400" /></div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            /* ═══ LIST / TABLE VIEW — with volume breakdown ═══ */
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleColumnDragEnd}>
                <SortableContext items={columns.filter(c => c.visible).map(c => c.id)} strategy={horizontalListSortingStrategy}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        {columns.filter(c => c.visible).map((col) => (
                          <SortableHeader
                            key={col.id}
                            id={col.id}
                            label={col.label}
                            sortColumn={sortColumn}
                            sortOrder={sortOrder}
                            onSort={handleSort}
                          />
                        ))}
                      </tr>
                    </thead>
                <tbody>
                  {filteredFormulas.map(formula => {
                    const cat = getFormulaCategory(formula.name);
                    const catColor = categoryColors[cat] || categoryColors.Produtos;
                    const volStatus = getVolumePricingStatus(formula.id);
                    const custoBase = calcIngredientCost(formula);
                    const custoPorLitro = custoBase / (formula.base_volume || 1);
                    const prices = getFormulaPrices(formula.id);

                    const columnValues: Record<string, React.ReactNode> = {
                      name: <div className="font-bold text-slate-800 group-hover:text-[#202eac] transition-colors text-sm">{formula.name}</div>,
                      version: <span className="text-[10px] bg-[#202eac] text-white px-1.5 py-0.5 rounded font-black border border-blue-100/50 shadow-sm">V{(formula.version || '1').replace(/^v/i, '')}</span>,
                      group: formula.groups?.name ? (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${catColor.bg} ${catColor.text}`}>{formula.groups.name}</span>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      ),
                      lm_code: <span className="text-xs text-slate-500 font-mono">{formula.lm_code || 'S/C'}</span>,
                      cost: <span className="text-sm font-bold text-slate-700">{fmt(custoPorLitro)}</span>,
                      varejo: prices && prices.varejoPrice > 0 ? (
                        <span className="text-sm font-bold text-emerald-600">{fmt(prices.varejoPrice)}</span>
                      ) : (
                        <span className="text-xs text-amber-500 flex items-center justify-end gap-1"><AlertTriangle className="w-3 h-3" /> -</span>
                      ),
                      atacado: prices && prices.atacadoPrice > 0 ? (
                        <span className="text-sm font-bold text-amber-600">{fmt(prices.atacadoPrice)}</span>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      ),
                      status: <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg ${volStatus.priced === volStatus.total && volStatus.total > 0 ? 'bg-emerald-50 text-emerald-600' : volStatus.priced > 0 ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>{volStatus.priced}/{volStatus.total}</span>,
                    };

                    const getTdClass = (id: string) => {
                      return 'px-3 py-4 text-center';
                    };

                    return (
                      <tr
                        key={formula.id}
                        onClick={() => openFormula(formula)}
                        className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer group"
                      >
                        {columns.filter(c => c.visible).map(col => (
                          <td key={col.id} className={getTdClass(col.id)}>
                            {columnValues[col.id]}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
                </SortableContext>
              </DndContext>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
