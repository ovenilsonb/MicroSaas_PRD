import React, { useState } from 'react';
import { Pencil, Copy, Trash2 } from 'lucide-react';
import { Variant } from './types';

interface InsumoVariantsSectionProps {
  formData: any;
  setFormData: (data: any) => void;
  suppliers: { id: string; name: string }[];
  formatInputCurrency: (value: string) => string;
  formatInputQuantity: (value: string, isChemical?: boolean) => string;
}

export default function InsumoVariantsSection({
  formData, setFormData, suppliers, formatInputCurrency, formatInputQuantity
}: InsumoVariantsSectionProps) {
  const [newVariant, setNewVariant] = useState({ 
    name: '', 
    codigo: '', 
    cost_per_unit: '', 
    supplier_id: '',
    estoque_atual: '',
    estoque_minimo: ''
  });

  const handleAddVariant = () => {
    if (newVariant.name) {
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
  };

  const handleRemoveVariant = (idx: number) => {
    const updated = [...formData.variants];
    updated.splice(idx, 1);
    setFormData({ ...formData, variants: updated });
  };

  const handleEditVariant = (v: Variant, idx: number) => {
    setNewVariant({ 
      name: v.name, 
      codigo: v.codigo || '', 
      cost_per_unit: typeof v.cost_per_unit === 'number' ? v.cost_per_unit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : v.cost_per_unit?.toString() || '',
      supplier_id: v.supplier_id || '',
      estoque_atual: v.estoque_atual?.toString() || '',
      estoque_minimo: v.estoque_minimo?.toString() || ''
    });
    handleRemoveVariant(idx);
  };

  const handleDuplicateVariant = (v: Variant) => {
    setFormData({ ...formData, variants: [...formData.variants, { ...v, id: undefined, name: `${v.name} (Cópia)` }] });
  };

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden mt-6">
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
                      onClick={() => handleEditVariant(v, idx)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" title="Duplicar Variante"
                      onClick={() => handleDuplicateVariant(v)}
                      className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" title="Deletar Variante"
                      onClick={() => handleRemoveVariant(idx)}
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
              <button type="button" onClick={handleAddVariant} className="h-[38px] px-4 bg-[#202eac] text-white text-sm font-bold rounded-lg hover:bg-blue-800 transition-colors shadow-sm shadow-blue-100 shrink-0">
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
