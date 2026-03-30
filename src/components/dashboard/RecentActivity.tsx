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
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden group h-full">
      {isEditing && (
        <div className="drag-handle bg-slate-100 p-1 flex justify-center cursor-move border-b border-slate-200">
          <GripHorizontal className="w-4 h-4 text-slate-400" />
        </div>
      )}
      <div className="p-6 flex-1 flex flex-col overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between mb-6 shrink-0">
          <h2 className="text-lg font-bold text-slate-800">Atividade Recente</h2>
        </div>

        <div className="space-y-4">
          {isLoading ? (
            <div className="py-8 text-center text-slate-400 text-sm italic">Carregando...</div>
          ) : activities.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm italic">Nenhuma atividade recente.</div>
          ) : (
            activities.map((act, idx) => {
              const config = activityConfig[act.type];
              const Icon = config.icon;
              
              return (
                <div key={idx} className="flex gap-3 items-start">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${config.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800">
                      <span className="font-medium">{config.label}</span>{' '}
                      <strong className="font-semibold truncate">{act.name}</strong>
                      {' '}{config.action}.
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {act.date.toLocaleDateString('pt-BR')} às {act.date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
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
