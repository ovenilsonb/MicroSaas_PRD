import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useStorageMode } from '../contexts/StorageModeContext';
import { useToast } from './dashboard/Toast';
import {
  Factory, Plus, Search, Beaker, Calendar, Hash, ChevronRight, ArrowLeft,
  CheckCircle2, Clock, AlertCircle, Play, ClipboardList, ShieldCheck,
  PackageCheck, Trash2, X, Download, Upload, Info, AlertTriangle,
  Eye, Scale, Droplets, Thermometer, Zap, Shield, ChevronDown,
  LayoutGrid, List as ListIcon, Timer, FlaskConical, Package,
  PackageOpen, Lightbulb, Minus, PlusCircle
} from 'lucide-react';
import { generateId } from '../lib/id';
import { ConfirmModal, ConfirmModalType } from './shared/ConfirmModal';

// ─── Interfaces ──────────────────────────────────────────────

interface FormulaIngredient {
  id: string;
  ingredient_id: string;
  variant_id: string | null;
  quantity: number;
  ingredients: {
    name: string;
    unit: string;
    cost_per_unit: number;
    produto_quimico: boolean;
    risco?: string;
  };
  variants?: { name: string; cost_per_unit: number | null };
}

interface Formula {
  id: string;
  name: string;
  version: string;
  base_volume: number;
  lm_code: string | null;
  batch_prefix: string | null;
  status: string;
  instructions?: string;
  formula_ingredients: FormulaIngredient[];
  groups?: { name: string };
}

type OrderStatus = 'planned' | 'weighing' | 'mixing' | 'homogenizing' | 'quality_check' | 'completed' | 'cancelled';

interface ProductionStep {
  key: string;
  label: string;
  completed: boolean;
  completedAt?: string;
  notes?: string;
}

interface IngredientBatch {
  ingredientId: string;
  supplierBatch: string;
  quantityUsed: number;
  verified: boolean;
}

interface PackagingPlanItem {
  packagingId: string;
  variantId: string | null;
  name: string;
  capacity: number;
  quantity: number;
  cost: number;
  unit: string;
}

interface PackagingOption {
  id: string;
  variant_id: string | null;
  name: string;
  cost: number;
  capacity: number;
}

interface ProductionOrder {
  id: string;
  formula_id: string;
  batch_number: string;
  planned_volume: number;
  actual_volume: number | null;
  status: OrderStatus;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at?: string;
  // Extended fields (stored in localStorage)
  steps?: ProductionStep[];
  ingredientBatches?: IngredientBatch[];
  operatorName?: string;
  equipmentId?: string;
  formulaSnapshot?: Formula;
  packagingPlan?: PackagingPlanItem[];
}

// ─── Helpers ─────────────────────────────────────────────────

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const parseCost = (v: any): number => {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') return v;
  return parseFloat(String(v).replace(/\./g, '').replace(',', '.')) || 0;
};

const generateBatchNumber = (prefix: string | null): string => {
  const p = prefix || 'LOT';
  const d = new Date();
  const ds = `${d.getFullYear()}${(d.getMonth() + 1).toString().padStart(2, '0')}${d.getDate().toString().padStart(2, '0')}`;
  const rnd = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  return `${p}-${ds}-${rnd}`;
};

// ─── Version Control Helpers ─────────────────────────────────

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
  return name
    .trim()
    .replace(/\s*\([^)]*\)\s*$/g, '')
    .trim()
    .toUpperCase();
};

// ─── Packaging Combination Calculator ────────────────────────

