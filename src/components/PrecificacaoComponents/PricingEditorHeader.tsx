import React from 'react';
import { ArrowLeft, TrendingUp, ShoppingCart, Store, PackageCheck, Eraser, RotateCcw, Save } from 'lucide-react';

interface PricingEditorHeaderProps {
  formulaName: string;
  selectedPriceType: 'varejo' | 'atacado' | 'fardo';
  onPriceTypeChange: (type: 'varejo' | 'atacado' | 'fardo') => void;
  onBack: () => void;
  onReset: () => void;
  onDiscard: () => void;
  onSave: () => void;
}

export const PricingEditorHeader: React.FC<PricingEditorHeaderProps> = ({
  formulaName,
  selectedPriceType,
  onPriceTypeChange,
  onBack,
  onReset,
  onDiscard,
  onSave
}) => {
  return (
    <>
      <header className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-all border border-slate-200 shadow-sm">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              Precificação — {formulaName}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">Defina preços por embalagem e canal de venda</p>
          </div>
        </div>
        <span className="text-xs text-slate-400 flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5" /> Margens calculadas automaticamente
        </span>
      </header>

      <div className="px-8 pt-6 pb-2 flex items-center justify-between gap-3 flex-wrap border-b border-slate-200">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-bold text-slate-600 mr-2">Tipo de Preço:</span>
          <button onClick={() => onPriceTypeChange('varejo')} className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${selectedPriceType === 'varejo' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-white text-slate-600 border border-slate-200 hover:border-emerald-400 hover:text-emerald-600'}`}>
            <ShoppingCart className="w-4 h-4" /> Varejo
          </button>
          <button onClick={() => onPriceTypeChange('atacado')} className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${selectedPriceType === 'atacado' ? 'bg-amber-500 text-white shadow-lg shadow-amber-200' : 'bg-white text-slate-600 border border-slate-200 hover:border-amber-400 hover:text-amber-600'}`}>
            <Store className="w-4 h-4" /> Atacado
          </button>
          <button onClick={() => onPriceTypeChange('fardo')} className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${selectedPriceType === 'fardo' ? 'bg-purple-500 text-white shadow-lg shadow-purple-200' : 'bg-white text-slate-600 border border-slate-200 hover:border-purple-400 hover:text-purple-600'}`}>
            <PackageCheck className="w-4 h-4" /> Fardo
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onReset} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-2" title="Zerar preços">
            <Eraser className="w-4 h-4" /> Zerar
          </button>
          <button onClick={onDiscard} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-2">
            <RotateCcw className="w-4 h-4" /> Descartar
          </button>
          <button onClick={onSave} className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 shadow-lg shadow-red-200 transition-all flex items-center gap-2">
            <Save className="w-4 h-4" /> Salvar
          </button>
        </div>
      </div>
    </>
  );
};
