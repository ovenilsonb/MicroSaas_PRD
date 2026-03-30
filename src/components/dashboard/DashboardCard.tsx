import React from 'react';
import { GripHorizontal, TrendingUp, TrendingDown } from 'lucide-react';
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
}: ExtendedDashboardCardProps) {
  const colors = colorClasses[color];

  return (
    <div 
      className={`bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden group transition-all hover:shadow-md ${
        onClick ? 'cursor-pointer hover:border-[#202eac]/30' : ''
      }`}
      onClick={onClick}
    >
      {isEditing && (
        <div className="drag-handle bg-slate-100 p-1 flex justify-center cursor-move border-b border-slate-200">
          <GripHorizontal className="w-4 h-4 text-slate-400" />
        </div>
      )}
      <div className="p-6 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-4">
          <div className={`w-12 h-12 ${colors.bg} ${colors.text} rounded-xl flex items-center justify-center shrink-0`}>
            {icon}
          </div>
          {trend && (
            <div className={`flex items-center gap-1 text-xs font-medium ${colors.trend}`}>
              {trend.isPositive ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              <span>{trend.isPositive ? '+' : ''}{trend.value}%</span>
            </div>
          )}
        </div>
        <h3 className="text-slate-500 text-sm font-medium mb-1">{title}</h3>
        <p className="text-3xl font-bold text-slate-800">
          {isLoading ? '...' : value}
        </p>
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
