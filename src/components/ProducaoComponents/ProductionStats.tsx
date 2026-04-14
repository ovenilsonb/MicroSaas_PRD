import React from 'react';
import { Factory, ClipboardList, Play, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface ProductionStatsProps {
  stats: {
    total: number;
    planned: number;
    inProgress: number;
    inQuality: number;
    completed: number;
  };
}

export const ProductionStats: React.FC<ProductionStatsProps> = ({ stats }) => {
  const cards = [
    { 
      label: 'Total de OFs', 
      value: stats.total, 
      icon: <Factory className="w-5 h-5" />, 
      color: 'bg-blue-600',
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    { 
      label: 'Planejadas', 
      value: stats.planned, 
      icon: <ClipboardList className="w-5 h-5" />, 
      color: 'bg-indigo-600',
      textColor: 'text-indigo-600',
      bgColor: 'bg-indigo-50'
    },
    { 
      label: 'Em Produção', 
      value: stats.inProgress, 
      icon: <Play className="w-5 h-5" />, 
      color: 'bg-amber-500',
      textColor: 'text-amber-600',
      bgColor: 'bg-amber-50',
      pulse: true
    },
    { 
      label: 'Em Qualidade', 
      value: stats.inQuality, 
      icon: <ShieldCheck className="w-5 h-5" />, 
      color: 'bg-purple-600',
      textColor: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    { 
      label: 'Finalizadas', 
      value: stats.completed, 
      icon: <CheckCircle2 className="w-5 h-5" />, 
      color: 'bg-emerald-600',
      textColor: 'text-emerald-600',
      bgColor: 'bg-emerald-50'
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      {cards.map((card, i) => (
        <div 
          key={i} 
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-all group"
        >
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${card.bgColor} ${card.textColor} ${card.pulse ? 'animate-pulse' : ''}`}>
            {React.cloneElement(card.icon as React.ReactElement, { className: 'w-6 h-6' })}
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{card.label}</p>
            <h3 className="text-2xl font-black text-slate-800">{card.value}</h3>
          </div>
        </div>
      ))}
    </div>
  );
};
