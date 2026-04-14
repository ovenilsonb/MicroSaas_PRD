import React from 'react';
import { formatCapacity } from './pricingUtils';

interface PricingAvailabilityToggleProps {
  isDisabled: boolean;
  onToggle: () => void;
  priceType: string;
  capacity: number;
}

export const PricingAvailabilityToggle: React.FC<PricingAvailabilityToggleProps> = ({
  isDisabled,
  onToggle,
  priceType,
  capacity
}) => {
  return (
    <div className="px-8 mt-2">
      <label className={`flex items-center gap-3 w-fit px-4 py-2.5 rounded-2xl cursor-pointer transition-all border ${isDisabled ? 'bg-slate-100 border-slate-300' : 'bg-white border-slate-200 hover:border-red-200 shadow-sm'}`}>
        <div
          onClick={onToggle}
          className={`w-10 h-5 rounded-full relative transition-colors ${isDisabled ? 'bg-red-500' : 'bg-slate-200'}`}
        >
          <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${isDisabled ? 'translate-x-5' : ''}`} />
        </div>
        <span className={`text-sm font-bold ${isDisabled ? 'text-red-600' : 'text-slate-600'}`}>
          Não comercializar {priceType.toUpperCase()} para este volume ({formatCapacity(capacity)})
        </span>
      </label>
    </div>
  );
};
