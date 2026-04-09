import React from 'react';
import { GripHorizontal, TrendingUp, TrendingDown, X } from 'lucide-react';
import { DashboardCardProps } from '../../types/dashboard';

const colorClasses = {
  blue: {
    bg: 'bg-blue-50',
    text: 'text-[#202eac]',
    border: 'border-blue-200',
    trend: 'text-blue-600',
  },
  indigo: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-600',
    border: 'border-indigo-200',
    trend: 'text-indigo-600',
  },
  amber: {
    bg: 'bg-amber-50',
    text: 'text-amber-600',
    border: 'border-amber-200',
    trend: 'text-amber-600',
  },
  emerald: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    border: 'border-emerald-200',
    trend: 'text-emerald-600',
  },
  red: {
    bg: 'bg-red-50',
    text: 'text-red-600',
    border: 'border-red-200',
    trend: 'text-red-600',
  },
  purple: {
    bg: 'bg-purple-50',
    text: 'text-purple-600',
    border: 'border-purple-200',
    trend: 'text-purple-600',
  },
};

interface ExtendedDashboardCardProps extends DashboardCardProps {
  isEditing?: boolean;
  onRemove?: () => void;
}

export default function DashboardCard({
  title,
  value,
  icon,
  color = 'blue',
  trend,
  isLoading = false,
  onClick,
  isEditing = false,
  onRemove,
}: ExtendedDashboardCardProps) {
  const colors = colorClasses[color];

  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      const lowerTitle = title.toLowerCase();
      // Sempre formatar como moeda se for faturamento ou valor de estoque
      if (lowerTitle.includes('faturamento') || lowerTitle.includes('investimento')) {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
      }
      // Outros números (opcional: formatar com casas decimais se necessário)
    }
    return val;
  };

  return (
    <div 
      className={`bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden group transition-all hover:shadow-md h-full relative ${
        onClick ? 'cursor-pointer hover:border-[#202eac]/30' : ''
      }`}
      onClick={onClick}
    >
      {isEditing && (
        <>
          <div className="drag-handle bg-slate-100 p-1 flex justify-center cursor-move border-b border-slate-200 active:bg-blue-50 transition-colors">
            <GripHorizontal className="w-4 h-4 text-slate-400" />
          </div>
          {onRemove && (
            <button 
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
              className="absolute top-8 right-2 w-6 h-6 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all z-10 shadow-sm border border-rose-100"
              title="Remover Card"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </>
      )}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div className="flex items-start justify-between mb-3">
          <div className={`w-10 h-10 ${colors.bg} ${colors.text} rounded-xl flex items-center justify-center shrink-0 shadow-sm border ${colors.border}/50`}>
            {React.cloneElement(icon as React.ReactElement, { className: 'w-5 h-5' })}
          </div>
          {trend && (
            <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${colors.bg} ${colors.trend}`}>
              {trend.isPositive ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              <span>{trend.isPositive ? '+' : ''}{trend.value}%</span>
            </div>
          )}
        </div>
        <div className="space-y-0.5">
          <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{title}</h3>
          <p className="text-2xl font-black text-slate-800 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">
            {isLoading ? (
              <span className="inline-block w-16 h-6 bg-slate-100 animate-pulse rounded" />
            ) : formatValue(value)}
          </p>
        </div>
      </div>
    </div>
  );
}

export function DashboardCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
      <div className="p-6 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-4">
          <div className="w-12 h-12 bg-slate-100 rounded-xl animate-pulse" />
        </div>
        <h3 className="text-slate-200 text-sm font-medium mb-1 bg-slate-100 rounded w-24 h-4 animate-pulse"> </h3>
        <p className="text-3xl font-bold text-slate-200 bg-slate-100 rounded w-16 h-8 animate-pulse"> </p>
      </div>
    </div>
  );
}
