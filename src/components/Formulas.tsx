import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Plus, Minus, Search, Beaker, Package, ArrowLeft, X, Copy, Trash2, 
  AlertTriangle, FileText, CheckCircle2, Save, LayoutGrid, List, 
  Info, Percent, DollarSign, ChevronRight, MoreVertical, ArrowDownAZ, ArrowUpZA
} from 'lucide-react';

interface Group {
  id: string;
  name: string;
}

interface Ingredient {
  id: string;
  name: string;
  apelido?: string;
  unit: string;
  cost_per_unit: number;
  produto_quimico: boolean;
  tem_variantes?: boolean;
  variants?: {
    id: string;
    name: string;
    codigo?: string;
    cost_per_unit: number | string;
  }[];
}

interface FormulaIngredient {
  id?: string; // Optional because it might be new before saving
  formula_id?: string;
  ingredient_id: string;
  variant_id?: string | null;
  quantity: number;
  ingredients?: {
    name: string;
    unit: string;
    cost_per_unit: number | string;
    produto_quimico: boolean;
  };
  variants?: {
    name: string;
    cost_per_unit: number | string;
  } | null;
}

interface Formula {
  id: string;
  name: string;
  version: string;
  base_volume: number;
  status: 'draft' | 'active' | 'archived';
  group_id?: string;
  lm_code?: string;
  description?: string;
  instructions?: string;
  yield_amount?: number;
  yield_unit?: string;
  batch_prefix?: string;
  created_at: string;
  updated_at: string;
  formula_ingredients?: FormulaIngredient[];
  groups?: { name: string };
}

