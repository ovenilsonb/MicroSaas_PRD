import React from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

interface PricingTabsProps {
  capacities: number[];
  activeCapacity: number;
  onSelectCapacity: (cap: number) => void;
  savedCapacities?: number[];
}

const formatCapacity = (cap: number): string => {
  if (cap >= 1) return `${cap}L`;
  return `${cap * 1000}ml`;
};

export default function PricingTabs({
  capacities,
  activeCapacity,
  onSelectCapacity,
  savedCapacities = [],
}: PricingTabsProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {capacities.map(cap => {
        const isSaved = savedCapacities.includes(cap);
        return (
          <button
            key={cap}
            onClick={() => onSelectCapacity(cap)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
              activeCapacity === cap
                ? 'bg-[#202eac] text-white shadow-md'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-[#202eac] hover:text-[#202eac]'
            }`}
          >
            {formatCapacity(cap)}
            {isSaved ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            )}
          </button>
        );
      })}
    </div>
  );
}
