import React from 'react';
import { Package, ShieldCheck } from 'lucide-react';
import { Formula } from './types';

interface FormulaEditorProductionProps {
  currentFormula: Partial<Formula>;
  setCurrentFormula: (formula: any) => void;
}

export const FormulaEditorProduction: React.FC<FormulaEditorProductionProps> = ({
  currentFormula,
  setCurrentFormula
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
      <h2 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
        <Package className="w-4 h-4 text-[#202eac]" /> Produção & Controle
      </h2>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Volume Base (L/Kg) *</label>
          <input
            type="text"
            value={currentFormula.base_volume?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || ''}
            onChange={e => {
              const val = e.target.value.replace(/\./g, '').replace(',', '.');
              if (!isNaN(Number(val))) {
                setCurrentFormula({ ...currentFormula, base_volume: Number(val) });
              }
            }}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Status</label>
          <select
            value={currentFormula.status || 'draft'}
            onChange={e => setCurrentFormula({ ...currentFormula, status: e.target.value as any })}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
          >
            <option key="status-draft" value="draft">Rascunho</option>
            <option key="status-active" value="active">Ativa</option>
            <option key="status-archived" value="archived">Arquivada</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Rendimento</label>
          <input
            type="text"
            value={currentFormula.yield_amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || ''}
            onChange={e => {
              const val = e.target.value.replace(/\./g, '').replace(',', '.');
              if (!isNaN(Number(val))) {
                setCurrentFormula({ ...currentFormula, yield_amount: Number(val) });
              }
            }}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
            placeholder="Ex: 50,00"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Unid. Rendimento</label>
          <select
            value={currentFormula.yield_unit || 'UN'}
            onChange={e => setCurrentFormula({ ...currentFormula, yield_unit: e.target.value.toUpperCase() })}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
          >
            <option key="unit-un" value="UN">Unidades (UN)</option>
            <option key="unit-cx" value="CX">Caixas (CX)</option>
            <option key="unit-gl" value="GL">Galões (GL)</option>
            <option key="unit-lt" value="LT">Litros (LT)</option>
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
          onChange={e => setCurrentFormula({ ...currentFormula, batch_prefix: e.target.value })}
          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
          placeholder="Ex: LOT-AMC"
        />
      </div>

      <div className="pt-2 border-t border-slate-100 mt-2">
        <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2 mb-3">
          <ShieldCheck className="w-4 h-4 text-[#202eac]" /> Parâmetros de Qualidade (Alvo)
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">pH (Mín - Máx)</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={currentFormula.ph_min || ''}
                onChange={e => setCurrentFormula({ ...currentFormula, ph_min: e.target.value })}
                className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:bg-white outline-none"
                placeholder="Ex: 6.5"
              />
              <span className="text-slate-400">-</span>
              <input
                type="text"
                value={currentFormula.ph_max || ''}
                onChange={e => setCurrentFormula({ ...currentFormula, ph_max: e.target.value })}
                className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:bg-white outline-none"
                placeholder="Ex: 7.5"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Viscosidade (Mín - Máx)</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={currentFormula.viscosity_min || ''}
                onChange={e => setCurrentFormula({ ...currentFormula, viscosity_min: e.target.value })}
                className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:bg-white outline-none"
                placeholder="Mín cP"
              />
              <span className="text-slate-400">-</span>
              <input
                type="text"
                value={currentFormula.viscosity_max || ''}
                onChange={e => setCurrentFormula({ ...currentFormula, viscosity_max: e.target.value })}
                className="w-full px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:bg-white outline-none"
                placeholder="Máx cP"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
