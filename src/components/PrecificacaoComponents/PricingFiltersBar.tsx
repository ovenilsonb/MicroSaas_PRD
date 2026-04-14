import React from 'react';
import { Search, X, List, LayoutGrid, Settings, Upload, Download } from 'lucide-react';

interface PricingFiltersBarProps {
  searchTerm: string;
  onSearchChange: (val: string) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  onOpenSettings: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExport: () => void;
}

export const PricingFiltersBar: React.FC<PricingFiltersBarProps> = ({
  searchTerm,
  onSearchChange,
  viewMode,
  onViewModeChange,
  onOpenSettings,
  onImport,
  onExport
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      {/* Search + Controls - Left Side */}
      <div className="flex gap-3 items-center flex-1">
        <div className="flex-1 bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 max-w-md transition-all focus-within:ring-2 focus-within:ring-[#202eac]/20 focus-within:border-[#202eac] focus-within:shadow-indigo-500/10">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar produtos..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="flex-1 outline-none text-slate-700 bg-transparent"
          />
          {searchTerm && (
            <button onClick={() => onSearchChange('')} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
          <button
            onClick={() => onViewModeChange('list')}
            className={`p-2 rounded-lg transition-all duration-200 ${viewMode === 'list' ? 'bg-gradient-to-br from-[#202eac] to-[#4b5ce8] text-white shadow-md' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
            title="Lista"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => onViewModeChange('grid')}
            className={`p-2 rounded-lg transition-all duration-200 ${viewMode === 'grid' ? 'bg-gradient-to-br from-[#202eac] to-[#4b5ce8] text-white shadow-md' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
            title="Blocos"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all bg-white border border-slate-200 shadow-sm"
          title="Configurar Colunas"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Export/Import - Right Side */}
      <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
        <label className="cursor-pointer px-3 py-2 rounded-lg transition-all font-medium flex items-center gap-2 text-slate-600 hover:text-[#202eac] hover:bg-slate-50">
          <Upload className="w-4 h-4 text-emerald-600" />
          <span className="hidden sm:inline">Importar</span>
          <input type="file" accept=".json" onChange={onImport} className="hidden" />
        </label>
        <button
          onClick={onExport}
          className="px-3 py-2 rounded-lg transition-all font-medium flex items-center gap-2 bg-gradient-to-r from-[#202eac] to-[#4b5ce8] text-white shadow-md hover:shadow-lg hover:shadow-indigo-500/25"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Exportar</span>
        </button>
      </div>
    </div>
  );
};
