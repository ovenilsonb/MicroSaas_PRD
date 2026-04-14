import React from 'react';
import { Search, LayoutGrid, List } from 'lucide-react';

interface SalesFiltersBarProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  viewMode: 'grid' | 'list';
  setViewMode: (mode: 'grid' | 'list') => void;
}

export function SalesFiltersBar({ searchTerm, setSearchTerm, viewMode, setViewMode }: SalesFiltersBarProps) {
  return (
    <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
      <div className="relative flex-1 flex items-center gap-3">
        <Search className="w-5 h-5 text-slate-400 ml-2" />
        <input
          type="text"
          placeholder="Buscar por número do pedido ou nome do cliente..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 outline-none text-sm p-1 bg-transparent"
        />
      </div>
      <div className="flex items-center gap-1 border-l border-slate-100 pl-3 mr-1">
        <button
          onClick={() => setViewMode('grid')}
          className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-blue-50 text-[#202eac] shadow-sm' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
        >
          <LayoutGrid className="w-4 h-4" />
        </button>
        <button
          onClick={() => setViewMode('list')}
          className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-blue-50 text-[#202eac] shadow-sm' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
        >
          <List className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
