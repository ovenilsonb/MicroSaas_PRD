import React from 'react';
import { Client, BRAZILIAN_STATES } from '../types';
import { formatCpfCnpj, formatPhoneNumber } from '../clientUtils';

interface ClientGeralTabProps {
  formData: Partial<Client>;
  setFormData: (data: Partial<Client>) => void;
}

export function ClientGeralTab({ formData, setFormData }: ClientGeralTabProps) {
  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nome / Razão Social *</label>
          <input
            type="text"
            required
            value={formData.name || ''}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
            placeholder="Nome completo ou nome da empresa"
          />
        </div>

        <div className="col-span-2">
          <div className="flex items-center gap-4 mb-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="docType"
                checked={formData.document_type === 'CPF'}
                onChange={() => setFormData({ ...formData, document_type: 'CPF', cnpj_cpf: '' })}
                className="w-4 h-4 text-[#202eac] focus:ring-[#202eac]"
              />
              <span className="text-sm font-semibold text-slate-700">Pessoa Física (CPF)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="docType"
                checked={formData.document_type === 'CNPJ'}
                onChange={() => setFormData({ ...formData, document_type: 'CNPJ', cnpj_cpf: '' })}
                className="w-4 h-4 text-[#202eac] focus:ring-[#202eac]"
              />
              <span className="text-sm font-semibold text-slate-700">Pessoa Jurídica (CNPJ)</span>
            </label>
          </div>

          <div className="flex justify-between items-center mb-1.5">
            <label className="block text-sm font-semibold text-slate-700">
              {formData.document_type === 'CNPJ' ? 'CNPJ' : 'CPF'} No.
            </label>
            <span className="text-[10px] font-bold text-red-500 uppercase">Em breve validação oficial</span>
          </div>
          <input
            type="text"
            value={formData.cnpj_cpf || ''}
            onChange={e => setFormData({ ...formData, cnpj_cpf: formatCpfCnpj(e.target.value, formData.document_type) })}
            maxLength={formData.document_type === 'CNPJ' ? 18 : 14}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all font-mono text-sm"
            placeholder={formData.document_type === 'CNPJ' ? '00.000.000/0000-00' : '000.000.000-00'}
          />
        </div>

        <div className="col-span-2 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Telefone</label>
            <input
              type="text"
              value={formData.phone || ''}
              onChange={e => setFormData({ ...formData, phone: formatPhoneNumber(e.target.value) })}
              maxLength={15}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
              placeholder="(00) 00000-0000"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Whatsapp</label>
            <input
              type="text"
              value={formData.whatsapp || ''}
              onChange={e => setFormData({ ...formData, whatsapp: formatPhoneNumber(e.target.value) })}
              maxLength={15}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
              placeholder="(00) 00000-0000"
            />
          </div>
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">E-mail</label>
          <input
            type="email"
            value={formData.email || ''}
            onChange={e => setFormData({ ...formData, email: e.target.value.toLowerCase() })}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
            placeholder="contato@cliente.com.br"
          />
        </div>

        <div className="col-span-2 grid grid-cols-4 gap-4">
          <div className="col-span-3">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Endereço</label>
            <input
              type="text"
              value={formData.address || ''}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
              placeholder="Rua, Avenida, etc."
            />
          </div>
          <div className="col-span-1">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Número</label>
            <input
              type="text"
              value={formData.number || ''}
              onChange={e => setFormData({ ...formData, number: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
              placeholder="000"
            />
          </div>
        </div>

        <div className="col-span-2 grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Bairro</label>
            <input
              type="text"
              value={formData.neighborhood || ''}
              onChange={e => setFormData({ ...formData, neighborhood: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
              placeholder="Bairro"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Cidade</label>
            <input
              type="text"
              value={formData.city || ''}
              onChange={e => setFormData({ ...formData, city: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
              placeholder="Cidade"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Estado (UF)</label>
            <select
              value={formData.state || ''}
              onChange={e => setFormData({ ...formData, state: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
            >
              <option value="">Selecione</option>
              {BRAZILIAN_STATES.map(uf => (
                <option key={uf} value={uf}>{uf}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
