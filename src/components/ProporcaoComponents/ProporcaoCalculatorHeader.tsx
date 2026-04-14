import React from 'react';
import { ArrowLeft, FileText } from 'lucide-react';
import { Formula } from './types';
import { formatVersion } from '../../lib/formatters';

interface HeaderProps {
  selectedFormula: Formula;
  onBack: () => void;
  onSave: () => void;
  isSaving: boolean;
}

export default function ProporcaoCalculatorHeader({
  selectedFormula,
  onBack,
  onSave,
  isSaving
}: HeaderProps) {
  return (
    <div className="bg-white border-b border-slate-200 px-8 py-3 flex items-center justify-between shrink-0 shadow-sm z-10">
      <div className="flex items-center gap-5">
        <button
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-500 rounded-xl hover:bg-[#202eac] hover:text-white hover:shadow-lg hover:shadow-indigo-500/20 transition-all duration-300 group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
        </button>
        
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">Calculadora de Proporção</h2>
            <span className="bg-blue-50 text-[#202eac] text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-100 uppercase">Simulação</span>
          </div>
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
            {selectedFormula.name}
            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
            <span className="text-[#202eac]">{formatVersion(selectedFormula.version).toUpperCase()}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onSave}
          disabled={isSaving}
          className="px-6 py-2.5 bg-gradient-to-r from-[#202eac] to-[#4b5ce8] text-white font-bold rounded-xl hover:shadow-lg hover:shadow-indigo-500/25 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm uppercase tracking-wider"
        >
          {isSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Processando...</span>
            </>
          ) : (
            <>
              <FileText className="w-4 h-4" />
              <span>Salvar Simulação</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
