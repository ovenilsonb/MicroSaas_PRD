import React, { useState } from 'react';
import { ChevronDown, ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ComparisonItem {
  label: string;
  value: number;
  isPositive: boolean;
  formatAsPercent?: boolean;
}

interface PriceComparisonBlockProps {
  comparisons: ComparisonItem[];
  title?: string;
  defaultExpanded?: boolean;
}

const formatCurrency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function PriceComparisonBlock({ 
  comparisons, 
  title = 'Comparações',
  defaultExpanded = false 
}: PriceComparisonBlockProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (comparisons.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-slate-100">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="w-3.5 h-3.5" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5" />
        )}
        {title}
      </button>

      {isExpanded && (
        <div className="grid grid-cols-2 gap-2 mt-2">
          {comparisons.map((comp, idx) => (
            <div 
              key={idx} 
              className={`rounded-lg p-2 text-center ${
                comp.isPositive 
                  ? 'bg-emerald-50' 
                  : comp.value === 0 
                    ? 'bg-slate-50'
                    : 'bg-red-50'
              }`}
            >
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                {comp.label}
              </div>
              <div className={`text-sm font-black ${
                comp.isPositive 
                  ? 'text-emerald-600' 
                  : comp.value === 0 
                    ? 'text-slate-400'
                    : 'text-red-500'
              }`}>
                {comp.isPositive ? '+' : ''}{formatCurrency(comp.value)}
                {comp.formatAsPercent && (
                  <span className="text-[10px] ml-1">
                    ({comp.isPositive ? '+' : ''}{comp.value.toFixed(1)}%)
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
