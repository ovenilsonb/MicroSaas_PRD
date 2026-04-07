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
  selectedOptionId?: string | null;
  packagingOptionsByCapacity?: Record<number, PackagingOption[]>;
  selectedPackagingKeys?: string[];
  onTogglePackagingKey?: (key: string) => void;
}

export default function AssemblySuggestions({
  assemblyOptions,
  onSelectOption,
  selectedOptionId,
  packagingOptionsByCapacity = {},
  selectedPackagingKeys = [],
  onTogglePackagingKey,
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
          validOptions.map(opt => {
            const isSelected = selectedOptionId === opt.id;
            
            return (
              <div key={opt.id} className="space-y-2 relative">
                <button
                  onClick={() => onSelectOption(opt)}
                  className={`w-full p-3 border rounded-lg text-left flex items-center justify-between transition-all ${
                    isSelected ? 'border-[#202eac] bg-blue-50/50 shadow-sm shadow-blue-100' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className={`text-sm font-medium ${isSelected ? 'text-[#202eac] font-bold' : 'text-slate-800'}`}>
                      {opt.name}
                      {opt.isSuggested && (
                        <span className="ml-2 text-[10px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded">
                          Exato
                        </span>
                      )}
                    </span>
                  </div>
                  <ChevronRight className={`w-4 h-4 transition-transform ${isSelected ? 'text-[#202eac] rotate-90' : 'text-slate-400'}`} />
                </button>
                
                {isSelected && packagingOptionsByCapacity && onTogglePackagingKey && (
                  <div className="bg-white border border-[#202eac]/20 rounded-lg p-3 mt-2 shadow-sm animate-in slide-in-from-top-2">
                    <h5 className="text-[10px] uppercase font-bold text-slate-500 mb-2 px-1">Selecione os Insumos Desejados:</h5>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto px-1 pr-2 custom-scrollbar">
                      {opt.items.map(item => {
                        const pkgsForCapacity = packagingOptionsByCapacity[item.capacity] || [];
                        if (pkgsForCapacity.length === 0) return null;
                        
                        return (
                          <div key={item.capacity} className="space-y-1">
                            {pkgsForCapacity.map(pkg => {
                              const key = `${pkg.id}_${pkg.variant_id || pkg.name}`;
                              const isChecked = selectedPackagingKeys.includes(key);
                              return (
                                <label key={key} className="flex items-start gap-2 p-1.5 hover:bg-slate-50 rounded cursor-pointer group">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => onTogglePackagingKey(key)}
                                    className="mt-0.5 w-3.5 h-3.5 text-[#202eac] border-slate-300 rounded focus:ring-[#202eac]"
                                  />
                                  <div className="flex flex-col flex-1">
                                    <span className={`text-xs font-medium line-clamp-1 ${isChecked ? 'text-slate-800' : 'text-slate-500'}`}>{pkg.name}</span>
                                    <span className="text-[10px] text-slate-400 font-mono">Qtd: {item.quantity}</span>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
