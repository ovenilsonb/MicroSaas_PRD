import React from 'react';
import { Calculator, ChevronRight } from 'lucide-react';
import { PackagingOption } from './types';

interface AssemblyOption {
  id: string;
  name: string;
  items: { capacity: number; quantity: number }[];
  isSuggested?: boolean;
}

interface AssemblySuggestionsProps {
  assemblyOptions: AssemblyOption[];
  onSelectOption: (opt: AssemblyOption) => void;
}

export default function AssemblySuggestions({
  assemblyOptions,
  onSelectOption,
}: AssemblySuggestionsProps) {
  if (assemblyOptions.length === 0) return null;

  return (
    <div className="pt-6 border-t border-slate-100 space-y-4">
      <div className="flex items-center gap-2 mb-2 ml-1 text-[#202eac]">
        <Calculator className="w-5 h-5" />
        <h4 className="text-[13px] font-black uppercase tracking-tight">
          Sugestões de Montagem (Sem Sobra)
        </h4>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {assemblyOptions.map(opt => (
          <button
            key={opt.id}
            onClick={() => onSelectOption(opt)}
            className="p-4 bg-white border-2 border-slate-100 rounded-[24px] hover:border-[#202eac] transition-all text-left flex items-center justify-between group active:scale-95 shadow-sm"
          >
            <div className="flex flex-col">
              <span className="text-[15px] font-black text-slate-800">
                {opt.name}{' '}
                {opt.isSuggested && (
                  <span className="ml-2 text-[10px] bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full">
                    Recomendado
                  </span>
                )}
              </span>
              <span className="text-[12px] text-slate-400 font-bold mt-1">
                {opt.items.map(i => `${i.quantity}x ${i.capacity}L`).join(' + ')}
              </span>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-[#202eac] group-hover:translate-x-1 transition-all" />
          </button>
        ))}
      </div>
    </div>
  );
}
