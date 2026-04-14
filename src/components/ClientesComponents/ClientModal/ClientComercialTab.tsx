import React, { useState } from 'react';
import { BadgeDollarSign, Tag, X } from 'lucide-react';
import { Client } from '../types';

interface ClientComercialTabProps {
  formData: Partial<Client>;
  setFormData: (data: Partial<Client>) => void;
}

export function ClientComercialTab({ formData, setFormData }: ClientComercialTabProps) {
  const [tagInput, setTagInput] = useState('');

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
        setFormData({ ...formData, tags: [...(formData.tags || []), tagInput.trim()] });
        setTagInput('');
      }
    }
  };

  const removeTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags?.filter(t => t !== tag) || [] });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
        <label className="block text-sm font-bold text-[#202eac] mb-2 flex items-center gap-2">
          <BadgeDollarSign className="w-5 h-5" />
          Tabela de Preços Padrão
        </label>
        <p className="text-xs text-slate-600 mb-3">
          Define a precificação automática deste cliente ao gerar novos pedidos.
        </p>
        <select
          value={formData.tabela_preco || 'Varejo'}
          onChange={e => setFormData({ ...formData, tabela_preco: e.target.value })}
          className="w-full px-3 py-2.5 bg-white border border-blue-200 rounded-lg font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all shadow-sm"
        >
          <option value="Varejo">Varejo (Consumidor Final)</option>
          <option value="Atacado">Atacado (Revenda / Grandes Volumes)</option>
          <option value="Fardo">Fardo (Distribuição)</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-2">
          <Tag className="w-4 h-4" />
          Tags de Segmentação Livre
        </label>
        <p className="text-xs text-slate-500 mb-2">
          Adicione nichos (ex: Lava Rápido, Residencial, Condomínio) digitando e pressionando Enter.
        </p>
        <div className="border border-slate-300 rounded-lg p-2 bg-white focus-within:ring-2 focus-within:ring-[#202eac]/20 focus-within:border-[#202eac] transition-all">
          <div className="flex flex-wrap gap-2 mb-2">
            {formData.tags && formData.tags.map(tag => (
              <span key={tag} className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-slate-100 text-slate-700 rounded-md border border-slate-200">
                {tag}
                <button 
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="text-slate-400 hover:text-red-500 focus:outline-none"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <input
            type="text"
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={handleAddTag}
            placeholder="Digite uma tag e aperte Enter..."
            className="w-full outline-none text-sm bg-transparent"
          />
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100">
        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Observações Comerciais</label>
        <textarea
          value={formData.notes || ''}
          onChange={e => setFormData({ ...formData, notes: e.target.value })}
          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all resize-none h-24"
          placeholder="Informações adicionais, horário de entrega, contatos extras..."
        />
      </div>
    </div>
  );
}
