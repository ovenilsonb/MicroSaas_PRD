import React from 'react';
import { Scale, Keyboard, Calculator, Search } from 'lucide-react';
import { Formula } from './types';
import { formatVersion } from '../../lib/formatters';

interface GalleryProps {
  formulas: Formula[];
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  filteredFormulas: Formula[];
  handleSort: (field: any) => void;
  currentPage: number;
  setCurrentPage: (val: number) => void;
  totalPages: number;
  handleSelectFormula: (f: Formula) => void;
}

export default function ProporcaoGallery({
  formulas,
  searchTerm,
  setSearchTerm,
  filteredFormulas,
  handleSort,
  currentPage,
  setCurrentPage,
  totalPages,
  handleSelectFormula
}: GalleryProps) {
  const ITEMS_PER_PAGE = 10;
  const paginatedFormulas = filteredFormulas.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="flex-1 overflow-auto p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Scale className="w-6 h-6 text-[#202eac]" />
              Proporção
            </h2>
            <span className="text-sm text-slate-500">{formulas.length} fórmulas ativas</span>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Keyboard className="w-3.5 h-3.5" /> Atalhos
            </span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white via-slate-50 to-slate-100 rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25 shrink-0">
              <Calculator className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                 Calculadora de Proporções
                 <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Módulo Principal</span>
              </h2>
              <p className="text-slate-600 text-sm mt-1.5 leading-relaxed max-w-3xl">
                Configure proporções exatas para sua produção.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center gap-4">
             <div className="bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2 w-64 focus-within:border-[#202eac] transition-all">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar fórmula..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 outline-none text-sm text-slate-700 placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm">
                  <th className="py-4 px-6 font-semibold cursor-pointer" onClick={() => handleSort('name')}>Fórmula</th>
                  <th className="py-4 px-6 font-semibold cursor-pointer" onClick={() => handleSort('lm_code')}>Código LM</th>
                  <th className="py-4 px-6 font-semibold text-right cursor-pointer" onClick={() => handleSort('base_volume')}>Volume Base</th>
                  <th className="py-4 px-6 font-semibold text-center">Insumos</th>
                  <th className="py-4 px-6 font-semibold text-center">Versão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedFormulas.map((f) => (
                  <tr 
                    key={f.id} 
                    onClick={() => handleSelectFormula(f)} 
                    className="hover:bg-blue-50/50 cursor-pointer transition-colors group"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 text-[#202eac] rounded-lg flex items-center justify-center font-bold text-xs">{f.name.charAt(0)}</div>
                        <span className="text-sm font-bold text-slate-800">{f.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-500 font-mono">{f.lm_code || '---'}</td>
                    <td className="py-4 px-6 text-sm font-bold text-slate-700 text-right">{f.base_volume}L</td>
                    <td className="py-4 px-6 text-center">
                      <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">{f.formula_ingredients.length} itens</span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="text-xs font-black text-[#202eac] bg-blue-50 px-2 py-1 rounded-lg uppercase tracking-wider">{formatVersion(f.version)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-center">
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${currentPage === i+1 ? 'bg-[#202eac] text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
