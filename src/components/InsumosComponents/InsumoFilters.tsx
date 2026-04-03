import React from 'react';
import { Search, X, Filter } from 'lucide-react';

interface InsumoFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filterType: string;
  onFilterTypeChange: (value: string) => void;
  filterSupplier: string;
  onFilterSupplierChange: (value: string) => void;
  filterStock: string;
  onFilterStockChange: (value: string) => void;
  suppliers: { id: string; name: string }[];
  viewMode: 'list' | 'grid';
  onViewModeChange: (mode: 'list' | 'grid') => void;
  sortOrder: 'asc' | 'desc';
  onSortOrderToggle: () => void;
  activeFiltersCount: number;
  onClearFilters: () => void;
  sortConfigsCount: number;
  onClearSorts: () => void;
}

export default function InsumoFilters({
  searchTerm, onSearchChange,
  filterType, onFilterTypeChange,
  filterSupplier, onFilterSupplierChange,
  filterStock, onFilterStockChange,
  suppliers,
  viewMode, onViewModeChange,
  sortOrder, onSortOrderToggle,
  activeFiltersCount, onClearFilters,
  sortConfigsCount, onClearSorts,
}: InsumoFiltersProps) {
  return (
    <>
      <div className="flex items-center gap-3 flex-wrap">
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

        <select
          className="bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm text-sm text-slate-600 outline-none focus:border-[#202eac] cursor-pointer uppercase"
          value={filterType}
          onChange={(e) => onFilterTypeChange(e.target.value)}
          aria-label="Filtrar por tipo"
        >
          <option value="">Todos os tipos</option>
          <option value="quimico">Químicos</option>
          <option value="embalagem">Embalagens / Rótulos</option>
        </select>

        <select
          className="bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm text-sm text-slate-600 outline-none focus:border-[#202eac] cursor-pointer uppercase"
          value={filterSupplier}
          onChange={(e) => onFilterSupplierChange(e.target.value)}
          aria-label="Filtrar por fornecedor"
        >
          <option value="">Todos fornecedores</option>
          {suppliers.map(s => (
            <option key={s.id} value={s.name}>{s.name}</option>
          ))}
        </select>

        <select
          className="bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm text-sm text-slate-600 outline-none focus:border-[#202eac] cursor-pointer uppercase"
          value={filterStock}
          onChange={(e) => onFilterStockChange(e.target.value)}
          aria-label="Filtrar por estoque"
        >
          <option value="">Estoque</option>
          <option value="baixo">Estoque baixo</option>
          <option value="medio">Estoque médio</option>
          <option value="alto">Estoque alto</option>
        </select>

        {activeFiltersCount > 0 && (
          <button
            onClick={onClearFilters}
            className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 rounded-xl border border-red-200 text-sm font-medium hover:bg-red-100 transition-colors"
          >
            <X className="w-3.5 h-3.5" /> Limpar {activeFiltersCount} filtro{activeFiltersCount > 1 ? 's' : ''}
          </button>
        )}

        <div className="flex-1"></div>

        {sortConfigsCount > 1 && (
          <button
            onClick={onClearSorts}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 text-amber-600 rounded-xl border border-amber-200 text-sm font-medium hover:bg-amber-100 transition-colors"
            title="Limpar ordenações extras"
          >
            <Filter className="w-3.5 h-3.5" /> {sortConfigsCount} ordenações
          </button>
        )}

        <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
          <button
            onClick={() => onViewModeChange('list')}
            className={`p-2 rounded-lg transition-all duration-200 ${viewMode === 'list' ? 'bg-gradient-to-br from-[#202eac] to-[#4b5ce8] text-white shadow-md' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
            title="Lista"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          </button>
          <button
            onClick={() => onViewModeChange('grid')}
            className={`p-2 rounded-lg transition-all duration-200 ${viewMode === 'grid' ? 'bg-gradient-to-br from-[#202eac] to-[#4b5ce8] text-white shadow-md' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
            title="Blocos"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          </button>
        </div>

        <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
          <button
            onClick={onSortOrderToggle}
            className="p-2 rounded-lg transition-all duration-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50"
            title="Inverter ordem"
          >
            {sortOrder === 'asc' ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 16 4 4 4-4"/><path d="M7 20V4"/><path d="M11 4h4"/><path d="M11 8h7"/><path d="M11 12h10"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 8 4-4 4 4"/><path d="M7 4v16"/><path d="M11 12h4"/><path d="M11 16h7"/><path d="M11 20h10"/></svg>
            )}
          </button>
        </div>
      </div>

      {activeFiltersCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-500 font-medium">Filtros ativos:</span>
          {filterType && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-200">
              Tipo: {filterType === 'quimico' ? 'Químicos' : 'Embalagens / Rótulos'}
              <button onClick={() => onFilterTypeChange('')} className="hover:text-blue-900"><X className="w-3 h-3" /></button>
            </span>
          )}
          {filterSupplier && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full border border-emerald-200">
              Fornecedor: {filterSupplier}
              <button onClick={() => onFilterSupplierChange('')} className="hover:text-emerald-900"><X className="w-3 h-3" /></button>
            </span>
          )}
          {filterStock && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-medium rounded-full border border-amber-200">
              Estoque: {filterStock === 'baixo' ? 'Baixo' : filterStock === 'medio' ? 'Médio' : 'Alto'}
              <button onClick={() => onFilterStockChange('')} className="hover:text-amber-900"><X className="w-3 h-3" /></button>
            </span>
          )}
        </div>
      )}
    </>
  );
}
