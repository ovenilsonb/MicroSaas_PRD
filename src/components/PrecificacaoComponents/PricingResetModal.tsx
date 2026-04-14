import React from 'react';
import { Eraser, X } from 'lucide-react';
import { formatCapacity } from './pricingUtils';

interface PricingResetModalProps {
  onClose: () => void;
  onResetCurrent: () => void;
  onResetAllOfType: () => void;
  onResetAllFormula: () => void;
  priceType: 'varejo' | 'atacado' | 'fardo';
  capacity: number;
  formulaName: string;
}

export const PricingResetModal: React.FC<PricingResetModalProps> = ({
  onClose,
  onResetCurrent,
  onResetAllOfType,
  onResetAllFormula,
  priceType,
  capacity,
  formulaName
}) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="max-w-lg w-full">
        <div className="bg-white rounded-2xl border border-red-200 shadow-xl overflow-hidden">
          <div className="bg-red-50 px-6 py-4 border-b border-red-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Eraser className="w-5 h-5 text-red-600" />
              <h3 className="text-lg font-bold text-red-800">Zerar Preços</h3>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-red-100 rounded-lg transition-colors">
              <X className="w-5 h-5 text-red-600" />
            </button>
          </div>
          <div className="p-6 space-y-3">
            <p className="text-sm text-slate-600">
              Selecione o que deseja zerar:
            </p>

            {/* Option 1: Current selection only */}
            <button
              onClick={onResetCurrent}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl hover:border-red-300 hover:bg-red-50 transition-colors text-left group"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-sm text-slate-800 group-hover:text-red-700">Preço Atual Apenas</span>
              </div>
              <div className="text-xs text-slate-500 group-hover:text-red-600">
                Zerar <strong>{priceType}</strong> do volume <strong>{formatCapacity(capacity)}</strong>
              </div>
            </button>

            {/* Option 2: All of this price type for this formula */}
            <button
              onClick={onResetAllOfType}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl hover:border-amber-300 hover:bg-amber-50 transition-colors text-left group"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-sm text-slate-800 group-hover:text-amber-700">Tipo {priceType} (todos os volumes)</span>
              </div>
              <div className="text-xs text-slate-500 group-hover:text-amber-600">
                Zerar todos os preços de <strong>{priceType}</strong> para <strong>{formulaName}</strong>
              </div>
            </button>

            {/* Option 3: All pricing for this formula */}
            <button
              onClick={onResetAllFormula}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl hover:border-red-400 hover:bg-red-50 transition-colors text-left group"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-sm text-slate-800 group-hover:text-red-700">Todas Precificações da Fórmula</span>
              </div>
              <div className="text-xs text-slate-500 group-hover:text-red-600">
                Zerar <strong>varejo, atacado e fardo</strong> de todos os volumes para <strong>{formulaName}</strong>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
