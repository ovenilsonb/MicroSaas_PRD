import React from 'react';
import { Beaker, CheckCircle2, AlertTriangle, LayoutGrid } from 'lucide-react';

interface FormulaStatsProps {
  stats: {
    total: number;
    active: number;
    draft: number;
    categories: number;
  };
  statusFilter: string;
  onStatusFilterChange: (status: 'all' | 'active' | 'draft' | 'archived') => void;
  onOpenCategoryModal: () => void;
}

export const FormulaStats: React.FC<FormulaStatsProps> = ({ 
  stats, 
  statusFilter, 
  onStatusFilterChange,
  onOpenCategoryModal
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Fórmulas */}
      <div 
        onClick={() => onStatusFilterChange('all')}
        className={`p-4 rounded-2xl border transition-all duration-300 flex items-center gap-4 group cursor-pointer ${
          statusFilter === 'all' 
            ? 'bg-blue-50 border-blue-400 shadow-md ring-2 ring-blue-500/10' 
            : 'bg-gradient-to-br from-white to-slate-50 border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300'
        }`}
      >
        <div className="w-12 h-12 bg-gradient-to-br from-[#202eac] to-[#4b5ce8] rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
          <Beaker className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-slate-500 text-xs font-medium truncate uppercase">Total de Fórmulas</p>
          <h3 className="text-2xl font-bold text-slate-800">{stats.total}</h3>
        </div>
      </div>

      {/* Fórmulas Ativas */}
      <div 
        onClick={() => onStatusFilterChange('active')}
        className={`p-4 rounded-2xl border transition-all duration-300 flex items-center gap-4 group cursor-pointer ${
          statusFilter === 'active' 
            ? 'bg-emerald-50 border-emerald-400 shadow-md ring-2 ring-emerald-500/10' 
            : 'bg-gradient-to-br from-white to-slate-50 border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-300'
        }`}
      >
        <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0">
          <CheckCircle2 className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-slate-500 text-xs font-medium truncate uppercase">Fórmulas Ativas</p>
          <h3 className="text-2xl font-bold text-slate-800">{stats.active}</h3>
        </div>
      </div>

      {/* Em Rascunho */}
      <div 
        onClick={() => onStatusFilterChange('draft')}
        className={`p-4 rounded-2xl border transition-all duration-300 flex items-center gap-4 group cursor-pointer ${
          statusFilter === 'draft' 
            ? 'bg-amber-50 border-amber-400 shadow-md ring-2 ring-amber-500/10' 
            : 'bg-gradient-to-br from-white to-slate-50 border-slate-200 shadow-sm hover:shadow-md hover:border-amber-300'
        }`}
      >
        <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
          <AlertTriangle className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-slate-500 text-xs font-medium truncate uppercase">Em Rascunho</p>
          <h3 className="text-2xl font-bold text-slate-800">{stats.draft}</h3>
        </div>
      </div>

      {/* Categorias */}
      <div 
        onClick={onOpenCategoryModal}
        className="bg-gradient-to-br from-white to-slate-50 p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 group hover:shadow-md hover:border-purple-300 transition-all duration-300 cursor-pointer"
      >
        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20 shrink-0">
          <LayoutGrid className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-slate-500 text-xs font-medium truncate uppercase">Total de Categorias</p>
          <h3 className="text-2xl font-bold text-slate-800">{stats.categories}</h3>
        </div>
      </div>
    </div>
  );
};
