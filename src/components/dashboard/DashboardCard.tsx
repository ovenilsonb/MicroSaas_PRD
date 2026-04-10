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
  w?: number;
  h?: number;
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
  w,
  h,
}: ExtendedDashboardCardProps) {
  const colors = colorClasses[color];
  const isCompact = h !== undefined && h < 3.5;
  const isVerySmall = w !== undefined && w < 3;

  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      const lowerTitle = title.toLowerCase();
      if (lowerTitle.includes('faturamento') || lowerTitle.includes('investimento')) {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
      }
    }
    return val;
  };

  return (
    <div 
      className={`bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden group transition-all hover:shadow-md h-full relative ${
        onClick ? 'cursor-pointer hover:border-[#202eac]/30' : ''
      }`}
      onClick={onClick}
    >
      {isEditing && (
        <>
          <div className={`drag-handle bg-slate-100 flex justify-center cursor-move border-b border-slate-200 active:bg-blue-50 transition-colors ${
            isCompact ? 'p-0.5' : 'p-1'
          }`}>
            <GripHorizontal className={`${isCompact ? 'w-3 h-3' : 'w-4 h-4'} text-slate-400`} />
          </div>
          {onRemove && (
            <button 
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
              className={`absolute bg-rose-50 text-rose-500 rounded-full flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all z-10 shadow-sm border border-rose-100 ${
                isCompact ? 'top-6 right-2 w-5 h-5' : 'top-10 right-3 w-7 h-7'
              }`}
              title="Remover Card"
            >
              <X className={isCompact ? 'w-3 h-3' : 'w-4 h-4'} />
            </button>
          )}
        </>
      )}
      <div className={`flex-1 flex flex-col ${isCompact ? 'p-3' : 'p-6'} ${isCompact ? 'justify-center' : 'justify-between'}`}>
        <div className={`flex items-start justify-between ${isCompact ? 'mb-2' : 'mb-4'}`}>
          <div className={`${isCompact ? 'w-8 h-8 rounded-lg' : 'w-12 h-12 rounded-2xl'} ${colors.bg} ${colors.text} flex items-center justify-center shrink-0 shadow-sm border ${colors.border}`}>
            {React.cloneElement(icon as React.ReactElement, { className: isCompact ? 'w-4 h-4' : 'w-6 h-6' })}
          </div>
          {trend && !isCompact && (
            <div className={`flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full ${colors.bg} ${colors.trend} tracking-widest`}>
              {trend.isPositive ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              <span>{trend.isPositive ? '+' : ''}{trend.value}%</span>
            </div>
          )}
        </div>
        <div className={isCompact ? 'space-y-0' : 'space-y-1'}>
          <h3 className={`text-slate-400 font-black uppercase tracking-[0.2em] ${isCompact ? 'text-[8px] leading-tight' : 'text-[10px]'}`}>
            {title}
          </h3>
          <p className={`font-black text-slate-800 tracking-tight whitespace-nowrap overflow-hidden text-ellipsis ${
            isCompact ? 'text-lg' : 'text-2xl'
          }`}>
            {isLoading ? (
              <span className={`inline-block bg-slate-100 animate-pulse rounded-lg ${isCompact ? 'w-16 h-6' : 'w-24 h-8'}`} />
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