function getExactCombinations(targetVolume: number, capacities: number[], maxResults = 8) {
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

const DEFAULT_STEPS: ProductionStep[] = [
  { key: 'conferencia', label: 'Conferência de Insumos', completed: false },
  { key: 'pesagem', label: 'Pesagem dos Componentes', completed: false },
  { key: 'adicao', label: 'Adição e Mistura Inicial', completed: false },
  { key: 'homogeneizacao', label: 'Homogeneização Final', completed: false },
  { key: 'ajuste_ph', label: 'Ajuste de pH / Viscosidade', completed: false },
  { key: 'amostra_cq', label: 'Coleta de Amostra para CQ', completed: false },
];

const getRiskIcons = (ingredients: FormulaIngredient[]) => {
  const risks: { icon: React.ReactNode; label: string; color: string }[] = [];
  const hasChemical = ingredients.some(i => i.ingredients?.produto_quimico);
  const hasCorrosive = ingredients.some(i => i.ingredients?.risco?.toLowerCase().includes('corros'));
  if (hasChemical) {
    risks.push({ icon: <Shield className="w-4 h-4" />, label: 'Luvas Obrigatórias', color: 'text-amber-600 bg-amber-50 border-amber-200' });
    risks.push({ icon: <Eye className="w-4 h-4" />, label: 'Óculos de Proteção', color: 'text-blue-600 bg-blue-50 border-blue-200' });
  }
  if (hasCorrosive) {
    risks.push({ icon: <AlertTriangle className="w-4 h-4" />, label: 'Risco Corrosivo', color: 'text-red-600 bg-red-50 border-red-200' });
  }
  if (risks.length === 0) {
    risks.push({ icon: <CheckCircle2 className="w-4 h-4" />, label: 'EPI Padrão', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' });
  }
  return risks;
};

const getStatusConfig = (status: OrderStatus) => {
  switch (status) {
    case 'planned': return { label: 'Planejada', color: 'bg-blue-100 text-blue-700 border-blue-200', step: 0 };
    case 'weighing': return { label: 'Pesagem', color: 'bg-cyan-100 text-cyan-700 border-cyan-200', step: 1 };
    case 'mixing': return { label: 'Mistura', color: 'bg-amber-100 text-amber-700 border-amber-200', step: 2 };
    case 'homogenizing': return { label: 'Homogeneização', color: 'bg-purple-100 text-purple-700 border-purple-200', step: 3 };
    case 'quality_check': return { label: 'Qualidade', color: 'bg-indigo-100 text-indigo-700 border-indigo-200', step: 4 };
    case 'completed': return { label: 'Finalizada', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', step: 5 };
    case 'cancelled': return { label: 'Cancelada', color: 'bg-slate-100 text-slate-500 border-slate-200', step: -1 };
    default: return { label: status, color: 'bg-slate-100 text-slate-500 border-slate-200', step: -1 };
  }
};

const PROCESS_FLOW: { status: OrderStatus; label: string; icon: React.ReactNode; description: string }[] = [
  { status: 'planned', label: 'Planejada', icon: <ClipboardList className="w-5 h-5" />, description: 'Reserva de lote e cálculo de insumos.' },
  { status: 'weighing', label: 'Pesagem', icon: <Scale className="w-5 h-5" />, description: 'Conferência e pesagem dos componentes.' },
  { status: 'mixing', label: 'Mistura', icon: <FlaskConical className="w-5 h-5" />, description: 'Adição dos insumos e mistura reativa.' },
  { status: 'homogenizing', label: 'Homogeneização', icon: <Droplets className="w-5 h-5" />, description: 'Homogeneização final da fórmula.' },
  { status: 'quality_check', label: 'Qualidade', icon: <ShieldCheck className="w-5 h-5" />, description: 'Coleta de amostra e análise laboratorial.' },
  { status: 'completed', label: 'Finalizada', icon: <PackageCheck className="w-5 h-5" />, description: 'Lote liberado para envase e estoque.' },
];

// ─── Component ───────────────────────────────────────────────

export default function Producao() {
  const { showToast } = useToast();
  const { mode } = useStorageMode();
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'create' | 'details'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null);

  // Create Form State
  const [targetFormulaId, setTargetFormulaId] = useState('');
  const [plannedVolume, setPlannedVolume] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [operatorName, setOperatorName] = useState('');
  const [equipmentId, setEquipmentId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Modal State (substitui window.confirm)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    detail?: string;
    type: ConfirmModalType;
    confirmLabel?: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', type: 'warning', onConfirm: () => {} });

  // Packaging State
  const [packagingOptions, setPackagingOptions] = useState<PackagingOption[]>([]);
  const [packagingQty, setPackagingQty] = useState<Record<string, number>>({});
  const [showPackagingSection, setShowPackagingSection] = useState(false);

  // ─── Data Fetching ──────────────────────────────────────────

  useEffect(() => { fetchInitialData(); }, [mode]);

  async function fetchInitialData() {
    setIsLoading(true);
    await Promise.all([fetchOrders(), fetchFormulas(), fetchPackaging()]);
    setIsLoading(false);
  }

  async function fetchOrders() {
    try {
      if (mode === 'supabase') {
        const { data, error } = await supabase
          .from('production_orders')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        // Merge with local extended data
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
  }

  async function fetchFormulas() {
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
  }

  async function fetchPackaging() {
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
  }

  // ─── Local persistence helpers ─────────────────────────────

  const saveOrdersLocal = (updated: ProductionOrder[]) => {
    localStorage.setItem('local_production_orders', JSON.stringify(updated));
    const ext: Record<string, any> = {};
    updated.forEach(o => {
      ext[o.id] = { steps: o.steps, ingredientBatches: o.ingredientBatches, operatorName: o.operatorName, equipmentId: o.equipmentId, formulaSnapshot: o.formulaSnapshot, packagingPlan: o.packagingPlan };
    });
    localStorage.setItem('production_orders_ext', JSON.stringify(ext));
  };

  // ─── Create Order ──────────────────────────────────────────

  const handleCreateNew = () => {
    setTargetFormulaId('');
    setPlannedVolume('');
    setBatchNumber('');
    setOperatorName('');
    setEquipmentId('');
    setPackagingQty({});
    setShowPackagingSection(false);
    setViewMode('create');
  };

  const handleSelectFormula = (id: string) => {
    setTargetFormulaId(id);
    const formula = latestFormulas.find(f => f.id === id) || formulas.find(f => f.id === id);
    if (formula) {
      // Modifica\u00e7\u00e3o: N\u00e3o preenche mais o volume automaticamente para evitar erros
      setPlannedVolume(''); 
      setBatchNumber(generateBatchNumber(formula.batch_prefix));
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetFormulaId || !batchNumber) return;
    if (!plannedVolume) {
      showToast('error', 'Volume Necessário', 'Por favor, informe o volume do lote para prosseguir.');
      return;
    }

    // Verificação de duplicidade de número de lote
    const batchExists = orders.some(o => o.batch_number.toLowerCase() === batchNumber.toLowerCase());
    if (batchExists) {
      showToast('error', 'Lote Duplicado', `Já existe uma OF com o número de lote "${batchNumber}". Altere o número para prosseguir.`);
      return;
    }

    setIsSaving(true);
    const formula = latestFormulas.find(f => f.id === targetFormulaId) || formulas.find(f => f.id === targetFormulaId);
    // Build packaging plan from selected quantities
    const packagingPlan: PackagingPlanItem[] = [];
    Object.entries(packagingQty).forEach(([key, qty]) => {
      if (qty > 0) {
        const opt = packagingOptions.find(p => `${p.id}_${p.variant_id || 'base'}` === key);
        if (opt) {
          const isRotulo = /r[oó]tulo/i.test(opt.name);
          packagingPlan.push({ packagingId: opt.id, variantId: opt.variant_id, name: opt.name, capacity: opt.capacity, quantity: qty, cost: opt.cost || 0, unit: isRotulo ? 'un' : (opt.capacity >= 1 ? 'L' : 'ml') });
        }
      }
    });
    const newOrder: ProductionOrder = {
      id: generateId(),
      formula_id: targetFormulaId,
      batch_number: batchNumber,
      planned_volume: parseFloat(plannedVolume),
      actual_volume: null,
      status: 'planned',
      start_date: null,
      end_date: null,
      created_at: new Date().toISOString(),
      steps: DEFAULT_STEPS.map(s => ({ ...s })),
      ingredientBatches: formula?.formula_ingredients?.map(fi => ({
        ingredientId: fi.ingredient_id,
        supplierBatch: '',
        quantityUsed: (fi.quantity / (formula?.base_volume || 1)) * parseFloat(plannedVolume),
        verified: false,
      })) || [],
      operatorName,
      equipmentId,
      formulaSnapshot: formula || undefined,
      packagingPlan: packagingPlan.length > 0 ? packagingPlan : undefined,
    };

    try {
      if (mode === 'supabase') {
        const { error } = await supabase.from('production_orders').insert([{
          id: newOrder.id,
          formula_id: targetFormulaId,
          planned_volume: parseFloat(plannedVolume),
          batch_number: batchNumber,
          status: 'planned',
        }]);
        if (error) throw error;
      }
      const updated = [newOrder, ...orders];
      setOrders(updated);
      saveOrdersLocal(updated);
      setViewMode('list');
      showToast('success', 'OF Criada', `Lote ${batchNumber} criado com sucesso.`);
    } catch (err) {
      console.error('Erro ao criar ordem:', err);
      showToast('error', 'Erro', 'Não foi possível criar a ordem de fabricação.');
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Update Order ──────────────────────────────────────────

  const advanceStatus = async (order: ProductionOrder) => {
    const flow: OrderStatus[] = ['planned', 'weighing', 'mixing', 'homogenizing', 'quality_check', 'completed'];
    const idx = flow.indexOf(order.status);
    if (idx < 0 || idx >= flow.length - 1) return;
    const newStatus = flow[idx + 1];
    const statusLabel = getStatusConfig(newStatus).label;

    // Validação de estoque quando vai para pesagem (modo ALERTA)
    if (newStatus === 'weighing') {
      const scaled = getScaledIngredients(order);
      const localIngs = JSON.parse(localStorage.getItem('local_ingredients') || '[]');
      const insufficient: string[] = [];
      scaled.forEach(item => {
        const ing = localIngs.find((i: any) => i.id === item.ingredient_id);
        if (ing) {
          const currentStock = ing.estoque_atual || 0;
          if (currentStock < item.scaledQty) {
            const ingName = item.variants?.name || item.ingredients?.name || 'Desconhecido';
            insufficient.push(`${ingName}: precisa ${item.scaledQty.toFixed(3)} ${item.ingredients?.unit || ''}, disponível ${currentStock.toFixed(3)}`);
          }
        }
      });

      if (insufficient.length > 0) {
        // Modal de alerta de estoque insuficiente
        setConfirmModal({
          isOpen: true,
          title: 'Estoque Insuficiente',
          message: `Os seguintes insumos não possuem estoque suficiente para o lote ${order.batch_number}. Deseja prosseguir mesmo assim?`,
          detail: insufficient.join('\n'),
          type: 'danger',
          confirmLabel: 'Prosseguir Mesmo Assim',
          onConfirm: () => { setConfirmModal(prev => ({ ...prev, isOpen: false })); executeAdvance(order, newStatus); },
        });
        return;
      }
    }

    // Confirmação visual antes de avançar qualquer etapa
    setConfirmModal({
      isOpen: true,
      title: `Avançar para ${statusLabel}`,
      message: `Deseja avançar a OF ${order.batch_number} para a etapa "${statusLabel}"?${newStatus === 'weighing' ? '\n\nAo confirmar, o estoque de insumos será baixado automaticamente.' : ''}`,
      type: newStatus === 'weighing' ? 'warning' : 'info',
      confirmLabel: 'Avançar Etapa',
      onConfirm: () => { setConfirmModal(prev => ({ ...prev, isOpen: false })); executeAdvance(order, newStatus); },
    });
  };

  const executeAdvance = async (order: ProductionOrder, newStatus: OrderStatus) => {

    const updateData: Partial<ProductionOrder> = { status: newStatus };
    if (newStatus === 'weighing') updateData.start_date = new Date().toISOString();
    if (newStatus === 'completed') updateData.end_date = new Date().toISOString();

    try {
      if (mode === 'supabase') {
        // Map extended statuses to base statuses for DB
        const dbStatus = ['weighing', 'mixing', 'homogenizing'].includes(newStatus) ? 'in_progress' : newStatus;
        const { error } = await supabase.from('production_orders').update({
          status: dbStatus,
          ...updateData.start_date ? { start_date: updateData.start_date } : {},
          ...updateData.end_date ? { end_date: updateData.end_date } : {}
        }).eq('id', order.id);
        if (error) throw error;

        // TRIGGER: Stock Deduction (Out)
        if (newStatus === 'weighing') {
          const scaled = getScaledIngredients(order);
          for (const item of scaled) {
            // Create Log (trigger will handle stock deduction automatically)
            await supabase.from('inventory_logs').insert([{
              ingredient_id: item.ingredient_id,
              variant_id: item.variant_id,
              quantity: item.scaledQty,
              type: 'out',
              reference_id: order.id,
              notes: `Consumo automático (OF: ${order.batch_number})`
            }]);
          }
        }

        // TRIGGER: Quality Control Creation
        if (newStatus === 'quality_check') {
          await supabase.from('quality_controls').insert([{
            production_order_id: order.id,
            status: 'pending'
          }]);
        }
      } else {
        // Local Mode Logic
        if (newStatus === 'weighing') {
          const scaled = getScaledIngredients(order);
          const localIngs = JSON.parse(localStorage.getItem('local_ingredients') || '[]');
          const localLogs = JSON.parse(localStorage.getItem('local_inventory_logs') || '[]');

          scaled.forEach(item => {
            localLogs.push({
              id: generateId(),
              ingredient_id: item.ingredient_id,
              variant_id: item.variant_id,
              quantity: item.scaledQty,
              type: 'out',
              reference_id: order.id,
              notes: `Consumo automático (OF: ${order.batch_number})`,
              created_at: new Date().toISOString()
            });

            const ingIdx = localIngs.findIndex((i: any) => i.id === item.ingredient_id);
            if (ingIdx >= 0) {
              localIngs[ingIdx].estoque_atual = (localIngs[ingIdx].estoque_atual || 0) - item.scaledQty;
            }
          });

          localStorage.setItem('local_ingredients', JSON.stringify(localIngs));
          localStorage.setItem('local_inventory_logs', JSON.stringify(localLogs));
        }

        if (newStatus === 'quality_check') {
          const localQC = JSON.parse(localStorage.getItem('local_quality_controls') || '[]');
          localQC.push({
            id: generateId(),
            production_order_id: order.id,
            status: 'pending',
            created_at: new Date().toISOString()
          });
          localStorage.setItem('local_quality_controls', JSON.stringify(localQC));
        }
      }

      const updated = orders.map(o => o.id === order.id ? { ...o, ...updateData } : o);
      setOrders(updated);
      saveOrdersLocal(updated);
      setSelectedOrder(prev => prev?.id === order.id ? { ...prev, ...updateData } : prev);
      showToast('success', 'Status Atualizado', `OF ${order.batch_number} agora está em: ${getStatusConfig(newStatus).label}`);
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      showToast('error', 'Erro', 'Não foi possível atualizar o status e processar integrações.');
    }
  };

  const toggleStep = (orderId: string, stepKey: string) => {
    const updated = orders.map(o => {
      if (o.id !== orderId) return o;
      const newSteps = (o.steps || []).map(s =>
        s.key === stepKey ? { ...s, completed: !s.completed, completedAt: !s.completed ? new Date().toISOString() : undefined } : s
      );
      return { ...o, steps: newSteps };
    });
    setOrders(updated);
    saveOrdersLocal(updated);
    setSelectedOrder(prev => {
      if (prev?.id !== orderId) return prev;
      return updated.find(o => o.id === orderId) || prev;
    });
  };

  const updateBatch = (orderId: string, ingredientId: string, supplierBatch: string) => {
    const updated = orders.map(o => {
      if (o.id !== orderId) return o;
      const newBatches = (o.ingredientBatches || []).map(b =>
        b.ingredientId === ingredientId ? { ...b, supplierBatch, verified: supplierBatch.trim().length > 0 } : b
      );
      return { ...o, ingredientBatches: newBatches };
    });
    setOrders(updated);
    saveOrdersLocal(updated);
    setSelectedOrder(prev => {
      if (prev?.id !== orderId) return prev;
      return updated.find(o => o.id === orderId) || prev;
    });
  };

  const deleteOrder = async (id: string) => {
    try {
      if (mode === 'supabase') {
        const { error } = await supabase.from('production_orders').delete().eq('id', id);
        if (error) throw error;
      }
      const updated = orders.filter(o => o.id !== id);
      setOrders(updated);
      saveOrdersLocal(updated);
      if (selectedOrder?.id === id) { setSelectedOrder(null); setViewMode('list'); }
      showToast('success', 'Excluída', 'Ordem de fabricação excluída.');
    } catch (err) {
      console.error('Erro ao excluir:', err);
    }
  };

  // ─── Computed ──────────────────────────────────────────────

  // Only show the latest version of each formula
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

  const filteredOrders = useMemo(() => {
    return orders.filter(o =>
      o.batch_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.formulaSnapshot?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [orders, searchTerm]);

  const stats = useMemo(() => ({
    total: orders.length,
    planned: orders.filter(o => o.status === 'planned').length,
    inProgress: orders.filter(o => ['weighing', 'mixing', 'homogenizing'].includes(o.status)).length,
    inQuality: orders.filter(o => o.status === 'quality_check').length,
    completed: orders.filter(o => o.status === 'completed').length,
  }), [orders]);

  const getFormulaForOrder = (order: ProductionOrder): Formula | undefined => {
    return order.formulaSnapshot || formulas.find(f => f.id === order.formula_id);
  };

  const getScaledIngredients = (order: ProductionOrder) => {
    const formula = getFormulaForOrder(order);
    if (!formula?.formula_ingredients) return [];
    const scale = order.planned_volume / (formula.base_volume || 1);
    return formula.formula_ingredients.map(fi => ({
      ...fi,
      scaledQty: fi.quantity * scale,
      unitCost: parseCost(fi.variants?.cost_per_unit ?? fi.ingredients?.cost_per_unit ?? 0),
    }));
  };

  // Helper to detect if a packaging item is a label (rótulo)
  const isLabel = (name: string) => /r[oó]tulo/i.test(name);

  // Packaging computed values for the create form — only EMBALAGEM counts volume, not RÓTULO
  const packagingVolConsumed = useMemo(() => {
    let total = 0;
    Object.entries(packagingQty).forEach(([key, qty]) => {
      const opt = packagingOptions.find(p => `${p.id}_${p.variant_id || 'base'}` === key);
      if (opt && qty > 0 && !isLabel(opt.name)) total += opt.capacity * qty;
    });
    return total;
  }, [packagingQty, packagingOptions]);

  const packagingLeftover = useMemo(() => {
    const vol = parseFloat(plannedVolume || '0');
    return vol - packagingVolConsumed;
  }, [plannedVolume, packagingVolConsumed]);

  const packagingSuggestions = useMemo(() => {
    const vol = parseFloat(plannedVolume || '0');
    if (vol <= 0 || packagingOptions.length === 0) return [];
    // Only use EMBALAGEM capacities for suggestions, not rótulos
    const embalagemCaps = [...new Set(packagingOptions.filter(p => !isLabel(p.name)).map(p => p.capacity))];
    return getExactCombinations(vol, embalagemCaps, 6);
  }, [plannedVolume, packagingOptions]);

  // Group: pair each EMBALAGEM with its matching RÓTULO by capacity
  const packagingPairs = useMemo(() => {
    const embalagens = packagingOptions.filter(p => !isLabel(p.name));
    const rotulos = packagingOptions.filter(p => isLabel(p.name));
    return embalagens.map(emb => {
      const matchingRotulo = rotulos.find(r => r.capacity === emb.capacity);
      return { embalagem: emb, rotulo: matchingRotulo || null };
    });
  }, [packagingOptions]);

  // When updating packaging qty, also sync the matching rótulo
  const updatePackagingQty = (embKey: string, newQty: number, matchingRotulo: PackagingOption | null) => {
    setPackagingQty(prev => {
      const updated = { ...prev, [embKey]: Math.max(0, newQty) };
      if (matchingRotulo) {
        const rotuloKey = `${matchingRotulo.id}_${matchingRotulo.variant_id || 'base'}`;
        updated[rotuloKey] = Math.max(0, newQty);
      }
      return updated;
    });
  };

  // ─── Render ────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 px-8 py-5 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <Factory className="w-6 h-6 text-[#202eac]" />
            Produção
          </h1>
          <p className="text-sm text-slate-500 mt-1">Ordens de fabricação, rastreabilidade e controle de processo</p>
        </div>
        {viewMode === 'list' && (
          <button onClick={handleCreateNew} className="bg-[#202eac] hover:bg-blue-800 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-100">
            <Plus className="w-5 h-5" /> Nova OF
          </button>
        )}
        {viewMode !== 'list' && (
          <button onClick={() => { setViewMode('list'); setSelectedOrder(null); }} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-colors border border-slate-200">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
        )}
      </header>

      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-7xl mx-auto">

          {/* ═══════════════ LIST VIEW ═══════════════ */}
          {viewMode === 'list' && (
            <div className="space-y-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 bg-blue-50 text-[#202eac] rounded-xl flex items-center justify-center"><Factory className="w-6 h-6" /></div>
                  <div><p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total de OFs</p><h3 className="text-2xl font-black text-slate-800">{stats.total}</h3></div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 bg-cyan-50 text-cyan-600 rounded-xl flex items-center justify-center"><ClipboardList className="w-6 h-6" /></div>
                  <div><p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Planejadas</p><h3 className="text-2xl font-black text-slate-800">{stats.planned}</h3></div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center animate-pulse"><Play className="w-6 h-6" /></div>
                  <div><p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Em Produção</p><h3 className="text-2xl font-black text-slate-800">{stats.inProgress}</h3></div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center"><ShieldCheck className="w-6 h-6" /></div>
                  <div><p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Em Qualidade</p><h3 className="text-2xl font-black text-slate-800">{stats.inQuality}</h3></div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center"><CheckCircle2 className="w-6 h-6" /></div>
                  <div><p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Finalizadas</p><h3 className="text-2xl font-black text-slate-800">{stats.completed}</h3></div>
                </div>
              </div>

              {/* Search */}
              <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                <Search className="w-5 h-5 text-slate-400 ml-2" />
                <input type="text" placeholder="Buscar por lote ou fórmula..." className="flex-1 outline-none text-sm p-1" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>

              {/* Orders Table */}
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-64">
                  <div className="w-10 h-10 border-4 border-blue-200 border-t-[#202eac] rounded-full animate-spin mb-4" />
                  <p className="text-slate-500 font-medium">Carregando ordens...</p>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto mt-10 shadow-sm">
                  <div className="w-20 h-20 bg-blue-50 text-[#202eac] rounded-full flex items-center justify-center mx-auto mb-6"><Factory className="w-10 h-10" /></div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">Nenhuma OF encontrada</h3>
                  <p className="text-slate-500 mb-8">Crie uma nova ordem de fabricação para começar a produzir.</p>
                  <button onClick={handleCreateNew} className="px-6 py-3 bg-[#202eac] hover:bg-blue-800 text-white font-bold rounded-xl transition-colors inline-flex items-center gap-2">
                    <Plus className="w-5 h-5" /> Nova OF
                  </button>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider">
                        <th className="py-4 px-6 font-bold">Lote / OF</th>
                        <th className="py-4 px-6 font-bold">Produto / Fórmula</th>
                        <th className="py-4 px-6 font-bold text-center">Volume</th>
                        <th className="py-4 px-6 font-bold text-center">Progresso</th>
                        <th className="py-4 px-6 font-bold text-center">Status</th>
                        <th className="py-4 px-6 font-bold">Data</th>
                        <th className="py-4 px-6 font-bold text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredOrders.map(order => {
                        const formula = getFormulaForOrder(order);
                        const stepsCompleted = (order.steps || []).filter(s => s.completed).length;
                        const stepsTotal = (order.steps || []).length || 1;
                        const cfg = getStatusConfig(order.status);
                        return (
                          <tr
                            key={order.id}
                            onClick={() => { setSelectedOrder(order); setViewMode('details'); }}
                            className="hover:bg-blue-50/50 transition-colors group cursor-pointer"
                          >
                            <td className="py-4 px-6">
                              <div className="font-bold text-slate-800 flex items-center gap-2"><Hash className="w-3.5 h-3.5 text-slate-400" />{order.batch_number}</div>
                            </td>
                            <td className="py-4 px-6">
                              <div className="font-semibold text-slate-700">{formula?.name || '—'}</div>
                              <div className="text-[10px] text-slate-400 font-mono uppercase">{formula?.lm_code || 'S/C'} • {(formula?.version || 'v1.0').toLowerCase()}</div>
                            </td>
                            <td className="py-4 px-6 text-center font-bold text-slate-600">{order.planned_volume}L</td>
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-2 justify-center">
                                <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-[#202eac] rounded-full transition-all duration-500" style={{ width: `${(stepsCompleted / stepsTotal) * 100}%` }} />
                                </div>
                                <span className="text-[10px] text-slate-400 font-bold">{stepsCompleted}/{stepsTotal}</span>
                              </div>
                            </td>
                            <td className="py-4 px-6 text-center">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${cfg.color}`}>{cfg.label}</span>
                            </td>
                            <td className="py-4 px-6">
                              <div className="text-xs text-slate-500 flex items-center gap-1.5"><Calendar className="w-3 h-3" />{new Date(order.created_at).toLocaleDateString('pt-BR')}</div>
                            </td>
                            <td className="py-4 px-6 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); setViewMode('details'); }}
                                  className="p-1.5 hover:bg-blue-100 text-[#202eac] bg-blue-50 rounded-lg transition-all"
                                  title="Detalhes"
                                >
                                  <ChevronRight className="w-5 h-5" />
                                </button>
                                {order.status === 'planned' && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); deleteOrder(order.id); }}
                                    className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-all"
                                    title="Excluir"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════ CREATE VIEW ═══════════════ */}
          {viewMode === 'create' && (
            <div className="max-w-2xl mx-auto">
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                  <h2 className="font-bold text-slate-800 flex items-center gap-2"><Plus className="w-5 h-5 text-[#202eac]" /> Nova Ordem de Fabricação</h2>
                </div>
                <form onSubmit={handleSubmitOrder} className="p-8 space-y-6">
                  {/* Formula Selection — Only latest version per product */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-bold text-slate-700">Escolha a Fórmula</label>
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Sempre a versão mais atual
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto pr-2">
                      {latestFormulas.map(f => (
                        <button key={f.id} type="button" onClick={() => handleSelectFormula(f.id)}
                          className={`p-4 rounded-xl border-2 text-left transition-all flex items-center justify-between ${targetFormulaId === f.id ? 'border-[#202eac] bg-blue-50/50 ring-2 ring-blue-100' : 'border-slate-100 bg-slate-50 hover:border-slate-200'}`}>
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${targetFormulaId === f.id ? 'bg-[#202eac] text-white' : 'bg-slate-200 text-slate-500'}`}><Beaker className="w-4 h-4" /></div>
                            <div>
                              <div className="font-bold text-sm text-slate-800">{f.name}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{f.lm_code || 'S/C'} • {(f.version || 'v1.0').toLowerCase()} • {f.base_volume}L</div>
                            </div>
                          </div>
                          {targetFormulaId === f.id && <CheckCircle2 className="w-5 h-5 text-[#202eac]" />}
                        </button>
                      ))}
                      {latestFormulas.length === 0 && (
                        <div className="text-center py-8 text-slate-400">
                          <Beaker className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Nenhuma fórmula ativa encontrada.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {targetFormulaId && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-slate-500 uppercase">Volume do Lote (L)</label>
                          <input 
                            type="number" 
                            value={plannedVolume} 
                            onChange={e => setPlannedVolume(e.target.value)}
                            placeholder="DIGITE O VOLUME"
                            className={`w-full px-4 py-3 bg-white dark:bg-slate-900 border rounded-xl outline-none font-black text-slate-800 transition-all ${
                              !plannedVolume 
                                ? 'border-amber-400 animate-pulse-amber ring-2 ring-amber-50' 
                                : 'border-slate-200 focus:ring-2 focus:ring-[#202eac]/20'
                            }`} 
                          />
                          {(() => {
                            const formula = latestFormulas.find(f => f.id === targetFormulaId) || formulas.find(f => f.id === targetFormulaId);
                            return !plannedVolume && (
                              <span className="text-amber-800 ml-1">
                                ⚠️ OBRIGATÓRIO: Sugestão da fórmula é {formula?.base_volume}L
                              </span>
                            );
                          })()}
                        </div>
                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-slate-500 uppercase">Número do Lote</label>
                          <input type="text" value={batchNumber} onChange={e => setBatchNumber(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#202eac]/20 outline-none font-mono text-slate-800 uppercase" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-slate-500 uppercase">Operador Responsável</label>
                          <input type="text" value={operatorName} onChange={e => setOperatorName(e.target.value)} placeholder="Nome do operador..."
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#202eac]/20 outline-none text-slate-800" />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-slate-500 uppercase">Equipamento / Tanque</label>
                          <input type="text" value={equipmentId} onChange={e => setEquipmentId(e.target.value)} placeholder="Ex: Tanque 01"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#202eac]/20 outline-none text-slate-800" />
                        </div>
                      </div>

                      {/* Preview: Ingredients needed */}
                      {(() => {
                        const formula = latestFormulas.find(f => f.id === targetFormulaId) || formulas.find(f => f.id === targetFormulaId);
                        if (!formula?.formula_ingredients?.length) return null;
                        const scale = parseFloat(plannedVolume || '0') / (formula.base_volume || 1);
                        return (
                          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
                            <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><Package className="w-4 h-4" /> Insumos Necessários ({plannedVolume}L)</h4>
                            <div className="space-y-1.5">
                              {formula.formula_ingredients.map(fi => (
                                <div key={fi.id} className="flex items-center justify-between text-sm">
                                  <span className="text-slate-700">{fi.variants?.name || fi.ingredients?.name}</span>
                                  <span className="font-bold text-slate-800">{(fi.quantity * scale).toFixed(3)} {fi.ingredients?.unit}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}

                      {/* ═══ PACKAGING / ENVASE SECTION ═══ */}
                      <div className="border-t border-slate-200 pt-4">
                        <button
                          type="button"
                          onClick={() => setShowPackagingSection(!showPackagingSection)}
                          className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${showPackagingSection ? 'border-[#202eac]/30 bg-blue-50/30' : 'border-dashed border-slate-200 hover:border-slate-300 bg-slate-50/50'
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${showPackagingSection ? 'bg-[#202eac] text-white' : 'bg-slate-200 text-slate-500'}`}>
                              <PackageOpen className="w-4 h-4" />
                            </div>
                            <div className="text-left">
                              <div className="font-bold text-sm text-slate-800">Distribuição de Envase</div>
                              <div className="text-[10px] text-slate-400">Opcional — Defina as embalagens para este lote</div>
                            </div>
                          </div>
                          <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${showPackagingSection ? 'rotate-180' : ''}`} />
                        </button>

                        {showPackagingSection && parseFloat(plannedVolume || '0') > 0 && (
                          <div className="mt-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">

                            {/* Volume Status Bar */}
                            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-500 uppercase">Volume do Lote</span>
                                <span className="text-sm font-black text-slate-800">{(parseFloat(plannedVolume) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 })}L</span>
                              </div>
                              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${packagingLeftover === 0 && packagingVolConsumed > 0
                                      ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                                      : packagingLeftover < 0
                                        ? 'bg-gradient-to-r from-red-400 to-red-500'
                                        : 'bg-gradient-to-r from-amber-400 to-amber-500'
                                    }`}
                                  style={{ width: `${Math.min(100, (packagingVolConsumed / parseFloat(plannedVolume || '1')) * 100)}%` }}
                                />
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-500">Alocado: <strong className="text-slate-700">{packagingVolConsumed.toFixed(1)}L</strong></span>
                                {packagingVolConsumed > 0 && (
                                  packagingLeftover === 0 ? (
                                    <span className="flex items-center gap-1 text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                      <CheckCircle2 className="w-3.5 h-3.5" /> Volume 100% alocado
                                    </span>
                                  ) : packagingLeftover > 0 ? (
                                    <span className="flex items-center gap-1 text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                      <AlertTriangle className="w-3.5 h-3.5" /> Sobra: {packagingLeftover.toFixed(1)}L
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1 text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                                      <AlertCircle className="w-3.5 h-3.5" /> Excede em {Math.abs(packagingLeftover).toFixed(1)}L
                                    </span>
                                  )
                                )}
                              </div>
                            </div>

                            {/* Packaging Selection */}
                            {packagingPairs.length === 0 ? (
                              <div className="bg-slate-50 rounded-xl border border-dashed border-slate-200 p-6 text-center">
                                <PackageOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                <p className="text-sm text-slate-500">Nenhuma embalagem cadastrada com volumetria.</p>
                                <p className="text-[10px] text-slate-400 mt-1">Cadastre insumos do tipo &quot;Material de Embalagem&quot; com volume no nome (ex: Frasco 1L)</p>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase">Embalagens Disponíveis</label>
                                <p className="text-[10px] text-slate-400 -mt-1">Ao escolher a embalagem, o rótulo correspondente é selecionado automaticamente.</p>
                                {packagingPairs.map(({ embalagem: pkg, rotulo }) => {
                                  const embKey = `${pkg.id}_${pkg.variant_id || 'base'}`;
                                  const qty = packagingQty[embKey] || 0;
                                  return (
                                    <div key={embKey} className={`p-3 rounded-xl border transition-all ${qty > 0 ? 'border-[#202eac]/30 bg-blue-50/30' : 'border-slate-100 bg-white dark:bg-slate-900 hover:border-slate-200'
                                      }`}>
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-black ${qty > 0 ? 'bg-[#202eac] text-white' : 'bg-slate-100 text-slate-500'
                                            }`}>
                                            {pkg.capacity >= 1 ? `${pkg.capacity}L` : `${(pkg.capacity * 1000).toFixed(0)}ml`}
                                          </div>
                                          <div className="min-w-0">
                                            <div className="font-bold text-sm text-slate-800 truncate">{pkg.name}</div>
                                            {qty > 0 && <div className="text-[10px] text-[#202eac] font-bold">{(pkg.capacity * qty).toFixed(1)}L total</div>}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                          <button type="button"
                                            onClick={() => updatePackagingQty(embKey, (packagingQty[embKey] || 0) - 1, rotulo)}
                                            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
                                          >
                                            <Minus className="w-3.5 h-3.5" />
                                          </button>
                                          <input type="number" min="0" value={qty}
                                            onChange={e => updatePackagingQty(embKey, parseInt(e.target.value) || 0, rotulo)}
                                            className="w-14 text-center text-sm font-bold bg-white dark:bg-slate-900 border border-slate-200 rounded-lg py-1.5 outline-none focus:ring-2 focus:ring-[#202eac]/20"
                                          />
                                          <button type="button"
                                            onClick={() => updatePackagingQty(embKey, (packagingQty[embKey] || 0) + 1, rotulo)}
                                            className="w-8 h-8 rounded-lg bg-[#202eac]/10 hover:bg-[#202eac]/20 text-[#202eac] flex items-center justify-center transition-colors"
                                          >
                                            <PlusCircle className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>
                                      {rotulo && qty > 0 && (
                                        <div className="flex items-center gap-2 mt-2 ml-11 text-[11px] text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                          <span className="font-bold">{rotulo.name}</span>
                                          <span className="text-emerald-500">• {qty} un. vinculados</span>
                                        </div>
                                      )}
                                      {!rotulo && qty > 0 && (
                                        <div className="flex items-center gap-2 mt-2 ml-11 text-[11px] text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                          <span className="font-bold">Nenhum rótulo correspondente encontrado</span>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Auto Suggestions */}
                            {packagingSuggestions.length > 0 && packagingVolConsumed === 0 && (
                              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-4 space-y-3">
                                <h4 className="text-xs font-bold text-[#202eac] uppercase flex items-center gap-2">
                                  <Lightbulb className="w-4 h-4" /> Sugestões que completam {plannedVolume}L
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {packagingSuggestions.slice(0, 6).map((combo, idx) => {
                                    const parts = Object.entries(combo)
                                      .filter(([, qty]) => qty > 0)
                                      .map(([cap, qty]) => `${qty}× ${parseFloat(cap) >= 1 ? `${cap}L` : `${(parseFloat(cap) * 1000).toFixed(0)}ml`}`);
                                    if (parts.length === 0) return null;
                                    return (
                                      <button key={idx} type="button"
                                        onClick={() => {
                                          const newQty: Record<string, number> = {};
                                          Object.entries(combo).filter(([, q]) => q > 0).forEach(([cap, qty]) => {
                                            const pair = packagingPairs.find(p => p.embalagem.capacity === parseFloat(cap));
                                            if (pair) {
                                              const embKey = `${pair.embalagem.id}_${pair.embalagem.variant_id || 'base'}`;
                                              newQty[embKey] = qty;
                                              if (pair.rotulo) {
                                                const rotKey = `${pair.rotulo.id}_${pair.rotulo.variant_id || 'base'}`;
                                                newQty[rotKey] = qty;
                                              }
                                            }
                                          });
                                          setPackagingQty(newQty);
                                        }}
                                        className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-900/80 rounded-lg border border-blue-200 hover:border-[#202eac] hover:bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 transition-all text-left"
                                      >
                                        <span className="text-[#202eac]">#{idx + 1}</span>
                                        <span>{parts.join(' + ')}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <button disabled={!targetFormulaId || isSaving} className="w-full py-4 bg-[#202eac] hover:bg-blue-800 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-100 disabled:opacity-50 disabled:cursor-not-allowed mt-4">
                    {isSaving ? 'Criando...' : 'Confirmar Lançamento de OF'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ═══════════════ DETAILS VIEW ═══════════════ */}
          {viewMode === 'details' && selectedOrder && (() => {
            const formula = getFormulaForOrder(selectedOrder);
            const scaled = getScaledIngredients(selectedOrder);
            const cfg = getStatusConfig(selectedOrder.status);
            const epiRisks = formula ? getRiskIcons(formula.formula_ingredients || []) : [];
            const stepsCompleted = (selectedOrder.steps || []).filter(s => s.completed).length;
            const stepsTotal = (selectedOrder.steps || []).length || 1;
            const allBatchesVerified = (selectedOrder.ingredientBatches || []).every(b => b.verified);
            const ingredientsCost = scaled.reduce((acc, fi) => acc + fi.scaledQty * fi.unitCost, 0);
            const packagingCost = (selectedOrder.packagingPlan || []).reduce((acc, p) => acc + (p.cost || 0) * p.quantity, 0);
            const totalCost = ingredientsCost + packagingCost;
            const elapsed = selectedOrder.start_date
              ? Math.round((new Date(selectedOrder.end_date || Date.now()).getTime() - new Date(selectedOrder.start_date).getTime()) / 60000)
              : 0;

            return (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                {/* OF Header Card */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 shadow-sm p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-[#202eac]/10 text-[#202eac] rounded-2xl flex items-center justify-center"><Factory className="w-7 h-7" /></div>
                      <div>
                        <h2 className="text-xl font-black text-slate-800">OF: {selectedOrder.batch_number}</h2>
                        <p className="text-sm text-slate-500">{formula?.name} • {(formula?.version || 'v1.0').toLowerCase()} • {(selectedOrder.planned_volume || 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 })}L</p>
                        {selectedOrder.operatorName && <p className="text-xs text-slate-400 mt-1">Operador: {selectedOrder.operatorName} {selectedOrder.equipmentId ? `• ${selectedOrder.equipmentId}` : ''}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase border ${cfg.color}`}>{cfg.label}</span>
                      {elapsed > 0 && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
                          <Timer className="w-3.5 h-3.5" /> {elapsed} min
                        </div>
                      )}
                    </div>
                  </div>

                  {/* EPI Warnings */}
                  <div className="flex flex-wrap gap-2 mt-4">
                    {epiRisks.map((r, i) => (
                      <div key={i} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${r.color}`}>
                        {r.icon} {r.label}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* LEFT: Process Flow + Checklist */}
                  <div className="lg:col-span-1 space-y-6">
                    {/* Process Flow */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                      <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2"><Zap className="w-4 h-4 text-[#202eac]" /> Fluxo de Processo</h3>
                      <div className="space-y-0">
                        {PROCESS_FLOW.map((pf, idx) => {
                          const isOrderCompleted = selectedOrder.status === 'completed';
                          const isActive = !isOrderCompleted && pf.status === selectedOrder.status;
                          const isPast = isOrderCompleted || cfg.step > idx;
                          const isFuture = !isOrderCompleted && cfg.step < idx;
                          return (
                            <div key={pf.status}>
                              <div className={`flex items-center gap-3 p-3 rounded-xl transition-all ${isActive ? 'bg-[#202eac]/5 border border-[#202eac]/20' : isPast ? 'opacity-80' : 'opacity-40'}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-black ${isPast ? 'bg-emerald-100 text-emerald-600' : isActive ? 'bg-[#202eac] text-white animate-pulse' : 'bg-slate-100 text-slate-400'}`}>
                                  {isPast ? <CheckCircle2 className="w-4 h-4" /> : (idx + 1)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className={`text-xs font-bold ${isActive ? 'text-[#202eac]' : 'text-slate-600'}`}>{pf.label}</div>
                                  <div className="text-[10px] text-slate-400 truncate">{pf.description}</div>
                                </div>
                              </div>
                              {idx < PROCESS_FLOW.length - 1 && <div className={`w-0.5 h-4 ml-[22px] ${isPast ? 'bg-emerald-300' : 'bg-slate-200'}`} />}
                            </div>
                          );
                        })}
                      </div>

                      {/* Advance Button (Blocked if Quality Check is needed) */}
                      {selectedOrder.status !== 'completed' && selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'quality_check' && (
                        <button onClick={() => advanceStatus(selectedOrder)}
                          className="w-full py-3 bg-[#202eac] text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-blue-800 transition-all shadow-lg shadow-blue-100">
                          <Play className="w-4 h-4" /> Avançar Etapa
                        </button>
                      )}
                      
                      {selectedOrder.status === 'quality_check' && (
                        <div className="text-center p-4 bg-amber-50 rounded-xl border border-amber-200 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                          <ShieldCheck className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                          <div className="font-bold text-amber-800">Aguardando Laudo Técnico</div>
                          <p className="text-xs text-amber-700 mt-1">Acesse o módulo de <strong>Qualidade</strong> para aprovar e dar entrada no Produto Acabado.</p>
                        </div>
                      )}
                      {selectedOrder.status === 'completed' && (
                        <div className="text-center p-4 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 flex flex-col items-center gap-2">
                          <PackageCheck className="w-8 h-8" />
                          <div className="font-bold">Lote Finalizado ✓</div>
                        </div>
                      )}
                    </div>

                    {/* Checklist */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2"><ClipboardList className="w-4 h-4 text-amber-500" /> Checklist de Processo</h3>
                        <span className="text-[10px] font-bold text-slate-400">{stepsCompleted}/{stepsTotal}</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[#202eac] to-emerald-500 rounded-full transition-all duration-500" style={{ width: `${(stepsCompleted / stepsTotal) * 100}%` }} />
                      </div>
                      <div className="space-y-2">
                        {(selectedOrder.steps || []).map(step => (
                          <button key={step.key} onClick={() => toggleStep(selectedOrder.id, step.key)}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${step.completed ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50 border-slate-100 hover:border-slate-200'}`}>
                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 ${step.completed ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'}`}>
                              {step.completed && <CheckCircle2 className="w-3 h-3 text-white" />}
                            </div>
                            <span className={`text-xs font-medium ${step.completed ? 'text-emerald-700 line-through' : 'text-slate-700'}`}>{step.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* RIGHT: Ingredients & Batches */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Ingredients Table with Batch Registration */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                          <Beaker className="w-4 h-4 text-purple-500" /> Insumos & Rastreabilidade
                          <span className="text-[10px] font-bold text-slate-400 ml-2">({selectedOrder.planned_volume}L)</span>
                        </h3>
                        {allBatchesVerified && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-200">✓ Todos Bipados</span>}
                      </div>
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            <th className="py-3 px-5">Insumo</th>
                            <th className="py-3 px-5 text-right">Qtd Planejada</th>
                            <th className="py-3 px-5 text-right">Custo Unit.</th>
                            <th className="py-3 px-5 text-right">Subtotal</th>
                            <th className="py-3 px-5">Lote do Fornecedor</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {scaled.map(fi => {
                            const batch = (selectedOrder.ingredientBatches || []).find(b => b.ingredientId === fi.ingredient_id);
                            return (
                              <tr key={fi.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-3 px-5">
                                  <div className="font-bold text-slate-800 text-sm">{fi.variants?.name || fi.ingredients?.name}</div>
                                  <div className="text-[10px] text-slate-400">{fi.ingredients?.produto_quimico ? '🧪 Químico' : '📦 Material'}</div>
                                </td>
                                <td className="py-3 px-5 text-right font-bold text-slate-700 text-sm">{fi.scaledQty.toFixed(3)} {fi.ingredients?.unit}</td>
                                <td className="py-3 px-5 text-right text-xs text-slate-500">{fmt(fi.unitCost)}/{fi.ingredients?.unit}</td>
                                <td className="py-3 px-5 text-right font-bold text-emerald-600 text-sm">{fmt(fi.scaledQty * fi.unitCost)}</td>
                                <td className="py-3 px-5">
                                  <div className="flex items-center gap-2">
                                    <input type="text" placeholder="Ex: LOT-ABC-123" value={batch?.supplierBatch || ''} onChange={e => updateBatch(selectedOrder.id, fi.ingredient_id, e.target.value)}
                                      className={`w-40 px-3 py-1.5 text-xs font-mono border rounded-lg outline-none transition-all ${batch?.verified ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-slate-50 border-slate-200 focus:ring-2 focus:ring-[#202eac]/20'}`} />
                                    {batch?.verified && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                          {/* ── Embalagens & Rótulos ── */}
                          {selectedOrder.packagingPlan && selectedOrder.packagingPlan.length > 0 && (
                            <>
                              <tr>
                                <td colSpan={5} className="py-2 px-5 bg-blue-50/50 border-t-2 border-blue-100">
                                  <div className="flex items-center gap-2 text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                                    <Package className="w-3.5 h-3.5" /> Embalagens & Rótulos
                                  </div>
                                </td>
                              </tr>
                              {selectedOrder.packagingPlan.map((item, i) => {
                                const isRotulo = /r[oó]tulo/i.test(item.name);
                                const unitCost = item.cost || 0;
                                const subtotal = unitCost * item.quantity;
                                return (
                                  <tr key={`pkg-${i}`} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="py-3 px-5">
                                      <div className="font-bold text-slate-800 text-sm">{item.name}</div>
                                      <div className="text-[10px] text-slate-400">{isRotulo ? '\ud83c\udff7\ufe0f Rótulo' : '\ud83d\udce6 Embalagem'}</div>
                                    </td>
                                    <td className="py-3 px-5 text-right font-bold text-slate-700 text-sm">{item.quantity} un.</td>
                                    <td className="py-3 px-5 text-right text-xs text-slate-500">{fmt(unitCost)}/un</td>
                                    <td className="py-3 px-5 text-right font-bold text-emerald-600 text-sm">{fmt(subtotal)}</td>
                                    <td className="py-3 px-5">
                                      <span className="text-xs text-slate-400">—</span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </>
                          )}
                        </tbody>
                        <tfoot className="border-t-2 border-slate-200">
                          <tr className="bg-slate-50">
                            <td className="py-3 px-5 font-black text-slate-800 text-sm" colSpan={3}>Custo Total do Lote</td>
                            <td className="py-3 px-5 text-right font-black text-emerald-600 text-lg">{fmt(totalCost)}</td>
                            <td className="py-3 px-5 text-xs text-slate-400">
                              {fmt(totalCost / (selectedOrder.planned_volume || 1))}/L
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Quick Info Cards */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Custo/Litro</div>
                        <div className="text-xl font-black text-[#202eac]">{fmt(totalCost / (selectedOrder.planned_volume || 1))}</div>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Volume Planejado</div>
                        <div className="text-xl font-black text-slate-800">{(selectedOrder.planned_volume || 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 })}L</div>
                      </div>
                      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Insumos</div>
                        <div className="text-xl font-black text-slate-800">{scaled.length} <span className="text-xs font-medium text-slate-400">itens</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

        </div>
      </div>
      {/* Estilos customizados para alertas visuais */}
      <style>{`
        @keyframes pulse-amber {
          0%, 100% { border-color: #cbd5e1; box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); }
          50% { border-color: #f59e0b; box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.2); }
        }
        .animate-pulse-amber {
          animation: pulse-amber 2s infinite;
        }
      `}</style>

      {/* Modal de Confirmação Visual */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        title={confirmModal.title}
        message={confirmModal.message}
        detail={confirmModal.detail}
        type={confirmModal.type}
        confirmLabel={confirmModal.confirmLabel}
      />
    </div>
  );
}