export default function Formulas() {
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [allIngredients, setAllIngredients] = useState<Ingredient[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'editor'>(() => {
    const saved = localStorage.getItem('formulasViewMode');
    return (saved as 'grid' | 'list' | 'editor') || 'list';
  });

  const handleSetViewMode = (mode: 'grid' | 'list' | 'editor') => {
    setViewMode(mode);
    if (mode !== 'editor') {
      localStorage.setItem('formulasViewMode', mode);
    }
  };
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  
  // Editor State
  const [currentFormula, setCurrentFormula] = useState<Partial<Formula> | null>(null);
  const [currentIngredients, setCurrentIngredients] = useState<FormulaIngredient[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  // Add Ingredient State (Inside Editor)
  const [selectedIngId, setSelectedIngId] = useState('');
  const [ingQuantity, setIngQuantity] = useState('');
  const [ingSearchTerm, setIngSearchTerm] = useState('');
  const [isIngDropdownOpen, setIsIngDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsIngDropdownOpen(false);
      }
      setOpenDropdownId(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Delete Modal
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string; name: string }>({ isOpen: false, id: '', name: '' });

  // Group Management State
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState('');
  const [isSavingGroup, setIsSavingGroup] = useState(false);

  // Notification State
  const [notification, setNotification] = useState<{
    show: boolean;
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
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

  useEffect(() => {
    if (currentFormula && viewMode === 'editor') {
      const totalQuantity = currentIngredients.reduce((sum, ing) => sum + (ing.quantity || 0), 0);
      if (totalQuantity > 0 && totalQuantity !== currentFormula.yield_amount) {
        setCurrentFormula(prev => prev ? { ...prev, yield_amount: totalQuantity } : null);
      }
    }
  }, [currentIngredients, viewMode]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch Formulas with their ingredients and groups
      const { data: formulasData, error: formulasError } = await supabase
        .from('formulas')
        .select(`
          *,
          groups (name),
          formula_ingredients (
            id, quantity, ingredient_id, variant_id,
            ingredients (name, unit, cost_per_unit, produto_quimico),
            variants:ingredient_variants (name, cost_per_unit)
          )
        `)
        .order('name');
      
      if (formulasError) throw formulasError;
      setFormulas(formulasData || []);

      fetchGroups();

      // Fetch Ingredients
      const { data: ingData } = await supabase.from('ingredients').select('*, variants:ingredient_variants(*)').order('name');
      if (ingData) setAllIngredients(ingData);

    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      showNotify('error', 'Erro de Conexão', 'Não foi possível carregar os dados das fórmulas e insumos.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGroups = async () => {
    const { data: groupsData } = await supabase.from('groups').select('*').order('name');
    if (groupsData) setGroups(groupsData);
  };

  // --- Group Actions ---
  const normalizeString = (str: string) => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  };

  const flattenedIngredients = useMemo(() => {
    const list: any[] = [];
    allIngredients.forEach(ing => {
      if (ing.tem_variantes && ing.variants && ing.variants.length > 0) {
        ing.variants.forEach(v => {
          list.push({
            ...ing,
            isVariant: true,
            variant_id: v.id,
            variant_name: v.name,
            variant_codigo: v.codigo,
            cost_per_unit: typeof v.cost_per_unit === 'string' ? parseFloat(v.cost_per_unit.replace(/\./g, '').replace(',', '.')) || 0 : v.cost_per_unit || 0,
            displayName: `${ing.name} - ${v.name}`
          });
        });
      } else {
        list.push({
          ...ing,
          isVariant: false,
          displayName: ing.name
        });
      }
    });
    return list;
  }, [allIngredients]);

  const filteredAndSortedIngredients = useMemo(() => {
    return flattenedIngredients
      .filter(item => {
        if (ingSearchTerm.length === 0) return true;
        const term = normalizeString(ingSearchTerm);
        return normalizeString(item.displayName).includes(term) || (item.apelido && normalizeString(item.apelido).includes(term));
      })
      .sort((a, b) => {
        if (a.produto_quimico && !b.produto_quimico) return -1;
        if (!a.produto_quimico && b.produto_quimico) return 1;
        return a.displayName.localeCompare(b.displayName);
      });
  }, [flattenedIngredients, ingSearchTerm]);

  const selectedIngredient = useMemo(() => {
    if (!selectedIngId) return null;
    return flattenedIngredients.find(ing => {
      const uniqueId = ing.isVariant ? `${ing.id}|${ing.variant_id}` : `${ing.id}|`;
      return uniqueId === selectedIngId;
    });
  }, [selectedIngId, flattenedIngredients]);

  const handleOpenGroupModal = () => {
    setGroupName('');
    setIsGroupModalOpen(true);
  };

  const handleEditGroup = (group: Group) => {
    setEditingGroupId(group.id);
    setGroupName(group.name);
    setIsGroupModalOpen(true);
  };

  const handleSaveGroup = async () => {
    if (!groupName.trim()) return;
    setIsSavingGroup(true);
    try {
      if (editingGroupId) {
        const { error } = await supabase.from('groups').update({ name: groupName }).eq('id', editingGroupId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('groups').insert([{ name: groupName }]);
        if (error) throw error;
      }
      await fetchGroups();
      setGroupName('');
      setEditingGroupId(null);
      showNotify('success', 'Sucesso', 'Grupo salvo com sucesso.');
    } catch (error) {
      console.error('Erro ao salvar grupo:', error);
      showNotify('error', 'Erro ao Salvar', 'Não foi possível salvar o grupo.');
    } finally {
      setIsSavingGroup(false);
    }
  };

  const handleDeleteGroup = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este grupo?')) return;
    try {
      const { error } = await supabase.from('groups').delete().eq('id', id);
      if (error) throw error;
      await fetchGroups();
      showNotify('success', 'Excluído', 'Grupo removido com sucesso.');
    } catch (error) {
      console.error('Erro ao excluir grupo:', error);
      showNotify('error', 'Erro ao Excluir', 'Não foi possível excluir o grupo. Verifique se existem fórmulas vinculadas a ele.');
    }
  };

  // --- Formatação ---
  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatQuantity = (value: number) => {
    return value.toLocaleString('pt-BR', { 
      minimumFractionDigits: 3, 
      maximumFractionDigits: 3 
    });
  };

  const formatInputQuantity = (value: string, isChemical: boolean = true) => {
    const digits = value.replace(/\D/g, '');
    if (!digits) return '';
    if (!isChemical) return parseInt(digits, 10).toString();
    const number = parseInt(digits, 10) / 1000;
    return number.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  };

  // --- Editor Actions ---
  const handleOpenEditor = (formula?: Formula) => {
    if (formula) {
      setCurrentFormula({ ...formula });
      setCurrentIngredients(formula.formula_ingredients || []);
    } else {
      setCurrentFormula({
        name: '',
        version: 'V1.0',
        base_volume: 100,
        status: 'draft',
        yield_amount: 1,
        yield_unit: 'UN'
      });
      setCurrentIngredients([]);
    }
    setViewMode('editor');
  };

  const handleDuplicateFormula = (formula: Formula) => {
    const { id, created_at, updated_at, formula_ingredients, groups, ...rest } = formula;
    
    // Try to increment version
    let newVersion = 'V1.0';
    if (formula.version) {
      const match = formula.version.match(/V(\d+)\.(\d+)/);
      if (match) {
        const major = parseInt(match[1]);
        const minor = parseInt(match[2]);
        newVersion = `V${major}.${minor + 1}`;
      }
    }

    setCurrentFormula({
      ...rest,
      name: `${formula.name} (Cópia)`,
      version: newVersion
    });
    
    // Map ingredients to the format expected by the editor
    const mappedIngredients = (formula.formula_ingredients || []).map(ing => ({
      ingredient_id: ing.ingredient_id,
      variant_id: ing.variant_id,
      quantity: ing.quantity,
      ingredients: ing.ingredients,
      variants: ing.variants
    }));

    setCurrentIngredients(mappedIngredients);
    setViewMode('editor');
  };

  const handleCloseEditor = () => {
    setCurrentFormula(null);
    setCurrentIngredients([]);
    setViewMode('grid');
    setSelectedIngId('');
    setIngQuantity('');
  };

  const handleAddIngredientToFormula = () => {
    if (!selectedIngId || !ingQuantity) return;
    
    const [ingId, variantId] = selectedIngId.split('|');

    // Check for duplicates
    const isDuplicate = currentIngredients.some(item => 
      item.ingredient_id === ingId && (variantId ? item.variant_id === variantId : !item.variant_id)
    );

    if (isDuplicate) {
      showNotify('info', 'Insumo já adicionado', 'Este insumo já faz parte da fórmula atual.');
      return;
    }
    
    const ingDetails = allIngredients.find(i => i.id === ingId);
    if (!ingDetails) return;

    let cost = ingDetails.cost_per_unit;
    let displayName = ingDetails.name;
    let variantName = null;

    if (variantId) {
      const variant = ingDetails.variants?.find(v => v.id === variantId);
      if (variant) {
        cost = typeof variant.cost_per_unit === 'string' ? parseFloat(variant.cost_per_unit.replace(/\./g, '').replace(',', '.')) || 0 : variant.cost_per_unit || 0;
        displayName = `${ingDetails.name} - ${variant.name}`;
        variantName = variant.name;
      }
    }

    const qtyNumber = parseFloat(ingQuantity.replace(/\./g, '').replace(',', '.'));
    if (isNaN(qtyNumber) || qtyNumber <= 0) return;

    // Check if already exists (same ingredient AND same variant)
    const existsIndex = currentIngredients.findIndex(i => i.ingredient_id === ingId && i.variant_id === (variantId || null));
    
    if (existsIndex >= 0) {
      // Update existing
      const updated = [...currentIngredients];
      const existing = updated[existsIndex];
      updated[existsIndex] = {
        ...existing,
        quantity: existing.quantity + qtyNumber
      };
      setCurrentIngredients(updated);
    } else {
      // Add new
      setCurrentIngredients([...currentIngredients, {
        ingredient_id: ingId,
        variant_id: variantId || null,
        quantity: qtyNumber,
        ingredients: {
          name: ingDetails.name,
          unit: ingDetails.unit,
          cost_per_unit: ingDetails.cost_per_unit,
          produto_quimico: ingDetails.produto_quimico
        },
        variants: variantName ? {
          name: variantName,
          cost_per_unit: cost
        } : null
      }]);
    }

    setSelectedIngId('');
    setIngQuantity('');
    setIngSearchTerm('');
  };

  const handleRemoveIngredientFromFormula = (index: number) => {
    const updated = [...currentIngredients];
    updated.splice(index, 1);
    setCurrentIngredients(updated);
  };

  const handleSaveFormula = async () => {
    if (!currentFormula?.name || !currentFormula?.base_volume) {
      showNotify('info', 'Campos Obrigatórios', 'Preencha o nome e o volume base da fórmula.');
      return;
    }

    setIsSaving(true);
    try {
      let formulaId = currentFormula.id;

      const formulaData = {
        name: currentFormula.name,
        version: currentFormula.version || 'V1.0',
        base_volume: currentFormula.base_volume,
        status: currentFormula.status || 'draft',
        group_id: currentFormula.group_id || null,
        lm_code: currentFormula.lm_code || null,
        description: currentFormula.description || null,
        instructions: currentFormula.instructions || null,
        yield_amount: currentFormula.yield_amount || null,
        yield_unit: currentFormula.yield_unit || 'UN',
        batch_prefix: currentFormula.batch_prefix || null,
      };

      if (formulaId) {
        // Update existing
        const { error } = await supabase.from('formulas').update(formulaData).eq('id', formulaId);
        if (error) throw error;
        
        // Delete old ingredients
        await supabase.from('formula_ingredients').delete().eq('formula_id', formulaId);
      } else {
        // Insert new
        const { data, error } = await supabase.from('formulas').insert([formulaData]).select().single();
        if (error) throw error;
        formulaId = data.id;
      }

      // Insert new ingredients
      if (currentIngredients.length > 0 && formulaId) {
        const ingredientsToInsert = currentIngredients.map(ing => ({
          formula_id: formulaId,
          ingredient_id: ing.ingredient_id,
          variant_id: ing.variant_id || null,
          quantity: ing.quantity
        }));
        
        const { error: ingError } = await supabase.from('formula_ingredients').insert(ingredientsToInsert);
        if (ingError) throw ingError;
      }

      await fetchData();
      handleCloseEditor();
      showNotify('success', 'Fórmula Salva', 'Os dados da fórmula foram atualizados com sucesso.');
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      showNotify('error', 'Erro ao Salvar', 'Não foi possível salvar a fórmula. Verifique sua conexão e tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAsNewVersion = async () => {
    if (!currentFormula) return;
    
    // Increment version
    let newVersion = 'V1.0';
    if (currentFormula.version) {
      const match = currentFormula.version.match(/V(\d+)\.(\d+)/);
      if (match) {
        const major = parseInt(match[1]);
        const minor = parseInt(match[2]);
        newVersion = `V${major}.${minor + 1}`;
      }
    }

    // Create a copy without ID to force a new insert
    const newFormula = {
      ...currentFormula,
      id: undefined,
      version: newVersion,
      name: currentFormula.name.includes('(Nova Versão)') ? currentFormula.name : `${currentFormula.name} (Nova Versão)`
    };

    setCurrentFormula(newFormula);
    
    // We need to wait for state update or just call save with the new data
    // For simplicity, let's just update state and then the user can click save, 
    // OR we can perform the save immediately.
    // Let's perform the save immediately with the new data.
    
    setIsSaving(true);
    try {
      const formulaData = {
        name: newFormula.name,
        version: newFormula.version,
        base_volume: newFormula.base_volume,
        status: newFormula.status || 'draft',
        group_id: newFormula.group_id || null,
        lm_code: newFormula.lm_code || null,
        description: newFormula.description || null,
        instructions: newFormula.instructions || null,
        yield_amount: newFormula.yield_amount || null,
        yield_unit: newFormula.yield_unit || 'UN',
        batch_prefix: newFormula.batch_prefix || null,
      };

      const { data, error } = await supabase.from('formulas').insert([formulaData]).select().single();
      if (error) throw error;
      const newId = data.id;

      if (currentIngredients.length > 0 && newId) {
        const ingredientsToInsert = currentIngredients.map(ing => ({
          formula_id: newId,
          ingredient_id: ing.ingredient_id,
          variant_id: ing.variant_id || null,
          quantity: ing.quantity
        }));
        
        const { error: ingError } = await supabase.from('formula_ingredients').insert(ingredientsToInsert);
        if (ingError) throw ingError;
      }

      await fetchData();
      handleCloseEditor();
      showNotify('success', 'Nova Versão Salva', `A versão ${newVersion} da fórmula foi criada com sucesso.`);
    } catch (error: any) {
      console.error('Erro ao salvar nova versão:', error);
      showNotify('error', 'Erro ao Salvar', 'Não foi possível criar a nova versão.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteFormula = async (id: string) => {
    try {
      const { error } = await supabase.from('formulas').delete().eq('id', id);
      if (error) throw error;
      setDeleteModal({ isOpen: false, id: '', name: '' });
      fetchData();
      showNotify('success', 'Excluído', 'A fórmula foi removida com sucesso.');
    } catch (error) {
      console.error('Erro ao excluir:', error);
      showNotify('error', 'Erro ao Excluir', 'Não foi possível excluir a fórmula.');
    }
  };

  // --- Calculations ---
  const calculateTotalCost = (ingredients: FormulaIngredient[]) => {
    return ingredients.reduce((total, item) => {
      let cost = 0;
      
      // Prioritize variant cost over base ingredient cost
      const variantCost = item.variants?.cost_per_unit;
      const ingredientCost = item.ingredients?.cost_per_unit;

      if (variantCost !== undefined && variantCost !== null) {
        cost = typeof variantCost === 'string' 
          ? parseFloat(variantCost.replace(/\./g, '').replace(',', '.')) || 0 
          : variantCost;
      } else if (ingredientCost !== undefined && ingredientCost !== null) {
        cost = typeof ingredientCost === 'string' 
          ? parseFloat(ingredientCost.replace(/\./g, '').replace(',', '.')) || 0 
          : ingredientCost;
      }
      
      return total + (item.quantity * cost);
    }, 0);
  };

  const calculateTotalVolume = (ingredients: FormulaIngredient[]) => {
    return ingredients.reduce((total, item) => {
      // Somente contabiliza produtos químicos no volume total para cálculo de porcentagem
      if (item.ingredients?.produto_quimico) {
        return total + item.quantity;
      }
      return total;
    }, 0);
  };

  // --- Render Helpers ---
  const filteredFormulas = useMemo(() => {
    return formulas
      .filter(f => 
        f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.lm_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (f.groups?.name && f.groups.name.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      .sort((a, b) => {
        if (sortOrder === 'asc') {
          return a.name.localeCompare(b.name);
        } else {
          return b.name.localeCompare(a.name);
        }
      });
  }, [formulas, searchTerm, sortOrder]);

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'active': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'draft': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'archived': return 'bg-slate-100 text-slate-700 border-slate-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatusText = (status: string) => {
    switch(status) {
      case 'active': return 'Ativa';
      case 'draft': return 'Rascunho';
      case 'archived': return 'Arquivada';
      default: return status;
    }
  };

  // ==========================================
  // VIEW: EDITOR (Unified Screen)
  // ==========================================
  let mainContent;
  if (viewMode === 'editor' && currentFormula) {
    const totalCost = calculateTotalCost(currentIngredients);
    const totalVolume = calculateTotalVolume(currentIngredients);

    mainContent = (
      <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden relative">
        {/* Editor Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 z-10 shadow-sm">
          <div className="flex items-center gap-4">
            <button 
              onClick={handleCloseEditor}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                {currentFormula.id ? 'Editar Fórmula' : 'Nova Fórmula'}
                <span className="text-sm font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                  Versão: {currentFormula.version || 'V1.0'}
                </span>
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {currentFormula.id && (
              <button 
                onClick={handleSaveAsNewVersion}
                disabled={isSaving}
                className="px-4 py-2 text-amber-600 font-medium hover:bg-amber-50 rounded-lg transition-colors flex items-center gap-2 border border-amber-200 disabled:opacity-50"
                title="Cria uma nova versão mantendo a atual intacta"
              >
                <Copy className="w-4 h-4" />
                Salvar como Nova Versão
              </button>
            )}
            <button 
              onClick={handleCloseEditor}
              className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button 
              onClick={handleSaveFormula}
              disabled={isSaving}
              className="px-6 py-2 bg-[#202eac] hover:bg-blue-800 text-white font-bold rounded-lg transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Salvando...' : currentFormula.id ? 'Salvar Alterações' : 'Criar Fórmula'}
            </button>
          </div>
        </header>

        {/* Editor Body - Split Layout */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* LEFT COLUMN: Dados Cadastrais */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
                <h2 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Info className="w-4 h-4 text-[#202eac]" /> Dados Principais
                </h2>
                
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Nome do Produto *</label>
                  <input 
                    type="text" 
                    value={currentFormula.name || ''}
                    onChange={e => setCurrentFormula({...currentFormula, name: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
                    placeholder="Ex: Amaciante Floral"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Lista Material (LM)</label>
                    <input 
                      type="text" 
                      value={currentFormula.lm_code || ''}
                      onChange={e => setCurrentFormula({...currentFormula, lm_code: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
                      placeholder="LM-001"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Grupo</label>
                    <div className="flex gap-2">
                      <select 
                        value={currentFormula.group_id || ''}
                        onChange={e => setCurrentFormula({...currentFormula, group_id: e.target.value})}
                        className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
                      >
                        <option value="">Selecione...</option>
                        {groups.map(g => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                      <button 
                        onClick={handleOpenGroupModal}
                        className="p-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
                        title="Gerenciar Grupos"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Descrição</label>
                  <textarea 
                    value={currentFormula.description || ''}
                    onChange={e => setCurrentFormula({...currentFormula, description: e.target.value})}
                    rows={2}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all resize-none"
                    placeholder="Breve descrição da aplicação do produto..."
                  />
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
                <h2 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Package className="w-4 h-4 text-[#202eac]" /> Produção & Controle
                </h2>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Volume Base (L/Kg) *</label>
                    <input 
                      type="number" 
                      value={currentFormula.base_volume || ''}
                      onChange={e => setCurrentFormula({...currentFormula, base_volume: Number(e.target.value)})}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Status</label>
                    <select 
                      value={currentFormula.status || 'draft'}
                      onChange={e => setCurrentFormula({...currentFormula, status: e.target.value as any})}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
                    >
                      <option value="draft">Rascunho</option>
                      <option value="active">Ativa</option>
                      <option value="archived">Arquivada</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Rendimento</label>
                    <input 
                      type="number" 
                      value={currentFormula.yield_amount || ''}
                      onChange={e => setCurrentFormula({...currentFormula, yield_amount: Number(e.target.value)})}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
                      placeholder="Ex: 50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Unid. Rendimento</label>
                    <select 
                      value={currentFormula.yield_unit || 'UN'}
                      onChange={e => setCurrentFormula({...currentFormula, yield_unit: e.target.value})}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
                    >
                      <option value="UN">Unidades (UN)</option>
                      <option value="CX">Caixas (CX)</option>
                      <option value="GL">Galões (GL)</option>
                      <option value="LT">Litros (LT)</option>
                      <option value="KG">Kilogramas (KG)</option>
                      <option value="FD">Fardos (FD)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Prefixo do Lote</label>
                  <input 
                    type="text" 
                    value={currentFormula.batch_prefix || ''}
                    onChange={e => setCurrentFormula({...currentFormula, batch_prefix: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
                    placeholder="Ex: LOT-AMC"
                  />
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Composição & Instruções */}
            <div className="lg:col-span-8 space-y-6 flex flex-col">
              
              {/* Composição */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col flex-1">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-xl">
                  <h2 className="font-bold text-slate-800 flex items-center gap-2">
                    <Beaker className="w-5 h-5 text-[#202eac]" /> Composição da Fórmula
                    <span className="bg-[#202eac] text-white text-xs px-2 py-0.5 rounded-full ml-2">
                      {currentIngredients.length} itens
                    </span>
                  </h2>
                  <div className="text-sm font-medium text-slate-500">
                    Volume Base: <span className="text-[#202eac] font-bold">{currentFormula.base_volume || 0} L/Kg</span>
                  </div>
                </div>

                {/* Add Ingredient Bar */}
                <div className="p-4 border-b border-slate-100 bg-white flex gap-3 items-end">
                  <div className="flex-1 relative" ref={dropdownRef}>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Adicionar Insumo</label>
                    <div 
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus-within:bg-white focus-within:ring-2 focus-within:ring-[#202eac]/20 focus-within:border-[#202eac] transition-all flex items-center cursor-text"
                      onClick={() => setIsIngDropdownOpen(true)}
                    >
                      <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                      <input
                        type="text"
                        placeholder="Pesquisar insumo (ex: agu)..."
                        value={ingSearchTerm}
                        onChange={e => {
                          setIngSearchTerm(e.target.value);
                          setIsIngDropdownOpen(true);
                          if (selectedIngId) setSelectedIngId('');
                        }}
                        onFocus={() => setIsIngDropdownOpen(true)}
                        className="bg-transparent border-none outline-none w-full text-sm text-slate-800 placeholder:text-slate-400"
                      />
                      {selectedIngId && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedIngId('');
                            setIngSearchTerm('');
                          }}
                          className="ml-2 text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {isIngDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {filteredAndSortedIngredients.length > 0 ? (
                          filteredAndSortedIngredients.map(ing => {
                            const uniqueId = ing.isVariant ? `${ing.id}|${ing.variant_id}` : `${ing.id}|`;
                            return (
                              <div 
                                key={uniqueId}
                                className={`px-4 py-2.5 cursor-pointer hover:bg-slate-50 flex items-center justify-between border-b border-slate-50 last:border-0 ${selectedIngId === uniqueId ? 'bg-[#202eac]/5' : ''}`}
                                onClick={() => {
                                  setSelectedIngId(uniqueId);
                                  setIngSearchTerm(ing.displayName);
                                  setIsIngDropdownOpen(false);
                                  if (ingQuantity) {
                                    setIngQuantity(formatInputQuantity(ingQuantity, ing.produto_quimico));
                                  }
                                }}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-2 h-2 rounded-full ${ing.produto_quimico ? 'bg-amber-400' : 'bg-slate-300'}`}></div>
                                  <div>
                                    <div className="font-medium text-slate-800 text-sm">{ing.displayName}</div>
                                    {ing.apelido && <div className="text-xs text-slate-400 italic">{ing.apelido}</div>}
                                  </div>
                                </div>
                                <div className="text-xs font-bold text-slate-600">
                                  {formatCurrency(ing.cost_per_unit)}/{ing.unit}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="px-4 py-3 text-sm text-slate-500 text-center">
                            Nenhum insumo encontrado.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="w-32">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Qtd</label>
                    <input 
                      type="text" 
                      value={ingQuantity}
                      onChange={e => {
                        setIngQuantity(formatInputQuantity(e.target.value, selectedIngredient?.produto_quimico ?? true));
                      }}
                      disabled={!selectedIngId}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all disabled:opacity-50"
                      placeholder={selectedIngredient?.produto_quimico === false ? "0" : "0,000"}
                    />
                  </div>
                  <button 
                    onClick={handleAddIngredientToFormula}
                    disabled={!selectedIngId || !ingQuantity}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Adicionar
                  </button>
                </div>

                {/* Ingredients Tables */}
                <div className="flex-1 overflow-auto bg-slate-50/30 p-4 space-y-6">
                  {/* Matérias-Primas (Químicos) */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                      Matérias-Primas (Químicos)
                    </h3>
                    {currentIngredients.filter(item => item.ingredients?.produto_quimico).length === 0 ? (
                      <div className="flex flex-col items-center justify-center text-slate-400 py-8 border-2 border-dashed border-slate-200 rounded-xl bg-white">
                        <Beaker className="w-8 h-8 mb-2 text-slate-300" />
                        <p className="font-medium text-slate-500 text-sm">Nenhuma matéria-prima adicionada</p>
                      </div>
                    ) : (
                      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                            <tr>
                              <th className="py-3 px-4">Insumo</th>
                              <th className="py-3 px-4 text-right">Qtd Total</th>
                              <th className="py-3 px-4 text-center">%</th>
                              <th className="py-3 px-4 text-center">Unid.</th>
                              <th className="py-3 px-4 text-right">Val. Unit.</th>
                              <th className="py-3 px-4 text-right">Total</th>
                              <th className="py-3 px-4 text-center w-12"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {currentIngredients.map((item, index) => {
                              if (!item.ingredients?.produto_quimico) return null;
                              
                              const percentage = totalVolume > 0 ? (item.quantity / totalVolume) * 100 : 0;
                              const rawCost = item.variants?.cost_per_unit ?? item.ingredients?.cost_per_unit ?? 0;
                              const itemCostPerUnit = typeof rawCost === 'string' 
                                ? parseFloat(rawCost.replace(/\./g, '').replace(',', '.')) || 0 
                                : rawCost;
                              const cost = item.quantity * itemCostPerUnit;
                              
                              return (
                                <tr key={index} className="hover:bg-slate-50 transition-colors group">
                                  <td className="py-3 px-4 font-medium text-slate-800 flex items-center gap-2">
                                    <div>
                                      {item.ingredients?.name}
                                      {item.variants && (
                                        <span className="ml-2 text-xs text-slate-500 font-normal">
                                          ({item.variants.name})
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 text-right font-mono text-slate-700">
                                    {formatQuantity(item.quantity)}
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                      {percentage.toFixed(2)}%
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-center text-slate-500">
                                    {item.ingredients?.unit}
                                  </td>
                                  <td className="py-3 px-4 text-right text-slate-500">
                                    {formatCurrency(itemCostPerUnit)}
                                  </td>
                                  <td className="py-3 px-4 text-right font-bold text-slate-800">
                                    {formatCurrency(cost)}
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <button 
                                      onClick={() => handleRemoveIngredientFromFormula(index)}
                                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                                      title="Remover"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Material de Embalagem (BOM) */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                      Material de Embalagem (BOM)
                    </h3>
                    {currentIngredients.filter(item => !item.ingredients?.produto_quimico).length === 0 ? (
                      <div className="flex flex-col items-center justify-center text-slate-400 py-8 border-2 border-dashed border-slate-200 rounded-xl bg-white">
                        <Package className="w-8 h-8 mb-2 text-slate-300" />
                        <p className="font-medium text-slate-500 text-sm">Nenhum material de embalagem adicionado</p>
                      </div>
                    ) : (
                      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                            <tr>
                              <th className="py-3 px-4">Item</th>
                              <th className="py-3 px-4 text-right">Qtd</th>
                              <th className="py-3 px-4 text-center">Unid.</th>
                              <th className="py-3 px-4 text-right">Val. Unit.</th>
                              <th className="py-3 px-4 text-right">Total</th>
                              <th className="py-3 px-4 text-center w-12"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {currentIngredients.map((item, index) => {
                              if (item.ingredients?.produto_quimico) return null;
                              
                              const rawCost = item.variants?.cost_per_unit ?? item.ingredients?.cost_per_unit ?? 0;
                              const itemCostPerUnit = typeof rawCost === 'string' 
                                ? parseFloat(rawCost.replace(/\./g, '').replace(',', '.')) || 0 
                                : rawCost;
                              const cost = item.quantity * itemCostPerUnit;
                              
                              return (
                                <tr key={index} className="hover:bg-slate-50 transition-colors group">
                                  <td className="py-3 px-4 font-medium text-slate-800 flex items-center gap-2">
                                    <div>
                                      {item.ingredients?.name}
                                      {item.variants && (
                                        <span className="ml-2 text-xs text-slate-500 font-normal">
                                          ({item.variants.name})
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 text-right font-mono text-slate-700">
                                    {formatQuantity(item.quantity)}
                                  </td>
                                  <td className="py-3 px-4 text-center text-slate-500">
                                    {item.ingredients?.unit}
                                  </td>
                                  <td className="py-3 px-4 text-right text-slate-500">
                                    {formatCurrency(itemCostPerUnit)}
                                  </td>
                                  <td className="py-3 px-4 text-right font-bold text-slate-800">
                                    {formatCurrency(cost)}
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <button 
                                      onClick={() => handleRemoveIngredientFromFormula(index)}
                                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                                      title="Remover"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Total Cost Summary */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-center shadow-sm gap-4">
                    <div className="flex items-center gap-2">
                      {Math.abs(totalVolume - (currentFormula.base_volume || 0)) > 0.001 && (
                        <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg text-sm font-medium">
                          <AlertTriangle className="w-4 h-4" />
                          <span>Atenção: O volume total dos químicos ({totalVolume.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} L/Kg) difere do Volume Base ({currentFormula.base_volume || 0} L/Kg).</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-slate-700 uppercase tracking-wider text-xs">
                        Custo Total da Fórmula:
                      </span>
                      <span className="font-bold text-emerald-600 text-xl">
                        {formatCurrency(totalCost)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Observações / Instruções */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h2 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                  <FileText className="w-4 h-4 text-[#202eac]" /> Observações / Modo de Preparo
                </h2>
                <textarea 
                  value={currentFormula.instructions || ''}
                  onChange={e => setCurrentFormula({...currentFormula, instructions: e.target.value})}
                  rows={4}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all resize-none text-sm"
                  placeholder="Ex: 1. Adicionar água no reator. 2. Aquecer a 60°C. 3. Adicionar o componente A lentamente..."
                />
              </div>

            </div>
          </div>
        </div>
      </div>
    );
  } else {
    // ==========================================
    // VIEW: GRID / LIST (Main Screen)
    // ==========================================
    mainContent = (
      <>
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-8 py-6 shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              <Beaker className="w-6 h-6 text-[#202eac]" /> Fórmulas e Receitas
            </h1>
            <p className="text-sm text-slate-500 mt-1">Gerencie suas formulações, custos e proporções.</p>
          </div>
          <button 
            onClick={() => handleOpenEditor()}
            className="px-5 py-2.5 bg-[#202eac] hover:bg-blue-800 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <Plus className="w-5 h-5" /> Nova Fórmula
          </button>
        </div>

        {/* Filters & Controls */}
        <div className="mt-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-96">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar por nome, LM ou grupo..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-100 border-transparent focus:bg-white focus:border-[#202eac] focus:ring-2 focus:ring-[#202eac]/20 rounded-xl transition-all"
            />
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button 
                onClick={() => handleSetViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white text-[#202eac] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                title="Visualização em Lista"
              >
                <List className="w-5 h-5" />
              </button>
              <button 
                onClick={() => handleSetViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white text-[#202eac] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                title="Visualização em Grade"
              >
                <LayoutGrid className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setSortOrder('asc')}
                className={`p-2 rounded-lg transition-colors ${sortOrder === 'asc' ? 'bg-white text-[#202eac] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                title="Ordem Alfabética (A-Z)"
              >
                <ArrowDownAZ className="w-5 h-5" />
              </button>
              <button
                onClick={() => setSortOrder('desc')}
                className={`p-2 rounded-lg transition-colors ${sortOrder === 'desc' ? 'bg-white text-[#202eac] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                title="Ordem Alfabética (Z-A)"
              >
                <ArrowUpZA className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64">
            <div className="w-10 h-10 border-4 border-blue-200 border-t-[#202eac] rounded-full animate-spin mb-4"></div>
            <p className="text-slate-500 font-medium">Carregando fórmulas...</p>
          </div>
        ) : filteredFormulas.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto mt-10 shadow-sm">
            <div className="w-20 h-20 bg-blue-50 text-[#202eac] rounded-full flex items-center justify-center mx-auto mb-6">
              <Beaker className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Nenhuma fórmula encontrada</h3>
            <p className="text-slate-500 mb-8">Você ainda não cadastrou nenhuma fórmula ou a busca não retornou resultados.</p>
            <button 
              onClick={() => handleOpenEditor()}
              className="px-6 py-3 bg-[#202eac] hover:bg-blue-800 text-white font-bold rounded-xl transition-colors inline-flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-5 h-5" /> Criar Primeira Fórmula
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredFormulas.map((formula) => {
              const totalCost = calculateTotalCost(formula.formula_ingredients || []);
              const ingredients = formula.formula_ingredients || [];
              const topIngredients = ingredients.slice(0, 3); // Show top 3
              
              return (
                <div key={formula.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col group cursor-pointer" onClick={() => handleOpenEditor(formula)}>
                  <div className="p-4 border-b border-slate-100">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        {formula.groups?.name && (
                          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-0.5 block">
                            {formula.groups.name}
                          </span>
                        )}
                        <h3 className="text-base font-bold text-slate-800 leading-tight group-hover:text-[#202eac] transition-colors">{formula.name}</h3>
                        {formula.lm_code && (
                          <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">LM: {formula.lm_code}</span>
                        )}
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusColor(formula.status)}`}>
                        {getStatusText(formula.status)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-3 mt-3 text-xs">
                      <div className="flex items-center gap-1 text-slate-600 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">
                        <Beaker className="w-3.5 h-3.5 text-blue-500" />
                        <span className="font-semibold">{formula.base_volume} L</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-600 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="font-bold text-emerald-700">{formatCurrency(totalCost)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Ingredients Preview Block */}
                  <div className="p-4 flex-1 bg-slate-50/50">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <Package className="w-3 h-3" /> Composição ({ingredients.length})
                    </h4>
                    
                    {ingredients.length > 0 ? (
                      <div className="space-y-1.5">
                        {topIngredients.map((ing, idx) => (
                          <div key={idx} className="flex justify-between items-center text-xs">
                            <span className="text-slate-700 truncate pr-2 flex items-center gap-1.5">
                              <div className={`w-1 h-1 rounded-full ${ing.ingredients?.produto_quimico ? 'bg-amber-400' : 'bg-blue-400'}`}></div>
                              {ing.ingredients?.name}
                            </span>
                            <span className="text-slate-500 font-mono text-[10px] whitespace-nowrap">
                              {formatQuantity(ing.quantity)} {ing.ingredients?.unit}
                            </span>
                          </div>
                        ))}
                        {ingredients.length > 3 && (
                          <div className="text-[10px] text-slate-400 font-medium pt-0.5 italic">
                            + {ingredients.length - 3} outros insumos...
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">Nenhum insumo cadastrado.</p>
                    )}
                  </div>

                  <div className="p-3 border-t border-slate-100 bg-white flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteModal({ isOpen: true, id: formula.id, name: formula.name });
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicateFormula(formula);
                        }}
                        className="p-1.5 text-slate-400 hover:text-[#202eac] hover:bg-blue-50 rounded-lg transition-colors"
                        title="Duplicar / Nova Versão"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditor(formula);
                      }}
                      className="flex-1 py-1.5 bg-slate-100 hover:bg-[#202eac] text-[#202eac] hover:text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 text-xs"
                    >
                      Editar Receita <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm">
                  <th className="py-4 px-6 font-semibold">Nome da Fórmula</th>
                  <th className="py-4 px-6 font-semibold">Grupo</th>
                  <th className="py-4 px-6 font-semibold">Volume Base</th>
                  <th className="py-4 px-6 font-semibold">Custo Total</th>
                  <th className="py-4 px-6 font-semibold">Status</th>
                  <th className="py-4 px-6 font-semibold text-center w-12">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredFormulas.map((formula) => {
                  const totalCost = calculateTotalCost(formula.formula_ingredients || []);
                  return (
                    <tr key={formula.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => handleOpenEditor(formula)}>
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-800 group-hover:text-[#202eac] transition-colors">{formula.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">Versão: {formula.version} {formula.lm_code && `• LM: ${formula.lm_code}`}</div>
                      </td>
                      <td className="py-4 px-6 text-slate-600">
                        {formula.groups?.name || '-'}
                      </td>
                      <td className="py-4 px-6 text-slate-600 font-medium">
                        {formula.base_volume} L
                      </td>
                      <td className="py-4 px-6 font-bold text-emerald-600">
                        {formatCurrency(totalCost)}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusColor(formula.status)}`}>
                          {getStatusText(formula.status)}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center relative" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenDropdownId(openDropdownId === formula.id ? null : formula.id);
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>

                        {openDropdownId === formula.id && (
                          <div className="absolute right-4 top-12 w-36 bg-white rounded-xl shadow-xl border border-slate-200 z-50 py-1.5 animate-in fade-in zoom-in-95 duration-100 text-left">
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleOpenEditor(formula); setOpenDropdownId(null); }}
                              className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                            >
                              <Info className="w-4 h-4 text-blue-500" />
                              Editar
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDuplicateFormula(formula); setOpenDropdownId(null); }}
                              className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                            >
                              <Copy className="w-4 h-4 text-amber-500" />
                              Duplicar / Nova Versão
                            </button>
                            <div className="h-px bg-slate-100 my-1"></div>
                            <button 
                              onClick={(e) => { e.stopPropagation(); setDeleteModal({ isOpen: true, id: formula.id, name: formula.name }); setOpenDropdownId(null); }}
                              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                              Excluir
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 relative">
      {/* Notifications / Toasts */}
      {notification.show && (
        <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-right-full duration-300">
          <div className={`flex items-start gap-4 p-4 rounded-2xl shadow-2xl border min-w-[320px] ${
            notification.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
            notification.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
            'bg-blue-50 border-blue-200 text-blue-800'
          }`}>
            <div className={`p-2 rounded-xl ${
              notification.type === 'success' ? 'bg-emerald-100 text-emerald-600' :
              notification.type === 'error' ? 'bg-red-100 text-red-600' :
              'bg-blue-100 text-blue-600'
            }`}>
              {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : 
               notification.type === 'error' ? <AlertTriangle className="w-5 h-5" /> : 
               <Info className="w-5 h-5" />}
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-sm">{notification.title}</h4>
              <p className="text-xs mt-1 opacity-90">{notification.message}</p>
            </div>
            <button 
              onClick={() => setNotification(prev => ({ ...prev, show: false }))}
              className="p-1 hover:bg-black/5 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {mainContent}

      {/* Group Management Modal */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">Gerenciar Grupos</h2>
              <button onClick={() => setIsGroupModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Nome do grupo..."
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac]"
                />
                <button
                  onClick={handleSaveGroup}
                  disabled={isSavingGroup || !groupName.trim()}
                  className="px-4 py-2 bg-[#202eac] text-white rounded-lg hover:bg-blue-800 disabled:opacity-50 transition-colors"
                >
                  {editingGroupId ? 'Atualizar' : 'Adicionar'}
                </button>
                {editingGroupId && (
                  <button
                    onClick={() => {
                      setEditingGroupId(null);
                      setGroupName('');
                    }}
                    className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    Cancelar
                  </button>
                )}
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 sticky top-0">
                    <tr>
                      <th className="py-2 px-4 font-semibold">Nome do Grupo</th>
                      <th className="py-2 px-4 text-right font-semibold">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {groups.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="py-4 text-center text-slate-500">
                          Nenhum grupo cadastrado.
                        </td>
                      </tr>
                    ) : (
                      groups.map(group => (
                        <tr key={group.id} className="hover:bg-slate-50">
                          <td className="py-2 px-4">{group.name}</td>
                          <td className="py-2 px-4 text-right">
                            <button
                              onClick={() => handleEditGroup(group)}
                              className="p-1 text-slate-400 hover:text-[#202eac] transition-colors"
                              title="Editar"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteGroup(group.id)}
                              className="p-1 text-slate-400 hover:text-red-600 transition-colors ml-2"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Excluir Fórmula?</h3>
              <p className="text-slate-500 mb-6">
                Tem certeza que deseja excluir a fórmula <strong>{deleteModal.name}</strong>? Esta ação não pode ser desfeita e removerá todos os insumos associados.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeleteModal({ isOpen: false, id: '', name: '' })}
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => handleDeleteFormula(deleteModal.id)}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors"
                >
                  Sim, Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
