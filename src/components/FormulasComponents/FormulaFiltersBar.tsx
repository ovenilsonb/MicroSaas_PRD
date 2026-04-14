import React from 'react';
import { Search, X, List, LayoutGrid, ArrowDownAZ, ArrowUpZA, Upload, Download } from 'lucide-react';

interface FormulaFiltersBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  sortOrder: 'asc' | 'desc';
  onSortOrderChange: (order: 'asc' | 'desc') => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExport: () => void;
}

export const FormulaFiltersBar: React.FC<FormulaFiltersBarProps> = ({
  searchTerm,
  onSearchChange,
  viewMode,
  onViewModeChange,
  sortOrder,
  onSortOrderChange,
  onImport,
  onExport
}) => {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Search - Compact */}
      <div className="bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2 w-64 focus-within:border-[#202eac] focus-within:ring-2 focus-within:ring-[#202eac]/10 transition-all">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          type="text"
          placeholder="Buscar..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="flex-1 outline-none text-sm text-slate-700 placeholder:text-slate-400 min-w-0"
        />
        {searchTerm && (
          <button onClick={() => onSearchChange('')} className="text-slate-400 hover:text-slate-600 shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1"></div>

      {/* View Mode */}
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

      {/* Sort Order */}
      <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
        <button
          onClick={() => onSortOrderChange('asc')}
          className={`p-2 rounded-lg transition-all duration-200 ${sortOrder === 'asc' ? 'bg-gradient-to-br from-[#202eac] to-[#4b5ce8] text-white shadow-md' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
          title="A-Z"
        >
          <ArrowDownAZ className="w-4 h-4" />
        </button>
        <button
          onClick={() => onSortOrderChange('desc')}
          className={`p-2 rounded-lg transition-all duration-200 ${sortOrder === 'desc' ? 'bg-gradient-to-br from-[#202eac] to-[#4b5ce8] text-white shadow-md' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
          title="Z-A"
        >
          <ArrowUpZA className="w-4 h-4" />
        </button>
      </div>

      {/* Import/Export Actions Group */}
      <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm ml-auto lg:ml-0">
        <label className="cursor-pointer p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 group/tooltip relative" title="Importar JSON">
          <Upload className="w-4 h-4" />
          <input type="file" onChange={onImport} accept=".json" className="hidden" />
        </label>
        <div className="w-px h-4 bg-slate-200 mx-0.5"></div>
        <button
          onClick={onExport}
          className="p-2 rounded-lg text-slate-400 hover:text-[#202eac] hover:bg-blue-50 transition-all duration-200"
          title="Exportar JSON"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
