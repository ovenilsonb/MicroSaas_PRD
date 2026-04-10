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
    color: 'bg-blue-50 text-[#202eac]',
    label: 'Fórmula',
    action: 'cadastrada',
  },
  insumo: {
    icon: Package,
    color: 'bg-emerald-50 text-emerald-600',
    label: 'Insumo',
    action: 'adicionado',
  },
  cliente: {
    icon: Users,
    color: 'bg-purple-50 text-purple-600',
    label: 'Cliente',
    action: 'cadastrado',
  },
  fornecedor: {
    icon: Users,
    color: 'bg-amber-50 text-amber-600',
    label: 'Fornecedor',
    action: 'cadastrado',
  },
  producao: {
    icon: Factory,
    color: 'bg-indigo-50 text-indigo-600',
    label: 'Produção',
    action: 'iniciada',
  },
  qualidade: {
    icon: Shield,
    color: 'bg-cyan-50 text-cyan-600',
    label: 'Qualidade',
    action: 'verificado',
  },
};

export default function RecentActivity({ activities, isLoading = false, isEditing = false }: RecentActivityProps) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden group h-full transition-colors duration-300">
      {isEditing && (
        <div className="drag-handle bg-slate-100 p-1 flex justify-center cursor-move border-b border-slate-200">
          <GripHorizontal className="w-4 h-4 text-slate-400" />
        </div>
      )}
      <div className="p-7 flex-1 flex flex-col overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between mb-8 shrink-0">
          <h2 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Atividade Recente</h2>
        </div>

        <div className="space-y-6">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400 text-[10px] font-black uppercase tracking-widest italic animate-pulse">Analizando Sincronização...</div>
          ) : activities.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-[10px] font-black uppercase tracking-widest italic">Nenhum evento detectado.</div>
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
                    <p className="text-sm text-slate-800 leading-snug">
                      <span className="font-bold">{config.label}</span>{' '}
                      <span className="font-black text-[#202eac] truncate">{act.name}</span>
                      <span className="text-slate-500"> {config.action}.</span>
                    </p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1.5 opacity-60">
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
