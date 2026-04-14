import React from 'react';
import { Ingredient } from './types';

interface InsumoGeneralTabProps {
  formData: any;
  setFormData: (data: any) => void;
  suppliers: { id: string; name: string }[];
  formatInputCurrency: (value: string) => string;
  formatInputQuantity: (value: string, isChemical?: boolean) => string;
}

export default function InsumoGeneralTab({
  formData, setFormData, suppliers, formatInputCurrency, formatInputQuantity
}: InsumoGeneralTabProps) {
  return (
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
    </div>
  );
}
