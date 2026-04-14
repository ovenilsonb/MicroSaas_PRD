import React, { useState, useEffect } from 'react';
import { X, Box, Beaker, ArrowRightLeft, List } from 'lucide-react';
import { Ingredient, Variant } from './types';
import { StockMovement } from './useInsumosData';
import StockMovementPanel from './StockMovementPanel';
import InsumoGeneralTab from './InsumoGeneralTab';
import InsumoTechnicalTab from './InsumoTechnicalTab';
import InsumoVariantsSection from './InsumoVariantsSection';
import InsumoUsageTab from './InsumoUsageTab';

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
      onLoadUsage(ingredient.id).catch(err => console.error('[InsumoModal] Error loading usage:', err));
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
  }, [ingredient, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const costStr = formData.cost_per_unit.trim();
    const cost = costStr ? parseFloat(costStr.replace(/\./g, '').replace(',', '.')) : 0;

    if (!formData.tem_variantes && (isNaN(cost) || cost < 0)) return;
    
    if (cost === 0 && !formData.tem_variantes) {
       // Alert already handled in service/UI if needed
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
                <>
                  <InsumoGeneralTab 
                    formData={formData} setFormData={setFormData} suppliers={suppliers} 
                    formatInputCurrency={formatInputCurrency} formatInputQuantity={formatInputQuantity} 
                  />
                  <InsumoVariantsSection 
                    formData={formData} setFormData={setFormData} suppliers={suppliers}
                    formatInputCurrency={formatInputCurrency} formatInputQuantity={formatInputQuantity}
                  />
                </>
              )}

              {activeTab === 'tecnicas' && (
                <InsumoTechnicalTab formData={formData} setFormData={setFormData} />
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
                <InsumoUsageTab usageFormulas={usageFormulas} isLoadingUsage={isLoadingUsage} />
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
