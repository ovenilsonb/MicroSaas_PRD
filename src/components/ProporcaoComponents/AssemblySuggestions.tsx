import React from 'react';
import { Calculator, ChevronRight, PackageX } from 'lucide-react';
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

  const noPackagingOption = assemblyOptions.find(opt => opt.id === 'no-packaging');
  const validOptions = assemblyOptions.filter(opt => opt.id !== 'no-packaging');

  return (
    <div className="pt-4 border-t border-slate-100 space-y-3">
      <div className="flex items-center gap-2">
        <Calculator className="w-4 h-4 text-[#202eac]" />
        <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
          Sugestões de Embalagem
        </h4>
      </div>
      <div className="space-y-2">
        {noPackagingOption ? (
          <div className="w-full p-3 border border-amber-200 bg-amber-50 rounded-lg flex items-center gap-2">
            <PackageX className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="text-sm font-medium text-amber-700">
              Volume sem embalagem disponível
            </span>
          </div>
        ) : (
          validOptions.map(opt => (
            <button
              key={opt.id}
              onClick={() => onSelectOption(opt)}
              className="w-full p-3 border border-slate-200 hover:border-[#202eac] hover:bg-slate-50 rounded-lg text-left flex items-center justify-between transition-all"
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium text-slate-800">
                  {opt.name}
                  {opt.isSuggested && (
                    <span className="ml-2 text-[10px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded">
                      Exato
                    </span>
                  )}
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          ))
        )}
      </div>
    </div>
  );
}
