import React, { useState } from 'react';
import { Users, X, Save } from 'lucide-react';
import { Client } from '../types';
import { ClientGeralTab } from './ClientGeralTab';
import { ClientComercialTab } from './ClientComercialTab';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Client>) => void;
  formData: Partial<Client>;
  setFormData: (data: Partial<Client>) => void;
  editingId: string | null;
}

export function ClientModal({
  isOpen,
  onClose,
  onSave,
  formData,
  setFormData,
  editingId
}: ClientModalProps) {
  const [activeTab, setActiveTab] = useState<'geral' | 'comercial' | 'historico'>('geral');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-[#202eac]" />
            {editingId ? 'Editar Cliente' : 'Novo Cliente'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('geral')}
            className={`px-6 py-3 font-semibold text-sm border-b-2 transition-colors ${
              activeTab === 'geral' ? 'border-[#202eac] text-[#202eac]' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Dados Gerais
          </button>
          <button
            onClick={() => setActiveTab('comercial')}
            className={`px-6 py-3 font-semibold text-sm border-b-2 transition-colors ${
              activeTab === 'comercial' ? 'border-[#202eac] text-[#202eac]' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Perfil Comercial
          </button>
          <div 
            className="px-6 py-3 font-semibold text-sm border-b-2 border-transparent text-slate-400 cursor-not-allowed flex items-center gap-2"
            title="Estará disponível quando o módulo de Pedidos/Produção for ativado"
          >
            Histórico (Em Breve)
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'geral' && (
            <ClientGeralTab formData={formData} setFormData={setFormData} />
          )}
          {activeTab === 'comercial' && (
            <ClientComercialTab formData={formData} setFormData={setFormData} />
          )}

          <div className="pt-6 mt-6 border-t border-slate-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-medium rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => onSave(formData)}
              className="px-6 py-2 bg-[#202eac] text-white font-medium rounded-lg hover:bg-blue-800 transition-colors flex items-center gap-2 shadow-sm shadow-blue-200"
            >
              <Save className="w-4 h-4" />
              Salvar Cliente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
