import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useStorageMode } from '../contexts/StorageModeContext';
import { Plus, Trash2, Search, X, Package, Beaker, TestTubes, Component, ArrowRightLeft, Box, AlertCircle, Copy, AlertTriangle, List, LayoutGrid, ArrowDownAZ, ArrowUpZA, CheckCircle2, Info, MoreVertical, TrendingUp, DollarSign, Pencil, Download, Upload } from 'lucide-react';
import { exportToJson, importFromJson, getBackupFilename } from '../lib/backupUtils';
import { generateId } from '../lib/id';

interface Variant {
  id?: string;
  name: string;
  codigo: string;
  cost_per_unit?: number | string;
}

interface Ingredient {
  id: string;
  name: string;
  codigo?: string;
  apelido?: string;
  unit: string;
  cost_per_unit: number;
  fornecedor?: string;
  validade_indeterminada?: boolean;
  expiry_date?: string;
  estoque_atual?: number;
  estoque_minimo?: number;
  produto_quimico?: boolean;
  tem_variantes?: boolean;
  peso_especifico?: string;
  ph?: string;
  temperatura?: string;
  viscosidade?: string;
  solubilidade?: string;
  risco?: string;
  created_at: string;
  variants?: Variant[];
}

export default function Insumos() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const { mode } = useStorageMode();
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(() => {
    const saved = localStorage.getItem('insumosViewMode');
    return (saved as 'list' | 'grid') || 'list';
  });

  const handleSetViewMode = (mode: 'list' | 'grid') => {
    setViewMode(mode);
    localStorage.setItem('insumosViewMode', mode);
  };
  const [sortField, setSortField] = useState<keyof Ingredient>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'geral' | 'tecnicas' | 'estoque' | 'uso'>('geral');
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string; name: string; formulas: any[]; isLoading: boolean }>({ isOpen: false, id: '', name: '', formulas: [], isLoading: false });

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
  const [usageFormulas, setUsageFormulas] = useState<any[]>([]);
  const [isLoadingUsage, setIsLoadingUsage] = useState(false);

  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = () => setOpenDropdownId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleExport = () => {
    try {
      const filename = getBackupFilename('Insumos');
      exportToJson(filename, ingredients);
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

      // If in Supabase mode, we should ideally upsert to the database
      // For now, let's update the local state and handle persistence based on mode
      if (mode === 'supabase') {
        showNotify('info', 'Importando...', 'Sincronizando dados com o Supabase...');

        // This is a simplified import for Supabase, bulk upsert would be better
        for (const item of data) {
          const { error } = await supabase.from('ingredients').upsert({
            ...item,
            variants: undefined // Don't upsert nested variants directly in this call
          });
          if (error) console.error(`Erro ao importar ${item.name}:`, error);
        }
        await fetchIngredients();
      } else {
        const localData = JSON.parse(localStorage.getItem('local_ingredients') || '[]');
        const newData = [...localData];

        data.forEach((item: any) => {
          const index = newData.findIndex(i => i.id === item.id);
          if (index >= 0) {
            newData[index] = item;
          } else {
            newData.push(item);
          }
        });

        localStorage.setItem('local_ingredients', JSON.stringify(newData));
        setIngredients(newData);
      }

      showNotify('success', 'Importação Concluída', `${data.length} insumos foram processados.`);
    } catch (err: any) {
      showNotify('error', 'Erro na Importação', err.message || 'Falha ao importar arquivo.');
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const formatInputCurrency = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (!digits) return '';
    const number = parseInt(digits, 10) / 100;
    return number.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatInputQuantity = (value: string, isChemical: boolean = true) => {
    const digits = value.replace(/\D/g, '');
    if (!digits) return '';

    if (isChemical) {
      const number = parseInt(digits, 10) / 1000;
      return number.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
    } else {
      return parseInt(digits, 10).toString();
    }
  };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    codigo: '',
    apelido: '',
    unit: 'L',
    cost_per_unit: '',
    fornecedor: '',
    validade_indeterminada: true,
    expiry_date: '',
    estoque_atual: '0,000',
    estoque_minimo: '0,000',
    produto_quimico: true,
    tem_variantes: false,
    peso_especifico: '',
    ph: '',
    temperatura: '',
    viscosidade: '',
    solubilidade: '',
    risco: '',
    variants: [] as Variant[]
  });
  const [newVariant, setNewVariant] = useState({ name: '', codigo: '', cost_per_unit: '' });

  useEffect(() => {
    fetchIngredients();
    fetchSuppliers();
  }, [mode]);

  const fetchSuppliers = async () => {
    try {
      if (mode === 'supabase') {
        const { data, error } = await supabase
          .from('suppliers')
          .select('id, name')
          .order('name');

        if (error) {
          if (error.code !== '42P01') throw error;
        } else {
          setSuppliers(data || []);
        }
      } else {
        const localSuppliers = JSON.parse(localStorage.getItem('local_suppliers') || '[]');
        setSuppliers(localSuppliers);
      }
    } catch (error) {
      console.error('Erro ao buscar fornecedores:', error);
    }
  };

  const fetchIngredients = async () => {
    setIsLoading(true);
    try {
      if (mode === 'supabase') {
        const { data, error } = await supabase
          .from('ingredients')
          .select('*, variants:ingredient_variants(*)')
          .order('name');

        if (error) throw error;
      } else {
        // Fetch from Local Storage
        let localIngredients = JSON.parse(localStorage.getItem('local_ingredients') || '[]');

        // Populate with sample data if empty
        if (localIngredients.length === 0) {
          localIngredients = [
            {
              id: generateId(),
              name: 'Água Desmineralizada',
              unit: 'L',
              cost_per_unit: 0.50,
              produto_quimico: true,
              created_at: new Date().toISOString(),
              estoque_atual: 1000,
              estoque_minimo: 100
            },
            {
              id: generateId(),
              name: 'Essência de Lavanda',
              unit: 'L',
              cost_per_unit: 45.00,
              produto_quimico: true,
              created_at: new Date().toISOString(),
              estoque_atual: 10,
              estoque_minimo: 2
            },
            {
              id: generateId(),
              name: 'Frasco 500ml',
              unit: 'UN',
              cost_per_unit: 1.20,
              produto_quimico: false,
              created_at: new Date().toISOString(),
              estoque_atual: 500,
              estoque_minimo: 50
            }
          ];
          localStorage.setItem('local_ingredients', JSON.stringify(localIngredients));
        }

        setIngredients(localIngredients);
      }
    } catch (error) {
      console.error('Erro ao buscar insumos:', error);
      showNotify('error', 'Erro de Carregamento', 'Não foi possível carregar a lista de insumos.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = async (ingredient?: Ingredient) => {
    if (ingredient) {
      setEditingId(ingredient.id);
      setFormData({
        name: ingredient.name || '',
        codigo: ingredient.codigo || '',
        apelido: ingredient.apelido || '',
        unit: ingredient.unit || 'L',
        cost_per_unit: ingredient.cost_per_unit ? ingredient.cost_per_unit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '',
        fornecedor: ingredient.fornecedor || '',
        validade_indeterminada: ingredient.validade_indeterminada ?? true,
        expiry_date: ingredient.expiry_date || '',
        estoque_atual: ingredient.estoque_atual ? ingredient.estoque_atual.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) : '0,000',
        estoque_minimo: ingredient.estoque_minimo ? ingredient.estoque_minimo.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) : '0,000',
        produto_quimico: ingredient.produto_quimico ?? true,
        tem_variantes: ingredient.tem_variantes ?? false,
        peso_especifico: ingredient.peso_especifico || '',
        ph: ingredient.ph || '',
        temperatura: ingredient.temperatura || '',
        viscosidade: ingredient.viscosidade || '',
        solubilidade: ingredient.solubilidade || '',
        risco: ingredient.risco || '',
        variants: []
      });

      // Fetch variants
      if (ingredient.tem_variantes) {
        try {
          const { data: variantsData, error: variantsError } = await supabase
            .from('ingredient_variants')
            .select('*')
            .eq('ingredient_id', ingredient.id);

          if (!variantsError && variantsData) {
            setFormData(prev => ({ ...prev, variants: variantsData }));
          }
        } catch (err) {
          console.error('Erro ao buscar variantes:', err);
        }
      }

      if (mode === 'supabase') {
        setIsLoadingUsage(true);
        try {
          const { data, error } = await supabase
            .from('formula_ingredients')
            .select(`
              formula_id,
              formulas (
                id,
                name,
                version
              )
            `)
            .eq('ingredient_id', ingredient.id);

          if (!error && data) {
            const formulas = data.map(d => d.formulas).filter(Boolean);
            setUsageFormulas(formulas);
          }
        } catch (err) {
          console.error('Erro ao buscar uso do insumo:', err);
        } finally {
          setIsLoadingUsage(false);
        }
      } else {
        // Modo Local: Busca nas fórmulas do localStorage
        setIsLoadingUsage(true);
        try {
          const localFormulas = JSON.parse(localStorage.getItem('local_formulas') || '[]');
          const formulasUsing = localFormulas.filter((f: any) =>
            f.formula_ingredients?.some((fi: any) => fi.ingredient_id === ingredient.id)
          ).map((f: any) => ({
            id: f.id,
            name: f.name,
            version: f.version || 'V1'
          }));
          setUsageFormulas(formulasUsing);
        } catch (err) {
          console.error('Erro ao buscar uso local do insumo:', err);
        } finally {
          setIsLoadingUsage(false);
        }
      }
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        codigo: '',
        apelido: '',
        unit: 'L',
        cost_per_unit: '',
        fornecedor: '',
        validade_indeterminada: true,
        expiry_date: '',
        estoque_atual: '0,000',
        estoque_minimo: '0,000',
        produto_quimico: true,
        tem_variantes: false,
        peso_especifico: '',
        ph: '',
        temperatura: '',
        viscosidade: '',
        solubilidade: '',
        risco: '',
        variants: []
      });
      setUsageFormulas([]);
    }
    setActiveTab('geral');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const costStr = formData.cost_per_unit.trim();
    const cost = costStr ? parseFloat(costStr.replace(/\./g, '').replace(',', '.')) : 0;

    // Se não tem variantes, o custo é obrigatório
    if (!formData.tem_variantes && (isNaN(cost) || cost <= 0)) {
      showNotify('info', 'Dados Inválidos', 'O valor unitário é obrigatório para insumos sem variantes.');
      return;
    }

    const payload: any = {
      name: formData.name,
      codigo: formData.codigo,
      apelido: formData.apelido,
      unit: formData.unit,
      cost_per_unit: cost,
      fornecedor: formData.fornecedor,
      validade_indeterminada: formData.validade_indeterminada,
      expiry_date: formData.validade_indeterminada ? null : formData.expiry_date || null,
      estoque_atual: parseFloat(formData.estoque_atual.replace(/\./g, '').replace(',', '.')) || 0,
      estoque_minimo: parseFloat(formData.estoque_minimo.replace(/\./g, '').replace(',', '.')) || 0,
      produto_quimico: formData.produto_quimico,
      tem_variantes: formData.tem_variantes,
      peso_especifico: formData.peso_especifico,
      ph: formData.ph,
      temperatura: formData.temperatura,
      viscosidade: formData.viscosidade,
      solubilidade: formData.solubilidade,
      risco: formData.risco
    };

    try {
      let savedIngredientId = editingId;

      if (mode === 'supabase') {
        if (editingId) {
          const { error } = await supabase
            .from('ingredients')
            .update(payload)
            .eq('id', editingId);
          if (error) throw error;
        } else {
          const { data, error } = await supabase
            .from('ingredients')
            .insert([payload])
            .select()
            .single();
          if (error) throw error;
          savedIngredientId = data.id;
        }

        // Handle variants in Supabase
        if (savedIngredientId) {
          if (formData.tem_variantes) {
            await supabase.from('ingredient_variants').delete().eq('ingredient_id', savedIngredientId);
            if (formData.variants.length > 0) {
              const variantsToInsert = formData.variants.map(v => ({
                ingredient_id: savedIngredientId,
                name: v.name,
                codigo: v.codigo,
                cost_per_unit: typeof v.cost_per_unit === 'string' ? parseFloat(v.cost_per_unit.replace(/\./g, '').replace(',', '.')) || 0 : v.cost_per_unit || 0
              }));
              const { error: variantError } = await supabase.from('ingredient_variants').insert(variantsToInsert);
              if (variantError) throw variantError;
            }
          } else {
            await supabase.from('ingredient_variants').delete().eq('ingredient_id', savedIngredientId);
          }
        }
      } else {
        // Local Logic
        const localIngredients = JSON.parse(localStorage.getItem('local_ingredients') || '[]');
        const ingredientData = {
          ...payload,
          id: editingId || generateId(),
          created_at: editingId ? (localIngredients.find((i: any) => i.id === editingId)?.created_at || new Date().toISOString()) : new Date().toISOString(),
          variants: formData.variants.map(v => ({
            ...v,
            id: v.id || generateId(),
            cost_per_unit: typeof v.cost_per_unit === 'string' ? parseFloat(v.cost_per_unit.replace(/\./g, '').replace(',', '.')) || 0 : v.cost_per_unit || 0
          }))
        };

        if (editingId) {
          const index = localIngredients.findIndex((i: any) => i.id === editingId);
          if (index >= 0) localIngredients[index] = ingredientData;
        } else {
          localIngredients.push(ingredientData);
        }
        localStorage.setItem('local_ingredients', JSON.stringify(localIngredients));
      }

      handleCloseModal();
      fetchIngredients();
      showNotify('success', 'Sucesso!', editingId ? 'Insumo atualizado com sucesso.' : 'Insumo cadastrado com sucesso.');
    } catch (error) {
      console.error('Erro ao salvar insumo:', error);
      showNotify('error', 'Erro ao Salvar', 'Não foi possível salvar o insumo.');
    }
  };

  const handleDuplicate = async (ing: Ingredient) => {
    setEditingId(null); // É um novo registro

    let variantsToCopy: Variant[] = [];
    if (ing.tem_variantes) {
      try {
        const { data } = await supabase
          .from('ingredient_variants')
          .select('*')
          .eq('ingredient_id', ing.id);
        if (data) {
          variantsToCopy = data.map(v => ({ name: v.name, codigo: v.codigo }));
        }
      } catch (err) {
        console.error('Erro ao buscar variantes para cópia:', err);
      }
    }

    setFormData({
      name: `${ing.name || ''} (Cópia)`,
      codigo: ing.codigo ? `${ing.codigo}-COPY` : '',
      apelido: ing.apelido || '',
      unit: ing.unit || 'L',
      cost_per_unit: ing.cost_per_unit ? ing.cost_per_unit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '',
      fornecedor: ing.fornecedor || '',
      validade_indeterminada: ing.validade_indeterminada ?? true,
      expiry_date: ing.expiry_date || '',
      estoque_atual: '0', // Zera o estoque na cópia
      estoque_minimo: ing.estoque_minimo?.toString() || '0',
      produto_quimico: ing.produto_quimico ?? true,
      tem_variantes: ing.tem_variantes ?? false,
      peso_especifico: ing.peso_especifico || '',
      ph: ing.ph || '',
      temperatura: ing.temperatura || '',
      viscosidade: ing.viscosidade || '',
      solubilidade: ing.solubilidade || '',
      risco: ing.risco || '',
      variants: variantsToCopy
    });
    setActiveTab('geral');
    setIsModalOpen(true);
  };

  const confirmDelete = async (id: string, name: string) => {
    setDeleteModal({ isOpen: true, id, name, formulas: [], isLoading: true });
    try {
      if (mode === 'supabase') {
        const { data, error } = await supabase
          .from('formula_ingredients')
          .select(`
            formula_id,
            formulas (
              id,
              name,
              version
            )
          `)
          .eq('ingredient_id', id);

        if (error) throw error;

        const formulas = data?.map(d => d.formulas).filter(Boolean) || [];
        setDeleteModal({ isOpen: true, id, name, formulas, isLoading: false });
      } else {
        // Modo Local: Verifica uso nos dados do localStorage
        const localFormulas = JSON.parse(localStorage.getItem('local_formulas') || '[]');
        const formulasUsingIngredient = localFormulas.filter((f: any) =>
          f.formula_ingredients?.some((ing: any) => ing.ingredient_id === id)
        );

        setDeleteModal({
          isOpen: true,
          id,
          name,
          formulas: formulasUsingIngredient.map((f: any) => ({
            id: f.id,
            name: f.name,
            version: f.version
          })),
          isLoading: false
        });
      }
    } catch (error) {
      console.error('Erro ao verificar uso do insumo:', error);
      setDeleteModal({ isOpen: true, id, name, formulas: [], isLoading: false });
    }
  };

  const executeDelete = async () => {
    try {
      if (mode === 'supabase') {
        const { error } = await supabase
          .from('ingredients')
          .delete()
          .eq('id', deleteModal.id);
        if (error) throw error;
      } else {
        const localIngredients = JSON.parse(localStorage.getItem('local_ingredients') || '[]');
        const filtered = localIngredients.filter((i: any) => i.id !== deleteModal.id);
        localStorage.setItem('local_ingredients', JSON.stringify(filtered));
      }

      setDeleteModal({ isOpen: false, id: '', name: '', formulas: [], isLoading: false });
      fetchIngredients();
      showNotify('success', 'Excluído', 'O insumo foi removido com sucesso.');
    } catch (error) {
      console.error('Erro ao excluir insumo:', error);
      setDeleteModal({ isOpen: false, id: '', name: '', formulas: [], isLoading: false });
      showNotify('error', 'Erro ao Excluir', 'Não foi possível excluir o insumo.');
    }
  };

  const filteredIngredients = useMemo(() => {
    return ingredients
      .filter(ing => ing.name.toLowerCase().includes(searchTerm.toLowerCase()) || ing.codigo?.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => {
        const aValue = a[sortField];
        const bValue = b[sortField];

        if (aValue === bValue) return 0;

        if (aValue === undefined || aValue === null) return sortOrder === 'asc' ? 1 : -1;
        if (bValue === undefined || bValue === null) return sortOrder === 'asc' ? -1 : 1;

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
        }

        if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;

        return 0;
      });
  }, [ingredients, searchTerm, sortField, sortOrder]);

  const stats = useMemo(() => {
    const total = ingredients.length;
    const lowStock = ingredients.filter(ing => {
      const atual = ing.estoque_atual || 0;
      const minimo = ing.estoque_minimo || 0;
      return atual <= minimo && total > 0;
    }).length;
    const chemical = ingredients.filter(ing => ing.produto_quimico).length;
    const investment = ingredients.reduce((acc, ing) => {
      const cost = typeof ing.cost_per_unit === 'number' ? ing.cost_per_unit : 0;
      return acc + ((ing.estoque_atual || 0) * cost);
    }, 0);

    return { total, lowStock, chemical, investment };
  }, [ingredients]);

  const handleSort = (field: keyof Ingredient) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
      {/* Notifications / Toasts */}
      {notification.show && (
        <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-right-full duration-300">
          <div className={`flex items-start gap-4 p-4 rounded-2xl shadow-2xl border min-w-[320px] ${notification.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
              notification.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
                'bg-blue-50 border-blue-200 text-blue-800'
            }`}>
            <div className={`p-2 rounded-xl ${notification.type === 'success' ? 'bg-emerald-100 text-emerald-600' :
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

      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <Package className="w-6 h-6 text-[#202eac]" />
            Insumos e Matérias-Primas
          </h1>
          <p className="text-sm text-slate-500 mt-1">Gerencie seu catálogo de ingredientes e custos</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="cursor-pointer px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium flex items-center gap-2 transition-colors shadow-sm">
            <Upload className="w-4 h-4 text-emerald-600" /> Importar
            <input type="file" accept=".json" className="hidden" onChange={handleImport} />
          </label>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium flex items-center gap-2 transition-colors shadow-sm"
          >
            <Download className="w-4 h-4 text-[#202eac]" /> Exportar
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-[#202eac] text-white rounded-lg hover:bg-blue-800 font-medium flex items-center gap-2 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Adicionar Insumo
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Insumos */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col group hover:border-[#202eac] transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-blue-50 text-[#202eac] rounded-xl flex items-center justify-center">
                  <Package className="w-5 h-5" />
                </div>
              </div>
              <p className="text-slate-500 text-sm font-medium">Total de Insumos</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{stats.total}</h3>
            </div>

            {/* Estoque Baixo */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col group hover:border-red-500 transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                {stats.lowStock > 0 && (
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                )}
              </div>
              <p className="text-slate-500 text-sm font-medium">Estoque Baixo</p>
              <h3 className={`text-2xl font-bold mt-1 ${stats.lowStock > 0 ? 'text-red-600' : 'text-slate-800'}`}>
                {stats.lowStock}
              </h3>
            </div>

            {/* Investimento */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col group hover:border-emerald-500 transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <p className="text-slate-500 text-sm font-medium">Valor em Estoque</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">
                {stats.investment.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </h3>
            </div>

            {/* Produtos Químicos */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col group hover:border-amber-500 transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                  <Beaker className="w-5 h-5" />
                </div>
              </div>
              <p className="text-slate-500 text-sm font-medium">Produtos Químicos</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{stats.chemical}</h3>
            </div>
          </div>

          {/* Search Bar and Controls */}
          <div className="flex items-center gap-4">
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 flex-1">
              <Search className="w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar insumos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 outline-none text-slate-700"
              />
            </div>

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
                title="Visualização em Blocos"
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

          {/* Content Area */}
          {isLoading ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center text-slate-500">
              Carregando insumos...
            </div>
          ) : filteredIngredients.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center text-slate-500">
              Nenhum insumo encontrado. Clique em "Adicionar Insumo" para começar.
            </div>
          ) : viewMode === 'list' ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-sm">
                    <th className="py-4 px-4 font-semibold w-32 text-left cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('validade_indeterminada')}>
                      Validade {sortField === 'validade_indeterminada' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="py-4 px-4 font-semibold cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('name')}>
                      Nome / Código {sortField === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="py-4 px-4 font-semibold w-20 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('unit')}>
                      Unidade {sortField === 'unit' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="py-4 px-4 font-semibold w-32 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('cost_per_unit')}>
                      Valor {sortField === 'cost_per_unit' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="py-4 px-4 font-semibold w-24 text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('tem_variantes')}>
                      Variantes? {sortField === 'tem_variantes' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="py-4 px-4 font-semibold w-32 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('fornecedor')}>
                      Fornecedor {sortField === 'fornecedor' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="py-4 px-4 font-semibold w-32 text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('estoque_atual')}>
                      Estoque {sortField === 'estoque_atual' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="py-4 px-4 font-semibold w-24 text-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('produto_quimico')}>
                      Tipo {sortField === 'produto_quimico' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredIngredients.map((ing) => {
                    const estoqueAtual = ing.estoque_atual || 0;
                    const estoqueMinimo = ing.estoque_minimo || 0;
                    const isEstoqueBaixo = estoqueAtual <= estoqueMinimo;

                    const maxEstoqueVisual = estoqueMinimo > 0 ? estoqueMinimo * 3 : 100;
                    const percentualEstoque = Math.min(100, Math.max(0, (estoqueAtual / (maxEstoqueVisual || 1)) * 100));

                    let validityColor = 'bg-slate-300';
                    let validityTitle = 'Validade Indeterminada';
                    let validityText = 'Indeterminada';

                    if (!ing.validade_indeterminada && ing.expiry_date) {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);

                      const [year, month, day] = ing.expiry_date.split('-');
                      const expDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

                      const twoMonthsFromNow = new Date(today);
                      twoMonthsFromNow.setMonth(twoMonthsFromNow.getMonth() + 2);

                      validityText = `${day}/${month}/${year}`;

                      if (expDate < today) {
                        validityColor = 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]';
                        validityTitle = 'Vencido';
                      } else if (expDate <= twoMonthsFromNow) {
                        validityColor = 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]';
                        validityTitle = 'Próximo do vencimento';
                      } else {
                        validityColor = 'bg-emerald-500';
                        validityTitle = 'Dentro do prazo';
                      }
                    } else if (!ing.validade_indeterminada) {
                      validityTitle = 'Data de validade não informada';
                      validityText = 'Não inf.';
                      validityColor = 'bg-slate-200';
                    }

                    return (
                      <tr key={ing.id} className="hover:bg-blue-50/80 even:bg-slate-100/60 transition-colors group border-b border-slate-200/60 last:border-none cursor-pointer" onClick={() => handleOpenModal(ing)}>
                        {/* Validade */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-3 h-3 rounded-full shrink-0 ${validityColor}`}
                              title={validityTitle}
                            ></div>
                            <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">
                              {validityText}
                            </span>
                          </div>
                        </td>

                        {/* Nome / Código */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-800 uppercase">{ing.name}</div>
                          <div className="text-xs text-slate-400 italic mt-0.5">{ing.codigo || 'S/ CÓDIGO'}</div>
                        </td>

                        {/* Unidade */}
                        <td className="py-3 px-4 text-slate-600 font-medium">
                          {ing.unit?.toUpperCase()}
                        </td>

                        {/* Valor */}
                        <td className="py-3 px-4">
                          {ing.tem_variantes && ing.variants && ing.variants.length > 0 ? (
                            <div className="flex flex-col">
                              {(() => {
                                const costs = ing.variants.map(v => typeof v.cost_per_unit === 'string' ? parseFloat(v.cost_per_unit.replace(/\./g, '').replace(',', '.')) || 0 : v.cost_per_unit || 0);
                                const minCost = Math.min(...costs);
                                const maxCost = Math.max(...costs);
                                if (minCost === maxCost) {
                                  return (
                                    <span className="font-bold text-slate-800">{formatCurrency(minCost)}</span>
                                  );
                                }
                                return (
                                  <>
                                    <span className="font-bold text-slate-800 text-sm" title="Menor valor">{formatCurrency(minCost)}</span>
                                    <span className="text-xs text-slate-500 font-medium mt-0.5" title="Maior valor">até {formatCurrency(maxCost)}</span>
                                  </>
                                );
                              })()}
                            </div>
                          ) : (
                            <span className="font-bold text-slate-800">{formatCurrency(ing.cost_per_unit)}</span>
                          )}
                        </td>

                        {/* Variantes? */}
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-1 text-[10px] font-bold rounded-md ${ing.tem_variantes
                              ? 'bg-purple-100 text-purple-700 border border-purple-200'
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                            }`}>
                            {ing.tem_variantes ? 'SIM' : 'NÃO'}
                          </span>
                        </td>

                        {/* Fornecedor */}
                        <td className="py-3 px-4 text-slate-500 text-sm uppercase">
                          {ing.fornecedor || '-'}
                        </td>

                        {/* Estoque */}
                        <td className="py-3 px-4 text-center">
                          <div className={`font-bold ${isEstoqueBaixo ? 'text-red-500' : 'text-emerald-600'}`}>
                            {estoqueAtual}
                          </div>
                          <div className="w-full h-1.5 bg-slate-200 rounded-full mt-1.5 overflow-hidden flex">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${isEstoqueBaixo
                                  ? 'bg-red-500'
                                  : 'bg-gradient-to-r from-amber-400 to-emerald-500'
                                }`}
                              style={{ width: `${percentualEstoque}%` }}
                            ></div>
                          </div>
                        </td>

                        {/* Tipo e Ações (Hover) */}
                        <td className="py-3 px-4 text-center relative">
                          {ing.produto_quimico ? (
                            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center mx-auto" title="Produto Químico">
                              <TestTubes className="w-4.5 h-4.5" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-600 border border-slate-200 flex items-center justify-center mx-auto" title="Outros">
                              <Component className="w-4 h-4" />
                            </div>
                          )}

                          {/* Hover Actions (Floating) */}
                          <div
                            className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm p-1 rounded-lg border border-slate-200 shadow-sm"
                            onClick={e => e.stopPropagation()}
                          >
                            <button
                              onClick={(e) => { e.stopPropagation(); handleOpenModal(ing); }}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                              title="Editar"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDuplicate(ing); }}
                              className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors"
                              title="Duplicar"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); confirmDelete(ing.id, ing.name); }}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredIngredients.map((ing) => {
                const estoqueAtual = ing.estoque_atual || 0;
                const estoqueMinimo = ing.estoque_minimo || 0;
                const isEstoqueBaixo = estoqueAtual <= estoqueMinimo;
                const maxEstoqueVisual = estoqueMinimo > 0 ? estoqueMinimo * 3 : 100;
                const percentualEstoque = Math.min(100, Math.max(0, (estoqueAtual / (maxEstoqueVisual || 1)) * 100));

                return (
                  <div
                    key={ing.id}
                    onClick={() => handleOpenModal(ing)}
                    className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group relative"
                  >
                    <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm rounded-lg p-1 shadow-sm border border-slate-100" onClick={(e) => e.stopPropagation()}>
                      <button onClick={(e) => { e.stopPropagation(); handleDuplicate(ing); }} className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors" title="Duplicar">
                        <Copy className="w-4 h-4" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); confirmDelete(ing.id, ing.name); }} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Excluir">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {ing.produto_quimico ? (
                          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                            <Beaker className="w-4.5 h-4.5" />
                          </div>
                        ) : (
                          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                            <Package className="w-4.5 h-4.5" />
                          </div>
                        )}
                        <div>
                          <h3 className="font-bold text-slate-800 uppercase line-clamp-1 pr-16 text-sm">{ing.name}</h3>
                          <p className="text-[10px] text-slate-400 italic">{ing.codigo || 'S/ CÓDIGO'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100 col-span-2">
                        <p className="text-[10px] text-slate-500 font-medium mb-1.5">Valor Unitário</p>
                        {ing.tem_variantes && ing.variants && ing.variants.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {[...ing.variants].sort((a, b) => {
                              const costA = typeof a.cost_per_unit === 'string' ? parseFloat(a.cost_per_unit.replace(/\./g, '').replace(',', '.')) || 0 : a.cost_per_unit || 0;
                              const costB = typeof b.cost_per_unit === 'string' ? parseFloat(b.cost_per_unit.replace(/\./g, '').replace(',', '.')) || 0 : b.cost_per_unit || 0;
                              return costA - costB;
                            }).map((v, idx) => (
                              <div key={idx} className="flex items-center justify-between text-[10px] bg-white px-2 py-1 rounded border border-slate-200">
                                <span className="text-slate-600 font-medium truncate max-w-[120px]" title={v.name}>{v.name}</span>
                                <span className="font-bold text-slate-800 ml-2">
                                  {formatCurrency(typeof v.cost_per_unit === 'string' ? parseFloat(v.cost_per_unit.replace(/\./g, '').replace(',', '.')) || 0 : v.cost_per_unit || 0)}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="font-bold text-slate-800 text-sm">{formatCurrency(ing.cost_per_unit)} <span className="text-[10px] font-normal text-slate-500">/ {ing.unit?.toUpperCase()}</span></p>
                        )}
                      </div>
                      <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100 col-span-2">
                        <p className="text-[10px] text-slate-500 font-medium mb-0.5">Fornecedor</p>
                        <p className="font-bold text-slate-800 text-xs uppercase line-clamp-1">{ing.fornecedor || '-'}</p>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] text-slate-500 font-medium">Estoque Atual</p>
                        <p className={`text-xs font-bold ${isEstoqueBaixo ? 'text-red-500' : 'text-emerald-600'}`}>
                          {estoqueAtual} {ing.unit?.toUpperCase()}
                        </p>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden flex">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${isEstoqueBaixo ? 'bg-red-500' : 'bg-gradient-to-r from-amber-400 to-emerald-500'
                            }`}
                          style={{ width: `${percentualEstoque}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <h2 className="text-lg font-bold text-slate-800">
                {editingId ? 'Editar Insumo' : 'Novo Insumo'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="p-6">
                {/* Tabs */}
                <div className="flex items-center gap-2 mb-6 bg-slate-50 p-1 rounded-lg border border-slate-100 w-fit">
                  <button
                    type="button"
                    onClick={() => setActiveTab('geral')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'geral'
                        ? 'bg-white text-[#202eac] shadow-sm border border-slate-200'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                  >
                    <Box className="w-4 h-4" />
                    Geral
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('tecnicas')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'tecnicas'
                        ? 'bg-white text-[#202eac] shadow-sm border border-slate-200'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                  >
                    <Beaker className="w-4 h-4" />
                    Informações Técnicas
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('estoque')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'estoque'
                        ? 'bg-white text-[#202eac] shadow-sm border border-slate-200'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                  >
                    <ArrowRightLeft className="w-4 h-4" />
                    Movimentação de Estoque
                  </button>
                  {editingId && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('uso')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'uso'
                          ? 'bg-white text-[#202eac] shadow-sm border border-slate-200'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                    >
                      <List className="w-4 h-4" />
                      Uso em Fórmulas
                    </button>
                  )}
                </div>

                <form id="insumo-form" onSubmit={handleSave} className="space-y-6">

                  {/* TAB: GERAL */}
                  {activeTab === 'geral' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nome *</label>
                          <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
                            placeholder="Ex: Ácido Cítrico"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Código</label>
                          <input
                            type="text"
                            value={formData.codigo}
                            onChange={e => setFormData({ ...formData, codigo: e.target.value })}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
                            placeholder="Ex: ACID-CIT"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Apelido</label>
                          <input
                            type="text"
                            value={formData.apelido}
                            onChange={e => setFormData({ ...formData, apelido: e.target.value })}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
                            placeholder="Ex: Ácido Cítrico"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Unidade *</label>
                          <select
                            value={formData.unit}
                            onChange={e => setFormData({ ...formData, unit: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all uppercase"
                          >
                            <option value="L">Litros (L)</option>
                            <option value="KG">Quilogramas (kg)</option>
                            <option value="G">Gramas (g)</option>
                            <option value="ML">Mililitros (ml)</option>
                            <option value="UN">Unidade (un)</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                            Valor Unitário {!formData.tem_variantes && '*'}
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">R$</span>
                            <input
                              type="text"
                              required={!formData.tem_variantes}
                              value={formData.cost_per_unit}
                              onChange={e => setFormData({ ...formData, cost_per_unit: formatInputCurrency(e.target.value) })}
                              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
                              placeholder="0,00"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Fornecedor Principal</label>
                          <div className="relative">
                            <select
                              value={formData.fornecedor}
                              onChange={e => setFormData({ ...formData, fornecedor: e.target.value })}
                              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all appearance-none"
                            >
                              <option value="">Selecione um fornecedor...</option>
                              {suppliers.map(supplier => (
                                <option key={supplier.id} value={supplier.name}>{supplier.name}</option>
                              ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Categoria *</label>
                          <select
                            value={formData.produto_quimico ? 'quimico' : 'embalagem'}
                            onChange={e => setFormData({ ...formData, produto_quimico: e.target.value === 'quimico' })}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
                          >
                            <option value="quimico">Matéria-Prima (Química)</option>
                            <option value="embalagem">Material de Embalagem</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-semibold text-slate-800">Validade Indeterminada</label>
                          <p className="text-xs text-slate-500 mt-0.5">Produto não possui data de validade</p>
                          <label className="relative inline-flex items-center cursor-pointer mt-2">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={formData.validade_indeterminada}
                              onChange={e => setFormData({ ...formData, validade_indeterminada: e.target.checked })}
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#202eac]"></div>
                          </label>
                        </div>
                        {!formData.validade_indeterminada && (
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Data de Validade</label>
                            <input
                              type="date"
                              required={!formData.validade_indeterminada}
                              value={formData.expiry_date}
                              onChange={e => setFormData({ ...formData, expiry_date: e.target.value })}
                              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
                            />
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Estoque Atual</label>
                          <input
                            type="text"
                            value={formData.estoque_atual}
                            onChange={e => setFormData({ ...formData, estoque_atual: formatInputQuantity(e.target.value, formData.produto_quimico) })}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
                            placeholder={formData.produto_quimico ? "0,000" : "0"}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Estoque Mínimo</label>
                          <input
                            type="text"
                            value={formData.estoque_minimo}
                            onChange={e => setFormData({ ...formData, estoque_minimo: formatInputQuantity(e.target.value, formData.produto_quimico) })}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
                            placeholder={formData.produto_quimico ? "0,000" : "0"}
                          />
                        </div>
                      </div>

                      <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <div className="p-4 bg-white flex items-center justify-between border-b border-slate-100">
                          <div>
                            <label className="block text-sm font-semibold text-slate-800">Tem Variantes?</label>
                            <p className="text-xs text-slate-500 mt-0.5">Ex: Essência com múltiplos aromas</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={formData.tem_variantes}
                              onChange={e => setFormData({ ...formData, tem_variantes: e.target.checked })}
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#202eac]"></div>
                          </label>
                        </div>
                        {formData.tem_variantes && (
                          <div className="p-4 bg-slate-50">
                            <label className="block text-sm font-semibold text-slate-700 mb-3">Variantes</label>

                            {formData.variants.length > 0 && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                                {[...formData.variants].sort((a, b) => {
                                  const costA = typeof a.cost_per_unit === 'string' ? parseFloat(a.cost_per_unit.replace(/\./g, '').replace(',', '.')) || 0 : a.cost_per_unit || 0;
                                  const costB = typeof b.cost_per_unit === 'string' ? parseFloat(b.cost_per_unit.replace(/\./g, '').replace(',', '.')) || 0 : b.cost_per_unit || 0;
                                  return costA - costB;
                                }).map((v, idx) => (
                                  <div key={idx} className="relative group bg-white p-3 border border-slate-200 rounded-xl hover:border-[#202eac]/30 hover:shadow-sm transition-all flex flex-col justify-between min-h-[80px]">
                                    <div>
                                      <div className="flex items-start justify-between">
                                        <span className="font-bold text-slate-800 text-sm line-clamp-1 pr-2" title={v.name}>{v.name}</span>
                                        {v.codigo && <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{v.codigo}</span>}
                                      </div>
                                    </div>
                                    <div className="mt-2 flex items-end justify-between">
                                      <span className="font-bold text-[#202eac] text-sm">
                                        R$ {typeof v.cost_per_unit === 'number' ? v.cost_per_unit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : v.cost_per_unit || '0,00'}
                                      </span>
                                    </div>

                                    {/* Hover Actions */}
                                    <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-slate-200 rounded-lg shadow-md flex items-center p-1 gap-1">
                                      <button
                                        type="button"
                                        title="Editar Variante"
                                        onClick={() => {
                                          setNewVariant({
                                            name: v.name,
                                            codigo: v.codigo || '',
                                            cost_per_unit: typeof v.cost_per_unit === 'number' ? v.cost_per_unit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : v.cost_per_unit?.toString() || ''
                                          });
                                          const updated = [...formData.variants];
                                          const originalIdx = formData.variants.findIndex(orig => orig.name === v.name && orig.codigo === v.codigo);
                                          if (originalIdx !== -1) {
                                            updated.splice(originalIdx, 1);
                                            setFormData({ ...formData, variants: updated });
                                          }
                                        }}
                                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        title="Duplicar Variante"
                                        onClick={() => {
                                          const suffix = ' (Cópia)';
                                          setFormData({
                                            ...formData,
                                            variants: [...formData.variants, { ...v, name: `${v.name}${suffix}` }]
                                          });
                                        }}
                                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                                      >
                                        <Copy className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        title="Deletar Variante"
                                        onClick={() => {
                                          const updated = [...formData.variants];
                                          const originalIdx = formData.variants.findIndex(orig => orig.name === v.name && orig.codigo === v.codigo);
                                          if (originalIdx !== -1) {
                                            updated.splice(originalIdx, 1);
                                            setFormData({ ...formData, variants: updated });
                                          }
                                        }}
                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="flex gap-3">
                              <input
                                type="text"
                                placeholder="Nome"
                                value={newVariant.name}
                                onChange={e => setNewVariant({ ...newVariant, name: e.target.value })}
                                className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac]"
                              />
                              <input
                                type="text"
                                placeholder="Código"
                                value={newVariant.codigo}
                                onChange={e => setNewVariant({ ...newVariant, codigo: e.target.value })}
                                className="w-24 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac]"
                              />
                              <input
                                type="text"
                                placeholder="0,00"
                                value={newVariant.cost_per_unit}
                                onChange={e => setNewVariant({ ...newVariant, cost_per_unit: formatInputCurrency(e.target.value) })}
                                className="w-24 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac]"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  if (newVariant.name) {
                                    setFormData({
                                      ...formData,
                                      variants: [...formData.variants, { ...newVariant }]
                                    });
                                    setNewVariant({ name: '', codigo: '', cost_per_unit: '' });
                                  }
                                }}
                                className="px-4 py-2 bg-[#202eac] text-white text-sm font-medium rounded-lg hover:bg-blue-800 transition-colors"
                              >
                                Adicionar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB: INFORMAÇÕES TÉCNICAS */}
                  {activeTab === 'tecnicas' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Peso Específico</label>
                          <input
                            type="text"
                            value={formData.peso_especifico}
                            onChange={e => setFormData({ ...formData, peso_especifico: e.target.value })}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
                            placeholder="Ex: 0.8 g/cm³"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">pH</label>
                          <input
                            type="text"
                            value={formData.ph}
                            onChange={e => setFormData({ ...formData, ph: e.target.value })}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
                            placeholder="Ex: 7.0"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Temperatura</label>
                          <input
                            type="text"
                            value={formData.temperatura}
                            onChange={e => setFormData({ ...formData, temperatura: e.target.value })}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
                            placeholder="Ex: 20°C"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Viscosidade</label>
                          <input
                            type="text"
                            value={formData.viscosidade}
                            onChange={e => setFormData({ ...formData, viscosidade: e.target.value })}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
                            placeholder="Ex: 2.5 cP"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Solubilidade</label>
                        <input
                          type="text"
                          value={formData.solubilidade}
                          onChange={e => setFormData({ ...formData, solubilidade: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
                          placeholder="Ex: Totalmente solúvel em água"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Risco</label>
                        <input
                          type="text"
                          value={formData.risco}
                          onChange={e => setFormData({ ...formData, risco: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
                          placeholder="Ex: R36/37/38 - Irritante"
                        />
                      </div>
                    </div>
                  )}

                  {/* TAB: MOVIMENTAÇÃO DE ESTOQUE */}
                  {activeTab === 'estoque' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">

                      <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-6 flex items-center justify-between relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-[#202eac]"></div>
                        <div>
                          <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Saldo Atual em Estoque</p>
                          <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-bold text-[#202eac]">{formData.estoque_atual || '0,00'}</span>
                            <span className="text-blue-600 font-medium">{formData.unit?.toUpperCase()}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-medium text-slate-500 mb-1">Estoque Mínimo: {formData.estoque_minimo || '0'} {formData.unit?.toUpperCase()}</p>
                          {parseFloat(formData.estoque_atual) <= parseFloat(formData.estoque_minimo) && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-red-100 text-red-700 text-xs font-bold">
                              <AlertCircle className="w-3 h-3" />
                              Estoque Baixo
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="border-t border-slate-200 pt-6">
                        <div className="flex items-center gap-4 mb-4">
                          <button type="button" className="px-4 py-2 bg-slate-100 text-slate-800 text-sm font-semibold rounded-lg flex items-center gap-2">
                            <ArrowRightLeft className="w-4 h-4" /> Histórico
                          </button>
                          <button type="button" className="px-4 py-2 text-slate-500 hover:text-slate-800 text-sm font-medium transition-colors">
                            Nova Entrada
                          </button>
                          <button type="button" className="px-4 py-2 text-slate-500 hover:text-slate-800 text-sm font-medium transition-colors">
                            Nova Saída
                          </button>
                        </div>

                        <div className="flex gap-3 mb-4">
                          <div className="relative flex-1">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              placeholder="Buscar por lote, fornecedor, documento..."
                              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac]"
                            />
                          </div>
                          <select className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac]">
                            <option>Todas as Movimentações</option>
                            <option>Entradas</option>
                            <option>Saídas</option>
                          </select>
                        </div>

                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                          <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                              <tr>
                                <th className="py-3 px-4 font-medium">Data</th>
                                <th className="py-3 px-4 font-medium">Tipo</th>
                                <th className="py-3 px-4 font-medium text-right">Quantidade</th>
                                <th className="py-3 px-4 font-medium text-right">Saldo</th>
                                <th className="py-3 px-4 font-medium">Origem/Destino</th>
                                <th className="py-3 px-4 font-medium">Lote/Doc</th>
                                <th className="py-3 px-4 font-medium">Usuário</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td colSpan={7} className="py-12 text-center text-slate-500">
                                  Nenhuma movimentação encontrada.
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                    </div>
                  )}

                  {/* TAB: USO EM FÓRMULAS */}
                  {activeTab === 'uso' && editingId && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                            <Beaker className="w-5 h-5 text-[#202eac]" />
                            Fórmulas que utilizam este insumo
                          </h3>
                          <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-1 rounded-full">
                            {usageFormulas.length} {usageFormulas.length === 1 ? 'fórmula' : 'fórmulas'}
                          </span>
                        </div>

                        <div className="p-0">
                          {isLoadingUsage ? (
                            <div className="p-8 text-center text-slate-500">
                              <div className="w-8 h-8 border-4 border-[#202eac] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                              <p>Buscando fórmulas...</p>
                            </div>
                          ) : usageFormulas.length > 0 ? (
                            <ul className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                              {usageFormulas.map((f: any) => (
                                <li key={f.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                                    <Beaker className="w-5 h-5" />
                                  </div>
                                  <div>
                                    <h4 className="font-medium text-slate-800">{f.name}</h4>
                                    <p className="text-xs text-slate-500 mt-0.5">Versão: {f.version || 'V1'}</p>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <div className="p-12 text-center text-slate-500 flex flex-col items-center">
                              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                <Package className="w-8 h-8 text-slate-400" />
                              </div>
                              <p className="text-lg font-medium text-slate-700 mb-1">Nenhuma fórmula encontrada</p>
                              <p className="text-sm">Este insumo ainda não foi adicionado a nenhuma fórmula.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                </form>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="insumo-form"
                className="px-6 py-2 bg-[#202eac] text-white font-medium rounded-lg hover:bg-blue-800 transition-colors shadow-sm"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Excluir Insumo</h3>

              {deleteModal.isLoading ? (
                <div className="mb-6">
                  <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-sm text-slate-500">Verificando uso em fórmulas...</p>
                </div>
              ) : deleteModal.formulas && deleteModal.formulas.length > 0 ? (
                <div className="mb-6 text-left">
                  <p className="text-red-600 font-medium mb-3 text-center text-sm">
                    Não é possível excluir este insumo porque ele está atrelado {deleteModal.formulas.length === 1 ? 'à seguinte fórmula' : 'às seguintes fórmulas'}:
                  </p>
                  <ul className="bg-red-50 border border-red-100 rounded-lg p-3 text-sm text-red-800 max-h-32 overflow-y-auto space-y-2">
                    {deleteModal.formulas.map((f: any) => (
                      <li key={f.id} className="flex items-center gap-2">
                        <Beaker className="w-4 h-4 shrink-0 opacity-70" />
                        <span className="font-medium truncate">{f.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-slate-600 mb-6">
                  Tem certeza que deseja excluir <strong>{deleteModal.name}</strong>? Esta ação não poderá ser desfeita.
                </p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteModal({ isOpen: false, id: '', name: '', formulas: [], isLoading: false })}
                  className="flex-1 px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
                >
                  {(!deleteModal.isLoading && deleteModal.formulas && deleteModal.formulas.length > 0) ? 'Entendi' : 'Cancelar'}
                </button>
                {(!deleteModal.isLoading && (!deleteModal.formulas || deleteModal.formulas.length === 0)) && (
                  <button
                    onClick={executeDelete}
                    className="flex-1 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                  >
                    Sim, Excluir
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
