import React from 'react';
import { Info, Plus } from 'lucide-react';
import { Formula, Group } from './types';

interface FormulaEditorGeneralProps {
  currentFormula: Partial<Formula>;
  setCurrentFormula: (formula: any) => void;
  categories: Group[];
  packagingVariants: any[];
  onOpenCategoryModal: () => void;
}

export const FormulaEditorGeneral: React.FC<FormulaEditorGeneralProps> = ({
  currentFormula,
  setCurrentFormula,
  categories,
  packagingVariants,
  onOpenCategoryModal
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
      <h2 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
        <Info className="w-4 h-4 text-[#202eac]" /> Dados Principais
      </h2>

      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Nome do Produto *</label>
        <input
          type="text"
          value={currentFormula.name || ''}
          onChange={e => setCurrentFormula({ ...currentFormula, name: e.target.value })}
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
            onChange={e => setCurrentFormula({ ...currentFormula, lm_code: e.target.value })}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
            placeholder="LM-001"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Categoria</label>
          <div className="flex gap-2">
            <select
              value={currentFormula.group_id || ''}
              onChange={e => setCurrentFormula({ ...currentFormula, group_id: e.target.value })}
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
            >
              <option value="">Selecione...</option>
              {categories.map((c, idx) => (
                <option key={`cat-${c.id}-${idx}`} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button
              onClick={onOpenCategoryModal}
              className="p-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
              title="Gerenciar Categorias"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {packagingVariants.length > 0 && (
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Embalagem Padrão</label>
            <select
              value={currentFormula.packaging_variant_id || ''}
              onChange={e => setCurrentFormula({ ...currentFormula, packaging_variant_id: e.target.value || undefined })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
            >
              <option value="">Selecione a embalagem padrão...</option>
              {(() => {
                const packagingFilter = /embalagem|frasco|bolsa|tubo|pot|bottle|galão|bidão|dispenser|jarra|copo|plástico|vidro|bag|sachê/i;
                const filtered = packagingVariants.filter(v => packagingFilter.test(v.name));
                const options = filtered.length > 0 ? filtered : packagingVariants;
                return options.map((v, idx) => (
                  <option key={`pkg-${v.id}-${idx}`} value={v.id}>{v.name}</option>
                ));
              })()}
            </select>
            <p className="text-xs text-slate-500 mt-1">Usado para cálculo automático de custo na precificação</p>
          </div>
        )}

        {packagingVariants.length > 0 && (
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Rótulo Padrão</label>
            <select
              value={currentFormula.label_variant_id || ''}
              onChange={e => setCurrentFormula({ ...currentFormula, label_variant_id: e.target.value || undefined })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all"
            >
              <option value="">Selecione o rótulo padrão...</option>
              {(() => {
                const labelFilter = /rótulo|etiqueta|label|adesivo|sticker|tag|papel|decoration|impresso/i;
                const filtered = packagingVariants.filter(v => labelFilter.test(v.name));
                const options = filtered.length > 0 ? filtered : packagingVariants;
                return options.map((v, idx) => (
                  <option key={`lbl-${v.id}-${idx}`} value={v.id}>{v.name}</option>
                ));
              })()}
            </select>
            <p className="text-xs text-slate-500 mt-1">Usado para cálculo automático de custo na precificação</p>
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Descrição</label>
        <textarea
          value={currentFormula.description || ''}
          onChange={e => setCurrentFormula({ ...currentFormula, description: e.target.value })}
          rows={2}
          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-[#202eac]/20 focus:border-[#202eac] transition-all resize-none"
          placeholder="Breve descrição da aplicação do produto..."
        />
      </div>
    </div>
  );
};
