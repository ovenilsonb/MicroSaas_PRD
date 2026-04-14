import React from 'react';
import { Settings2, Plus } from 'lucide-react';
import { DashboardCardDefinition } from '../../hooks/useDashboardCards';

interface DashboardCustomizerProps {
  isEditing: boolean;
  resetLayout: () => void;
  hiddenCards: DashboardCardDefinition[];
  onAddCard: (key: string) => void;
}

export function DashboardCustomizer({ 
  isEditing, 
  resetLayout, 
  hiddenCards, 
  onAddCard 
}: DashboardCustomizerProps) {
  if (!isEditing) return null;

  return (
    <div className="mb-8 space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
      {/* Dica de Edição */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500 text-white rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20">
            <Settings2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-blue-900">Modo de Personalização Ativo</p>
            <p className="text-xs text-blue-700 font-medium">Arraste os cards para organizar ou use o "X" para ocultar indicadores.</p>
          </div>
        </div>
        <button 
          onClick={resetLayout}
          className="px-4 py-2 text-xs font-black text-blue-700 hover:text-white hover:bg-blue-600 rounded-xl transition-all border border-blue-200 uppercase tracking-widest"
        >
          Resetar para o Padrão
        </button>
      </div>

      {/* Banco de Cards Ocultos */}
      {hiddenCards.length > 0 && (
        <div className="p-6 bg-white border border-dashed border-slate-300 rounded-[24px]">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4" /> Indicadores Disponíveis
          </h3>
          <div className="flex flex-wrap gap-3">
            {hiddenCards.map(card => (
              <button
                key={card.id}
                onClick={() => onAddCard(card.id)}
                className="px-4 py-2.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:text-[#202eac] hover:border-[#202eac]/30 transition-all flex items-center gap-2 group"
              >
                <Plus className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#202eac]" />
                {card.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
