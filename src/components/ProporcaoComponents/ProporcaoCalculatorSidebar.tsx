import React from 'react';
import { History } from 'lucide-react';
import { ToggleGroup, Input } from './Input';
import { CalculationMode, Simulation, PackagingOption } from './types';
import AssemblySuggestions from './AssemblySuggestions';
import { formatCurrency } from '../../lib/formatters';

interface SidebarProps {
  calculationMode: CalculationMode;
  onCalculationModeChange: (mode: CalculationMode) => void;
  currentBatchSize: string;
  onBatchSizeChange: (val: string) => void;
  assemblyOptions: any[];
  onSelectOption: (opt: any) => void;
  selectedOptionId: string | null;
  packagingOptionsByCapacity: Record<number, PackagingOption[]>;
  selectedPackagingKeys: string[];
  onTogglePackagingKey: (key: string) => void;
  recentSimulations: Simulation[];
  allSimulations: Simulation[];
  showAllSimulations: boolean;
  setShowAllSimulations: (val: boolean | ((p: boolean) => boolean)) => void;
}

export default function ProporcaoCalculatorSidebar({
  calculationMode,
  onCalculationModeChange,
  currentBatchSize,
  onBatchSizeChange,
  assemblyOptions,
  onSelectOption,
  selectedOptionId,
  packagingOptionsByCapacity,
  selectedPackagingKeys,
  onTogglePackagingKey,
  recentSimulations,
  allSimulations,
  showAllSimulations,
  setShowAllSimulations
}: SidebarProps) {
  return (
    <aside className="lg:col-span-4 space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div className="space-y-4">
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Modo de Cálculo</label>
          <ToggleGroup
            value={calculationMode}
            onChange={(v) => onCalculationModeChange(v as CalculationMode)}
            options={[
              { value: 'volume', label: 'Volume Fixo' },
              { value: 'units', label: 'Qtd Peças' },
            ]}
          />
        </div>

        <div className="space-y-6">
          <Input
            label="Meta de Produção"
            type="text"
            value={currentBatchSize}
            onChange={e => onBatchSizeChange(e.target.value)}
            suffix={calculationMode === 'volume' ? 'L/KG' : 'UNI/L'}
          />

          <div className="pt-4 border-t border-slate-100">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-3 block">Sugestões de Montagem</label>
            <AssemblySuggestions
              assemblyOptions={assemblyOptions}
              onSelectOption={onSelectOption}
              selectedOptionId={selectedOptionId}
              packagingOptionsByCapacity={packagingOptionsByCapacity}
              selectedPackagingKeys={selectedPackagingKeys}
              onTogglePackagingKey={onTogglePackagingKey}
            />
          </div>
        </div>

        {recentSimulations.length > 0 && (
          <div className="pt-6 border-t border-slate-100">
            <div className="flex items-center justify-between mb-4 px-1">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-[#202eac]" />
                <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-tight">Recentes</h4>
              </div>
            </div>
            <div className="space-y-2">
              {(showAllSimulations ? allSimulations : recentSimulations).map((sim: Simulation) => (
                <div
                  key={sim.id}
                  className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between group cursor-default"
                >
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-bold text-slate-700 truncate">
                      {sim.displayName.split(' -- ')[1] || sim.displayName}
                    </span>
                    <span className="text-[9px] text-slate-400">
                      {new Date(sim.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-[#202eac]">
                    {formatCurrency(sim.totalCost)}
                  </span>
                </div>
              ))}
            </div>
            {allSimulations.length > 5 && (
              <button
                type="button"
                onClick={() => setShowAllSimulations(prev => !prev)}
                className="w-full mt-3 text-[10px] font-bold text-[#202eac] hover:text-blue-800 text-center py-2 transition-colors uppercase tracking-wider"
              >
                {showAllSimulations ? 'Ocultar Histórico' : `Ver Integral (${allSimulations.length})`}
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
