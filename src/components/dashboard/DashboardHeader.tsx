import React from 'react';
import { LayoutPanelTop, Settings2, RefreshCw } from 'lucide-react';

interface DashboardHeaderProps {
  isEditing: boolean;
  setIsEditing: (editing: boolean) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export function DashboardHeader({ 
  isEditing, 
  setIsEditing, 
  onRefresh,
  isLoading 
}: DashboardHeaderProps) {
  return (
    <header className="bg-white border-b border-slate-200 px-8 py-6 flex justify-between items-center sticky top-0 z-30 shadow-sm transition-colors duration-300">
      <div>
        <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
          <LayoutPanelTop className="w-7 h-7 text-[#202eac]" /> Dashboard
        </h1>
        <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Controle Industrial Ohana Clean</p>
      </div>
      <div className="flex items-center gap-3">
        <button 
          onClick={onRefresh}
          disabled={isLoading}
          className={`p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all ${isLoading ? 'opacity-50' : 'active:scale-95'}`}
          title="Sincronizar Dados"
        >
          <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
        <button 
          onClick={() => setIsEditing(!isEditing)}
          className={`px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-sm ${
            isEditing 
              ? 'bg-[#202eac] text-white hover:bg-[#1a258a] scale-105' 
              : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Settings2 className="w-4 h-4" />
          {isEditing ? 'Salvar Organização' : 'Personalizar Tela'}
        </button>
      </div>
    </header>
  );
}
