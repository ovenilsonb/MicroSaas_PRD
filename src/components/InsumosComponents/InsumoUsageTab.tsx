import React from 'react';
import { Beaker } from 'lucide-react';

interface InsumoUsageTabProps {
  usageFormulas: any[];
  isLoadingUsage: boolean;
}

export default function InsumoUsageTab({ usageFormulas, isLoadingUsage }: InsumoUsageTabProps) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <Beaker className="w-5 h-5 text-[#202eac]" />
            Fórmulas que utilizam este insumo
          </h3>
          <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-1 rounded-full">
            {usageFormulas.length} {usageFormulas.length === 1 ? 'fórmula' : 'fórmulas'}
          </span>
        </div>
        <div className="p-0">
          {isLoadingUsage ? (
            <div className="p-8 text-center text-slate-500">
              <div className="w-8 h-8 border-4 border-[#202eac] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p>Buscando fórmulas...</p>
            </div>
          ) : usageFormulas.length > 0 ? (
            <ul className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
              {usageFormulas.map((f: any) => (
                <li key={f.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                    <Beaker className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-800">{f.name}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Versão: {f.version || 'v1.0'}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              </div>
              <p className="text-lg font-medium text-slate-700 mb-1">Nenhuma fórmula encontrada</p>
              <p className="text-sm">Este insumo ainda não foi adicionado a nenhuma fórmula.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
