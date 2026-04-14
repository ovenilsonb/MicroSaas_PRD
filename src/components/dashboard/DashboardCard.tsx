import React from 'react';
import { GripHorizontal, TrendingUp, TrendingDown, X } from 'lucide-react';
import { DashboardCardProps } from '../../types/dashboard';

const colorClasses = {
  blue: {
    solid: 'bg-[#202eac]',
    light: 'bg-indigo-400',
    text: 'text-white',
    iconText: 'text-[#202eac]',
    iconBorder: 'border-[#202eac]',
    skeleton: 'bg-[#202eac]/20',
  },
  indigo: {
    solid: 'bg-indigo-600',
    light: 'bg-indigo-400',
    text: 'text-white',
    iconText: 'text-indigo-600',
    iconBorder: 'border-indigo-600',
    skeleton: 'bg-indigo-600/20',
  },
  amber: {
    solid: 'bg-amber-500',
    light: 'bg-amber-300',
    text: 'text-white',
    iconText: 'text-amber-600',
    iconBorder: 'border-amber-500',
    skeleton: 'bg-amber-500/20',
  },
  emerald: {
    solid: 'bg-emerald-600',
    light: 'bg-emerald-400',
    text: 'text-white',
    iconText: 'text-emerald-600',
    iconBorder: 'border-emerald-600',
    skeleton: 'bg-emerald-600/20',
  },
  red: {
    solid: 'bg-rose-600',
    light: 'bg-rose-400',
    text: 'text-white',
    iconText: 'text-rose-600',
    iconBorder: 'border-rose-600',
    skeleton: 'bg-rose-600/20',
  },
  purple: {
    solid: 'bg-purple-600',
    light: 'bg-purple-400',
    text: 'text-white',
    iconText: 'text-purple-600',
    iconBorder: 'border-purple-600',
    skeleton: 'bg-purple-600/20',
  },
};

interface ExtendedDashboardCardProps extends DashboardCardProps {
  isEditing?: boolean;
  onRemove?: () => void;
  w?: number;
  h?: number;
}

const DashboardCard: React.FC<ExtendedDashboardCardProps> = ({
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
}) => {
  const settings = colorClasses[color] || colorClasses.blue;
  const isCompact = h !== undefined && h < 6;

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
      className={`relative overflow-hidden group transition-all duration-300 h-full cursor-pointer
        ${settings.solid} ${settings.text} shadow-xl shadow-slate-200/50 
        ${isCompact ? 'rounded-[40px]' : 'rounded-full'}
      `}
      onClick={onClick}
    >
      {/* Decorative Swoosh - Inspired by cards.png */}
      <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full -translate-x-12 -translate-y-12 blur-2xl" />
      
      {isEditing && (
        <div className="absolute top-0 left-0 right-0 z-30">
          <div className="drag-handle bg-white/10 flex justify-center cursor-move active:bg-white/20 transition-colors p-1">
            <GripHorizontal className="w-4 h-4 text-white/60" />
          </div>
          {onRemove && (
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
              className="absolute top-6 right-8 bg-white/20 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-white hover:text-rose-500 transition-all shadow-lg backdrop-blur-sm"
              title="Remover Card"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      <div className={`px-6 py-4 flex items-center h-full gap-5 relative z-10 ${isCompact ? 'px-4 py-2 gap-4' : ''}`}>
        {/* Left: Round Icon Area (White with module-colored icon) */}
        <div className={`
          flex items-center justify-center bg-white rounded-full border-4 ${settings.iconBorder} shrink-0 shadow-lg
          ${isCompact ? 'w-16 h-16' : 'w-24 h-24'}
        `}>
          {React.cloneElement(icon as React.ReactElement, { 
            className: `${isCompact ? 'w-7 h-7' : 'w-10 h-10'} ${settings.iconText}` 
          })}
        </div>

        {/* Right: Text Content */}
        <div className="flex flex-col justify-center min-w-0 flex-1">
          <h3 className={`font-bold uppercase tracking-[0.2em] text-white/70 leading-tight mb-1 ${isCompact ? 'text-[11px]' : 'text-sm'}`}>
            {title}
          </h3>
          <div className="flex items-baseline gap-3">
            <p className={`font-black text-white tracking-tighter leading-none break-words ${
              isCompact ? 'text-3xl' : 'text-6xl'
            }`}>
              {isLoading ? (
                <span className="inline-block bg-white/20 animate-pulse rounded-lg w-24 h-8" />
              ) : formatValue(value)}
            </p>
            
            {/* Inline Trend for Royal Style */}
            {trend && !isCompact && (
              <div className={`flex items-center gap-0.5 text-[10px] font-black px-2 py-1 rounded-full bg-white/20 text-white shadow-sm mb-1`}>
                {trend.isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                <span>{trend.isPositive ? '+' : ''}{trend.value}%</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(DashboardCard);

export function DashboardCardSkeleton() {
  return (
    <div className="bg-slate-50 rounded-full shadow-sm flex items-center justify-start p-6 gap-6 h-full overflow-hidden border border-slate-100">
      <div className="w-24 h-24 bg-slate-200 rounded-full animate-pulse border-4 border-slate-100 shadow-inner" />
      <div className="flex flex-col gap-4 flex-1">
        <div className="h-3 bg-slate-200 rounded-full w-24 animate-pulse" />
        <div className="h-10 bg-slate-200 rounded-lg w-40 animate-pulse" />
      </div>
    </div>
  );
}
