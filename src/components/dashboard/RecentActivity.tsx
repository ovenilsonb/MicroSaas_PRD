import React from 'react';
import { Beaker, Package, Users, Factory, Shield, GripHorizontal } from 'lucide-react';
import { ActivityItem } from '../../types/dashboard';

interface RecentActivityProps {
  activities: ActivityItem[];
  isLoading?: boolean;
  isEditing?: boolean;
}

const activityConfig = {
  formula: {
    icon: Beaker,
    color: 'bg-blue-50 dark:bg-blue-900/30 text-[#202eac] dark:text-blue-400',
    label: 'Fórmula',
    action: 'cadastrada',
  },
  insumo: {
    icon: Package,
    color: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
    label: 'Insumo',
    action: 'adicionado',
  },
  cliente: {
    icon: Users,
    color: 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    label: 'Cliente',
    action: 'cadastrado',
  },
  fornecedor: {
    icon: Users,
    color: 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    label: 'Fornecedor',
    action: 'cadastrado',
  },
  producao: {
    icon: Factory,
    color: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400',
    label: 'Produção',
    action: 'iniciada',
  },
  qualidade: {
    icon: Shield,
    color: 'bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400',
    label: 'Qualidade',
    action: 'verificado',
  },
};

export default function RecentActivity({ activities, isLoading = false, isEditing = false }: RecentActivityProps) {
  return (
    <div className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden group h-full transition-colors duration-300">
      {isEditing && (
        <div className="drag-handle bg-slate-100 dark:bg-slate-800/50 p-1 flex justify-center cursor-move border-b border-slate-200 dark:border-slate-800">
          <GripHorizontal className="w-4 h-4 text-slate-400 dark:text-slate-600" />
        </div>
      )}
      <div className="p-7 flex-1 flex flex-col overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between mb-8 shrink-0">
          <h2 className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-[0.2em]">Atividade Recente</h2>
        </div>

        <div className="space-y-6">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400 dark:text-slate-600 text-[10px] font-black uppercase tracking-widest italic animate-pulse">Analizando Sincronização...</div>
          ) : activities.length === 0 ? (
            <div className="py-12 text-center text-slate-400 dark:text-slate-600 text-[10px] font-black uppercase tracking-widest italic">Nenhum evento detectado.</div>
          ) : (
            activities.map((act, idx) => {
              const config = activityConfig[act.type];
              const Icon = config.icon;
              
              return (
                <div key={idx} className="flex gap-4 items-start group/item">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover/item:scale-110 ${config.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800 dark:text-slate-200 leading-snug">
                      <span className="font-bold">{config.label}</span>{' '}
                      <span className="font-black text-[#202eac] dark:text-blue-400 truncate">{act.name}</span>
                      <span className="text-slate-500 dark:text-slate-500"> {config.action}.</span>
                    </p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mt-1.5 opacity-60">
                      {act.date.toLocaleDateString('pt-BR')} — {act.date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
