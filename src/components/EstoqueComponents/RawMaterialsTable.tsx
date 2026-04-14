import React from 'react';
import { Search, Box } from 'lucide-react';
import { IngredientStats } from './types';

interface TableProps {
  stats: IngredientStats[];
  searchTerm: string;
  onSearchChange: (val: string) => void;
}

export default function RawMaterialsTable({ stats, searchTerm, onSearchChange }: TableProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <h2 className="font-bold text-slate-800 flex items-center gap-2">
          <Box className="w-5 h-5 text-[#202eac]" /> Status Geral de Insumos
        </h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar insumo..."
            value={searchTerm}
            onChange={e => onSearchChange(e.target.value)}
            className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#202eac]/10"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-white border-b border-slate-100 z-10">
            <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <th className="py-4 px-6">Insumo</th>
              <th className="py-4 px-6 text-center">Unid.</th>
              <th className="py-4 px-6 text-right">Estoque</th>
              <th className="py-4 px-6 text-right">Min.</th>
              <th className="py-4 px-6 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {stats.map(item => (
              <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="py-3 px-6 font-bold text-slate-700 text-sm">{item.nome}</td>
                <td className="py-3 px-6 text-center text-xs text-slate-500">{item.unidade_medida}</td>
                <td className="py-3 px-6 text-right font-black text-slate-800 text-sm tracking-tight">{item.estoque_atual.toLocaleString()}</td>
                <td className="py-3 px-6 text-right text-xs text-slate-400">{item.estoque_minimo.toLocaleString()}</td>
                <td className="py-3 px-6">
                  <div className="flex justify-center">
                    {item.estoque_atual < item.estoque_minimo ? (
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                    ) : item.estoque_atual < item.estoque_minimo * 1.2 ? (
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
