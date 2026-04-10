import React, { useState, useEffect } from 'react';
import { X, Box, Beaker, ArrowRightLeft, List, Pencil, Copy, Trash2, AlertCircle } from 'lucide-react';
import { Ingredient, Variant } from './types';
import { StockMovement } from './useInsumosData';
import StockMovementPanel from './StockMovementPanel';

interface InsumoModalProps {
  isOpen: boolean;
  ingredient: Ingredient | null;
  suppliers: { id: string; name: string }[];
  usageFormulas: any[];
  isLoadingUsage: boolean;
  stockMovements: StockMovement[];
  isLoadingMovements: boolean;
  isSaving: boolean;
  onClose: () => void;
  onSave: (formData: any) => void;
  onLoadVariants: (ingredientId: string) => Promise<Variant[]>;
  onLoadUsage: (ingredientId: string) => Promise<any[]>;
  onLoadMovements: (ingredientId: string) => Promise<StockMovement[]>;
  onAddMovement: (movement: any) => Promise<boolean>;
  onExportMovements: () => void;
  onDateFilterChange?: (filter: { startDate: string; endDate: string } | null) => void;
  dateFilter?: { startDate: string; endDate: string };
}

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
  }
  return parseInt(digits, 10).toString();
};

export default function InsumoModal({
  isOpen, ingredient, suppliers, usageFormulas, isLoadingUsage,
  stockMovements, isLoadingMovements, isSaving,
  onClose, onSave, onLoadVariants, onLoadUsage, onLoadMovements,
  onAddMovement, onExportMovements, onDateFilterChange, dateFilter,
}: InsumoModalProps) {
  const [activeTab, setActiveTab] = useState<'geral' | 'tecnicas' | 'estoque' | 'uso'>('geral');
  const [formData, setFormData] = useState({
    name: '', codigo: '', apelido: '', unit: 'L', cost_per_unit: '',
    fornecedor: '', supplier_id: '', validade_indeterminada: true, expiry_date: '',
    estoque_atual: '0,000', estoque_minimo: '0,000', produto_quimico: true,
    tem_variantes: false, peso_especifico: '', ph: '', temperatura: '',
    viscosidade: '', solubilidade: '', risco: '', variants: [] as Variant[]
  });
  const [newVariant, setNewVariant] = useState({ 
    name: '', 
    codigo: '', 
    cost_per_unit: '', 
    supplier_id: '',
    estoque_atual: '',
    estoque_minimo: ''
  });
  const [movementForm, setMovementForm] = useState({
    type: 'entrada' as 'entrada' | 'saida', quantity: '', note: '', batch: '',
  });

  useEffect(() => {
    if (ingredient) {
      setFormData({
        name: ingredient.name || '', codigo: ingredient.codigo || '', apelido: ingredient.apelido || '',
        unit: ingredient.unit || 'L',
        cost_per_unit: ingredient.cost_per_unit ? ingredient.cost_per_unit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '',
        fornecedor: ingredient.fornecedor || '', supplier_id: ingredient.supplier_id || '', validade_indeterminada: ingredient.validade_indeterminada ?? true,
        expiry_date: ingredient.expiry_date || '',
        estoque_atual: ingredient.estoque_atual ? ingredient.estoque_atual.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) : '0,000',
        estoque_minimo: ingredient.estoque_minimo ? ingredient.estoque_minimo.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 }) : '0,000',
        produto_quimico: ingredient.produto_quimico ?? true, tem_variantes: ingredient.tem_variantes ?? false,
        peso_especifico: ingredient.peso_especifico || '', ph: ingredient.ph || '',
        temperatura: ingredient.temperatura || '', viscosidade: ingredient.viscosidade || '',
        solubilidade: ingredient.solubilidade || '', risco: ingredient.risco || '', variants: []
      });
      if (ingredient.tem_variantes) {
        onLoadVariants(ingredient.id).then(variants => {
          if (variants.length > 0) setFormData(prev => ({ ...prev, variants }));
        }).catch(err => console.error('[InsumoModal] Error loading variants:', err));
      }
      onLoadUsage(ingredient.id).then(formulas => {
      }).catch(err => console.error('[InsumoModal] Error loading usage:', err));
      onLoadMovements(ingredient.id).catch(err => console.error('[InsumoModal] Error loading movements:', err));
    } else {
      setFormData({
        name: '', codigo: '', apelido: '', unit: 'L', cost_per_unit: '',
        fornecedor: '', supplier_id: '', validade_indeterminada: true, expiry_date: '',
        estoque_atual: '0,000', estoque_minimo: '0,000', produto_quimico: true,
        tem_variantes: false, peso_especifico: '', ph: '', temperatura: '',
        viscosidade: '', solubilidade: '', risco: '', variants: []
      });
    }
    setActiveTab('geral');
    setMovementForm({ type: 'entrada', quantity: '', note: '', batch: '' });
    setNewVariant({ 
      name: '', 
      codigo: '', 
      cost_per_unit: '', 
      supplier_id: '',
      estoque_atual: '',
      estoque_minimo: ''
    });
  }, [ingredient, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const costStr = formData.cost_per_unit.trim();
    const cost = costStr ? parseFloat(costStr.replace(/\./g, '').replace(',', '.')) : 0;

    if (!formData.tem_variantes && (isNaN(cost) || cost <= 0)) {
      return;
    }
    if (cost === 0 && !formData.tem_variantes) {
      const confirmed = window.alert('Atenção: Este insumo está com custo zero. Isso pode afetar cálculos de fórmulas e precificação.');
    }

    const payload = {
      id: ingredient?.id || undefined,
      name: formData.name, codigo: formData.codigo, apelido: formData.apelido, unit: formData.unit,
      cost_per_unit: cost, fornecedor: formData.fornecedor, supplier_id: formData.supplier_id || null, validade_indeterminada: formData.validade_indeterminada,
      expiry_date: formData.validade_indeterminada ? null : formData.expiry_date || null,
      estoque_atual: parseFloat(formData.estoque_atual.replace(/\./g, '').replace(',', '.')) || 0,
      estoque_minimo: parseFloat(formData.estoque_minimo.replace(/\./g, '').replace(',', '.')) || 0,
      produto_quimico: formData.produto_quimico, tem_variantes: formData.tem_variantes,
      peso_especifico: formData.peso_especifico, ph: formData.ph, temperatura: formData.temperatura,
      viscosidade: formData.viscosidade, solubilidade: formData.solubilidade, risco: formData.risco,
      variants: formData.variants.map(v => {
        const costValue = typeof v.cost_per_unit === 'string'
          ? parseFloat(v.cost_per_unit.replace(/\./g, '').replace(',', '.')) || 0
          : v.cost_per_unit || 0;
        return { ...v, cost_per_unit: costValue };
      })
    };
    onSave(payload);
  };

  const handleAddMovement = async () => {
    if (!ingredient?.id || !movementForm.quantity) return;
    const qty = parseFloat(movementForm.quantity.replace(/\./g, '').replace(',', '.'));
    if (isNaN(qty) || qty <= 0) return;

    const success = await onAddMovement({
      ingredient_id: ingredient.id, type: movementForm.type, quantity: qty,
      date: new Date().toISOString(), note: movementForm.note || undefined,
      batch: movementForm.batch || undefined,
    });

    if (success) {
      setMovementForm({ type: 'entrada', quantity: '', note: '', batch: '' });
      onLoadMovements(ingredient.id);
    }
  };

  if (!isOpen) return null;

  const displayIngredient = ingredient || {
    id: '', name: '', unit: 'UN', estoque_atual: 0, estoque_minimo: 0,
    validade_indeterminada: true, cost_per_unit: 0, variants: [], tem_variantes: false
  } as Ingredient;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
          <h2 className="text-lg font-bold text-slate-800">
            {ingredient ? 'Editar Insumo' : 'Novo Insumo'}
          </h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-6 bg-slate-50 p-1 rounded-lg border border-slate-100 w-fit">
              <button type="button" onClick={() => setActiveTab('geral')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'geral' ? 'bg-white text-[#202eac] shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}>
                <Box className="w-4 h-4" /> Geral
              </button>
              <button type="button" onClick={() => setActiveTab('tecnicas')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'tecnicas' ? 'bg-white text-[#202eac] shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}>
                <Beaker className="w-4 h-4" /> Informações Técnicas
              </button>
              {ingredient && (
                <button type="button" onClick={() => setActiveTab('estoque')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'estoque' ? 'bg-white text-[#202eac] shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}>
                  <ArrowRightLeft className="w-4 h-4" /> Movimentação
                </button>
              )}
              {ingredient && (
                <button type="button" onClick={() => setActiveTab('uso')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'uso' ? 'bg-white text-[#202eac] shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}>
                  <List className="w-4 h-4" /> Uso em Fórmulas
                </button>
              )}
            </div>

            <form id="insumo-form" onSubmit={handleSubmit} className="space-y-6">
              {activeTab === 'geral' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nome *</label>
                      <input type="text" required value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
                        placeholder="Ex: Ácido Cítrico" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Código</label>
                      <input type="text" value={formData.codigo}
                        onChange={e => setFormData({ ...formData, codigo: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
                        placeholder="Ex: ACID-CIT" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Apelido</label>
                      <input type="text" value={formData.apelido}
                        onChange={e => setFormData({ ...formData, apelido: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
                        placeholder="Ex: Ácido" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Unidade *</label>
                      <select value={formData.unit}
                        onChange={e => setFormData({ ...formData, unit: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all uppercase">
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
                        <input type="text" required={!formData.tem_variantes} value={formData.cost_per_unit}
                          onChange={e => setFormData({ ...formData, cost_per_unit: formatInputCurrency(e.target.value) })}
                          className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
                          placeholder="0,00" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Fornecedor Principal</label>
                      <div className="relative">
                        <select value={formData.supplier_id || formData.fornecedor || ''}
                          onChange={e => {
                            const selectedValue = e.target.value;
                            const selectedSupplier = suppliers.find(s => s.id === selectedValue || s.name === selectedValue);
                            setFormData({ 
                              ...formData, 
                              supplier_id: selectedSupplier ? selectedSupplier.id : '',
                              fornecedor: selectedSupplier ? selectedSupplier.name : selectedValue
                            });
                          }}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all appearance-none">
                          <option value="">Selecione um fornecedor...</option>
                          {suppliers.map(supplier => (
                            <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Categoria *</label>
                      <select value={formData.produto_quimico ? 'quimico' : 'embalagem'}
                        onChange={e => setFormData({ ...formData, produto_quimico: e.target.value === 'quimico' })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all">
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
                        <input type="checkbox" className="sr-only peer" checked={formData.validade_indeterminada}
                          onChange={e => setFormData({ ...formData, validade_indeterminada: e.target.checked })} />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#202eac]"></div>
                      </label>
                    </div>
                    {!formData.validade_indeterminada && (
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Data de Validade</label>
                        <input type="date" required={!formData.validade_indeterminada} value={formData.expiry_date}
                          onChange={e => setFormData({ ...formData, expiry_date: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all" />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Estoque Atual</label>
                      <input type="text" value={formData.estoque_atual}
                        onChange={e => setFormData({ ...formData, estoque_atual: formatInputQuantity(e.target.value, formData.produto_quimico) })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
                        placeholder={formData.produto_quimico ? "0,000" : "0"} />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Estoque Mínimo</label>
                      <input type="text" value={formData.estoque_minimo}
                        onChange={e => setFormData({ ...formData, estoque_minimo: formatInputQuantity(e.target.value, formData.produto_quimico) })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
                        placeholder={formData.produto_quimico ? "0,000" : "0"} />
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="p-4 bg-white flex items-center justify-between border-b border-slate-100">
                      <div>
                        <label className="block text-sm font-semibold text-slate-800">Tem Variantes?</label>
                        <p className="text-xs text-slate-500 mt-0.5">Ex: Essência com múltiplos aromas</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={formData.tem_variantes}
                          onChange={e => setFormData({ ...formData, tem_variantes: e.target.checked })} />
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
                                  <div className="flex flex-col">
                                    <span className="font-bold text-[#202eac] text-sm">
                                      R$ {typeof v.cost_per_unit === 'number' ? v.cost_per_unit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : v.cost_per_unit || '0,00'}
                                    </span>
                                    {v.supplier_id && (
                                      <span className="text-[10px] text-slate-400 truncate max-w-[100px]">
                                        {suppliers.find(s => s.id === v.supplier_id)?.name || 'Fornecedor'}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-right">
                                    <span className={`text-xs font-bold ${Number(v.estoque_atual) <= Number(v.estoque_minimo || 0) ? 'text-red-500' : 'text-slate-600'}`}>
                                      {v.estoque_atual || '0'} {formData.unit}
                                    </span>
                                  </div>
                                </div>
                                <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-slate-200 rounded-lg shadow-md flex items-center p-1 gap-1">
                                  <button type="button" title="Editar Variante"
                                    onClick={() => {
                                      setNewVariant({ 
                                        name: v.name, 
                                        codigo: v.codigo || '', 
                                        cost_per_unit: typeof v.cost_per_unit === 'number' ? v.cost_per_unit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : v.cost_per_unit?.toString() || '',
                                        supplier_id: v.supplier_id || '',
                                        estoque_atual: v.estoque_atual?.toString() || '',
                                        estoque_minimo: v.estoque_minimo?.toString() || ''
                                      });
                                      const updated = [...formData.variants];
                                      const originalIdx = formData.variants.findIndex(orig => orig.name === v.name && orig.codigo === v.codigo);
                                      if (originalIdx !== -1) { updated.splice(originalIdx, 1); setFormData({ ...formData, variants: updated }); }
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button type="button" title="Duplicar Variante"
                                    onClick={() => setFormData({ ...formData, variants: [...formData.variants, { ...v, name: `${v.name} (Cópia)` }] })}
                                    className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors">
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>
                                  <button type="button" title="Deletar Variante"
                                    onClick={() => {
                                      const updated = [...formData.variants];
                                      const originalIdx = formData.variants.findIndex(orig => orig.name === v.name && orig.codigo === v.codigo);
                                      if (originalIdx !== -1) { updated.splice(originalIdx, 1); setFormData({ ...formData, variants: updated }); }
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                          <div className="flex gap-3">
                            <div className="flex-1">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Nome da Variante</label>
                              <input type="text" placeholder="Ex: Fragrância Lavanda" value={newVariant.name}
                                onChange={e => setNewVariant({ ...newVariant, name: e.target.value })}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac]" />
                            </div>
                            <div className="w-28">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Código</label>
                              <input type="text" placeholder="SKU-001" value={newVariant.codigo}
                                onChange={e => setNewVariant({ ...newVariant, codigo: e.target.value })}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac]" />
                            </div>
                            <div className="w-28">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Custo Un.</label>
                              <input type="text" placeholder="0,00" value={newVariant.cost_per_unit}
                                onChange={e => setNewVariant({ ...newVariant, cost_per_unit: formatInputCurrency(e.target.value) })}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac]" />
                            </div>
                          </div>
                          <div className="flex gap-3 items-end">
                            <div className="flex-1">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Fornecedor da Variante</label>
                              <select 
                                value={newVariant.supplier_id}
                                onChange={e => setNewVariant({ ...newVariant, supplier_id: e.target.value })}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac]"
                              >
                                <option value="">Mesmo do Insumo Pai</option>
                                {suppliers.map(s => (
                                  <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                              </select>
                            </div>
                            <div className="w-24">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Estoque</label>
                              <input type="text" placeholder="0" value={newVariant.estoque_atual}
                                onChange={e => setNewVariant({ ...newVariant, estoque_atual: formatInputQuantity(e.target.value, formData.produto_quimico) })}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac]" />
                            </div>
                            <div className="w-24">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Mínimo</label>
                              <input type="text" placeholder="0" value={newVariant.estoque_minimo}
                                onChange={e => setNewVariant({ ...newVariant, estoque_minimo: formatInputQuantity(e.target.value, formData.produto_quimico) })}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac]" />
                            </div>
                            <button type="button" onClick={() => {
                              if (newVariant.name) {
                                // Convert numeric values back to numbers for the Variant interface
                                const vCost = typeof newVariant.cost_per_unit === 'string' ? parseFloat(newVariant.cost_per_unit.replace(/\./g, '').replace(',', '.')) || 0 : 0;
                                const vStock = typeof newVariant.estoque_atual === 'string' ? parseFloat(newVariant.estoque_atual.replace(/\./g, '').replace(',', '.')) || 0 : 0;
                                const vMin = typeof newVariant.estoque_minimo === 'string' ? parseFloat(newVariant.estoque_minimo.replace(/\./g, '').replace(',', '.')) || 0 : 0;
                                
                                setFormData({ 
                                  ...formData, 
                                  variants: [...formData.variants, { 
                                    ...newVariant, 
                                    cost_per_unit: vCost,
                                    estoque_atual: vStock,
                                    estoque_minimo: vMin
                                  } as Variant] 
                                });
                                setNewVariant({ name: '', codigo: '', cost_per_unit: '', supplier_id: '', estoque_atual: '', estoque_minimo: '' });
                              }
                            }} className="h-[38px] px-4 bg-[#202eac] text-white text-sm font-bold rounded-lg hover:bg-blue-800 transition-colors shadow-sm shadow-blue-100 shrink-0">
                              Adicionar
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'tecnicas' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Peso Específico</label>
                      <input type="text" value={formData.peso_especifico}
                        onChange={e => setFormData({ ...formData, peso_especifico: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
                        placeholder="Ex: 0.8 g/cm³" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">pH</label>
                      <input type="text" value={formData.ph}
                        onChange={e => setFormData({ ...formData, ph: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
                        placeholder="Ex: 7.0" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Temperatura</label>
                      <input type="text" value={formData.temperatura}
                        onChange={e => setFormData({ ...formData, temperatura: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
                        placeholder="Ex: 20°C" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Viscosidade</label>
                      <input type="text" value={formData.viscosidade}
                        onChange={e => setFormData({ ...formData, viscosidade: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
                        placeholder="Ex: 2.5 cP" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Solubilidade</label>
                    <input type="text" value={formData.solubilidade}
                      onChange={e => setFormData({ ...formData, solubilidade: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
                      placeholder="Ex: Totalmente solúvel em água" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Risco</label>
                    <input type="text" value={formData.risco}
                      onChange={e => setFormData({ ...formData, risco: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
                      placeholder="Ex: R36/37/38 - Irritante" />
                  </div>
                </div>
              )}

              {activeTab === 'estoque' && ingredient && (
                <StockMovementPanel
                  ingredient={displayIngredient}
                  movements={stockMovements}
                  isLoadingMovements={isLoadingMovements}
                  movementForm={movementForm}
                  onFormChange={setMovementForm}
                  onAddMovement={handleAddMovement}
                  onExportMovements={onExportMovements}
                  dateFilter={dateFilter}
                  onDateFilterChange={onDateFilterChange}
                />
              )}

              {activeTab === 'uso' && ingredient && (
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
                                <p className="text-xs text-slate-500 mt-0.5">Versão: {f.version || 'v1.0'}</p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="p-12 text-center text-slate-500 flex flex-col items-center">
                          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
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
          <button type="button" onClick={onClose} disabled={isSaving}
            className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50">
            Cancelar
          </button>
          <button type="submit" form="insumo-form" disabled={isSaving}
            className="px-6 py-2 bg-[#202eac] text-white font-medium rounded-lg hover:bg-blue-800 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2">
            {isSaving ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Salvando...</>
            ) : 'Salvar Alterações'}
          </button>
        </div>
      </div>
    </div>
  );
}
